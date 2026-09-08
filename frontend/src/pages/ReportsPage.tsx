import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtMoney, fmtDate, daysOverdue } from "../lib/utils";
import type { Lead, TicketRow, InvoiceRow, ListResponse } from "../types";
import { Badge, Bar, Button, Card, Table, Td, Th, EmptyState } from "../components/ui";
import { stageTone, priorityTone } from "../components/ui";
import { ExpiryBadge } from "./LicensesPage";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ Import autoTable directly as a function

// Helper to safely extract arrays from API responses
const getArr = <T,>(d: unknown): T[] => {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === "object" && "data" in d && Array.isArray((d as Record<string, unknown>).data)) {
    return (d as Record<string, unknown>).data as T[];
  }
  return [];
};

export default function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role ?? "Admin";

  // 1. Fetch Raw Data
  const leadsQ = useQuery({
    queryKey: ["reports", "leads"],
    queryFn: async () => (await api.get<ListResponse<Lead>>("/leads", { params: { limit: 1000 } })).data,
    enabled: role === "Admin" || role === "Sales",
  });

  const ticketsQ = useQuery({
    queryKey: ["reports", "tickets"],
    queryFn: async () => (await api.get<ListResponse<TicketRow>>("/tickets", { params: { limit: 1000 } })).data,
  });

  const invoicesQ = useQuery({
    queryKey: ["reports", "invoices"],
    queryFn: async () => (await api.get<ListResponse<InvoiceRow>>("/invoices", { params: { limit: 1000 } })).data,
    enabled: role === "Admin" || role === "Finance",
  });

  // Cast to any[] to safely access nested client/product objects from API
  const licensesQ = useQuery({
    queryKey: ["reports", "licenses"],
    queryFn: async () => (await api.get<any>("/licenses", { params: { limit: 1000 } })).data,
  });

  const isLoading = leadsQ.isPending || ticketsQ.isPending || invoicesQ.isPending || licensesQ.isPending;

  // 2. Calculate Report Data
  const reportData = useMemo(() => {
    const leads = getArr<Lead>(leadsQ.data);
    const tickets = getArr<TicketRow>(ticketsQ.data);
    const invoices = getArr<InvoiceRow>(invoicesQ.data);
    const licenses = getArr<any>(licensesQ.data);

    // --- Report 1: Sales Pipeline (Module H.4) ---
    const stages = ["New", "Contacted", "ProposalSent", "Negotiation", "Won", "Lost"];
    const pipeline = stages.map((stage) => {
      const stageLeads = leads.filter((l) => l.stage === stage);
      return {
        stage,
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
      };
    });
    const totalPipelineValue = pipeline.reduce((sum, p) => sum + p.value, 0);
    const wonValue = pipeline.find((p) => p.stage === "Won")?.value || 0;
    const conversionRate = leads.length > 0 ? ((pipeline.find((p) => p.stage === "Won")?.count || 0) / leads.length) * 100 : 0;

    // --- Report 2: SLA & Support (Module H.5) ---
    const openTickets = tickets.filter((t) => t.status === "Open" || t.status === "In Progress");
    const criticalTickets = openTickets.filter((t) => t.priority === "Critical");
    const highTickets = openTickets.filter((t) => t.priority === "High");
    
    // --- Report 3: Client Revenue (Module H.3) ---
    const clientRevenue = invoices.reduce((acc, inv) => {
      const name = inv.clientName || "Unknown Client";
      if (!acc[name]) acc[name] = 0;
      acc[name] += inv.totalAmount || 0;
      return acc;
    }, {} as Record<string, number>);
    
    const topClients = Object.entries(clientRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    // --- Report 4: Expiring Licenses (Module H.2) ---
    const expiringSoon = licenses
      .filter((l: any) => l.daysToExpiry !== null && l.daysToExpiry <= 90 && l.daysToExpiry >= 0)
      .map((l: any) => ({
        id: l.id,
        clientName: l.client?.companyName || l.clientName || "Unknown Client",
        productName: l.product?.name || l.productName || "Unknown Product",
        type: l.type,
        seats: l.seats,
        daysToExpiry: l.daysToExpiry,
      }));

    return { pipeline, totalPipelineValue, wonValue, conversionRate, openTickets, criticalTickets, highTickets, topClients, expiringSoon };
  }, [leadsQ.data, ticketsQ.data, invoicesQ.data, licensesQ.data]);

  // 3. Export Utilities
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (!data.length) return;
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(header => {
        const val = row[header] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], filename: string, title: string, columns: { header: string; dataKey: string }[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // ✅ FIX: Call autoTable as a function, passing the doc instance as the first argument
    autoTable(doc, {
      head: [columns.map(c => c.header)],
      body: data.map(row => columns.map(c => row[c.dataKey] ?? "")),
      startY: 25,
      theme: "striped",
    });
    
    doc.save(`${filename}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Reports & Analytics</h1>
        <p className="text-[13.5px] text-mute">Module H — Comprehensive business intelligence and compliance tracking.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* --- REPORT 1: Sales Pipeline (H.4) --- */}
        {(role === "Admin" || role === "Sales") && (
          <Card 
            title="Sales Pipeline Analysis" 
            sub="Lead volume, value, and conversion rates" 
            className="animate-fade-up"
            actions={
              <div className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => exportToCSV(reportData.pipeline.map(p => ({ Stage: p.stage, Count: p.count, Value: p.value })), "sales_pipeline", ["Stage", "Count", "Value"])}>CSV</Button>
                <Button size="xs" variant="ghost" onClick={() => exportToPDF(reportData.pipeline.map(p => ({ stage: p.stage, count: p.count, value: fmtMoney(p.value) })), "sales_pipeline", "Sales Pipeline Analysis", [{ header: "Stage", dataKey: "stage" }, { header: "Count", dataKey: "count" }, { header: "Value", dataKey: "value" }])}>PDF</Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-[11px] font-bold uppercase text-mute">Total Pipeline</p>
                  <p className="tnum font-mono text-lg font-bold text-brand-800">{fmtMoney(reportData.totalPipelineValue)}</p>
                </div>
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-[11px] font-bold uppercase text-mute">Won Value</p>
                  <p className="tnum font-mono text-lg font-bold text-emerald-700">{fmtMoney(reportData.wonValue)}</p>
                </div>
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-[11px] font-bold uppercase text-mute">Conversion Rate</p>
                  <p className="tnum font-mono text-lg font-bold text-brand-800">{reportData.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                {reportData.pipeline.map((p) => (
                  <div key={p.stage}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-bold">{p.stage} <span className="ml-1 font-mono text-mute">×{p.count}</span></span>
                      <span className="tnum font-mono font-semibold">{fmtMoney(p.value)}</span>
                    </div>
                    <Bar pct={(p.value / Math.max(1, reportData.totalPipelineValue)) * 100} tone={stageTone(p.stage as any)} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* --- REPORT 2: SLA Compliance (H.5) --- */}
        <Card title="SLA Compliance & Support Load" sub="Ticket distribution and critical alerts" className="animate-fade-up">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-[11px] font-bold uppercase text-rose-800">Critical Open</p>
                <p className="tnum font-mono text-2xl font-bold text-rose-700">{reportData.criticalTickets.length}</p>
                <p className="text-[11px] text-rose-600">Requires immediate attention</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] font-bold uppercase text-amber-800">High Priority Open</p>
                <p className="tnum font-mono text-2xl font-bold text-amber-700">{reportData.highTickets.length}</p>
                <p className="text-[11px] text-amber-600">Monitor closely</p>
              </div>
            </div>

            <div className="pt-2">
              <p className="mb-2 text-[12px] font-bold uppercase text-mute">Open Tickets by Priority</p>
              <div className="space-y-2">
                {["Critical", "High", "Medium", "Low"].map((p) => {
                  const count = reportData.openTickets.filter((t) => t.priority === p).length;
                  const total = reportData.openTickets.length || 1;
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <span className="w-16 text-[12px] font-bold">{p}</span>
                      <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
                        <div className={`h-full ${priorityTone(p) === "red" ? "bg-rose-600" : priorityTone(p) === "amber" ? "bg-amber-500" : priorityTone(p) === "blue" ? "bg-sky-600" : "bg-slate-400"}`} style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-[12px] font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* --- REPORT 3: Client Profitability (H.3) --- */}
        {(role === "Admin" || role === "Finance") && (
          <Card 
            title="Top Revenue Generating Clients" 
            sub="Total invoiced amount per client" 
            className="animate-fade-up"
            actions={
              <div className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => exportToCSV(reportData.topClients.map((c, i) => ({ Rank: i + 1, Client: c.name, TotalRevenue: c.total })), "top_clients", ["Rank", "Client", "TotalRevenue"])}>CSV</Button>
                <Button size="xs" variant="ghost" onClick={() => exportToPDF(reportData.topClients.map((c, i) => ({ rank: i + 1, client: c.name, revenue: fmtMoney(c.total) })), "top_clients", "Top Revenue Generating Clients", [{ header: "Rank", dataKey: "rank" }, { header: "Client", dataKey: "client" }, { header: "Revenue", dataKey: "revenue" }])}>PDF</Button>
              </div>
            }
          >
            {reportData.topClients.length === 0 ? (
              <EmptyState title="No invoice data available" />
            ) : (
              <Table minWidth="min-w-[400px]" head={<><Th>Client</Th><Th className="text-right">Total Revenue</Th></>}>
                {reportData.topClients.map((c, idx) => (
                  <tr key={c.name} className="transition-colors hover:bg-brand-50/40">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">{idx + 1}</span>
                        <span className="font-bold">{c.name}</span>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <span className="tnum font-mono font-bold text-emerald-700">{fmtMoney(c.total)}</span>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        )}

        {/* --- REPORT 4: Expiring Licenses (H.2) --- */}
        <Card 
          title="Licenses Expiring ≤ 90 Days" 
          sub="Renewal radar for proactive outreach" 
          className="animate-fade-up"
          actions={
            <div className="flex gap-1">
              <Button size="xs" variant="ghost" onClick={() => exportToCSV(reportData.expiringSoon.map(l => ({ Client: l.clientName, Product: l.productName, Type: l.type, Seats: l.seats, DaysToExpiry: l.daysToExpiry })), "expiring_licenses", ["Client", "Product", "Type", "Seats", "DaysToExpiry"])}>CSV</Button>
              <Button size="xs" variant="ghost" onClick={() => exportToPDF(reportData.expiringSoon.map(l => ({ client: l.clientName, product: l.productName, type: l.type, seats: l.seats, days: l.daysToExpiry })), "expiring_licenses", "Licenses Expiring ≤ 90 Days", [{ header: "Client", dataKey: "client" }, { header: "Product", dataKey: "product" }, { header: "Type", dataKey: "type" }, { header: "Seats", dataKey: "seats" }, { header: "Days Left", dataKey: "days" }])}>PDF</Button>
            </div>
          }
        >
          {reportData.expiringSoon.length === 0 ? (
            <EmptyState title="No licenses expiring soon" hint="All active licenses are healthy." />
          ) : (
            <Table minWidth="min-w-[500px]" head={<><Th>Client</Th><Th>Product</Th><Th>Expiry</Th></>}>
              {reportData.expiringSoon.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-brand-50/40">
                  <Td className="font-bold">{l.clientName}</Td>
                  <Td>
                    <p className="font-medium">{l.productName}</p>
                    <p className="text-[11px] text-mute">{l.type} · {l.seats} seats</p>
                  </Td>
                  <Td>
                    <ExpiryBadge days={l.daysToExpiry} />
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

      </div>
    </div>
  );
}