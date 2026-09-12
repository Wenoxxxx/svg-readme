const STEPS = [
  {
    n: "1",
    title: "Layout via React + Satori",
    body: "Content and layout are described as React, then flattened to SVG server-side — the same approach used for OG-image generation.",
  },
  {
    n: "2",
    title: "Keyframes injected after render",
    body: "Satori's output has no animation support, so the motion CSS is hand-written and injected into the SVG's <style> as a post-process step.",
  },
  {
    n: "3",
    title: "Export, then commit",
    body: "Download the SVG, drop it in your repo, and reference it with a standard markdown image tag — GitHub renders the animation as-is.",
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-[1200px] mx-auto px-6" id="how">
      <div className="bg-zinc-100 py-16 mb-20 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="max-w-[560px] mb-8">
                <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400 mb-3">
                  <span aria-hidden="true" className="w-[6px] h-[6px] bg-zinc-400" />
                  Under the hood
                </div>
                <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight">
                  How it renders
                </h2>
              </div>
              <div className="flex flex-col gap-8">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-5 items-start">
                    <div className="w-8 h-8 bg-white border border-zinc-200 flex items-center justify-center font-mono text-xs font-semibold flex-shrink-0 mt-0.5">
                      {s.n}
                    </div>
                    <div>
                      <h4 className="text-[15px] font-semibold mb-1.5">{s.title}</h4>
                      <p className="text-sm text-zinc-500 leading-[1.7]">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-950 p-7 font-mono text-[13px] leading-[2] text-zinc-200 border border-white/[0.06] md:sticky md:top-6">
              <div className="text-zinc-600"># README.md</div>
              <div className="text-green-400">![banner](./banner.svg)</div>
              <br />
              <div className="text-zinc-600">
                &lt;!-- that&apos;s it — no build step,
              </div>
              <div className="text-zinc-600">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;no external image host,
              </div>
              <div className="text-zinc-600">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;no action to keep running --&gt;
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
