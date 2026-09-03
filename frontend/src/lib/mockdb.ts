import { AxiosError } from "axios";
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { jsPDF } from "jspdf";
import type {
  ActivityItem, Attachment, AuditLog, Client, ClientRow, Contact, CreditNote, EntityType,
  Invoice, InvoiceItem, InvoiceRow, Lead, License, LicenseRow, ListResponse, OverdueHostingRow,
  Payment, Product, Ticket, TicketRow, TimeLog, User,
} from "../types";

// A fully functional in-browser API used whenever the real backend
// (http://localhost:5000/api) is unreachable. Persists to localStorage.

const DB_KEY = "clientnest.db.v1";
const DAY = 86_400_000;

type DbUser = User & { password: string };

interface DB {
  users: DbUser[];
  leads: Lead[];
  clients: Client[];
  contacts: Contact[];
  products: Product[];
  licenses: License[];
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: CreditNote[];
  tickets: Ticket[];
  timeLogs: TimeLog[];
  attachments: Attachment[];
  audit: AuditLog[];
  seq: number;
}

const iso = (t: number) => new Date(t).toISOString();
const ago = (days: number, hours = 0) => iso(Date.now() - days * DAY - hours * 3_600_000);
const ahead = (days: number) => iso(Date.now() + days * DAY);

// ── Seed data ───────────────────────────────────────────────────────────
function seed(): DB {
  const users: DbUser[] = [
    { id: "u1", name: "Ava Stern", email: "admin@clientnest.io", role: "Admin", isActive: true, createdAt: ago(400), password: "nest2025" },
    { id: "u2", name: "Marco Silva", email: "finance@clientnest.io", role: "Finance", isActive: true, createdAt: ago(320), password: "nest2025" },
    { id: "u3", name: "Priya Nair", email: "support@clientnest.io", role: "Support", isActive: true, createdAt: ago(280), password: "nest2025" },
    { id: "u4", name: "Jonas Keller", email: "sales@clientnest.io", role: "Sales", isActive: true, createdAt: ago(260), password: "nest2025" },
  ];

  const products: Product[] = [
    { id: "p1", name: "NestERP Core", sku: "NERP-CORE", category: "ERP", basePrice: 4800 },
    { id: "p2", name: "NestCRM Suite", sku: "NCRM-SUITE", category: "CRM", basePrice: 2400 },
    { id: "p3", name: "HostShield Managed Hosting", sku: "HS-HOST", category: "Hosting", basePrice: 450 },
    { id: "p4", name: "NestBI Analytics", sku: "NBI-ANLYT", category: "BI", basePrice: 3200 },
    { id: "p5", name: "SecureVault Backup", sku: "SV-BKP", category: "Security", basePrice: 900 },
  ];

  const clients: Client[] = [
    { id: "c1", companyName: "Meridian Logistics", taxId: "TX-88231045", billingAddress: "14 Harbor Gate Rd, Rotterdam", industryType: "Logistics", status: "Active", accountOwnerId: "u4", taxRatePct: 15, hostingFeeAmount: 450, hostingCycle: "Monthly", createdAt: ago(380) },
    { id: "c2", companyName: "BlueRock Financial", taxId: "TX-70019822", billingAddress: "200 Canal Street, Amsterdam", industryType: "Financial Services", status: "Active", accountOwnerId: "u4", taxRatePct: 15, hostingFeeAmount: 620, hostingCycle: "Monthly", createdAt: ago(340) },
    { id: "c3", companyName: "Cantex Manufacturing", taxId: "TX-51190347", billingAddress: "8 Foundry Lane, Duisburg", industryType: "Manufacturing", status: "Active", accountOwnerId: "u1", taxRatePct: 15, hostingFeeAmount: 1140, hostingCycle: "Quarterly", createdAt: ago(310) },
    { id: "c4", companyName: "Harborview Dental Group", taxId: "TX-63320981", billingAddress: "45 Marina Blvd, Hamburg", industryType: "Healthcare", status: "Active", accountOwnerId: "u4", taxRatePct: 10, hostingFeeAmount: 260, hostingCycle: "Monthly", createdAt: ago(290) },
    { id: "c5", companyName: "Nordwind Travel", taxId: "TX-40418876", billingAddress: "9 Skyway Ave, Copenhagen", industryType: "Travel", status: "OnHold", accountOwnerId: "u4", taxRatePct: 15, hostingFeeAmount: 0, hostingCycle: "Monthly", createdAt: ago(260) },
    { id: "c6", companyName: "Apexfield Energy", taxId: "TX-91827734", billingAddress: "1 Turbine Way, Oslo", industryType: "Energy", status: "Active", accountOwnerId: "u1", taxRatePct: 15, hostingFeeAmount: 890, hostingCycle: "Monthly", createdAt: ago(240) },
    { id: "c7", companyName: "Quarry Lane Retail", taxId: "TX-30988112", billingAddress: "77 Mill Row, Leeds", industryType: "Retail", status: "Active", accountOwnerId: "u4", taxRatePct: 15, hostingFeeAmount: 930, hostingCycle: "Quarterly", createdAt: ago(220) },
    { id: "c8", companyName: "Silverline Legal", taxId: "TX-20871456", billingAddress: "3 Chancery Ct, London", industryType: "Legal", status: "Prospect", accountOwnerId: "u4", taxRatePct: 15, hostingFeeAmount: 0, hostingCycle: "Monthly", createdAt: ago(24) },
    { id: "c9", companyName: "Orbitale Media", taxId: "TX-66209315", billingAddress: "18 Antenna Sq, Berlin", industryType: "Media", status: "Active", accountOwnerId: "u1", taxRatePct: 15, hostingFeeAmount: 240, hostingCycle: "Monthly", createdAt: ago(180) },
    { id: "c10", companyName: "Trestle Construction", taxId: "TX-11902843", billingAddress: "52 Girder Rd, Antwerp", industryType: "Construction", status: "Churned", accountOwnerId: "u4", taxRatePct: 15, hostingFeeAmount: 0, hostingCycle: "Monthly", createdAt: ago(420) },
  ];

  const contacts: Contact[] = [
    { id: "ct1", clientId: "c1", name: "Willem van Dijk", email: "w.vandijk@meridianlog.example", phone: "+31 6 5511 2231", contactType: "Technical", notifyEmail: true, createdAt: ago(370) },
    { id: "ct2", clientId: "c1", name: "Sofie Brouwer", email: "finance@meridianlog.example", phone: "+31 6 5511 8890", contactType: "Billing", notifyEmail: true, createdAt: ago(370) },
    { id: "ct3", clientId: "c2", name: "Daniel Okoye", email: "d.okoye@bluerock.example", phone: "+31 20 774 2210", contactType: "Executive", notifyEmail: true, createdAt: ago(335) },
    { id: "ct4", clientId: "c2", name: "Lena Fischer", email: "ap@bluerock.example", phone: "+31 20 774 2244", contactType: "Billing", notifyEmail: true, createdAt: ago(330) },
    { id: "ct5", clientId: "c2", name: "Ravi Menon", email: "it@bluerock.example", phone: "+31 20 774 2261", contactType: "Technical", notifyEmail: false, createdAt: ago(300) },
    { id: "ct6", clientId: "c3", name: "Greta Holtmann", email: "g.holtmann@cantex.example", phone: "+49 203 555 0182", contactType: "Technical", notifyEmail: true, createdAt: ago(305) },
    { id: "ct7", clientId: "c3", name: "Paul Brandt", email: "p.brandt@cantex.example", phone: "+49 203 555 0114", contactType: "Executive", notifyEmail: true, createdAt: ago(305) },
    { id: "ct8", clientId: "c4", name: "Dr. Maren Kolb", email: "m.kolb@harborview.example", phone: "+49 40 228 6610", contactType: "Executive", notifyEmail: true, createdAt: ago(285) },
    { id: "ct9", clientId: "c4", name: "Timo Weiss", email: "admin@harborview.example", phone: "+49 40 228 6612", contactType: "Billing", notifyEmail: true, createdAt: ago(280) },
    { id: "ct10", clientId: "c5", name: "Ida Sørensen", email: "ida@nordwind.example", phone: "+45 32 88 71 20", contactType: "Executive", notifyEmail: true, createdAt: ago(255) },
    { id: "ct11", clientId: "c6", name: "Nikolai Berg", email: "n.berg@apexfield.example", phone: "+47 22 90 41 55", contactType: "Technical", notifyEmail: true, createdAt: ago(235) },
    { id: "ct12", clientId: "c6", name: "Kari Aune", email: "kari@apexfield.example", phone: "+47 22 90 41 60", contactType: "Billing", notifyEmail: true, createdAt: ago(235) },
    { id: "ct13", clientId: "c6", name: "Sten Vik", email: "s.vik@apexfield.example", phone: "+47 22 90 41 71", contactType: "Executive", notifyEmail: false, createdAt: ago(220) },
    { id: "ct14", clientId: "c7", name: "Amelia Hart", email: "a.hart@quarrylane.example", phone: "+44 113 496 0821", contactType: "Billing", notifyEmail: true, createdAt: ago(215) },
    { id: "ct15", clientId: "c7", name: "Owen Price", email: "it@quarrylane.example", phone: "+44 113 496 0835", contactType: "Technical", notifyEmail: true, createdAt: ago(210) },
    { id: "ct16", clientId: "c8", name: "Margaux Devereux", email: "m.devereux@silverline.example", phone: "+44 20 7946 0331", contactType: "Executive", notifyEmail: true, createdAt: ago(24) },
    { id: "ct17", clientId: "c9", name: "Jonas Weissbach", email: "j.weissbach@orbitale.example", phone: "+49 30 901 820 44", contactType: "Technical", notifyEmail: true, createdAt: ago(175) },
    { id: "ct18", clientId: "c9", name: "Faye Lindqvist", email: "accounts@orbitale.example", phone: "+49 30 901 820 51", contactType: "Billing", notifyEmail: true, createdAt: ago(175) },
    { id: "ct19", clientId: "c10", name: "Bart Peeters", email: "b.peeters@trestle.example", phone: "+32 3 544 18 70", contactType: "Technical", notifyEmail: false, createdAt: ago(415) },
  ];

  const licenses: License[] = [
    { id: "l1", clientId: "c1", productId: "p1", type: "Subscription", startDate: ago(200), endDate: ahead(21), seats: 25, monthlyValue: 640, createdAt: ago(200) },
    { id: "l2", clientId: "c1", productId: "p5", type: "Subscription", startDate: ago(160), endDate: ahead(50), seats: 25, monthlyValue: 120, createdAt: ago(160) },
    { id: "l3", clientId: "c2", productId: "p2", type: "Subscription", startDate: ago(350), endDate: ahead(12), seats: 40, monthlyValue: 520, createdAt: ago(350) },
    { id: "l4", clientId: "c2", productId: "p4", type: "Perpetual", startDate: ago(300), endDate: null, seats: 10, monthlyValue: 0, createdAt: ago(300) },
    { id: "l5", clientId: "c2", productId: "p5", type: "Subscription", startDate: ago(165), endDate: ahead(200), seats: 40, monthlyValue: 110, createdAt: ago(165) },
    { id: "l6", clientId: "c3", productId: "p1", type: "Subscription", startDate: ago(290), endDate: ahead(78), seats: 60, monthlyValue: 980, createdAt: ago(290) },
    { id: "l7", clientId: "c3", productId: "p5", type: "Leased", startDate: ago(320), endDate: ahead(44), seats: 10, monthlyValue: 95, createdAt: ago(320) },
    { id: "l8", clientId: "c4", productId: "p2", type: "Subscription", startDate: ago(120), endDate: ahead(240), seats: 12, monthlyValue: 260, createdAt: ago(120) },
    { id: "l9", clientId: "c4", productId: "p4", type: "Subscription", startDate: ago(260), endDate: ahead(100), seats: 6, monthlyValue: 140, createdAt: ago(260) },
    { id: "l10", clientId: "c6", productId: "p1", type: "Subscription", startDate: ago(357), endDate: ahead(8), seats: 80, monthlyValue: 1450, createdAt: ago(357) },
    { id: "l11", clientId: "c6", productId: "p4", type: "Subscription", startDate: ago(235), endDate: ahead(130), seats: 15, monthlyValue: 310, createdAt: ago(235) },
    { id: "l12", clientId: "c7", productId: "p2", type: "Subscription", startDate: ago(300), endDate: ahead(65), seats: 18, monthlyValue: 290, createdAt: ago(300) },
    { id: "l13", clientId: "c7", productId: "p5", type: "Perpetual", startDate: ago(210), endDate: null, seats: 18, monthlyValue: 0, createdAt: ago(210) },
    { id: "l14", clientId: "c9", productId: "p2", type: "Subscription", startDate: ago(337), endDate: ahead(28), seats: 8, monthlyValue: 210, createdAt: ago(337) },
    { id: "l15", clientId: "c9", productId: "p5", type: "Subscription", startDate: ago(65), endDate: ahead(300), seats: 8, monthlyValue: 90, createdAt: ago(65) },
    { id: "l16", clientId: "c10", productId: "p1", type: "Perpetual", startDate: ago(410), endDate: null, seats: 30, monthlyValue: 0, createdAt: ago(410) },
  ];

  const items = (invId: string, rows: [string, number, number][]): InvoiceItem[] =>
    rows.map(([description, qty, unitPrice], i) => ({ id: `${invId}-i${i + 1}`, description, qty, unitPrice }));

  const invoices: Invoice[] = [
    { id: "inv1", number: "INV-2025-101", clientId: "c1", issueDate: ago(45), dueDate: ago(30), subtotal: 450, taxRatePct: 15, taxAmount: 67.5, totalAmount: 517.5, status: "Sent", items: items("inv1", [["HostShield managed hosting — monthly", 1, 450]]), createdAt: ago(45) },
    { id: "inv2", number: "INV-2025-117", clientId: "c1", issueDate: ago(20), dueDate: ahead(10), subtotal: 1200, taxRatePct: 15, taxAmount: 180, totalAmount: 1380, status: "Sent", items: items("inv2", [["Quarterly maintenance retainer", 1, 900], ["On-site health check", 1, 300]]), createdAt: ago(20) },
    { id: "inv3", number: "INV-2025-089", clientId: "c2", issueDate: ago(60), dueDate: ago(45), subtotal: 2600, taxRatePct: 15, taxAmount: 390, totalAmount: 2990, status: "Sent", items: items("inv3", [["NestCRM Suite renewal — 40 seats", 1, 2400], ["Data migration service", 1, 200]]), createdAt: ago(60) },
    { id: "inv4", number: "INV-2025-114", clientId: "c2", issueDate: ago(25), dueDate: ahead(5), subtotal: 620, taxRatePct: 15, taxAmount: 93, totalAmount: 713, status: "Sent", items: items("inv4", [["HostShield managed hosting — monthly", 1, 620]]), createdAt: ago(25) },
    { id: "inv5", number: "INV-2025-072", clientId: "c3", issueDate: ago(90), dueDate: ago(75), subtotal: 3400, taxRatePct: 15, taxAmount: 510, totalAmount: 3910, status: "Sent", items: items("inv5", [["NestERP Core — 60 seat expansion", 1, 3000], ["Training workshop", 1, 400]]), createdAt: ago(90) },
    { id: "inv6", number: "INV-2025-121", clientId: "c3", issueDate: ago(70), dueDate: ago(40), subtotal: 1140, taxRatePct: 15, taxAmount: 171, totalAmount: 1311, status: "Sent", items: items("inv6", [["HostShield hosting — quarterly", 1, 1140]]), createdAt: ago(70) },
    { id: "inv7", number: "INV-2025-095", clientId: "c4", issueDate: ago(35), dueDate: ago(20), subtotal: 610, taxRatePct: 10, taxAmount: 61, totalAmount: 671, status: "Sent", items: items("inv7", [["NestCRM subscription — 3 months", 1, 610]]), createdAt: ago(35) },
    { id: "inv8", number: "INV-2025-124", clientId: "c4", issueDate: ago(3), dueDate: ahead(27), subtotal: 260, taxRatePct: 10, taxAmount: 26, totalAmount: 286, status: "Draft", items: items("inv8", [["HostShield managed hosting — monthly", 1, 260]]), createdAt: ago(3) },
    { id: "inv9", number: "INV-2025-108", clientId: "c6", issueDate: ago(25), dueDate: ahead(5), subtotal: 8000, taxRatePct: 15, taxAmount: 1200, totalAmount: 9200, status: "Sent", items: items("inv9", [["NestBI Analytics rollout — phase 2", 1, 6200], ["Dashboard customization", 1, 1300], ["Team training", 1, 500]]), createdAt: ago(25) },
    { id: "inv10", number: "INV-2025-092", clientId: "c6", issueDate: ago(40), dueDate: ago(25), subtotal: 890, taxRatePct: 15, taxAmount: 133.5, totalAmount: 1023.5, status: "Sent", items: items("inv10", [["HostShield managed hosting — monthly", 1, 890]]), createdAt: ago(40) },
    { id: "inv11", number: "INV-2025-081", clientId: "c7", issueDate: ago(70), dueDate: ago(55), subtotal: 1740, taxRatePct: 15, taxAmount: 261, totalAmount: 2001, status: "Sent", items: items("inv11", [["NestCRM Suite — 18 seats, annual prepay", 1, 1740]]), createdAt: ago(70) },
    { id: "inv12", number: "INV-2025-119", clientId: "c7", issueDate: ago(12), dueDate: ahead(18), subtotal: 930, taxRatePct: 15, taxAmount: 139.5, totalAmount: 1069.5, status: "Sent", items: items("inv12", [["HostShield hosting — quarterly", 1, 930]]), createdAt: ago(12) },
    { id: "inv13", number: "INV-2025-086", clientId: "c9", issueDate: ago(50), dueDate: ago(35), subtotal: 1050, taxRatePct: 15, taxAmount: 157.5, totalAmount: 1207.5, status: "Sent", items: items("inv13", [["NestCRM Suite — 8 seats, half-year", 1, 1050]]), createdAt: ago(50) },
    { id: "inv14", number: "INV-2025-123", clientId: "c9", issueDate: ago(50), dueDate: ago(20), subtotal: 240, taxRatePct: 15, taxAmount: 36, totalAmount: 276, status: "Sent", items: items("inv14", [["HostShield managed hosting — monthly", 1, 240]]), createdAt: ago(50) },
    { id: "inv15", number: "INV-2025-041", clientId: "c10", issueDate: ago(200), dueDate: ago(185), subtotal: 4800, taxRatePct: 15, taxAmount: 720, totalAmount: 5520, status: "Sent", items: items("inv15", [["NestERP Core perpetual — 30 seats", 1, 4800]]), createdAt: ago(200) },
    { id: "inv16", number: "INV-2025-125", clientId: "c8", issueDate: ago(2), dueDate: ahead(28), subtotal: 2400, taxRatePct: 15, taxAmount: 360, totalAmount: 2760, status: "Draft", items: items("inv16", [["NestCRM Suite — proposal, 15 seats", 1, 2400]]), createdAt: ago(2) },
    { id: "inv17", number: "INV-2025-052", clientId: "c5", issueDate: ago(120), dueDate: ago(105), subtotal: 940, taxRatePct: 15, taxAmount: 141, totalAmount: 1081, status: "Sent", items: items("inv17", [["Legacy system decommission support", 1, 940]]), createdAt: ago(120) },
    { id: "inv18", number: "INV-2025-122", clientId: "c1", issueDate: ago(5), dueDate: ahead(25), subtotal: 1850, taxRatePct: 15, taxAmount: 277.5, totalAmount: 2127.5, status: "Sent", items: items("inv18", [["Warehouse module upgrade", 1, 1850]]), createdAt: ago(5) },
  ];

  const payments: Payment[] = [
    { id: "pay1", invoiceId: "inv3", clientId: "c2", amount: 1000, paymentDate: ago(30), method: "Bank Transfer", category: "License", notes: "First instalment per agreement", createdBy: "u2", createdAt: ago(30) },
    { id: "pay2", invoiceId: "inv4", clientId: "c2", amount: 713, paymentDate: ago(10), method: "Bank Transfer", category: "Hosting", notes: "", createdBy: "u2", createdAt: ago(10) },
    { id: "pay3", invoiceId: "inv5", clientId: "c3", amount: 3910, paymentDate: ago(78), method: "Bank Transfer", category: "License", notes: "Paid in full", createdBy: "u2", createdAt: ago(78) },
    { id: "pay4", invoiceId: "inv9", clientId: "c6", amount: 3000, paymentDate: ago(12), method: "Bank Transfer", category: "Upgrade", notes: "Milestone 1 of 3", createdBy: "u2", createdAt: ago(12) },
    { id: "pay5", invoiceId: "inv11", clientId: "c7", amount: 2001, paymentDate: ago(58), method: "Card", category: "License", notes: "", createdBy: "u2", createdAt: ago(58) },
    { id: "pay6", invoiceId: "inv15", clientId: "c10", amount: 5520, paymentDate: ago(188), method: "Bank Transfer", category: "License", notes: "Final settlement before churn", createdBy: "u2", createdAt: ago(188) },
    { id: "pay7", invoiceId: "inv1", clientId: "c1", amount: 517.5, paymentDate: ago(25), method: "Bank Transfer", category: "Hosting", notes: "", createdBy: "u2", createdAt: ago(25) },
    { id: "pay8", invoiceId: "inv6", clientId: "c3", amount: 1311, paymentDate: ago(60), method: "Bank Transfer", category: "Hosting", notes: "Previous quarter settled", createdBy: "u2", createdAt: ago(60) },
    { id: "pay9", invoiceId: "inv7", clientId: "c4", amount: 671, paymentDate: ago(20), method: "Card", category: "Hosting", notes: "Settled after reminder call", createdBy: "u2", createdAt: ago(20) },
    { id: "pay10", invoiceId: "inv10", clientId: "c6", amount: 1023.5, paymentDate: ago(35), method: "Bank Transfer", category: "Hosting", notes: "", createdBy: "u2", createdAt: ago(35) },
    { id: "pay11", invoiceId: "inv12", clientId: "c7", amount: 1069.5, paymentDate: ago(10), method: "Bank Transfer", category: "Hosting", notes: "", createdBy: "u2", createdAt: ago(10) },
    { id: "pay12", invoiceId: "inv14", clientId: "c9", amount: 276, paymentDate: ago(45), method: "Card", category: "Hosting", notes: "", createdBy: "u2", createdAt: ago(45) },
  ];

  const creditNotes: CreditNote[] = [
    { id: "cn1", invoiceId: "inv3", clientId: "c2", amount: 150, reason: "Service credit for scheduled-maintenance overrun in May", createdBy: "u2", createdAt: ago(26) },
    { id: "cn2", invoiceId: "inv11", clientId: "c7", amount: 90, reason: "Loyalty discount — 3-year client", createdBy: "u1", createdAt: ago(57) },
    { id: "cn3", invoiceId: "inv9", clientId: "c6", amount: 400, reason: "Scope reduction — reporting module deferred to phase 3", createdBy: "u2", createdAt: ago(9) },
  ];

  const tickets: Ticket[] = [
    { id: "t1", ref: "TK-1052", clientId: "c2", subject: "Payment gateway outage on production portal", description: "Clients cannot complete card payments since 09:40. Gateway returns 502 intermittently. Impact is revenue-critical for BlueRock's self-service portal.", priority: "Critical", status: "Open", assignedToId: "u3", firstResponseAt: null, resolvedAt: null, createdAt: ago(0, 1) },
    { id: "t2", ref: "TK-1051", clientId: "c6", subject: "NestERP nightly sync failing since Tuesday", description: "The ERP-to-BI nightly sync job aborts at 02:15 with a lock timeout. Dashboard data is stale for the trading desk. Error logs attached.", priority: "Critical", status: "In Progress", assignedToId: "u3", firstResponseAt: ago(0, 2), resolvedAt: null, createdAt: ago(0, 4) },
    { id: "t3", ref: "TK-1050", clientId: "c1", subject: "Reporting exports extremely slow for large date ranges", description: "CSV exports over 90-day ranges take 6+ minutes and sometimes time out. Fleet operations team is blocked on monthly reconciliation.", priority: "High", status: "In Progress", assignedToId: "u3", firstResponseAt: ago(0, 20), resolvedAt: null, createdAt: ago(1) },
    { id: "t4", ref: "TK-1049", clientId: "c4", subject: "Add two new practitioners to scheduling module", description: "Dr. Osei and Dr. Lindgren join next month — need profiles, permissions and calendar templates configured.", priority: "Medium", status: "Open", assignedToId: "u3", firstResponseAt: null, resolvedAt: null, createdAt: ago(2) },
    { id: "t5", ref: "TK-1048", clientId: "c3", subject: "Barcode scanner integration throws duplicate-key error", description: "Warehouse scanners intermittently fail with duplicate-key errors when batches exceed 400 items. Reproducible on line 3 terminal.", priority: "High", status: "Open", assignedToId: null, firstResponseAt: null, resolvedAt: null, createdAt: ago(0, 6) },
    { id: "t6", ref: "TK-1047", clientId: "c7", subject: "Update seasonal branding on customer portal", description: "Swap hero banners and email footer for the autumn campaign. Assets are in the shared drive under /campaigns/autumn.", priority: "Low", status: "Open", assignedToId: "u3", firstResponseAt: null, resolvedAt: null, createdAt: ago(3) },
    { id: "t7", ref: "TK-1046", clientId: "c9", subject: "Dashboard widgets show stale data after refresh", description: "Audience-reach widgets keep showing yesterday's figures until a hard reload. Started after the 4.2.1 client update.", priority: "Medium", status: "In Progress", assignedToId: "u3", firstResponseAt: ago(0, 22), resolvedAt: null, createdAt: ago(1, 2) },
    { id: "t8", ref: "TK-1044", clientId: "c1", subject: "Email notifications delayed by ~30 minutes", description: "Dispatch confirmation emails arrive roughly half an hour late. Queue backlog traced to the notification worker.", priority: "Medium", status: "Resolved", assignedToId: "u3", firstResponseAt: ago(4, 22), resolvedAt: ago(4), createdAt: ago(5) },
    { id: "t9", ref: "TK-1041", clientId: "c2", subject: "How to export client statements as CSV", description: "Compliance team needs a walkthrough of the CSV export and column mapping for quarterly statements.", priority: "Low", status: "Closed", assignedToId: "u3", firstResponseAt: ago(8, 20), resolvedAt: ago(8, 10), createdAt: ago(9) },
    { id: "t10", ref: "TK-1043", clientId: "c6", subject: "Invoice PDF layout broken for multi-page invoices", description: "Line items spill into the footer on page 2+. Finance rejects the PDFs for audit purposes.", priority: "High", status: "Resolved", assignedToId: "u3", firstResponseAt: ago(6, 22), resolvedAt: ago(6, 4), createdAt: ago(7) },
    { id: "t11", ref: "TK-1038", clientId: "c4", subject: "Database failover incident — booking writes lost", description: "Primary DB failover during patching window lost ~14 bookings. Requires reconciliation and incident report.", priority: "Critical", status: "Resolved", assignedToId: "u3", firstResponseAt: ago(12), resolvedAt: ago(11, 19), createdAt: ago(12, 4) },
  ];

  const timeLogs: TimeLog[] = [
    { id: "tl1", ticketId: "t2", userId: "u3", minutes: 95, note: "Reproduced lock timeout; captured deadlock graph", createdAt: ago(0, 2) },
    { id: "tl2", ticketId: "t3", userId: "u3", minutes: 140, note: "Profiled export query; index on shipments.date missing", createdAt: ago(0, 18) },
    { id: "tl3", ticketId: "t7", userId: "u3", minutes: 45, note: "Widget cache invalidation review", createdAt: ago(0, 20) },
    { id: "tl4", ticketId: "t8", userId: "u3", minutes: 120, note: "Cleared queue backlog, tuned worker concurrency", createdAt: ago(4, 2) },
    { id: "tl5", ticketId: "t10", userId: "u3", minutes: 75, note: "Rewrote PDF pagination template", createdAt: ago(6, 6) },
    { id: "tl6", ticketId: "t11", userId: "u3", minutes: 260, note: "Reconciled 14 bookings, drafted incident report", createdAt: ago(11, 20) },
    { id: "tl7", ticketId: "t2", userId: "u1", minutes: 40, note: "Reviewed sync job config with infra", createdAt: ago(0, 1) },
  ];

  const attachments: Attachment[] = [
    { id: "at1", ticketId: "t2", name: "sync-error-trace.log", size: 14_520, uploadedBy: "u3", createdAt: ago(0, 3) },
    { id: "at2", ticketId: "t2", name: "deadlock-graph.json", size: 88_110, uploadedBy: "u1", createdAt: ago(0, 1) },
    { id: "at3", ticketId: "t11", name: "incident-report.pdf", size: 214_003, uploadedBy: "u3", createdAt: ago(11, 18) },
  ];

  const leads: Lead[] = [
    { id: "ld1", companyName: "Vantage Cold Storage", contactName: "Henrik Voss", email: "h.voss@vantagecold.example", phone: "+45 70 11 45 90", source: "Referral", estimatedValue: 18500, stage: "Proposal", createdAt: ago(18) },
    { id: "ld2", companyName: "Ironbark Mining Services", contactName: "Camille Roux", email: "c.roux@ironbark.example", phone: "+33 1 84 88 20 11", source: "Trade Show", estimatedValue: 46000, stage: "Negotiation", createdAt: ago(26) },
    { id: "ld3", companyName: "Cielo Boutique Hotels", contactName: "Mateo Herrera", email: "mateo@cielohotels.example", phone: "+34 91 748 55 30", source: "Website", estimatedValue: 12000, stage: "New", createdAt: ago(2) },
    { id: "ld4", companyName: "Fernway Pharmaceuticals", contactName: "Aoife Brennan", email: "a.brennan@fernway.example", phone: "+353 1 902 44 71", source: "LinkedIn", estimatedValue: 27500, stage: "Contacted", createdAt: ago(9) },
    { id: "ld5", companyName: "Redshift Gaming", contactName: "Tomas Lind", email: "tomas@redshiftgg.example", phone: "+46 8 5500 14 82", source: "Cold Call", estimatedValue: 33000, stage: "Proposal", createdAt: ago(14) },
    { id: "ld6", companyName: "Baltic Ferry Lines", contactName: "Kristjan Tamm", email: "k.tamm@balticferry.example", phone: "+372 6 445 180", source: "Referral", estimatedValue: 51000, stage: "Negotiation", createdAt: ago(31) },
    { id: "ld7", companyName: "Summit Athletics", contactName: "Dana Whitfield", email: "dana@summitath.example", phone: "+44 161 555 0143", source: "Website", estimatedValue: 9500, stage: "New", createdAt: ago(1) },
    { id: "ld8", companyName: "Clearwater Utilities", contactName: "Bram Janssens", email: "b.janssens@clearwater.example", phone: "+32 2 555 90 24", source: "Partner", estimatedValue: 22000, stage: "Contacted", createdAt: ago(12) },
    { id: "ld9", companyName: "Hearth & Harvest Restaurants", contactName: "Nadia Ferretti", email: "nadia@hearthharvest.example", phone: "+39 02 8342 1170", source: "Cold Call", estimatedValue: 15000, stage: "Lost", lostReason: "Price", createdAt: ago(40) },
    { id: "ld10", companyName: "Polaris Aerospace", contactName: "Elif Kaya", email: "e.kaya@polarisaero.example", phone: "+90 212 705 44 10", source: "Trade Show", estimatedValue: 58000, stage: "Won", createdAt: ago(55) },
    { id: "ld11", companyName: "Golden Mile Properties", contactName: "Pieter Botha", email: "p.botha@goldenmile.example", phone: "+27 21 555 0182", source: "LinkedIn", estimatedValue: 19000, stage: "Lost", lostReason: "Competitor", createdAt: ago(35) },
    { id: "ld12", companyName: "Atlas Freight Co.", contactName: "Ingrid Solberg", email: "ingrid@atlasfreight.example", phone: "+47 55 30 21 88", source: "Referral", estimatedValue: 29500, stage: "Proposal", createdAt: ago(6) },
  ];

  const audit: AuditLog[] = [
    { id: "al1", timestamp: ago(30), userId: "u2", userName: "Marco Silva", action: "payment.create", entityType: "Payment", entityId: "pay1", before: null, after: { invoice: "INV-2025-089", amount: 1000, method: "Bank Transfer" } },
    { id: "al2", timestamp: ago(30), userId: "u2", userName: "Marco Silva", action: "invoice.status", entityType: "Invoice", entityId: "inv3", before: { status: "Sent" }, after: { status: "PartiallyPaid" } },
    { id: "al3", timestamp: ago(26), userId: "u2", userName: "Marco Silva", action: "creditnote.create", entityType: "CreditNote", entityId: "cn1", before: null, after: { invoice: "INV-2025-089", amount: 150 } },
    { id: "al4", timestamp: ago(12), userId: "u2", userName: "Marco Silva", action: "payment.create", entityType: "Payment", entityId: "pay4", before: null, after: { invoice: "INV-2025-108", amount: 3000, category: "Upgrade" } },
    { id: "al5", timestamp: ago(12), userId: "u2", userName: "Marco Silva", action: "invoice.status", entityType: "Invoice", entityId: "inv9", before: { status: "Sent" }, after: { status: "PartiallyPaid" } },
    { id: "al6", timestamp: ago(10), userId: "u2", userName: "Marco Silva", action: "payment.create", entityType: "Payment", entityId: "pay2", before: null, after: { invoice: "INV-2025-114", amount: 713 } },
    { id: "al7", timestamp: ago(10), userId: "u2", userName: "Marco Silva", action: "invoice.status", entityType: "Invoice", entityId: "inv4", before: { status: "Sent" }, after: { status: "Paid" } },
    { id: "al8", timestamp: ago(9), userId: "u2", userName: "Marco Silva", action: "creditnote.create", entityType: "CreditNote", entityId: "cn3", before: null, after: { invoice: "INV-2025-108", amount: 400 } },
    { id: "al9", timestamp: ago(0, 4), userId: "u3", userName: "Priya Nair", action: "ticket.create", entityType: "Ticket", entityId: "t2", before: null, after: { ref: "TK-1051", priority: "Critical" } },
    { id: "al10", timestamp: ago(0, 1), userId: "u3", userName: "Priya Nair", action: "ticket.create", entityType: "Ticket", entityId: "t1", before: null, after: { ref: "TK-1052", priority: "Critical" } },
    { id: "al11", timestamp: ago(20), userId: "u4", userName: "Jonas Keller", action: "invoice.create", entityType: "Invoice", entityId: "inv2", before: null, after: { number: "INV-2025-117", total: 1380 } },
    { id: "al12", timestamp: ago(44), userId: "u1", userName: "Ava Stern", action: "client.update", entityType: "Client", entityId: "c5", before: { status: "Active" }, after: { status: "OnHold" } },
    { id: "al13", timestamp: ago(55), userId: "u4", userName: "Jonas Keller", action: "lead.convert", entityType: "Lead", entityId: "ld10", before: { stage: "Negotiation" }, after: { stage: "Won", client: "Polaris Aerospace" } },
    { id: "al14", timestamp: ago(8), userId: "u1", userName: "Ava Stern", action: "license.create", entityType: "License", entityId: "l10", before: null, after: { client: "Apexfield Energy", product: "NestERP Core", seats: 80 } },
    { id: "al15", timestamp: ago(5), userId: "u4", userName: "Jonas Keller", action: "invoice.create", entityType: "Invoice", entityId: "inv18", before: null, after: { number: "INV-2025-122", total: 2127.5 } },
    { id: "al16", timestamp: ago(3), userId: "u2", userName: "Marco Silva", action: "invoice.create", entityType: "Invoice", entityId: "inv8", before: null, after: { number: "INV-2025-124", status: "Draft" } },
    { id: "al17", timestamp: ago(25), userId: "u2", userName: "Marco Silva", action: "payment.create", entityType: "Payment", entityId: "pay7", before: null, after: { invoice: "INV-2025-101", amount: 517.5, category: "Hosting" } },
    { id: "al18", timestamp: ago(25), userId: "u2", userName: "Marco Silva", action: "invoice.status", entityType: "Invoice", entityId: "inv1", before: { status: "Overdue" }, after: { status: "Paid" } },
    { id: "al19", timestamp: ago(20), userId: "u2", userName: "Marco Silva", action: "payment.create", entityType: "Payment", entityId: "pay9", before: null, after: { invoice: "INV-2025-095", amount: 671, category: "Hosting" } },
  ];

  return { users, leads, clients, contacts, products, licenses, invoices, payments, creditNotes, tickets, timeLogs, attachments, audit, seq: 1000 };
}

// ── Persistence ─────────────────────────────────────────────────────────
let db: DB | null = null;
function getDb(): DB {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      db = JSON.parse(raw) as DB;
      return db;
    }
  } catch {
    /* corrupted — reseed */
  }
  db = seed();
  save();
  return db;
}
function save() {
  if (!db) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage full — keep in memory */
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100;
const contains = (hay: string | undefined, needle: string) =>
  !!hay && hay.toLowerCase().includes(needle.toLowerCase());

function httpError(config: AxiosRequestConfig, status: number, message: string): AxiosError {
  const response = { data: { message }, status, statusText: message, headers: {}, config } as AxiosResponse;
  return new AxiosError(message, String(status), config as InternalAxiosRequestConfig, undefined, response);
}

function paginate<T>(items: T[], q: URLSearchParams): ListResponse<T> {
  const page = Math.max(1, parseInt(q.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(q.get("limit") ?? "10", 10) || 10));
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), total: items.length, page, limit };
}

const pubUser = (u: DbUser): User => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt });

function daysToExpiry(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY);
}

function enrichLicense(d: DB, l: License): LicenseRow {
  return {
    ...l,
    clientName: d.clients.find((c) => c.id === l.clientId)?.companyName ?? "—",
    productName: d.products.find((p) => p.id === l.productId)?.name ?? "—",
    daysToExpiry: daysToExpiry(l.endDate),
  };
}

function invoiceFinancials(d: DB, invoiceId: string) {
  const paid = d.payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);
  const credits = d.creditNotes.filter((c) => c.invoiceId === invoiceId).reduce((s, c) => s + c.amount, 0);
  return { paid: round2(paid), credits: round2(credits) };
}

function liveStatus(inv: Invoice, paid: number, credits: number): Invoice["status"] {
  if (inv.status === "Draft") return "Draft";
  if (paid + credits >= inv.totalAmount - 0.001) return "Paid";
  if (Date.now() > new Date(inv.dueDate).getTime()) return "Overdue";
  if (paid > 0) return "PartiallyPaid";
  return "Sent";
}

function enrichInvoice(d: DB, inv: Invoice): InvoiceRow {
  const { paid, credits } = invoiceFinancials(d, inv.id);
  return {
    ...inv,
    status: liveStatus(inv, paid, credits),
    clientName: d.clients.find((c) => c.id === inv.clientId)?.companyName ?? "—",
    paid,
    credits,
    balance: round2(inv.totalAmount - paid - credits),
  };
}

function enrichTicket(d: DB, t: Ticket): TicketRow {
  return {
    ...t,
    clientName: d.clients.find((c) => c.id === t.clientId)?.companyName ?? "—",
    assigneeName: d.users.find((u) => u.id === t.assignedToId)?.name ?? "Unassigned",
    minutesTotal: d.timeLogs.filter((tl) => tl.ticketId === t.id).reduce((s, tl) => s + tl.minutes, 0),
  };
}

function enrichClient(d: DB, c: Client): ClientRow {
  return {
    ...c,
    ownerName: d.users.find((u) => u.id === c.accountOwnerId)?.name ?? "—",
    contactsCount: d.contacts.filter((ct) => ct.clientId === c.id).length,
    licensesCount: d.licenses.filter((l) => l.clientId === c.id).length,
  };
}

function log(d: DB, user: DbUser, action: string, entityType: EntityType, entityId: string, before: unknown, after: unknown) {
  d.audit.unshift({
    id: `al-${d.seq++}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    action,
    entityType,
    entityId,
    before,
    after,
  });
}

// ── SoA PDF (SRS Module D) ──────────────────────────────────────────────
function buildSoaPdf(d: DB, inv: InvoiceRow): Blob {
  const client = d.clients.find((c) => c.id === inv.clientId);
  const payments = d.payments.filter((p) => p.invoiceId === inv.id);
  const credits = d.creditNotes.filter((c) => c.invoiceId === inv.id);
  const doc = new jsPDF();
  const usd = (n: number) => `$${n.toFixed(2)}`;
  let y = 0;

  doc.setFillColor(9, 42, 49);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(232, 179, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ClientNest Pro", 14, 13);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Statement of Account", 14, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 196, 13, { align: "right" });
  doc.text(inv.number, 196, 21, { align: "right" });

  y = 42;
  doc.setTextColor(20, 40, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(client?.companyName ?? "", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(client?.billingAddress ?? "", 14, y + 6);
  doc.text(`Tax ID: ${client?.taxId ?? "—"}`, 14, y + 12);
  doc.text(`Issued: ${new Date(inv.issueDate).toLocaleDateString()}`, 130, y);
  doc.text(`Due: ${new Date(inv.dueDate).toLocaleDateString()}`, 130, y + 6);
  doc.text(`Status: ${inv.status}`, 130, y + 12);

  y += 26;
  doc.setFillColor(237, 241, 241);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Description", 16, y);
  doc.text("Qty", 140, y);
  doc.text("Unit", 158, y);
  doc.text("Amount", 194, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 8;
  inv.items.forEach((it) => {
    doc.text(it.description.slice(0, 62), 16, y);
    doc.text(String(it.qty), 140, y);
    doc.text(usd(it.unitPrice), 158, y);
    doc.text(usd(it.qty * it.unitPrice), 194, y, { align: "right" });
    y += 6;
  });

  y += 4;
  doc.line(110, y, 194, y);
  y += 6;
  doc.text("Subtotal", 150, y); doc.text(usd(inv.subtotal), 194, y, { align: "right" }); y += 6;
  doc.text(`Tax (${inv.taxRatePct}%)`, 150, y); doc.text(usd(inv.taxAmount), 194, y, { align: "right" }); y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total", 150, y); doc.text(usd(inv.totalAmount), 194, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Payments & credit notes", 14, y);
  doc.setFont("helvetica", "normal");
  y += 7;
  if (payments.length === 0 && credits.length === 0) {
    doc.text("No payments or credit notes recorded.", 14, y);
    y += 6;
  }
  payments.forEach((p) => {
    doc.text(`${new Date(p.paymentDate).toLocaleDateString()}  —  Payment (${p.method}, ${p.category})`, 16, y);
    doc.text(usd(p.amount), 194, y, { align: "right" });
    y += 6;
  });
  credits.forEach((c) => {
    doc.text(`${new Date(c.createdAt).toLocaleDateString()}  —  Credit note: ${c.reason.slice(0, 48)}`, 16, y);
    doc.text(`(${usd(c.amount)})`, 194, y, { align: "right" });
    y += 6;
  });

  y += 4;
  doc.setFillColor(9, 42, 49);
  doc.rect(14, y - 5, 182, 10, "F");
  doc.setTextColor(232, 179, 75);
  doc.setFont("helvetica", "bold");
  doc.text("Balance outstanding", 16, y + 1);
  doc.text(usd(inv.balance), 194, y + 1, { align: "right" });

  doc.setTextColor(120, 130, 132);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("ClientNest Pro · CRM & Fee Management · This statement is system-generated.", 105, 287, { align: "center" });
  return doc.output("blob");
}

// ── Router ──────────────────────────────────────────────────────────────
export async function handleMock(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 320));
  const d = getDb();
  const method = (config.method ?? "get").toLowerCase();
  const rawUrl = config.url ?? "/";
  const [rawPath, query = ""] = rawUrl.split("?");
  const path = rawPath.replace(/\/+$/, "") || "/";
  const q = new URLSearchParams(query);
  let body: Record<string, any> = {};
  if (config.data) {
    try {
      body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    } catch {
      body = {};
    }
  }

  const ok = (data: unknown, status = 200): AxiosResponse => ({
    data, status, statusText: "OK", headers: {}, config,
  });

  const authHeader = config.headers?.Authorization;
  const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : "";
  const me = d.users.find((u) => `cn-demo-${u.id}` === token) ?? null;
  const requireAuth = (): DbUser => {
    if (!me || !me.isActive) throw httpError(config, 401, "Invalid or expired token");
    return me;
  };
  const requireRole = (...roles: User["role"][]): DbUser => {
    const u = requireAuth();
    if (!roles.includes(u.role)) throw httpError(config, 403, `Requires role: ${roles.join(" or ")}`);
    return u;
  };

  let m: RegExpMatchArray | null;

  // ── Auth ──────────────────────────────────────────────────────────────
  if (method === "post" && path === "/auth/login") {
    const u = d.users.find((x) => x.email.toLowerCase() === String(body.email ?? "").toLowerCase());
    if (!u || u.password !== body.password) throw httpError(config, 401, "Invalid email or password");
    if (!u.isActive) throw httpError(config, 403, "This account has been deactivated");
    log(d, u, "user.login", "User", u.id, null, { email: u.email });
    save();
    return ok({ token: `cn-demo-${u.id}`, user: pubUser(u) });
  }
  if (method === "get" && path === "/auth/me") {
    return ok(pubUser(requireAuth()));
  }

  // ── Leads (Module A) ──────────────────────────────────────────────────
  if (path === "/leads" && method === "get") {
    requireAuth();
    const search = q.get("search") ?? "";
    const stage = q.get("stage");
    const source = q.get("source");
    let rows = d.leads.filter((l) =>
      (!search || contains(l.companyName, search) || contains(l.contactName, search) || contains(l.email, search)) &&
      (!stage || l.stage === stage) &&
      (!source || l.source === source),
    );
    rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok(paginate(rows, q));
  }
  if (path === "/leads" && method === "post") {
    const u = requireRole("Admin", "Sales");
    const lead: Lead = {
      id: `ld-${d.seq++}`,
      companyName: body.companyName, contactName: body.contactName, email: body.email,
      phone: body.phone ?? "", source: body.source, estimatedValue: Number(body.estimatedValue) || 0,
      stage: body.stage ?? "New", notes: body.notes ?? "", createdAt: new Date().toISOString(),
    };
    d.leads.unshift(lead);
    log(d, u, "lead.create", "Lead", lead.id, null, { company: lead.companyName, stage: lead.stage });
    save();
    return ok(lead, 201);
  }
  if ((m = path.match(/^\/leads\/([\w-]+)$/)) && method === "put") {
    const u = requireRole("Admin", "Sales");
    const lead = d.leads.find((l) => l.id === m![1]);
    if (!lead) throw httpError(config, 404, "Lead not found");
    const before = { stage: lead.stage, estimatedValue: lead.estimatedValue };
    Object.assign(lead, {
      companyName: body.companyName ?? lead.companyName,
      contactName: body.contactName ?? lead.contactName,
      email: body.email ?? lead.email,
      phone: body.phone ?? lead.phone,
      source: body.source ?? lead.source,
      estimatedValue: body.estimatedValue !== undefined ? Number(body.estimatedValue) : lead.estimatedValue,
      stage: body.stage ?? lead.stage,
      notes: body.notes !== undefined ? body.notes : lead.notes,
    });
    log(d, u, "lead.update", "Lead", lead.id, before, { stage: lead.stage, estimatedValue: lead.estimatedValue });
    save();
    return ok(lead);
  }
  if ((m = path.match(/^\/leads\/([\w-]+)\/convert$/)) && method === "post") {
    const u = requireRole("Admin", "Sales");
    const lead = d.leads.find((l) => l.id === m![1]);
    if (!lead) throw httpError(config, 404, "Lead not found");
    if (lead.stage === "Won" || lead.stage === "Lost") throw httpError(config, 400, "Lead is already closed");
    const client: Client = {
      id: `c-${d.seq++}`,
      companyName: body.companyName ?? lead.companyName,
      taxId: body.taxId ?? "",
      billingAddress: body.billingAddress ?? "",
      industryType: body.industryType ?? "Other",
      status: "Active",
      accountOwnerId: body.accountOwnerId ?? u.id,
      taxRatePct: Number(body.taxRatePct ?? 15),
      hostingFeeAmount: Number(body.hostingFeeAmount ?? 0),
      hostingCycle: body.hostingCycle ?? "Monthly",
      createdAt: new Date().toISOString(),
    };
    d.clients.unshift(client);
    d.contacts.unshift({
      id: `ct-${d.seq++}`, clientId: client.id, name: lead.contactName, email: lead.email,
      phone: lead.phone, contactType: "Executive", notifyEmail: true, createdAt: client.createdAt,
    });
    const before = { stage: lead.stage };
    lead.stage = "Won";
    log(d, u, "lead.convert", "Lead", lead.id, before, { stage: "Won", client: client.companyName });
    log(d, u, "client.create", "Client", client.id, null, { company: client.companyName, convertedFrom: lead.companyName });
    save();
    return ok({ client: enrichClient(d, client) }, 201);
  }
  if ((m = path.match(/^\/leads\/([\w-]+)\/lost$/)) && method === "post") {
    const u = requireRole("Admin", "Sales");
    const lead = d.leads.find((l) => l.id === m![1]);
    if (!lead) throw httpError(config, 404, "Lead not found");
    if (!body.lostReason) throw httpError(config, 400, "lostReason is required");
    const before = { stage: lead.stage };
    lead.stage = "Lost";
    lead.lostReason = body.lostReason;
    log(d, u, "lead.lost", "Lead", lead.id, before, { stage: "Lost", reason: lead.lostReason });
    save();
    return ok(lead);
  }

  // ── Clients & contacts (Module B) ─────────────────────────────────────
  if (path === "/clients" && method === "get") {
    requireAuth();
    const search = q.get("search") ?? "";
    const status = q.get("status");
    const industry = q.get("industry");
    let rows = d.clients.filter((c) => !c.isDeleted)
      .filter((c) =>
        (!search || contains(c.companyName, search) || contains(c.taxId, search)) &&
        (!status || c.status === status) &&
        (!industry || c.industryType === industry))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => enrichClient(d, c));
    return ok(paginate(rows, q));
  }
  if (path === "/clients" && method === "post") {
    const u = requireRole("Admin", "Sales", "Finance");
    const client: Client = {
      id: `c-${d.seq++}`,
      companyName: body.companyName, taxId: body.taxId ?? "", billingAddress: body.billingAddress ?? "",
      industryType: body.industryType ?? "Other", status: body.status ?? "Prospect",
      accountOwnerId: body.accountOwnerId ?? u.id, taxRatePct: Number(body.taxRatePct ?? 15),
      hostingFeeAmount: Number(body.hostingFeeAmount ?? 0), hostingCycle: body.hostingCycle ?? "Monthly",
      createdAt: new Date().toISOString(),
    };
    d.clients.unshift(client);
    log(d, u, "client.create", "Client", client.id, null, { company: client.companyName, status: client.status });
    save();
    return ok(enrichClient(d, client), 201);
  }
  if ((m = path.match(/^\/clients\/([\w-]+)$/)) && method === "get") {
    requireAuth();
    const c = d.clients.find((x) => x.id === m![1] && !x.isDeleted);
    if (!c) throw httpError(config, 404, "Client not found");
    return ok({
      client: enrichClient(d, c),
      contacts: d.contacts.filter((ct) => ct.clientId === c.id),
      licenses: d.licenses.filter((l) => l.clientId === c.id).map((l) => enrichLicense(d, l)),
      invoices: d.invoices.filter((i) => i.clientId === c.id && !i.isDeleted).map((i) => enrichInvoice(d, i))
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
      tickets: d.tickets.filter((t) => t.clientId === c.id).map((t) => enrichTicket(d, t))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  }
  if ((m = path.match(/^\/clients\/([\w-]+)$/)) && method === "put") {
    const u = requireRole("Admin", "Sales", "Finance");
    const c = d.clients.find((x) => x.id === m![1] && !x.isDeleted);
    if (!c) throw httpError(config, 404, "Client not found");
    const before = { status: c.status, hostingFeeAmount: c.hostingFeeAmount, accountOwnerId: c.accountOwnerId };
    Object.assign(c, {
      companyName: body.companyName ?? c.companyName,
      taxId: body.taxId ?? c.taxId,
      billingAddress: body.billingAddress ?? c.billingAddress,
      industryType: body.industryType ?? c.industryType,
      status: body.status ?? c.status,
      accountOwnerId: body.accountOwnerId ?? c.accountOwnerId,
      taxRatePct: body.taxRatePct !== undefined ? Number(body.taxRatePct) : c.taxRatePct,
      hostingFeeAmount: body.hostingFeeAmount !== undefined ? Number(body.hostingFeeAmount) : c.hostingFeeAmount,
      hostingCycle: body.hostingCycle ?? c.hostingCycle,
    });
    log(d, u, "client.update", "Client", c.id, before, { status: c.status, hostingFeeAmount: c.hostingFeeAmount });
    save();
    return ok(enrichClient(d, c));
  }
  if ((m = path.match(/^\/clients\/([\w-]+)$/)) && method === "delete") {
    const u = requireRole("Admin");
    const c = d.clients.find((x) => x.id === m![1] && !x.isDeleted);
    if (!c) throw httpError(config, 404, "Client not found");
    c.isDeleted = true;
    log(d, u, "client.delete", "Client", c.id, { company: c.companyName, isDeleted: false }, { isDeleted: true });
    save();
    return ok({ ok: true });
  }
  if ((m = path.match(/^\/clients\/([\w-]+)\/activity$/)) && method === "get") {
    requireAuth();
    const cid = m![1];
    const acts: ActivityItem[] = [
      ...d.invoices.filter((i) => i.clientId === cid && !i.isDeleted).map((i) => ({
        id: `ac-inv-${i.id}`, kind: "invoice" as const, title: `Invoice ${i.number} issued`,
        detail: `${i.items[0]?.description ?? "Services"} · total $${i.totalAmount.toFixed(2)}`, at: i.createdAt,
      })),
      ...d.payments.filter((p) => p.clientId === cid).map((p) => ({
        id: `ac-pay-${p.id}`, kind: "payment" as const, title: `Payment received — $${p.amount.toFixed(2)}`,
        detail: `${p.method} · ${p.category}${p.notes ? ` · ${p.notes}` : ""}`, at: p.createdAt,
      })),
      ...d.creditNotes.filter((cn) => cn.clientId === cid).map((cn) => ({
        id: `ac-cn-${cn.id}`, kind: "credit" as const, title: `Credit note — $${cn.amount.toFixed(2)}`,
        detail: cn.reason, at: cn.createdAt,
      })),
      ...d.tickets.filter((t) => t.clientId === cid).flatMap((t) => [
        { id: `ac-tk-${t.id}`, kind: "ticket" as const, title: `Ticket ${t.ref} opened — ${t.subject}`, detail: `Priority ${t.priority} · ${t.status}`, at: t.createdAt },
        ...(t.resolvedAt ? [{ id: `ac-tkr-${t.id}`, kind: "ticket" as const, title: `Ticket ${t.ref} resolved`, detail: t.subject, at: t.resolvedAt }] : []),
      ]),
      ...d.licenses.filter((l) => l.clientId === cid).map((l) => ({
        id: `ac-lic-${l.id}`, kind: "license" as const,
        title: `License granted — ${d.products.find((p) => p.id === l.productId)?.name ?? "Product"}`,
        detail: `${l.type} · ${l.seats} seats`, at: l.createdAt,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
    return ok(acts);
  }
  if ((m = path.match(/^\/clients\/([\w-]+)\/contacts$/)) && method === "get") {
    requireAuth();
    return ok(d.contacts.filter((ct) => ct.clientId === m![1]));
  }
  if ((m = path.match(/^\/clients\/([\w-]+)\/contacts$/)) && method === "post") {
    const u = requireRole("Admin", "Sales", "Finance");
    const contact: Contact = {
      id: `ct-${d.seq++}`, clientId: m![1], name: body.name, email: body.email, phone: body.phone ?? "",
      contactType: body.contactType ?? "Technical", notifyEmail: !!body.notifyEmail, createdAt: new Date().toISOString(),
    };
    d.contacts.push(contact);
    log(d, u, "contact.create", "Contact", contact.id, null, { name: contact.name, type: contact.contactType });
    save();
    return ok(contact, 201);
  }
  if ((m = path.match(/^\/contacts\/([\w-]+)$/)) && method === "put") {
    const u = requireRole("Admin", "Sales", "Finance");
    const ct = d.contacts.find((x) => x.id === m![1]);
    if (!ct) throw httpError(config, 404, "Contact not found");
    const before = { name: ct.name, contactType: ct.contactType };
    Object.assign(ct, {
      name: body.name ?? ct.name, email: body.email ?? ct.email, phone: body.phone ?? ct.phone,
      contactType: body.contactType ?? ct.contactType,
      notifyEmail: body.notifyEmail !== undefined ? !!body.notifyEmail : ct.notifyEmail,
    });
    log(d, u, "contact.update", "Contact", ct.id, before, { name: ct.name, contactType: ct.contactType });
    save();
    return ok(ct);
  }
  if ((m = path.match(/^\/contacts\/([\w-]+)$/)) && method === "delete") {
    const u = requireRole("Admin", "Sales", "Finance");
    const idx = d.contacts.findIndex((x) => x.id === m![1]);
    if (idx === -1) throw httpError(config, 404, "Contact not found");
    const [removed] = d.contacts.splice(idx, 1);
    log(d, u, "contact.delete", "Contact", removed.id, { name: removed.name }, null);
    save();
    return ok({ ok: true });
  }

  // ── Products & licenses (Module C) ────────────────────────────────────
  if (path === "/products" && method === "get") {
    requireAuth();
    return ok(d.products);
  }
  if (path === "/licenses" && method === "get") {
    requireAuth();
    const clientId = q.get("clientId");
    const type = q.get("type");
    const expiringWithin = q.get("expiringWithin");
    const search = q.get("search") ?? "";
    let rows = d.licenses.map((l) => enrichLicense(d, l))
      .filter((l) =>
        (!search || contains(l.clientName, search) || contains(l.productName, search)) &&
        (!clientId || l.clientId === clientId) && (!type || l.type === type))
      .filter((l) => {
        if (!expiringWithin) return true;
        const n = parseInt(expiringWithin, 10);
        return l.daysToExpiry !== null && l.daysToExpiry <= n && l.daysToExpiry >= 0;
      });
    rows = [...rows].sort((a, b) => (a.daysToExpiry ?? 10_000) - (b.daysToExpiry ?? 10_000));
    return ok(paginate(rows, q));
  }
  if (path === "/licenses" && method === "post") {
    const u = requireRole("Admin", "Finance");
    if (!body.clientId || !body.productId) throw httpError(config, 400, "clientId and productId are required");
    const license: License = {
      id: `l-${d.seq++}`, clientId: body.clientId, productId: body.productId,
      type: body.type ?? "Subscription", startDate: body.startDate ?? new Date().toISOString(),
      endDate: body.type === "Perpetual" ? null : (body.endDate || null),
      seats: Number(body.seats) || 1, monthlyValue: Number(body.monthlyValue) || 0,
      createdAt: new Date().toISOString(),
    };
    d.licenses.unshift(license);
    log(d, u, "license.create", "License", license.id, null, {
      client: d.clients.find((c) => c.id === license.clientId)?.companyName, type: license.type, seats: license.seats,
    });
    save();
    return ok(enrichLicense(d, license), 201);
  }
  if ((m = path.match(/^\/licenses\/([\w-]+)$/)) && method === "put") {
    const u = requireRole("Admin", "Finance");
    const l = d.licenses.find((x) => x.id === m![1]);
    if (!l) throw httpError(config, 404, "License not found");
    const before = { endDate: l.endDate, seats: l.seats, type: l.type };
    Object.assign(l, {
      clientId: body.clientId ?? l.clientId, productId: body.productId ?? l.productId,
      type: body.type ?? l.type, startDate: body.startDate ?? l.startDate,
      endDate: (body.type ?? l.type) === "Perpetual" ? null : (body.endDate !== undefined ? body.endDate || null : l.endDate),
      seats: body.seats !== undefined ? Number(body.seats) : l.seats,
      monthlyValue: body.monthlyValue !== undefined ? Number(body.monthlyValue) : l.monthlyValue,
    });
    log(d, u, "license.update", "License", l.id, before, { endDate: l.endDate, seats: l.seats, type: l.type });
    save();
    return ok(enrichLicense(d, l));
  }

  // ── Invoices, payments, credit notes (Module D) ───────────────────────
  if (path === "/invoices" && method === "get") {
    requireAuth();
    const status = q.get("status");
    const clientId = q.get("clientId");
    const from = q.get("from");
    const to = q.get("to");
    const search = q.get("search") ?? "";
    let rows = d.invoices.filter((i) => !i.isDeleted).map((i) => enrichInvoice(d, i))
      .filter((i) =>
        (!status || i.status === status) &&
        (!clientId || i.clientId === clientId) &&
        (!from || i.issueDate >= new Date(from).toISOString()) &&
        (!to || i.issueDate <= new Date(new Date(to).getTime() + DAY).toISOString()) &&
        (!search || contains(i.number, search) || contains(i.clientName, search)))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    return ok(paginate(rows, q));
  }
  if (path === "/invoices" && method === "post") {
    const u = requireRole("Admin", "Finance");
    if (!body.clientId) throw httpError(config, 400, "clientId is required");
    const subtotal = round2(Number(body.subtotal) || 0);
    const taxRatePct = Number(body.taxRatePct ?? 0);
    const taxAmount = round2((subtotal * taxRatePct) / 100);
    const year = new Date().getFullYear();
    const invItems: InvoiceItem[] = Array.isArray(body.items) && body.items.length > 0
      ? body.items.map((it: any, i: number) => ({
          id: `it-${d.seq++}`, description: it.description || "Line item", qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0,
        }))
      : [{ id: `it-${d.seq++}`, description: body.description || "Professional services", qty: 1, unitPrice: subtotal }];
    const inv: Invoice = {
      id: `inv-${d.seq++}`, number: `INV-${year}-${d.seq}`, clientId: body.clientId,
      issueDate: body.issueDate ? new Date(body.issueDate).toISOString() : new Date().toISOString(),
      dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : ahead(30),
      subtotal, taxRatePct, taxAmount, totalAmount: round2(subtotal + taxAmount),
      status: body.status === "Draft" ? "Draft" : "Sent", items: invItems, createdAt: new Date().toISOString(),
    };
    d.invoices.unshift(inv);
    log(d, u, "invoice.create", "Invoice", inv.id, null, { number: inv.number, total: inv.totalAmount, status: inv.status });
    save();
    return ok(enrichInvoice(d, inv), 201);
  }
  if ((m = path.match(/^\/invoices\/([\w-]+)$/)) && method === "get") {
    requireAuth();
    const inv = d.invoices.find((i) => i.id === m![1] && !i.isDeleted);
    if (!inv) throw httpError(config, 404, "Invoice not found");
    const client = d.clients.find((c) => c.id === inv.clientId);
    return ok({
      invoice: enrichInvoice(d, inv),
      client: client ? enrichClient(d, client) : null,
      payments: d.payments.filter((p) => p.invoiceId === inv.id)
        .map((p) => ({ ...p, createdByName: d.users.find((u2) => u2.id === p.createdBy)?.name ?? "—" }))
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
      creditNotes: d.creditNotes.filter((c) => c.invoiceId === inv.id)
        .map((c) => ({ ...c, createdByName: d.users.find((u2) => u2.id === c.createdBy)?.name ?? "—" })),
    });
  }
  if ((m = path.match(/^\/invoices\/([\w-]+)$/)) && method === "put") {
    const u = requireRole("Admin", "Finance");
    const inv = d.invoices.find((i) => i.id === m![1] && !i.isDeleted);
    if (!inv) throw httpError(config, 404, "Invoice not found");
    const before = { status: inv.status, subtotal: inv.subtotal, dueDate: inv.dueDate };
    const subtotal = body.subtotal !== undefined ? round2(Number(body.subtotal)) : inv.subtotal;
    const taxRatePct = body.taxRatePct !== undefined ? Number(body.taxRatePct) : inv.taxRatePct;
    Object.assign(inv, {
      clientId: body.clientId ?? inv.clientId,
      issueDate: body.issueDate ? new Date(body.issueDate).toISOString() : inv.issueDate,
      dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : inv.dueDate,
      subtotal, taxRatePct,
      taxAmount: round2((subtotal * taxRatePct) / 100),
      totalAmount: round2(subtotal + (subtotal * taxRatePct) / 100),
      status: body.status ?? inv.status,
    });
    if (Array.isArray(body.items) && body.items.length > 0) {
      inv.items = body.items.map((it: any, i: number) => ({
        id: `it-${d.seq++}`, description: it.description || "Line item", qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0,
      }));
    }
    log(d, u, "invoice.update", "Invoice", inv.id, before, { status: inv.status, subtotal: inv.subtotal, dueDate: inv.dueDate });
    save();
    return ok(enrichInvoice(d, inv));
  }
  if ((m = path.match(/^\/invoices\/([\w-]+)$/)) && method === "delete") {
    const u = requireRole("Admin");
    const inv = d.invoices.find((i) => i.id === m![1] && !i.isDeleted);
    if (!inv) throw httpError(config, 404, "Invoice not found");
    inv.isDeleted = true;
    log(d, u, "invoice.delete", "Invoice", inv.id, { number: inv.number, isDeleted: false }, { isDeleted: true });
    save();
    return ok({ ok: true });
  }
  if ((m = path.match(/^\/invoices\/([\w-]+)\/payments$/)) && method === "post") {
    const u = requireRole("Admin", "Finance");
    const inv = d.invoices.find((i) => i.id === m![1] && !i.isDeleted);
    if (!inv) throw httpError(config, 404, "Invoice not found");
    const row = enrichInvoice(d, inv);
    const amount = round2(Number(body.amount));
    if (!amount || amount <= 0) throw httpError(config, 400, "Amount must be greater than zero");
    if (amount > row.balance + 0.001) throw httpError(config, 400, `Amount exceeds outstanding balance of $${row.balance.toFixed(2)}`);
    const payment: Payment = {
      id: `pay-${d.seq++}`, invoiceId: inv.id, clientId: inv.clientId, amount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate).toISOString() : new Date().toISOString(),
      method: body.method ?? "Bank Transfer", category: body.category ?? "Maintenance",
      notes: body.notes ?? "", createdBy: u.id, createdAt: new Date().toISOString(),
    };
    d.payments.unshift(payment);
    const statusBefore = row.status;
    log(d, u, "payment.create", "Payment", payment.id, null, { invoice: inv.number, amount, method: payment.method, category: payment.category });
    const statusAfter = liveStatus(inv, invoiceFinancials(d, inv.id).paid, invoiceFinancials(d, inv.id).credits);
    if (statusAfter !== statusBefore) log(d, u, "invoice.status", "Invoice", inv.id, { status: statusBefore }, { status: statusAfter });
    save();
    return ok({ payment, invoice: enrichInvoice(d, inv) }, 201);
  }
  if ((m = path.match(/^\/invoices\/([\w-]+)\/credit-notes$/)) && method === "post") {
    const u = requireRole("Admin", "Finance");
    const inv = d.invoices.find((i) => i.id === m![1] && !i.isDeleted);
    if (!inv) throw httpError(config, 404, "Invoice not found");
    const row = enrichInvoice(d, inv);
    const amount = round2(Number(body.amount));
    if (!amount || amount <= 0) throw httpError(config, 400, "Amount must be greater than zero");
    if (!body.reason || String(body.reason).trim().length < 5) throw httpError(config, 400, "A reason (min 5 characters) is required for credit notes");
    if (amount > row.balance + 0.001) throw httpError(config, 400, `Amount exceeds outstanding balance of $${row.balance.toFixed(2)}`);
    const cn: CreditNote = {
      id: `cn-${d.seq++}`, invoiceId: inv.id, clientId: inv.clientId, amount,
      reason: body.reason, createdBy: u.id, createdAt: new Date().toISOString(),
    };
    d.creditNotes.unshift(cn);
    const statusBefore = row.status;
    log(d, u, "creditnote.create", "CreditNote", cn.id, null, { invoice: inv.number, amount, reason: cn.reason });
    const statusAfter = liveStatus(inv, invoiceFinancials(d, inv.id).paid, invoiceFinancials(d, inv.id).credits);
    if (statusAfter !== statusBefore) log(d, u, "invoice.status", "Invoice", inv.id, { status: statusBefore }, { status: statusAfter });
    save();
    return ok({ creditNote: cn, invoice: enrichInvoice(d, inv) }, 201);
  }
  if ((m = path.match(/^\/invoices\/([\w-]+)\/soa$/)) && method === "get") {
    requireAuth();
    const inv = d.invoices.find((i) => i.id === m![1] && !i.isDeleted);
    if (!inv) throw httpError(config, 404, "Invoice not found");
    return ok(buildSoaPdf(d, enrichInvoice(d, inv)));
  }

  // ── Tickets & time logs (Module F) ────────────────────────────────────
  if (path === "/tickets" && method === "get") {
    requireAuth();
    const status = q.get("status");
    const priority = q.get("priority");
    const clientId = q.get("clientId");
    const assignedTo = q.get("assignedTo");
    const search = q.get("search") ?? "";
    let rows = d.tickets.map((t) => enrichTicket(d, t))
      .filter((t) =>
        (!status || t.status === status) &&
        (!priority || t.priority === priority) &&
        (!clientId || t.clientId === clientId) &&
        (!assignedTo || t.assignedToId === assignedTo) &&
        (!search || contains(t.subject, search) || contains(t.ref, search)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok(paginate(rows, q));
  }
  if (path === "/tickets" && method === "post") {
    const u = requireRole("Admin", "Support");
    if (!body.clientId || !body.subject) throw httpError(config, 400, "clientId and subject are required");
    const ticket: Ticket = {
      id: `t-${d.seq++}`, ref: `TK-${d.seq}`, clientId: body.clientId, subject: body.subject,
      description: body.description ?? "", priority: body.priority ?? "Medium",
      status: body.status ?? "Open", assignedToId: body.assignedToId || null,
      firstResponseAt: null, resolvedAt: null, createdAt: new Date().toISOString(),
    };
    d.tickets.unshift(ticket);
    log(d, u, "ticket.create", "Ticket", ticket.id, null, { ref: ticket.ref, priority: ticket.priority });
    save();
    return ok(enrichTicket(d, ticket), 201);
  }
  if ((m = path.match(/^\/tickets\/([\w-]+)$/)) && method === "get") {
    requireAuth();
    const t = d.tickets.find((x) => x.id === m![1]);
    if (!t) throw httpError(config, 404, "Ticket not found");
    return ok({
      ticket: enrichTicket(d, t),
      client: (() => { const c = d.clients.find((x) => x.id === t.clientId); return c ? enrichClient(d, c) : null; })(),
      timeLogs: d.timeLogs.filter((tl) => tl.ticketId === t.id)
        .map((tl) => ({ ...tl, userName: d.users.find((u2) => u2.id === tl.userId)?.name ?? "—" }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      attachments: d.attachments.filter((a) => a.ticketId === t.id)
        .map((a) => ({ ...a, uploadedByName: d.users.find((u2) => u2.id === a.uploadedBy)?.name ?? "—" })),
    });
  }
  if ((m = path.match(/^\/tickets\/([\w-]+)$/)) && method === "put") {
    const u = requireRole("Admin", "Support");
    const t = d.tickets.find((x) => x.id === m![1]);
    if (!t) throw httpError(config, 404, "Ticket not found");
    const before = { status: t.status, priority: t.priority, assignedToId: t.assignedToId };
    const newStatus = body.status ?? t.status;
    Object.assign(t, {
      subject: body.subject ?? t.subject,
      description: body.description ?? t.description,
      priority: body.priority ?? t.priority,
      clientId: body.clientId ?? t.clientId,
      assignedToId: body.assignedToId !== undefined ? (body.assignedToId || null) : t.assignedToId,
      status: newStatus,
    });
    if (newStatus !== "Open" && !t.firstResponseAt) t.firstResponseAt = new Date().toISOString();
    if ((newStatus === "Resolved" || newStatus === "Closed") && !t.resolvedAt) t.resolvedAt = new Date().toISOString();
    log(d, u, "ticket.update", "Ticket", t.id, before, { status: t.status, priority: t.priority });
    save();
    return ok(enrichTicket(d, t));
  }
  if ((m = path.match(/^\/tickets\/([\w-]+)\/time-logs$/)) && method === "post") {
    const u = requireRole("Admin", "Support");
    const t = d.tickets.find((x) => x.id === m![1]);
    if (!t) throw httpError(config, 404, "Ticket not found");
    const minutes = Number(body.minutes);
    if (!minutes || minutes <= 0) throw httpError(config, 400, "Minutes must be greater than zero");
    const tl: TimeLog = {
      id: `tl-${d.seq++}`, ticketId: t.id, userId: u.id, minutes,
      note: body.note ?? "", createdAt: new Date().toISOString(),
    };
    d.timeLogs.unshift(tl);
    if (!t.firstResponseAt) t.firstResponseAt = tl.createdAt;
    log(d, u, "timelog.create", "Ticket", t.id, null, { ref: t.ref, minutes });
    save();
    return ok({ timeLog: { ...tl, userName: u.name }, ticket: enrichTicket(d, t) }, 201);
  }
  if ((m = path.match(/^\/tickets\/([\w-]+)\/attachments$/)) && method === "post") {
    const u = requireRole("Admin", "Support");
    const t = d.tickets.find((x) => x.id === m![1]);
    if (!t) throw httpError(config, 404, "Ticket not found");
    const att: Attachment = {
      id: `at-${d.seq++}`, ticketId: t.id, name: body.name ?? "file.bin",
      size: Number(body.size) || 0, uploadedBy: u.id, createdAt: new Date().toISOString(),
    };
    d.attachments.push(att);
    log(d, u, "attachment.upload", "Ticket", t.id, null, { ref: t.ref, file: att.name });
    save();
    return ok({ ...att, uploadedByName: u.name }, 201);
  }

  // ── Reports (Module H) ────────────────────────────────────────────────
  if (path === "/reports/overdue-hosting" && method === "get") {
    requireAuth();
    const cycleDays: Record<string, number> = { Monthly: 30, Quarterly: 91, Annual: 365 };
    const rows: OverdueHostingRow[] = d.clients
      .filter((c) => !c.isDeleted && c.status === "Active" && c.hostingFeeAmount > 0)
      .map((c) => {
        const last = d.payments
          .filter((p) => p.clientId === c.id && p.category === "Hosting")
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];
        const anchor = last ? new Date(last.paymentDate).getTime() : new Date(c.createdAt).getTime();
        const daysSince = Math.floor((Date.now() - anchor) / DAY);
        const overdueBy = daysSince - cycleDays[c.hostingCycle];
        return { clientId: c.id, companyName: c.companyName, amount: c.hostingFeeAmount, cycle: c.hostingCycle, daysOverdue: overdueBy };
      })
      .filter((r) => r.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
    return ok(rows);
  }

  // ── Audit logs (Module I) ─────────────────────────────────────────────
  if (path === "/audit-logs" && method === "get") {
    requireRole("Admin");
    const userId = q.get("userId");
    const entityType = q.get("entityType");
    const from = q.get("from");
    const to = q.get("to");
    let rows = d.audit
      .filter((a) =>
        (!userId || a.userId === userId) &&
        (!entityType || a.entityType === entityType) &&
        (!from || a.timestamp >= new Date(from).toISOString()) &&
        (!to || a.timestamp <= new Date(new Date(to).getTime() + DAY).toISOString()))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return ok(paginate(rows, q));
  }

  // ── Users ─────────────────────────────────────────────────────────────
  if (path === "/users" && method === "get") {
    requireAuth();
    const status = q.get("status");
    let rows = d.users.filter((u) => !status || (status === "Active") === u.isActive)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(pubUser);
    return ok(paginate(rows, q));
  }
  if (path === "/users" && method === "post") {
    requireRole("Admin");
    if (d.users.some((u) => u.email.toLowerCase() === String(body.email ?? "").toLowerCase()))
      throw httpError(config, 400, "A user with this email already exists");
    const user: DbUser = {
      id: `u-${d.seq++}`, name: body.name, email: body.email, password: body.password || "welcome1",
      role: body.role ?? "Support", isActive: body.isActive !== false, createdAt: new Date().toISOString(),
    };
    d.users.push(user);
    const actor = me!;
    log(d, actor, "user.create", "User", user.id, null, { name: user.name, role: user.role });
    save();
    return ok(pubUser(user), 201);
  }
  if ((m = path.match(/^\/users\/([\w-]+)$/)) && method === "put") {
    const actor = requireRole("Admin");
    const user = d.users.find((u) => u.id === m![1]);
    if (!user) throw httpError(config, 404, "User not found");
    if (user.id === actor.id && body.isActive === false)
      throw httpError(config, 400, "You cannot deactivate your own account");
    const before = { role: user.role, isActive: user.isActive };
    Object.assign(user, {
      name: body.name ?? user.name,
      email: body.email ?? user.email,
      role: body.role ?? user.role,
      isActive: body.isActive !== undefined ? !!body.isActive : user.isActive,
    });
    if (body.password) user.password = body.password;
    log(d, actor, "user.update", "User", user.id, before, { role: user.role, isActive: user.isActive });
    save();
    return ok(pubUser(user));
  }

  throw httpError(config, 404, `No mock route for ${method.toUpperCase()} ${path}`);
}
