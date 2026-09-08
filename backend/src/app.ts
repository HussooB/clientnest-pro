import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { notFound, errorHandler } from "./middleware/error.middleware";

import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import clientRoutes from "./routes/client.routes";
import leadRoutes from "./routes/lead.routes";
import productRoutes from "./routes/product.routes";
import licenseRoutes from "./routes/license.routes";

import invoiceRoutes from "./routes/invoice.routes";
import paymentRoutes from "./routes/payment.routes";
import creditNoteRoutes from "./routes/creditNote.routes";
import reportRoutes from "./routes/report.routes";
import auditRoutes from "./routes/audit.routes";
import ticketRoutes from "./routes/ticket.routes";
import contractRoutes from "./routes/contract.routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/credit-notes", creditNoteRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/contracts", contractRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;