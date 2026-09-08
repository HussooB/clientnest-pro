import { Router } from "express";
import { Role } from "@prisma/client";
import {
  listContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  uploadContractFile,
} from "../controllers/contract.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import multer from "multer";

const router = Router();
const upload = multer({ dest: "uploads/contracts/" });

router.use(authenticate);

router.get("/", listContracts);
router.get("/:id", getContract);
router.post("/", requireRole(Role.Admin, Role.Sales, Role.Finance), createContract);
router.put("/:id", requireRole(Role.Admin, Role.Sales, Role.Finance), updateContract);
router.delete("/:id", requireRole(Role.Admin), deleteContract);
router.post("/:id/upload", requireRole(Role.Admin, Role.Sales, Role.Finance), upload.single("file"), uploadContractFile);

export default router;