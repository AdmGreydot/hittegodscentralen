// Reverse geocoding and postal code lookup for Denmark via Nominatim (OpenStreetMap). DAWA, which
// this used before, closed on 1 October 2026. Works in both server and client code.
// Nominatim's usage policy: at most 1 request per second and an identifying User-Agent or Referer
// (browsers send the Referer themselves). See https://operations.osmfoundation.org/policies/nominatim/

export type ReverseGeocodeResult = {
  postalCode: string; // "8230"
  city: string; // "Aarhus" (town, city or village)
  municipality: string | null; // "Aarhus", without "Kommune"
  region: string | null; // "Region Midtjylland", same format as items.region
  // Nearest street address, e.g. "J. Skjoldborgs Vej 57". Null when the nearest address is
  // too far away to describe the spot (a forest, a beach, a field).
  address: string | null;
  distanceMeters: number; // from the given point to that nearest address
};

// Further than this from any address, and the address would be misleading.
const MAX_ADDRESS_DISTANCE_M = 150;

const NOMINATIM = "https://nominatim.openstreetmap.org";
// Sent from the server; in the browser it can't be set, and the Referer identifies us instead.
const USER_AGENT = "Hittegodscentralen/1.0 (info@hittegodscentralen.dk)";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
};

type NominatimPlace = { lat: string; lon: string; address?: NominatimAddress };

// OSM names that don't just end in " Kommune".
const MUNICIPALITY_NAMES: Record<string, string> = {
  "Københavns Kommune": "København",
  "Bornholms Regionskommune": "Bornholm",
};

// "Aarhus Kommune" → "Aarhus", the format items.municipality uses (and DAWA used).
export function municipalityName(osmName: string | undefined) {
  if (!osmName) return null;
  return MUNICIPALITY_NAMES[osmName] ?? osmName.replace(/ Kommune$/, "");
}

async function nominatim(path: string, params: Record<string, string>, signal?: AbortSignal) {
  const url = new URL(path, NOMINATIM);
  url.search = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "da",
    ...params,
  }).toString();
  const headers = typeof window === "undefined" ? { "User-Agent": USER_AGENT } : undefined;
  const res = await fetch(url, { headers, signal: signal ?? AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return res.json();
}

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
 * Turns coordinates into postal code, city and (when the point is close to one) a street
 * address. Returns null if the point isn't in Denmark or the lookup fails.
 *
 * @example
 * const place = await reverseGeocode(56.15854, 10.14602);
 * // { postalCode: "8230", city: "Aarhus", municipality: "Aarhus",
 * //   region: "Region Midtjylland", address: "J. Skjoldborgs Vej 57", distanceMeters: 0 }
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let data: NominatimPlace | null;
  try {
    data = await nominatim(
      "/reverse",
      { lat: String(latitude), lon: String(longitude), zoom: "18" },
      signal,
    );
  } catch {
    return null;
  }

  // Outside Denmark, or nothing found (e.g. out at sea).
  const a = data?.address;
  if (!data || !a || a.country_code !== "dk" || !a.postcode) return null;

  const distance = Math.round(
    distanceInMeters(latitude, longitude, Number(data.lat), Number(data.lon)),
  );
  const street = a.road && a.house_number ? `${a.road} ${a.house_number}` : null;

  return {
    postalCode: a.postcode,
    city: a.city ?? a.town ?? a.village ?? a.suburb ?? a.hamlet ?? "",
    municipality: municipalityName(a.municipality),
    region: a.state ?? null,
    address: distance <= MAX_ADDRESS_DISTANCE_M ? street : null,
    distanceMeters: distance,
  };
}

// Municipality and an approximate centre point for a Danish postal code. Null if not found.
export async function lookupPostalCode(postalCode: string) {
  if (!/^\d{4}$/.test(postalCode)) return null;
  try {
    const results: NominatimPlace[] | null = await nominatim("/search", {
      postalcode: postalCode,
      country: "dk",
      limit: "1",
    });
    const place = results?.[0];
    if (!place) return null;
    return {
      municipality: municipalityName(place.address?.municipality),
      latitude: Number(place.lat),
      longitude: Number(place.lon),
    };
  } catch {
    return null;
  }
}
