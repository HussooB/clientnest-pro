import { Router } from "express";
import { Role } from "@prisma/client";
import { listLeads, getLead, createLead, updateLead, convertLead, markLeadLost } from "../controllers/lead.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

// All authenticated users can read
router.get("/", authenticate, listLeads);
router.get("/:id", authenticate, getLead);

// Only Admin and Sales can write/convert
router.post("/", authenticate, requireRole(Role.Admin, Role.Sales), createLead);
router.patch("/:id", authenticate, requireRole(Role.Admin, Role.Sales), updateLead);
router.post("/:id/convert", authenticate, requireRole(Role.Admin, Role.Sales), convertLead);
router.post("/:id/lost", authenticate, requireRole(Role.Admin, Role.Sales), markLeadLost);

export default router;
