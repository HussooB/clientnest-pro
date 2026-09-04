import { Router } from "express";
import { Role } from "@prisma/client";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  addTimeLog,
} from "../controllers/ticket.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

// All authenticated users can read tickets (RBAC handled in controller if needed)
router.get("/", authenticate, listTickets);
router.get("/:id", authenticate, getTicket);

// Admin and Support can create/update tickets
router.post("/", authenticate, requireRole(Role.Admin, Role.Support), createTicket);
router.put("/:id", authenticate, requireRole(Role.Admin, Role.Support), updateTicket);

// Add time log (Admin/Support only)
router.post("/:id/time-logs", authenticate, requireRole(Role.Admin, Role.Support), addTimeLog);

export default router;