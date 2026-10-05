"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// The worker is copied to public/ on npm install (scripts/copy-maplibre-worker.mjs).
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Free vector map from OpenFreeMap (OpenStreetMap data). No API key, no usage limits.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
// Denmark incl. Bornholm, shown when there's no point yet.
const DENMARK: [[number, number], [number, number]] = [
  [8, 54.5],
  [15.2, 57.8],
];
const RUST = "#ba4e2f";
// Radius of the area shown when the point is only a postal code's centre.
const AREA_RADIUS_M = 1200;

const LOCALE = {
  "NavigationControl.ZoomIn": "Zoom ind",
  "NavigationControl.ZoomOut": "Zoom ud",
  "NavigationControl.ResetBearing": "Nulstil retning",
  "CooperativeGesturesHandler.WindowsHelpText": "Hold Ctrl nede og scroll for at zoome",
  "CooperativeGesturesHandler.MacHelpText": "Hold ⌘ nede og scroll for at zoome",
  "CooperativeGesturesHandler.MobileHelpText": "Brug to fingre for at flytte kortet",
};

export type MapPoint = { latitude: number; longitude: number };

// A circle of `radius` metres around the point, as a GeoJSON polygon.
function circle({ latitude, longitude }: MapPoint, radius: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((latitude * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    coords.push([longitude + dLng * Math.cos(a), latitude + dLat * Math.sin(a)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

/**
 * Map with an optional point. `exact` shows a pin; otherwise a shaded area, since the point is
 * only approximate. With `onPick` the user can click the map or drag the pin to choose a spot.
 * Loaded through LazyMap, as maplibre-gl only runs in the browser.
 */
export default function MapView({
  point,
  exact = true,
  onPick,
  label,
}: {
  point: MapPoint | null;
  exact?: boolean;
  onPick?: (point: MapPoint) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // The latest callback, so the map's listeners don't need re-binding on every render.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });
  const pickable = Boolean(onPick);

  // Create the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE_URL,
      bounds: DENMARK,
      fitBoundsOptions: { padding: 20 },
      attributionControl: { compact: true },
      // On a page you scroll through, don't let the map steal the scroll wheel.
      cooperativeGestures: !pickable,
      locale: LOCALE,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    if (pickable) {
      map.on("click", (e) => onPickRef.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
      map.getCanvas().style.cursor = "crosshair";
    }
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [pickable]);

  // Show the point: a pin, or an area when it's approximate.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRef.current?.remove();
    markerRef.current = null;

    function showArea() {
      const data = point && !exact ? circle(point, AREA_RADIUS_M) : { type: "FeatureCollection" as const, features: [] };
      const source = map!.getSource<maplibregl.GeoJSONSource>("area");
      if (source) return source.setData(data);
      map!.addSource("area", { type: "geojson", data });
      map!.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": RUST, "fill-opacity": 0.15 } });
      map!.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": RUST, "line-width": 2 } });
    }
    if (map.isStyleLoaded()) showArea();
    else map.once("load", showArea);

    if (!point) return;
    const lngLat: [number, number] = [point.longitude, point.latitude];

    if (exact) {
      const marker = new maplibregl.Marker({ color: RUST, draggable: pickable }).setLngLat(lngLat).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onPickRef.current?.({ latitude: lat, longitude: lng });
      });
      markerRef.current = marker;
    }
    // Keep the zoom if the user is already close (e.g. after dragging the pin).
    map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), exact ? 15 : 12), duration: 600 });
  }, [point?.latitude, point?.longitude, exact, pickable]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />;
}
