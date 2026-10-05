// maplibre-gl 6 runs its map rendering in a worker that it loads by URL, and Next's bundler
// doesn't pick that file up. Copy the worker (and the shared chunk it imports) to public/, so
// MapView can point at /maplibre/maplibre-gl-worker.mjs. Runs on every npm install (postinstall),
// so the files always match the installed version.
import { copyFileSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist";
const to = "public/maplibre";
mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(`${from}/${file}`, `${to}/${file}`);
}
