import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-12">
      <div
        aria-hidden="true"
        className="absolute -top-[200px] -right-[100px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(27,93,239,0.08)_0%,transparent_70%)] pointer-events-none"
      />
      <div className="max-w-[1200px] mx-auto px-6 relative">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-[#1b5def] mb-5">
          <span aria-hidden="true" className="w-[6px] h-[6px] bg-[#1b5def]" />
          GitHub Profile READMEs
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1] tracking-tight max-w-[700px] mb-5">
          An animated banner for your README, built{" "}
          <em className="text-[#1b5def] not-italic relative">
            in the browser
            <span
              aria-hidden="true"
              className="absolute bottom-[2px] left-0 right-0 h-2 bg-[#1b5def]/10 -z-10"
            />
          </em>
          , not in Figma.
        </h1>
        <p className="text-lg text-zinc-500 max-w-[520px] leading-[1.7] mb-8">
          Type your handle and tagline, pick an accent and a motion style, and
          export a real SVG with the keyframes baked in — no rendering pipeline
          required.
        </p>
        <div className="flex gap-3 flex-wrap items-center">
          <Link
            to="/editor"
            className="inline-flex items-center px-5 py-3 bg-[#1b5def] text-white text-sm font-semibold hover:bg-[#164ecb] transition-colors no-underline"
          >
            Open Full Editor →
          </Link>
          <a
            href="#studio"
            className="inline-flex items-center px-5 py-3 border border-zinc-900 text-sm font-semibold text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors no-underline"
          >
            Try quick generator ↓
          </a>
        </div>
      </div>
    </section>
  );
}
