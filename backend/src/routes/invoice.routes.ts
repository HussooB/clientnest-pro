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
  recordPayment,      // ✅ Add these imports
  issueCreditNote,    // ✅
} from "../controllers/invoice.controller";

const router = Router();

router.use(authenticate);

router.get("/", listInvoices);
// ✅ FIX: Move SOA route BEFORE /:id to prevent route collision
router.get("/:id/soa", getStatementOfAccount); 
router.get("/:id", getInvoice);
router.post("/", requireRole("Admin", "Finance"), createInvoice);
router.put("/:id", requireRole("Admin", "Finance"), updateInvoice);
router.delete("/:id", requireRole("Admin"), deleteInvoice);

// ✅ ADD THESE NEW ROUTES
router.post("/:id/payments", requireRole("Admin", "Finance"), recordPayment);
router.post("/:id/credit-notes", requireRole("Admin", "Finance"), issueCreditNote);

export default router;