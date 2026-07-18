import { useState, useMemo } from "react";

export default function Home() {
  const [handle, setHandle] = useState("Owen Jerusalem");
  const [tagline, setTagline] = useState(
    "BSIT student · freelance designer · builder",
  );
  const [color, setColor] = useState("#1b5def");
  const [motion, setMotion] = useState<"fade" | "sweep">("fade");
  const [size, setSize] = useState("800x200");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState("");

  const swatches = [
    { name: "Owen blue", value: "#1b5def" },
    { name: "Ink", value: "#101218" },
    { name: "Green", value: "#0f8a5f" },
    { name: "Red", value: "#d1392b" },
    { name: "Amber", value: "#b3510a" },
  ];

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const svgString = useMemo(() => {
    const [w, h] = size.split("x").map(Number);
    // Generate deterministic uid from inputs
    const uid =
      "sr" +
      [handle, tagline, color, motion, size, theme]
        .join("-")
        .split("")
        .reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0)
        .toString(36)
        .slice(0, 6);
    const dark = theme === "dark";
    const bg = dark ? "#0f1117" : "#ffffff";
    const ink = dark ? "#f3f4f7" : "#101218";
    const inkSoft = dark ? "#9aa0b4" : "#565b6d";
    const border = dark ? "#262a35" : "#101218";
    const words = tagline.split(" ");

    let motionCSS: string;
    let motionMarkup: string;

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (motion === "fade") {
      motionCSS =
        words
          .map(
            (_, i) => `
        .${uid}-w${i}{opacity:0;animation:${uid}fade .5s ease forwards;animation-delay:${0.25 + i * 0.09}s;}
      `,
          )
          .join("") +
        `
        @keyframes ${uid}fade{to{opacity:1;}}
        .${uid}-handle{opacity:0;animation:${uid}fade .5s ease forwards;animation-delay:0.05s;}
        .${uid}-dot{animation:${uid}pulse 1.6s ease-in-out infinite;}
        @keyframes ${uid}pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
      `;
      let x = w * 0.065;
      const tagY = h * 0.62;
      motionMarkup = words
        .map((word, i) => {
          const width = word.length * 7.2 + 10;
          const el = `<tspan class="${uid}-w${i}" x="${x.toFixed(1)}" y="${tagY}">${esc(word)}</tspan>`;
          x += width;
          return el;
        })
        .join("");
    } else {
      motionCSS = `
        .${uid}-handle{opacity:0;animation:${uid}fadeIn .6s ease forwards .1s;}
        .${uid}-tag{opacity:0;animation:${uid}fadeIn .6s ease forwards .3s;}
        @keyframes ${uid}fadeIn{to{opacity:1;}}
        .${uid}-sweep{animation:${uid}sweep 2.6s ease-in-out infinite;}
        @keyframes ${uid}sweep{
          0%{transform:translateX(-30%);}
          50%{transform:translateX(${w}px);}
          100%{transform:translateX(${w}px);}
        }
        .${uid}-dot{animation:${uid}pulse 1.6s ease-in-out infinite;}
        @keyframes ${uid}pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
      `;
      motionMarkup = `<tspan class="${uid}-tag" x="${(w * 0.065).toFixed(1)}" y="${h * 0.62}">${esc(tagline)}</tspan>`;
    }

    const sweepRect =
      motion === "sweep"
        ? `<rect class="${uid}-sweep" x="0" y="0" width="${(w * 0.18).toFixed(0)}" height="${h}" fill="${color}" opacity="0.10"/>`
        : "";

    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(handle)} banner">
  <style>
    text{font-family: 'JetBrains Mono', ui-monospace, monospace;}
    ${motionCSS}
  </style>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="${bg}" stroke="${border}"/>
  ${sweepRect}
  <rect x="${(w * 0.065).toFixed(1)}" y="${(h * 0.22).toFixed(1)}" width="10" height="10" fill="${color}" class="${uid}-dot"/>
  <text class="${uid}-handle" x="${(w * 0.065 + 18).toFixed(1)}" y="${(h * 0.3).toFixed(1)}" font-size="${Math.round(h * 0.16)}" font-weight="600" fill="${ink}">${esc(handle)}</text>
  <text font-size="${Math.round(h * 0.085)}" fill="${inkSoft}">${motionMarkup}</text>
</svg>`;
  }, [handle, tagline, color, motion, size, theme]);

  const handleDownload = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banner.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashToast("Downloaded banner.svg");
  };

  const handleCopyMarkdown = () => {
    const md = "![banner](./banner.svg)";
    navigator.clipboard
      .writeText(md)
      .then(() => flashToast("Copied to clipboard"))
      .catch(() => flashToast("Copy failed"));
  };

  return (
    <div className="bg-white min-h-screen text-zinc-900 font-sans">
      {/* Hero Section */}
      <section className="py-14 border-b border-zinc-200">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[640px] mb-9">
            <div className="font-mono text-[12.5px] text-[#1b5def] uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2 before:content-[''] before:w-[7px] before:h-[7px] before:bg-[#1b5def] before:inline-block">
              GitHub profile READMEs
            </div>
            <h1 className="font-['Poppins'] font-semibold text-3xl md:text-5xl leading-[1.08] tracking-tight text-zinc-900">
              An animated banner for your README, built{" "}
              <em className="text-[#1b5def] not-italic">in the browser</em>, not
              in Figma.
            </h1>
            <p className="text-[16.5px] text-zinc-500 mt-4 max-w-[52ch] leading-relaxed">
              Type your handle and tagline, pick an accent and a motion style,
              and export a real SVG with the keyframes baked in — no rendering
              pipeline required to try it.
            </p>
          </div>

          {/* Interactive Studio */}
          <div
            className="grid grid-cols-1 md:grid-cols-[340px_1fr] border border-zinc-900"
            id="studio"
          >
            {/* Control Panel */}
            <div className="p-[22px] border-b md:border-b-0 md:border-r border-zinc-900 bg-white flex flex-col gap-6">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400 mb-3.5">
                  01 — Content
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[12.5px] text-zinc-500 font-mono"
                      htmlFor="handle-in"
                    >
                      Handle / name
                    </label>
                    <input
                      className="w-full border border-zinc-200 bg-white px-2.5 py-2 font-sans text-sm text-zinc-900 rounded-none focus:outline-none focus:ring-2 focus:ring-[#1b5def] focus:border-[#1b5def]"
                      id="handle-in"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      maxLength={28}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[12.5px] text-zinc-500 font-mono"
                      htmlFor="tagline-in"
                    >
                      Tagline
                    </label>
                    <input
                      className="w-full border border-zinc-200 bg-white px-2.5 py-2 font-sans text-sm text-zinc-900 rounded-none focus:outline-none focus:ring-2 focus:ring-[#1b5def] focus:border-[#1b5def]"
                      id="tagline-in"
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      maxLength={60}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400 mb-3.5">
                  02 — Accent
                </div>
                <div className="flex gap-2 flex-wrap">
                  {swatches.map((s) => (
                    <button
                      key={s.value}
                      className={`w-7 h-7 border border-zinc-900 cursor-pointer relative shrink-0 ${
                        color === s.value
                          ? "after:content-[''] after:absolute after:-inset-1 after:border after:border-zinc-900"
                          : ""
                      }`}
                      style={{ backgroundColor: s.value }}
                      onClick={() => setColor(s.value)}
                      aria-label={s.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400 mb-3.5">
                  03 — Motion
                </div>
                <div className="flex border border-zinc-200">
                  <button
                    className={`flex-1 py-2 text-xs font-mono border-r border-zinc-200 last:border-r-0 cursor-pointer ${
                      motion === "fade"
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-500"
                    }`}
                    onClick={() => setMotion("fade")}
                  >
                    Fade cascade
                  </button>
                  <button
                    className={`flex-1 py-2 text-xs font-mono border-r border-zinc-200 last:border-r-0 cursor-pointer ${
                      motion === "sweep"
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-500"
                    }`}
                    onClick={() => setMotion("sweep")}
                  >
                    Gradient sweep
                  </button>
                </div>
              </div>

              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400 mb-3.5">
                  04 — Size &amp; theme
                </div>
                <div className="flex flex-col gap-4">
                  <select
                    className="w-full border border-zinc-200 bg-white px-2.5 py-2 font-sans text-sm text-zinc-900 rounded-none focus:outline-none focus:ring-2 focus:ring-[#1b5def]"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  >
                    <option value="800x200">800 × 200 — standard</option>
                    <option value="1000x220">1000 × 220 — wide</option>
                    <option value="640x160">640 × 160 — compact</option>
                  </select>
                  <div className="flex border border-zinc-200">
                    <button
                      className={`flex-1 py-2 text-xs font-mono border-r border-zinc-200 last:border-r-0 cursor-pointer ${
                        theme === "light"
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-500"
                      }`}
                      onClick={() => setTheme("light")}
                    >
                      Light
                    </button>
                    <button
                      className={`flex-1 py-2 text-xs font-mono border-r border-zinc-200 last:border-r-0 cursor-pointer ${
                        theme === "dark"
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-500"
                      }`}
                      onClick={() => setTheme("dark")}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage */}
            <div className="bg-zinc-950 p-[22px] flex flex-col gap-4 min-w-0 relative shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border-t md:border-t-0 border-zinc-900">
              {/* Radial Grid Pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500 z-10">
                Live preview
              </div>

              {/* Artboard Container mimicking the Editor */}
              <div className="flex-1 flex items-center justify-center p-5 min-w-0 overflow-auto z-10">
                <div
                  className="bg-zinc-900 rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.01] w-full max-w-[800px] aspect-[800/200] items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: svgString }}
                />
              </div>

              <div className="flex gap-2.5 items-center flex-wrap z-10">
                <button
                  className="font-mono text-[13px] px-4 py-2.5 bg-[#1b5def] text-white border-0 hover:bg-[#154bc4] cursor-pointer whitespace-nowrap"
                  onClick={handleDownload}
                >
                  Download SVG
                </button>
                <button
                  className="font-mono text-[13px] px-4 py-2.5 bg-zinc-900 text-zinc-100 border border-white/10 hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
                  onClick={handleCopyMarkdown}
                >
                  Copy README markdown
                </button>
                <span className="font-mono text-xs text-[#1b5def] h-3.5 transition-opacity duration-300">
                  {toast}
                </span>
              </div>
              <div className="flex items-center gap-2.5 border border-white/10 bg-zinc-900 p-2.5 px-3 min-w-0 z-10">
                <code className="text-[12.5px] text-zinc-400 overflow-x-auto whitespace-nowrap flex-1 font-mono">
                  ![banner](./banner.svg)
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 border-b border-zinc-200">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[560px] mb-10">
            <div className="font-mono text-[12.5px] text-zinc-400 uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2 before:content-[''] before:w-[7px] before:h-[7px] before:bg-zinc-400 before:inline-block">
              Why not just a static image
            </div>
            <h2 className="font-['Poppins'] font-semibold text-2xl md:text-3xl text-zinc-900">
              Three things a GIF or a screenshot can't do
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
            <div className="bg-white p-[26px]">
              <div className="font-mono text-xs text-[#1b5def] mb-3.5">01</div>
              <h3 className="font-['Poppins'] font-semibold text-[17px] text-zinc-900 mb-2">
                Real keyframes, not frames
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                The animation is CSS inside the SVG's own &lt;style&gt; block —
                it plays natively wherever the SVG renders, with no frame count
                and no file-size penalty for smoothness.
              </p>
            </div>
            <div className="bg-white p-[26px]">
              <div className="font-mono text-xs text-[#1b5def] mb-3.5">02</div>
              <h3 className="font-['Poppins'] font-semibold text-[17px] text-zinc-900 mb-2">
                What you see is what ships
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                The preview on this page is the exact markup you download. No
                separate render step, no "close enough" gap between the editor
                and the export.
              </p>
            </div>
            <div className="bg-white p-[26px]">
              <div className="font-mono text-xs text-[#1b5def] mb-3.5">03</div>
              <h3 className="font-['Poppins'] font-semibold text-[17px] text-zinc-900 mb-2">
                Your brand, not a template
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Accent, size, and motion are parameters, not presets baked into
                someone else's generator — set them once to match the rest of
                your profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 border-b border-zinc-200 bg-[#f3f4f7]" id="how">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="max-w-[560px] mb-7">
                <div className="font-mono text-[12.5px] text-zinc-400 uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2 before:content-[''] before:w-[7px] before:h-[7px] before:bg-zinc-400 before:inline-block">
                  Under the hood
                </div>
                <h2 className="font-['Poppins'] font-semibold text-2xl md:text-3xl text-zinc-900">
                  How it renders
                </h2>
              </div>
              <ol className="list-none p-0 m-0 flex flex-col gap-6">
                <li className="relative pl-[38px]">
                  <span className="absolute left-0 top-0 font-mono text-xs w-6 h-6 border border-zinc-900 flex items-center justify-center bg-white text-zinc-950">
                    1
                  </span>
                  <h4 className="font-['Poppins'] font-semibold text-[15px] text-zinc-900 mb-1">
                    Layout via React + Satori
                  </h4>
                  <p className="text-[13.5px] text-zinc-500 leading-relaxed">
                    Content and layout are described as React, then flattened to
                    SVG server-side — the same approach used for OG-image
                    generation.
                  </p>
                </li>
                <li className="relative pl-[38px]">
                  <span className="absolute left-0 top-0 font-mono text-xs w-6 h-6 border border-zinc-900 flex items-center justify-center bg-white text-zinc-950">
                    2
                  </span>
                  <h4 className="font-['Poppins'] font-semibold text-[15px] text-zinc-900 mb-1">
                    Keyframes injected after render
                  </h4>
                  <p className="text-[13.5px] text-zinc-500 leading-relaxed">
                    Satori's output has no animation support, so the motion CSS
                    is hand-written and injected into the SVG's &lt;style&gt; as
                    a post-process step.
                  </p>
                </li>
                <li className="relative pl-[38px]">
                  <span className="absolute left-0 top-0 font-mono text-xs w-6 h-6 border border-zinc-900 flex items-center justify-center bg-white text-zinc-950">
                    3
                  </span>
                  <h4 className="font-['Poppins'] font-semibold text-[15px] text-zinc-900 mb-1">
                    Export, then commit
                  </h4>
                  <p className="text-[13.5px] text-zinc-500 leading-relaxed">
                    Download the SVG, drop it in your repo, and reference it
                    with a standard markdown image tag — GitHub renders the
                    animation as-is.
                  </p>
                </li>
              </ol>
            </div>
            <div className="bg-[#0f1117] text-[#e7e9ee] p-5 font-mono text-[12.5px] leading-relaxed border border-zinc-900 overflow-x-auto">
              <span className="text-[#7d8296]"># README.md</span>
              <br />
              <span className="text-[#9fe08a]">![banner](./banner.svg)</span>
              <br />
              <br />
              <span className="text-[#7d8296]">
                &lt;!-- that's it — no build step, --&gt;
              </span>
              <br />
              <span className="text-[#7d8296]">
                &lt;!-- no external image host, --&gt;
              </span>
              <br />
              <span className="text-[#7d8296]">
                &lt;!-- no action to keep running --&gt;
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-7 bg-white">
        <div className="max-w-[1180px] mx-auto px-6 flex justify-between items-center flex-wrap gap-3">
          <span className="font-mono text-[12.5px] text-zinc-400">
            svg-readme — built by Owen Jerusalem
          </span>
          <a
            className="text-[12.5px] text-zinc-400 hover:text-zinc-900 transition-colors no-underline"
            href="https://github.com/Wenoxxxx"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/Wenoxxxx
          </a>
        </div>
      </footer>
    </div>
  );
}
