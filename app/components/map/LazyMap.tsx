"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

// maplibre-gl is large and needs the browser, so it's only loaded when a map is on screen.
const LazyMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-zinc-200/60 text-zinc-400">
      <MapPin size={28} strokeWidth={1.5} className="animate-pulse" aria-hidden />
    </div>
  ),
});

export default LazyMap;
export type { MapPoint } from "./MapView";
