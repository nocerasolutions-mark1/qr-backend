import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import {
  getAnalyticsSummary,
  getQrAnalytics,
} from "../services/analytics.service.js";
const router = Router();
router.use(requireAuth);

router.get("/qr/:id", async (req: AuthRequest, res, next) => {
  try {
    const qrCodeId = String(req.params.id);
    const analytics = await getQrAnalytics(req.auth!.tenantId, qrCodeId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

router.get("/summary", async (req: AuthRequest, res, next) => {
  try {
    const summary = await getAnalyticsSummary(req.auth!.tenantId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
