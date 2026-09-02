import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { getAuditLogs } from "../controllers/audit.controller";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("Admin"), getAuditLogs);

export default router;
