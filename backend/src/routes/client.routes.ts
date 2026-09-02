import { Router } from "express";
import { Role } from "@prisma/client";
import { listClients, getClient, createClient, updateClient, deleteClient, addContact, updateContact, deleteContact } from "../controllers/client.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

// All authenticated users can read
router.get("/", authenticate, listClients);
router.get("/:id", authenticate, getClient);

// Only Admin and Sales can write
router.post("/", authenticate, requireRole(Role.Admin, Role.Sales), createClient);
router.put("/:id", authenticate, requireRole(Role.Admin, Role.Sales), updateClient);
router.delete("/:id", authenticate, deleteClient); // Admin only (checked in controller)

// Contact management - Admin/Sales only
router.post("/:id/contacts", authenticate, requireRole(Role.Admin, Role.Sales), addContact);
router.patch("/:id/contacts/:contactId", authenticate, requireRole(Role.Admin, Role.Sales), updateContact);
router.delete("/:id/contacts/:contactId", authenticate, requireRole(Role.Admin, Role.Sales), deleteContact);

export default router;
