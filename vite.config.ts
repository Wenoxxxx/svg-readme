import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The editor UI is a Vite SPA rooted at src/ui. In dev the Express server
// (src/server/index.ts) mounts Vite as middleware, so this config is mainly
// used for `npm run build:ui` (produces src/ui/dist served in production mode).
export default defineConfig({
  root: "src/ui",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // The Express server owns the port; Vite runs in middleware mode.
    port: 5174,
    strictPort: true,
  },
});
