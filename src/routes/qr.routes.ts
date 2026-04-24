import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

import {
  createQrCode,
  getQrCodes,
  updateQrCode,
  getQrPngBufferForCodeId,
  getQrCodeById,
  deleteQrCode,
} from "../services/qr.service.js";

const router = Router();

router.use(requireAuth);

const designJsonSchema = z.object({
  contentType: z.string().optional(),
  design: z
    .object({
      style: z.enum(["square", "dots", "rounded"]).optional(),
      colorDark: z.string().optional(),
      colorLight: z.string().optional(),
      logo: z.string().optional(),
    })
    .optional(),
});

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const qrCodes = await getQrCodes(req.auth!.tenantId);
    res.json(qrCodes);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      targetUrl: z.string().url(),
      type: z.enum(["static", "dynamic"]).optional(),
      designJson: designJsonSchema.optional(),
    });

    const body = schema.parse(req.body);

    const qrCode = await createQrCode({
      tenantId: req.auth!.tenantId,
      createdBy: req.auth!.userId,
      ...body,
    });

    res.json(qrCode);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const qrCodeId = String(req.params.id);
    const qrCode = await getQrCodeById(req.auth!.tenantId, qrCodeId);
    res.json(qrCode);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res, next) => {
  try {
    const qrCodeId = String(req.params.id);

    const schema = z.object({
      name: z.string().optional(),
      targetUrl: z.string().url().optional(),
      status: z.enum(["active", "archived", "disabled"]).optional(),
      designJson: designJsonSchema.optional(),
    });

    const body = schema.parse(req.body);

    const qrCode = await updateQrCode({
      tenantId: req.auth!.tenantId,
      qrCodeId,
      ...body,
    });

    res.json(qrCode);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/image", async (req: AuthRequest, res, next) => {
  try {
    const qrCodeId = String(req.params.id);

    const pngBuffer = await getQrPngBufferForCodeId(
      req.auth!.tenantId,
      qrCodeId,
    );

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="qr-${qrCodeId}.png"`,
    );

    return res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    const qrCodeId = String(req.params.id);
    const result = await deleteQrCode(req.auth!.tenantId, qrCodeId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
