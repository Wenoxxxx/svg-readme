import fs from "fs";
import path from "path";
import { bannerRenderable } from "./templates/banner";
import { bannerDefaults } from "./templates/banner";
import { renderToSvg } from "./render/render";

// CLI entry point — regenerates output/banner.svg from the default banner.
// The editor (npm run ui) shares the same renderToSvg pipeline.
async function build() {
  const svg = await renderToSvg(bannerRenderable, bannerDefaults);

  const outDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, "banner.svg"), svg);
  console.log("[SUCCESS] banner.svg generated");
}

build().catch((err) => {
  console.error("[ERROR] Build failed:", err);
  process.exit(1);
});
