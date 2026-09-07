/// <reference types="node" />
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { Role, ClientStatus, LeadStage, LeadSource, LicenseType, InvoiceStatus, PaymentCategory, HostingCycle, ContactType } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

async function main() {
  console.log("🌱 Seeding ClientNest Pro database...");

  try {
    // 🧹 Clean existing data (in correct order to respect foreign keys)
    console.log("🧹 Clearing existing data...");
    await prisma.payment.deleteMany({});
    await prisma.creditNote.deleteMany({});
    await prisma.timeLog.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.license.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("✅ Database cleared");

    // 1. Seed Users
    const seedUsers = [
      { email: "admin@clientnest.com", password: "Admin123!", role: Role.Admin, name: "System Admin" },
      { email: "finance@clientnest.com", password: "Finance123!", role: Role.Finance, name: "Finance User" },
      { email: "support@clientnest.com", password: "Support123!", role: Role.Support, name: "Support User" },
      { email: "sales@clientnest.com", password: "Sales123!", role: Role.Sales, name: "Sales User" },
    ];

    for (const user of seedUsers) {
      const passwordHash = await hashPassword(user.password);
      await prisma.user.create({
        data: { email: user.email, name: user.name, role: user.role, passwordHash, isActive: true },
      });
    }
    console.log("✅ Users seeded");

    const adminUser = await prisma.user.findUnique({ where: { email: "admin@clientnest.com" } });
    const salesUser = await prisma.user.findUnique({ where: { email: "sales@clientnest.com" } });

    // 2. Seed Products
    const products = await Promise.all([
      prisma.product.create({ data: { name: "ERP Pro", description: "Enterprise Resource Planning Suite", basePrice: 5000 } }),
      prisma.product.create({ data: { name: "HR Lite", description: "Human Resources Management", basePrice: 2000 } }),
      prisma.product.create({ data: { name: "Payroll Plus", description: "Payroll Processing System", basePrice: 3000 } }),
    ]);
    console.log("✅ Products seeded");

    // 3. Seed Clients
    const clients = await Promise.all([
      prisma.client.create({
        data: {
          companyName: "Acme Corporation",
          taxId: "TAX-001",
          billingAddress: "123 Business St, Tech City",
          industryType: "Technology",
          status: ClientStatus.Active,
          accountOwnerId: adminUser?.id || "",
          taxRatePct: 15,
          hostingFeeAmount: 500,
          hostingCycle: HostingCycle.Monthly,
        },
      }),
      prisma.client.create({
        data: {
          companyName: "Global Solutions Ltd",
          taxId: "TAX-002",
          billingAddress: "456 Commerce Ave",
          industryType: "Consulting",
          status: ClientStatus.Active,
          accountOwnerId: salesUser?.id || "",
          taxRatePct: 10,
          hostingFeeAmount: 300,
          hostingCycle: HostingCycle.Yearly,
        },
      }),
      prisma.client.create({
        data: {
          companyName: "StartUp Inc",
          taxId: "TAX-003",
          billingAddress: "789 Innovation Blvd",
          industryType: "Startup",
          status: ClientStatus.Prospect,
          accountOwnerId: salesUser?.id || "",
          taxRatePct: 5,
          hostingFeeAmount: 0,
          hostingCycle: HostingCycle.Monthly,
        },
      }),
    ]);
    console.log("✅ Clients seeded");

    // 4. Seed Contacts
    await Promise.all([
      prisma.contact.create({
        data: { name: "John Doe", email: "john@acme.com", phone: "+1-555-0100", contactType: ContactType.Billing, notifyEmail: true, clientId: clients[0].id },
      }),
      prisma.contact.create({
        data: { name: "Jane Smith", email: "jane@globalsolutions.com", phone: "+1-555-0200", contactType: ContactType.Technical, notifyEmail: true, clientId: clients[1].id },
      }),
    ]);
    console.log("✅ Contacts seeded");

    // 5. Seed Leads
    await Promise.all([
      prisma.lead.create({
        data: {
          companyName: "Tech Innovators",
          contactName: "Mike Johnson",
          email: "mike@techinnovators.com",
          phone: "+1-555-0300",
          source: LeadSource.Website,
          estimatedValue: 15000,
          stage: LeadStage.Negotiation,
        },
      }),
      prisma.lead.create({
        data: {
          companyName: "Future Systems",
          contactName: "Sarah Williams",
          email: "sarah@futuresystems.com",
          phone: "+1-555-0400",
          source: LeadSource.Referral,
          estimatedValue: 25000,
          stage: LeadStage.ProposalSent,
        },
      }),
      prisma.lead.create({
        data: {
          companyName: "Digital Dynamics",
          contactName: "Tom Brown",
          email: "tom@digitaldynamics.com",
          phone: "+1-555-0500",
          source: LeadSource.ColdCall,
          estimatedValue: 10000,
          stage: LeadStage.New,
        },
      }),
    ]);
    console.log("✅ Leads seeded");

    // 6. Seed Licenses
    const today = new Date();
    const thirtyDays = new Date(today);
    thirtyDays.setDate(today.getDate() + 30);

    await Promise.all([
      prisma.license.create({
        data: {
          clientId: clients[0].id,
          productId: products[0].id,
          type: LicenseType.Subscription,
          startDate: today,
          endDate: thirtyDays,
          seats: 10,
        },
      }),
      prisma.license.create({
        data: {
          clientId: clients[1].id,
          productId: products[1].id,
          type: LicenseType.Perpetual,
          startDate: today,
          endDate: null,
          seats: 5,
        },
      }),
    ]);
    console.log("✅ Licenses seeded");

    // 7. Seed Invoices
    const invoices = await Promise.all([
      prisma.invoice.create({
        data: {
          invoiceNumber: "INV-2026-001",
          clientId: clients[0].id,
          issueDate: today,
          dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 5000,
          taxRatePct: 15,
          taxAmount: 750,
          totalAmount: 5750,
          status: InvoiceStatus.Sent,
        },
      }),
      prisma.invoice.create({
        data: {
          invoiceNumber: "INV-2026-002",
          clientId: clients[1].id,
          issueDate: today,
          dueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
          subtotal: 3000,
          taxRatePct: 10,
          taxAmount: 300,
          totalAmount: 3300,
          status: InvoiceStatus.Overdue,
        },
      }),
    ]);
    console.log("✅ Invoices seeded");

    // 8. Seed Payments
    await prisma.payment.create({
      data: {
        invoiceId: invoices[0].id,
        amount: 2000,
        paymentDate: today,
        method: "Bank Transfer",
        category: PaymentCategory.License,
        createdById: adminUser!.id,
      },
    });
    console.log("✅ Payments seeded");

    console.log("\n🎉 Seed complete! Database is fully ready for supervisor demo.");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();