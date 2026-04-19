import { Router } from "express";
import { z } from "zod";
import { loginUser, registerUser } from "../services/auth.service.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const schema = z.object({
      tenantName: z.string().min(2),
      tenantSlug: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const body = schema.parse(req.body);
    const result = await registerUser(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const body = schema.parse(req.body);
    const result = await loginUser(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
