// Reverse geocoding for Danish coordinates via DAWA (Danmarks Adressers Web API).
// Works in both server and client code (DAWA allows browser requests).

export type ReverseGeocodeResult = {
  postalCode: string; // "8230"
  city: string; // "Åbyhøj" (the postal district name)
  municipality: string | null; // "Aarhus"
  region: string | null; // "Region Midtjylland" — same format as items.region
  // Nearest street address, e.g. "J. Skjoldborgs Vej 57". Null when the nearest address is
  // too far away to describe the spot (a forest, a beach, a field).
  address: string | null;
  distanceMeters: number; // from the given point to that nearest address
};

// Further than this from any address, and the address would be misleading.
const MAX_ADDRESS_DISTANCE_M = 150;
// Further than this, the point isn't in Denmark (DAWA still returns the nearest Danish address).
const MAX_DISTANCE_M = 5000;

type DawaReverseResponse = {
  vejstykke: { navn: string } | null;
  husnr: string | null;
  supplerendebynavn: string | null;
  postnummer: { nr: string; navn: string };
  kommune: { navn: string } | null;
  region: { navn: string } | null;
  adgangspunkt: { koordinater: [number, number] };
};

// Distance in metres between two points (haversine formula).
export function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Turns coordinates into postal code, city and — when the point is close to one — a street
 * address. Returns null if the point isn't in Denmark or the lookup fails.
 *
 * @example
 * const place = await reverseGeocode(56.15854, 10.14602);
 * // { postalCode: "8230", city: "Åbyhøj", municipality: "Aarhus",
 * //   region: "Region Midtjylland", address: "J. Skjoldborgs Vej 57", distanceMeters: 0 }
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let data: DawaReverseResponse;
  try {
    const url = new URL("https://api.dataforsyningen.dk/adgangsadresser/reverse");
    url.searchParams.set("x", String(longitude));
    url.searchParams.set("y", String(latitude));
    const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }

  const [addressLng, addressLat] = data.adgangspunkt.koordinater;
  const distance = Math.round(distanceInMeters(latitude, longitude, addressLat, addressLng));
  if (distance > MAX_DISTANCE_M) return null;

  const street =
    data.vejstykke && data.husnr ? `${data.vejstykke.navn} ${data.husnr}` : null;

  return {
    postalCode: data.postnummer.nr,
    city: data.postnummer.navn,
    municipality: data.kommune?.navn ?? null,
    region: data.region?.navn ?? null,
    address: distance <= MAX_ADDRESS_DISTANCE_M ? street : null,
    distanceMeters: distance,
  };
}
