import fs from "fs";
import path from "path";

// Satori embeds these directly into the SVG, so there's no runtime dependency
// on any external font request. Loaded once and cached.
export interface FontEntry {
  name: string;
  data: Buffer;
  weight: number;
  style: "normal" | "italic";
}

let cache: FontEntry[] | null = null;

export function loadFonts(): FontEntry[] {
  if (cache) return cache;

  const fontsDir = path.join(process.cwd(), "assets/fonts");
  cache = [
    {
      name: "Poppins",
      data: fs.readFileSync(path.join(fontsDir, "Poppins-Medium.ttf")),
      weight: 500,
      style: "normal",
    },
    {
      name: "Poppins",
      data: fs.readFileSync(path.join(fontsDir, "Poppins-Regular.ttf")),
      weight: 400,
      style: "normal",
    },
    {
      name: "JetBrains Mono",
      data: fs.readFileSync(path.join(fontsDir, "JetBrainsMono-Regular.ttf")),
      weight: 400,
      style: "normal",
    },
  ];
  return cache;
}
