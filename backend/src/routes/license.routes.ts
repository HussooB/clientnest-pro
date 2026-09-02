import { Router } from "express";
import { Role } from "@prisma/client";
import {
  listLicenses,
  getLicense,
  createLicense,
  updateLicense,
} from "../controllers/license.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

router.get("/", authenticate, listLicenses);
router.get("/:id", authenticate, getLicense);
router.post("/", authenticate, requireRole(Role.Admin, Role.Sales), createLicense);
router.put("/:id", authenticate, requireRole(Role.Admin, Role.Sales), updateLicense);

export default router;