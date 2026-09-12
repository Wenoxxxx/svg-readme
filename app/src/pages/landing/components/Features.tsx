const ITEMS = [
  {
    n: "01",
    title: "Real keyframes, not frames",
    body: "The animation is CSS inside the SVG's own <style> block — it plays natively wherever the SVG renders, with no frame count and no file-size penalty for smoothness.",
  },
  {
    n: "02",
    title: "What you see is what ships",
    body: "The preview on this page is the exact markup you download. No separate render step, no \u201cclose enough\u201d gap between the editor and the export.",
  },
  {
    n: "03",
    title: "Your brand, not a template",
    body: "Accent, size, and motion are parameters, not presets baked into someone else's generator — set them once to match the rest of your profile.",
  },
];

export default function Features() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-[600px] mb-12">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400 mb-3">
            <span aria-hidden="true" className="w-[6px] h-[6px] bg-zinc-400" />
            Why not just a static image
          </div>
          <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight">
            Three things a GIF or screenshot can&apos;t do
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 overflow-hidden">
          {ITEMS.map((f) => (
            <div key={f.n} className="bg-white p-8 transition-colors hover:bg-zinc-50">
              <span className="inline-block font-mono text-[11px] text-[#1b5def] font-medium mb-4 px-2 py-1 bg-[#1b5def]/5">
                {f.n}
              </span>
              <h3 className="font-display text-[17px] font-semibold mb-2.5 tracking-tight">
                {f.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-[1.7]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
