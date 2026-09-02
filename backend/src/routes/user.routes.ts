import { Router } from "express";
import { Role } from "@prisma/client";
import { listUsers } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

router.get("/", authenticate, requireRole(Role.Admin), listUsers);

export default router;
