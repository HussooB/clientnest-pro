import { Router } from "express";
import { Role } from "@prisma/client";
import {
  listFeatureRequests,
  createFeatureRequest,
  updateFeatureRequest,
  deleteFeatureRequest,
} from "../controllers/featureRequest.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get("/", listFeatureRequests);
router.post("/", requireRole(Role.Admin, Role.Sales, Role.Support), createFeatureRequest);
router.put("/:id", requireRole(Role.Admin, Role.Sales, Role.Support), updateFeatureRequest);
router.delete("/:id", requireRole(Role.Admin), deleteFeatureRequest);

export default router;