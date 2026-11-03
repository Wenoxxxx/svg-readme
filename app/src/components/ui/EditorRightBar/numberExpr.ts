// ─── Tiny safe arithmetic parser (no eval) ──────────────────────────────────
// Grammar:
//   expr   := term (('+' | '-') term)*
//   term   := factor (('*' | '/') factor)*
//   factor := ('+' | '-') factor | number | '(' expr ')'
// Supports decimals like ".5" and "1.", optional trailing "%" / "px" units.

/**
 * Evaluate a numeric expression typed into an inspector field.
 * Returns null for anything that is not a finite arithmetic expression.
 */
export function evaluateNumberExpression(input: string): number | null {
  const src = input.trim().replace(/(px|%|°)$/i, "").trim();
  if (src === "") return null;
  let pos = 0;

  const skip = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  };

  const parseNumber = (): number | null => {
    skip();
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(pos));
    if (!m) return null;
    pos += m[0].length;
    return Number(m[0]);
  };

  const parseFactor = (depth: number): number | null => {
    if (depth > 64) return null;
    skip();
    const ch = src[pos];
    if (ch === "+" || ch === "-") {
      pos++;
      const v = parseFactor(depth + 1);
      return v === null ? null : ch === "-" ? -v : v;
    }
    if (ch === "(") {
      pos++;
      const v = parseExpr(depth + 1);
      skip();
      if (v === null || src[pos] !== ")") return null;
      pos++;
      return v;
    }
    return parseNumber();
  };

  const parseTerm = (depth: number): number | null => {
    let left = parseFactor(depth);
    if (left === null) return null;
    for (;;) {
      skip();
      const op = src[pos];
      if (op !== "*" && op !== "/") return left;
      pos++;
      const right = parseFactor(depth);
      if (right === null) return null;
      left = op === "*" ? left * right : left / right;
    }
  };

  function parseExpr(depth: number): number | null {
    let left = parseTerm(depth);
    if (left === null) return null;
    for (;;) {
      skip();
      const op = src[pos];
      if (op !== "+" && op !== "-") return left;
      pos++;
      const right = parseTerm(depth);
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
  }

  const result = parseExpr(0);
  skip();
  if (result === null || pos !== src.length || !Number.isFinite(result)) return null;
  return result;
}
