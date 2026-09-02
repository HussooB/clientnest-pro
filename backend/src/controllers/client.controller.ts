import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { clientSchema } from "../validators/client.validator";
import type { Client, ClientStatus } from "@prisma/client";

type ClientWithContacts = Client & {
  contacts: typeof import("@prisma/client").Contact[];
};

export async function listClients(req: Request, res: Response): Promise<void> {
  const { includeDeleted } = req.query;
  const isAdmin = req.user?.role === "Admin";

  if (includeDeleted === "true" && !isAdmin) {
    throw new ApiError(403, "Only Admins can view deleted clients");
  }

  const where: { deletedAt?: null } = {};
  if (includeDeleted !== "true") {
    where.deletedAt = null;
  }

  const clients = await prisma.client.findMany({
    where,
    include: { contacts: true },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: clients,
  });
}

export async function getClient(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: { contacts: true },
  });

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  res.status(200).json({
    success: true,
    data: client,
  });
}

export async function createClient(req: Request, res: Response): Promise<void> {
  const input = clientSchema.parse(req.body);

  const client = await prisma.client.create({
    data: {
      ...input,
      status: (input.status as ClientStatus) || "Prospect",
    },
    include: { contacts: true },
  });

  res.status(201).json({
    success: true,
    data: client,
  });
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const input = clientSchema.parse(req.body);

  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Client not found");
  }

  const client = await prisma.client.update({
    where: { id },
    data: input,
    include: { contacts: true },
  });

  res.status(200).json({
    success: true,
    data: client,
  });
}

export async function deleteClient(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const isAdmin = req.user?.role === "Admin";

  if (!isAdmin) {
    throw new ApiError(403, "Only Admins can delete clients");
  }

  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Client not found");
  }

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({
    success: true,
    data: { message: "Client soft-deleted" },
  });
}

export async function addContact(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, email, phone, contactType, notifyEmail } = req.body;

  const client = await prisma.client.findUnique({
    where: { id, deletedAt: null },
  });

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      contactType,
      notifyEmail: notifyEmail ?? true,
      clientId: id,
    },
  });

  res.status(201).json({
    success: true,
    data: contact,
  });
}

export async function updateContact(req: Request, res: Response): Promise<void> {
  const { id, contactId } = req.params;
  const { name, email, phone, contactType, notifyEmail } = req.body;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact || contact.clientId !== id) {
    throw new ApiError(404, "Contact not found");
  }

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      contactType,
      notifyEmail: notifyEmail ?? true,
    },
  });

  res.status(200).json({
    success: true,
    data: updated,
  });
}

export async function deleteContact(req: Request, res: Response): Promise<void> {
  const { id, contactId } = req.params;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact || contact.clientId !== id) {
    throw new ApiError(404, "Contact not found");
  }

  await prisma.contact.delete({
    where: { id: contactId },
  });

  res.status(200).json({
    success: true,
    data: { message: "Contact deleted" },
  });
}
