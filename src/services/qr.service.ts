import { prisma } from "../db/prisma.js";
import { generateQrDataUrl, generateQrSvg } from "../utils/qr.js";
import { makeShortPath } from "../utils/slug.js";
import { env } from "../config/env.js";
import { JSDOM } from "jsdom";
import nodeCanvas from "canvas";
import QRCodeStyling from "qr-code-styling";

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

async function logoUrlToDataUrl(logoUrl?: string): Promise<string | undefined> {
  if (!logoUrl || !logoUrl.startsWith("http")) return undefined;

  try {
    const response = await fetch(logoUrl);

    if (!response.ok) {
      console.warn("Logo fetch failed:", response.status, logoUrl);
      return undefined;
    }

    const contentType = response.headers.get("content-type") || "image/png";

    if (!contentType.startsWith("image/")) {
      console.warn("Logo URL is not an image:", contentType, logoUrl);
      return undefined;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.warn("Logo fetch error:", err);
    return undefined;
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
  const logoDataUrl = await logoUrlToDataUrl(design?.logo);

  const qrCodeStyling = new (QRCodeStyling as any)({
    width: 800,
    height: 800,
    type: "png",
    data: getQrContent(qrCode),
    image: logoDataUrl,
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
    imageOptions: {
      margin: 10,
      imageSize: 0.28,
      hideBackgroundDots: true,
    },
  });

  const rawData = await qrCodeStyling.getRawData("png");

  return Buffer.from(rawData as ArrayBuffer);
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
