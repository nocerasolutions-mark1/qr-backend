import { prisma } from "../db/prisma.js";
import { hashIp } from "../utils/hash.js";
import { lookupGeo } from "../utils/geo.js";
import UAParser from "ua-parser-js";

export async function logScan(input: {
  tenantId: string;
  qrCodeId: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
}) {
  const parsed = input.userAgent ? UAParser(input.userAgent) : undefined;
  const geo = lookupGeo(input.ip);

  return prisma.scanEvent.create({
    data: {
      tenantId: input.tenantId,
      qrCodeId: input.qrCodeId,
      ipHash: hashIp(input.ip),
      userAgent: input.userAgent,
      referer: input.referer,
      deviceType: parsed?.device.type ?? "desktop",
      os: parsed?.os.name,
      browser: parsed?.browser.name,
      country: geo.country,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
  });
}

export async function getAnalyticsSummary(tenantId: string) {
  const totalScans = await prisma.scanEvent.count({
    where: { tenantId },
  });

  const totalQrCodes = await prisma.qrCode.count({
    where: { tenantId },
  });

  return { totalScans, totalQrCodes };
}

export async function getQrAnalytics(tenantId: string, qrCodeId: string) {
  const totalScans = await prisma.scanEvent.count({
    where: { tenantId, qrCodeId },
  });

  const recentScans = await prisma.scanEvent.findMany({
    where: { tenantId, qrCodeId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      createdAt: true,
      browser: true,
      os: true,
      deviceType: true,
      referer: true,
      country: true,
      city: true,
      latitude: true,
      longitude: true,
    },
  });

  return {
    qrCodeId,
    totalScans,
    recentScans,
  };
}
