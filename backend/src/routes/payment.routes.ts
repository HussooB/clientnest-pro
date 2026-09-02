import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { listPayments, createPayment } from "../controllers/payment.controller";

const router = Router();

router.use(authenticate);

router.get("/", listPayments);
router.post("/", requireRole("Admin", "Finance"), createPayment);

export default router;
