import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { logScan } from "../services/analytics.service.js";

const router = Router();

router.get("/r/:shortPath", async (req, res, next) => {
  try {
    const qrCode = await prisma.qrCode.findUnique({
      where: { shortPath: req.params.shortPath },
    });

    if (!qrCode || qrCode.status !== "active") {
      return res.status(404).send("QR code not found");
    }

    await logScan({
      tenantId: qrCode.tenantId,
      qrCodeId: qrCode.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      referer: req.headers.referer,
    });

    return res.redirect(qrCode.targetUrl);
  } catch (err) {
    next(err);
  }
});

export default router;
