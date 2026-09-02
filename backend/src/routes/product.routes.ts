import { Router } from "express";
import { Role } from "@prisma/client";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
} from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

router.get("/", authenticate, listProducts);
router.get("/:id", authenticate, getProduct);
router.post("/", authenticate, requireRole(Role.Admin, Role.Sales), createProduct);
router.put("/:id", authenticate, requireRole(Role.Admin, Role.Sales), updateProduct);

export default router;