import { Router } from "express";
import { Role } from "@prisma/client";
import { listUsers, createUser, updateUser } from "../controllers/user.controller"; // ✅ Import createUser
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

router.get("/", authenticate, requireRole(Role.Admin), listUsers);
router.post("/", authenticate, requireRole(Role.Admin), createUser); // ✅ ADD THIS NEW ROUTE
router.put("/:id", authenticate, requireRole(Role.Admin), updateUser);

export default router;