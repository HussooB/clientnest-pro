import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getStatementOfAccount,
} from "../controllers/invoice.controller";

const router = Router();

router.use(authenticate);

router.get("/", listInvoices);
router.get("/soa/:id", getStatementOfAccount);
router.get("/:id", getInvoice);
router.post("/", requireRole("Admin", "Finance"), createInvoice);
router.put("/:id", requireRole("Admin", "Finance"), updateInvoice);
router.delete("/:id", requireRole("Admin"), deleteInvoice);

export default router;
