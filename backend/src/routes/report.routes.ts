import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { getOverdueHosting } from "../controllers/report.controller";

const router = Router();

router.use(authenticate);

router.get("/overdue-hosting", requireRole("Admin", "Finance"), getOverdueHosting);

export default router;
