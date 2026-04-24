import { prisma } from "../db/prisma.js";
import { generateQrDataUrl, generateQrSvg } from "../utils/qr.js";
import { makeShortPath } from "../utils/slug.js";
import { env } from "../config/env.js";
import { JSDOM } from "jsdom";
import nodeCanvas from "canvas";
import QRCodeStyling from "qr-code-styling";
import sharp from "sharp";

type QrDesignJson = {
  contentType?: string;
  design?: {
    style?: "square" | "dots" | "rounded";
    colorDark?: string;
    colorLight?: string;
    logo?: string;
  };
};

function getQrContent(qrCode: {
  type: string;
  targetUrl: string;
  shortPath: string;
}) {
  return qrCode.type === "static"
    ? qrCode.targetUrl
    : `${env.appBaseUrl}/r/${qrCode.shortPath}`;
}

function getDotsType(style?: string) {
  if (style === "dots") return "dots";
  if (style === "rounded") return "rounded";
  return "square";
}

async function getLogoBuffer(logo?: string): Promise<Buffer | undefined> {
  if (!logo) return undefined;

  try {
    if (logo.startsWith("data:image/")) {
      const base64 = logo.split(",")[1];
      return Buffer.from(base64, "base64");
    }

    if (logo.startsWith("http")) {
      const response = await fetch(logo);
      if (!response.ok) return undefined;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return undefined;
  } catch (err) {
    console.warn("Logo parse/fetch error:", err);
    return undefined;
  }
}

async function overlayLogoOnQr(qrBuffer: Buffer, logo?: string) {
  const logoBuffer = await getLogoBuffer(logo);

  if (!logoBuffer) return qrBuffer;

  try {
    const logoSize = 160;

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, {
        fit: "contain",
      })
      .png()
      .toBuffer();

    return sharp(qrBuffer)
      .composite([
        {
          input: resizedLogo,
          gravity: "center",
        },
      ])
      .png()
      .toBuffer();
  } catch (err) {
    console.warn("Logo overlay failed:", err);
    return qrBuffer;
  }
}

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

  const designJson = qrCode.designJson as QrDesignJson | null;
  const design = designJson?.design;

  const qrCodeStyling = new (QRCodeStyling as any)({
    width: 800,
    height: 800,
    type: "png",
    data: getQrContent(qrCode),
    margin: 24,
    jsdom: JSDOM,
    nodeCanvas,
    qrOptions: {
      errorCorrectionLevel: "H",
    },
    dotsOptions: {
      color: design?.colorDark || "#000000",
      type: getDotsType(design?.style) as any,
    },
    backgroundOptions: {
      color: design?.colorLight || "#ffffff",
    },
    cornersSquareOptions: {
      type: design?.style === "rounded" ? "extra-rounded" : "square",
      color: design?.colorDark || "#000000",
    },
    cornersDotOptions: {
      type: design?.style === "dots" ? "dot" : "square",
      color: design?.colorDark || "#000000",
    },
  });

  const rawData = await qrCodeStyling.getRawData("png");
  const qrBuffer = Buffer.from(rawData as ArrayBuffer);

  return overlayLogoOnQr(qrBuffer, design?.logo);
}

export async function getQrCodes(tenantId: string) {
  return prisma.qrCode.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          scanEvents: true,
        },
      },
    },
  });
}

export async function updateQrCode(input: {
  tenantId: string;
  qrCodeId: string;
  name?: string;
  targetUrl?: string;
  status?: string;
  designJson?: unknown;
}) {
  const existing = await prisma.qrCode.findFirst({
    where: { id: input.qrCodeId, tenantId: input.tenantId },
  });

  if (!existing) {
    throw new Error("QR code not found");
  }

  if (
    existing.type === "static" &&
    input.targetUrl &&
    input.targetUrl !== existing.targetUrl
  ) {
    throw new Error("Static QR target URL cannot be edited");
  }

  return prisma.qrCode.update({
    where: { id: input.qrCodeId },
    data: {
      name: input.name,
      targetUrl: input.targetUrl,
      status: input.status,
      designJson: input.designJson as object | undefined,
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

  return generateQrSvg(getQrContent(qrCode));
}

export async function getQrCodeById(tenantId: string, qrCodeId: string) {
  const qrCode = await prisma.qrCode.findFirst({
    where: {
      id: qrCodeId,
      tenantId,
    },
  });

  if (!qrCode) {
    throw new Error("QR code not found");
  }

  return qrCode;
}

export async function deleteQrCode(tenantId: string, qrCodeId: string) {
  const existing = await prisma.qrCode.findFirst({
    where: {
      id: qrCodeId,
      tenantId,
    },
  });

  if (!existing) {
    throw new Error("QR code not found");
  }

  await prisma.qrCode.delete({
    where: { id: qrCodeId },
  });

  return { success: true };
}
