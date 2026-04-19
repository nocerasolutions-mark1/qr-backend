import { prisma } from "../db/prisma.js";
import { generateQrDataUrl, generateQrSvg } from "../utils/qr.js";
import { makeShortPath } from "../utils/slug.js";
import { env } from "../config/env.js";
import QRCode from "qrcode";

export async function createQrCode(input: {
  tenantId: string;
  name: string;
  targetUrl: string;
  type?: "static" | "dynamic";
  designJson?: unknown;
  createdBy?: string;
}) {
  const shortPath = makeShortPath();
  const redirectUrl = `${env.appBaseUrl}/r/${shortPath}`;
  const type = input.type ?? "dynamic";

  const imageUrl = await generateQrDataUrl(
    type === "static" ? input.targetUrl : redirectUrl,
  );

  return prisma.qrCode.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      slug: makeShortPath(10),
      type,
      targetUrl: input.targetUrl,
      shortPath,
      status: "active",
      designJson: input.designJson as object | undefined,
      imageUrl,
      createdBy: input.createdBy,
    },
  });
}

export async function getQrPngBufferForCodeId(
  tenantId: string,
  qrCodeId: string,
): Promise<Buffer> {
  const qrCode = await prisma.qrCode.findFirst({
    where: {
      id: qrCodeId,
      tenantId,
    },
  });

  if (!qrCode) {
    throw new Error("QR code not found");
  }

  const qrContent =
    qrCode.type === "static"
      ? qrCode.targetUrl
      : `${env.appBaseUrl}/r/${qrCode.shortPath}`;

  return QRCode.toBuffer(qrContent, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
    type: "png",
  });
}

export async function getQrCodes(tenantId: string) {
  return prisma.qrCode.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateQrCode(input: {
  tenantId: string;
  qrCodeId: string;
  name?: string;
  targetUrl?: string;
  status?: string;
}) {
  const existing = await prisma.qrCode.findFirst({
    where: { id: input.qrCodeId, tenantId: input.tenantId },
  });

  if (!existing) {
    throw new Error("QR code not found");
  }

  return prisma.qrCode.update({
    where: { id: input.qrCodeId },
    data: {
      name: input.name,
      targetUrl: input.targetUrl,
      status: input.status,
    },
  });
}

export async function getQrSvgForCode(shortPath: string) {
  const qrCode = await prisma.qrCode.findUnique({
    where: { shortPath },
  });

  if (!qrCode) {
    throw new Error("QR not found");
  }

  const url =
    qrCode.type === "static"
      ? qrCode.targetUrl
      : `${env.appBaseUrl}/r/${shortPath}`;

  return generateQrSvg(url);
}
