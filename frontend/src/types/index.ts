// ── ClientNest Pro domain types (SRS CRM-ITD, Modules A–I) ──────────────

export type Role = "Admin" | "Finance" | "Support" | "Sales";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

// Module A — Leads
export type LeadStage = "New" | "Contacted" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type LostReason = "Price" | "Competitor" | "Timing" | "No Budget" | "Other";

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: string;
  estimatedValue: number;
  stage: LeadStage;
  lostReason?: LostReason | null;
  notes?: string;
  createdAt: string;
}

// Module B — Clients & Contacts
export type ClientStatus = "Prospect" | "Active" | "OnHold" | "Churned";
export type HostingCycle = "Monthly" | "Quarterly" | "Annual";
export type ContactType = "Technical" | "Billing" | "Executive";

export interface Client {
  id: string;
  companyName: string;
  taxId: string;
  billingAddress: string;
  industryType: string;
  status: ClientStatus;
  accountOwnerId: string;
  taxRatePct: number;
  hostingFeeAmount: number;
  hostingCycle: HostingCycle;
  isDeleted?: boolean;
  createdAt: string;
}

export interface ClientRow extends Client {
  ownerName: string;
  contactsCount: number;
  licensesCount: number;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  contactType: ContactType;
  notifyEmail: boolean;
  createdAt: string;
}

// Module C — Products & Licenses
export type LicenseType = "Perpetual" | "Subscription" | "Leased";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
}

export interface License {
  id: string;
  clientId: string;
  productId: string;
  type: LicenseType;
  startDate: string;
  endDate: string | null;
  seats: number;
  monthlyValue: number;
  createdAt: string;
}

export interface LicenseRow extends License {
  clientName: string;
  productName: string;
  daysToExpiry: number | null;
}

// Module D — Financials
export type InvoiceStatus = "Draft" | "Sent" | "PartiallyPaid" | "Paid" | "Overdue";
export type PaymentMethod = "Bank Transfer" | "Card" | "Cash" | "Cheque";
export type PaymentCategory = "Hosting" | "Maintenance" | "Upgrade" | "License";

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRatePct: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  isDeleted?: boolean;
  createdAt: string;
}

export interface InvoiceRow extends Invoice {
  clientName: string;
  paid: number;
  credits: number;
  balance: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  category: PaymentCategory;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

// Module F — Support tickets
export type TicketPriority = "Low" | "Medium" | "High" | "Critical";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export interface Ticket {
  id: string;
  ref: string;
  clientId: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface TicketRow extends Ticket {
  clientName: string;
  assigneeName: string;
  minutesTotal: number;
}

export interface TimeLog {
  id: string;
  ticketId: string;
  userId: string;
  userName?: string;
  minutes: number;
  note?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  name: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

// Module I — Audit trail
export type EntityType =
  | "Lead" | "Client" | "Contact" | "License" | "Invoice"
  | "Payment" | "CreditNote" | "Ticket" | "User";

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  before: unknown;
  after: unknown;
}

// Reporting / activity
export interface ActivityItem {
  id: string;
  kind: "payment" | "invoice" | "ticket" | "license" | "credit" | "client";
  title: string;
  detail: string;
  at: string;
}

export interface OverdueHostingRow {
  clientId: string;
  companyName: string;
  amount: number;
  cycle: HostingCycle;
  daysOverdue: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Option constants ────────────────────────────────────────────────────
export const ROLES: Role[] = ["Admin", "Finance", "Support", "Sales"];
export const STAGES: LeadStage[] = ["New", "Contacted", "Proposal", "Negotiation", "Won", "Lost"];
export const SOURCES = ["Website", "Referral", "Cold Call", "Trade Show", "LinkedIn", "Partner"];
export const LOST_REASONS: LostReason[] = ["Price", "Competitor", "Timing", "No Budget", "Other"];
export const CLIENT_STATUSES: ClientStatus[] = ["Prospect", "Active", "OnHold", "Churned"];
export const INDUSTRIES = [
  "Logistics", "Financial Services", "Manufacturing", "Healthcare", "Retail",
  "Energy", "Legal", "Media", "Construction", "Travel", "Education", "Other",
];
export const HOSTING_CYCLES: HostingCycle[] = ["Monthly", "Quarterly", "Annual"];
export const CONTACT_TYPES: ContactType[] = ["Technical", "Billing", "Executive"];
export const LICENSE_TYPES: LicenseType[] = ["Perpetual", "Subscription", "Leased"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["Draft", "Sent", "PartiallyPaid", "Paid", "Overdue"];
export const PAYMENT_METHODS: PaymentMethod[] = ["Bank Transfer", "Card", "Cash", "Cheque"];
export const PAYMENT_CATEGORIES: PaymentCategory[] = ["Hosting", "Maintenance", "Upgrade", "License"];
export const TICKET_STATUSES: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];
export const TICKET_PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Critical"];
export const ENTITY_TYPES: EntityType[] = [
  "Lead", "Client", "Contact", "License", "Invoice", "Payment", "CreditNote", "Ticket", "User",
];
