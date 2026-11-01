import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="bg-[#fafafa] text-zinc-900 antialiased">
      <section className="max-w-2xl mx-auto py-24 px-6 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-[#1b5def] mb-5">
          <span aria-hidden="true" className="w-[6px] h-[6px] bg-[#1b5def]" />
          404
        </div>
        <h1 className="font-display text-4xl font-bold mb-4 tracking-tight">
          Page not found
        </h1>
        <p className="text-zinc-500 leading-[1.7] mb-8">
          That route does not exist. Head back to the generator or open the full
          editor.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2.5 bg-[#1b5def] text-white text-[13px] font-medium no-underline hover:bg-[#164ecb] transition-colors"
          >
            Back to generator
          </Link>
          <Link
            to="/editor"
            className="inline-flex items-center px-4 py-2.5 border border-zinc-900 text-zinc-900 text-[13px] font-medium no-underline hover:bg-zinc-900 hover:text-white transition-colors"
          >
            Open editor
          </Link>
        </div>
      </section>
    </div>
  );
}
