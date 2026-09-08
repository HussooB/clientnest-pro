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
  recordPayment,
  issueCreditNote,
} from "../controllers/invoice.controller";

const router = Router();

router.use(authenticate);

// ✅ 1. SPECIFIC routes MUST come before generic parameterized routes (/:id)
router.get("/:id/soa", getStatementOfAccount);

// ✅ 2. Generic parameterized route
router.get("/:id", getInvoice);

// ✅ 3. Collection routes
router.get("/", listInvoices);
router.post("/", requireRole("Admin", "Finance"), createInvoice);

// ✅ 4. Action routes
router.put("/:id", requireRole("Admin", "Finance"), updateInvoice);
router.delete("/:id", requireRole("Admin"), deleteInvoice);
router.post("/:id/payments", requireRole("Admin", "Finance"), recordPayment);
router.post("/:id/credit-notes", requireRole("Admin", "Finance"), issueCreditNote);

export default router;