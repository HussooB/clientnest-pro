import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { env } from "../config/env";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  skip: () => env.NODE_ENV === "test",
});

router.post("/login", loginLimiter, login);
router.get("/me", authenticate, getMe);

export default router;
