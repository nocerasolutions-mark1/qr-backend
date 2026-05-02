import maxmind, { CityResponse } from "maxmind";
import path from "path";
import type { Request } from "express";

export interface GeoLocation {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const null_result: GeoLocation = { country: null, city: null, latitude: null, longitude: null };

let reader: Awaited<ReturnType<typeof maxmind.open<CityResponse>>> | null = null;

async function getReader() {
  if (!reader) {
    const dbPath = path.resolve("GeoLite2-City.mmdb");
    reader = await maxmind.open<CityResponse>(dbPath);
  }
  return reader;
}

export function extractClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.headers["x-real-ip"] as string | undefined ?? req.ip;
}

export async function lookupGeo(ip: string | undefined): Promise<GeoLocation> {
  if (!ip) return null_result;

  const stripped = ip.startsWith("::ffff:") ? ip.slice(7) : ip;

  try {
    const db = await getReader();
    const geo = db.get(stripped);
    if (!geo) return null_result;

    return {
      country: geo.country?.iso_code ?? null,
      city: geo.city?.names?.en ?? null,
      latitude: geo.location?.latitude ?? null,
      longitude: geo.location?.longitude ?? null,
    };
  } catch {
    return null_result;
  }
}
