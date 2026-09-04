import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

// Define a type that safely inherits your project's custom Express user type
// while guaranteeing that 'sub' can be fetched safely
type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
  };
};

// List tickets with filters
export async function listTickets(req: Request, res: Response): Promise<void> {
  const { status, priority, clientId, assignedTo, page = "1", limit = "10" } = req.query;

  const where: any = {};
  if (typeof status === "string") where.status = status;
  if (typeof priority === "string") where.priority = priority;
  if (typeof clientId === "string") where.clientId = clientId;
  if (typeof assignedTo === "string") where.assignedToId = assignedTo;

  const pageStr = typeof page === "string" ? page : "1";
  const limitStr = typeof limit === "string" ? limit : "10";

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        client: { select: { companyName: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { timeLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(pageStr) - 1) * Number(limitStr),
      take: Number(limitStr),
    }),
    prisma.ticket.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: { tickets, total, page: Number(pageStr), limit: Number(limitStr) },
  });
}

// Get single ticket
export async function getTicket(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (typeof id !== "string") {
    throw new ApiError(400, "Invalid ticket ID format");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      client: true,
      assignedTo: { select: { name: true, email: true } },
      timeLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
    },
  });

  if (!ticket) throw new ApiError(404, "Ticket not found");

  res.status(200).json({ success: true, data: ticket });
}

// Create ticket
export async function createTicket(req: Request, res: Response): Promise<void> {
  const { clientId, subject, description, priority, assignedToId } = req.body;

  if (!clientId || !subject) {
    throw new ApiError(400, "clientId and subject are required");
  }

  // Generate ticket ref (TK-XXXX)
  const count = await prisma.ticket.count();
  const ref = `TK-${1000 + count + 1}`;

  const ticket = await prisma.ticket.create({
    data: {
      ref,
      clientId,
      subject,
      description,
      priority: priority || "Medium",
      assignedToId,
    },
    include: { client: { select: { companyName: true } } },
  });

  res.status(201).json({ success: true, data: ticket });
}

// Update ticket
export async function updateTicket(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, priority, assignedToId, subject, description } = req.body;

  if (typeof id !== "string") {
    throw new ApiError(400, "Invalid ticket ID format");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");

  const updateData: any = {};
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
  if (subject) updateData.subject = subject;
  if (description !== undefined) updateData.description = description;

  // Auto-set first response time
  if (status && status !== "Open" && !ticket.firstResponseAt) {
    updateData.firstResponseAt = new Date();
  }

  // Auto-set resolved time
  if ((status === "Resolved" || status === "Closed") && !ticket.resolvedAt) {
    updateData.resolvedAt = new Date();
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      client: { select: { companyName: true } },
      assignedTo: { select: { name: true } },
    },
  });

  res.status(200).json({ success: true, data: updated });
}

// Add time log
export async function addTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { minutes, note } = req.body;
  const userId = req.user?.sub; 

  if (typeof id !== "string") {
    throw new ApiError(400, "Invalid ticket ID format");
  }

  if (!minutes || minutes <= 0) {
    throw new ApiError(400, "Minutes must be greater than zero");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");

  const timeLog = await prisma.timeLog.create({
    data: {
      ticketId: id,
      userId: userId || "",
      minutes,
      note,
    },
    include: { user: { select: { name: true } } },
  });

  // Auto-set first response if not set
  if (!ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id },
      data: { firstResponseAt: new Date() },
    });
  }

  res.status(201).json({ success: true, data: timeLog });
}
