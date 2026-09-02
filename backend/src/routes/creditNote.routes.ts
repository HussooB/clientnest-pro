import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { listCreditNotes, createCreditNote } from "../controllers/creditNote.controller";

const router = Router();

router.use(authenticate);

router.get("/", listCreditNotes);
router.post("/", requireRole("Admin", "Finance"), createCreditNote);

export default router;
