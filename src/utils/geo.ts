import geoip from "geoip-lite";
import type { Request } from "express";

export interface GeoLocation {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function extractClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.headers["x-real-ip"] as string | undefined ?? req.ip;
}

export function lookupGeo(ip: string | undefined): GeoLocation {
  if (!ip) return { country: null, city: null, latitude: null, longitude: null };

  const stripped = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const geo = geoip.lookup(stripped);

  if (!geo) return { country: null, city: null, latitude: null, longitude: null };

  return {
    country: geo.country || null,
    city: geo.city || null,
    latitude: geo.ll?.[0] ?? null,
    longitude: geo.ll?.[1] ?? null,
  };
}
