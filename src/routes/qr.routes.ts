import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import {
  createQrCode,
  getQrCodes,
  updateQrCode,
} from "../services/qr.service.js";
import {
  createQrCode,
  getQrCodes,
  updateQrCode,
  getQrPngBufferForCodeId,
} from "../services/qr.service.js";

const router = Router();
router.use(requireAuth);

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
      designJson: z.unknown().optional(),
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

router.patch("/:id", async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      targetUrl: z.string().url().optional(),
      status: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const qrCode = await updateQrCode({
      tenantId: req.auth!.tenantId,
      qrCodeId: req.params.id,
      ...body,
    });

    res.json(qrCode);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/image", async (req: AuthRequest, res, next) => {
  try {
    const pngBuffer = await getQrPngBufferForCodeId(
      req.auth!.tenantId,
      req.params.id,
    );

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="qr-${req.params.id}.png"`,
    );
    return res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
