import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="bg-[#fafafa] text-zinc-900 antialiased">
      <section className="max-w-3xl mx-auto py-16 px-6">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-[#1b5def] mb-5">
          <span aria-hidden="true" className="w-[6px] h-[6px] bg-[#1b5def]" />
          About
        </div>
        <h2 className="font-display text-4xl font-bold mb-6 tracking-tight">
          Docs that look as good as the work
        </h2>
        <p className="text-zinc-500 leading-[1.7] mb-4">
          svg-readme is a web app for generating animated SVG banners for your
          GitHub profile README. It provides a visual editor to design your
          banner — hand-injected CSS animations, gradients, morphing paths, and
          all.
        </p>
        <p className="text-zinc-500 leading-[1.7] mb-4">
          No backend. No database. Designs live in local{" "}
          <code className="font-mono text-[13px] bg-zinc-100 px-1.5 py-0.5">
            .svg-readme.json
          </code>{" "}
          files + browser localStorage. Open the full editor to design visually,
          then export SVG, PNG, or GIF and reference it from your profile
          README.
        </p>
        <div className="flex gap-3 flex-wrap mt-8">
          <Link
            to="/editor"
            className="inline-flex items-center px-5 py-3 bg-[#1b5def] text-white text-sm font-semibold hover:bg-[#164ecb] transition-colors no-underline"
          >
            Open Full Editor →
          </Link>
          <Link
            to="/"
            className="inline-flex items-center px-5 py-3 border border-zinc-900 text-sm font-semibold text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors no-underline"
          >
            Back home
          </Link>
        </div>
      </section>
    </div>
  );
}
