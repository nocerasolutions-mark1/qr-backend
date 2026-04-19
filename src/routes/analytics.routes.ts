import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { getAnalyticsSummary } from "../services/analytics.service.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: AuthRequest, res, next) => {
  try {
    const summary = await getAnalyticsSummary(req.auth!.tenantId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
