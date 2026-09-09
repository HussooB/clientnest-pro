import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { fmtDate, fmtMoney, useClientsOptions } from "../lib/utils";
import { PAYMENT_CATEGORIES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, EmptyState, ErrorState,
  Pagination, Select, Table, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconSearch, IconDownload } from "../components/icons";

const LIMIT = 20;

interface PaymentRow {
  id: string;
  amount: number;
  paymentDate: string;
  method: string | null;
  category: string;
  notes: string | null;
  invoice: {
    invoiceNumber: string;
    client: {
      companyName: string;
    };
  };
  createdBy: {
    name: string;
  } | null;
}

export default function PaymentsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  const clientsQ = useClientsOptions();

  useEffect(() => {
    if (params.get("clientId") || params.get("category") || params.get("from") || params.get("to")) {
      setParams({}, { replace: true });
    }
  }, []);

  useEffect(() => setPage(1), [search, clientId, category, from, to]);

  const paymentsQ = useQuery({
    queryKey: ["payments", page, clientId, category, from, to],
    queryFn: async () => {
      const res = await api.get<any>("/payments", {
        params: {
          clientId: clientId || undefined,
          category: category || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      return res.data.data || [];
    },
  });

  // Client-side search filtering
  const allRows: PaymentRow[] = paymentsQ.data ?? [];
  const filteredRows = allRows.filter((p: PaymentRow) => 
    !search || 
    p.invoice.client.companyName.toLowerCase().includes(search.toLowerCase()) || 
    p.invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filteredRows.slice((page - 1) * LIMIT, page * LIMIT);
  const total = filteredRows.length;

  const exportToCSV = () => {
    if (!filteredRows.length) return;
    const headers = ["Date", "Invoice", "Client", "Amount", "Method", "Category", "Recorded By", "Notes"];
    const csvContent = [
      headers.join(","),
      ...filteredRows.map((p: PaymentRow) => 
        [
          fmtDate(p.paymentDate),
          p.invoice.invoiceNumber,
          `"${p.invoice.client.companyName}"`,
          p.amount,
          p.method || "N/A",
          p.category,
          `"${p.createdBy?.name || "Unknown"}"`,
          `"${(p.notes || "").replace(/"/g, '""')}"`
        ].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push("success", "Payments exported to CSV");
  };

  return (
    <div>
      <PageHeader 
        title="Payment Reconciliation" 
        desc="Module D — comprehensive view of all recorded payments across the platform."
        actions={
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredRows.length === 0}>
            <IconDownload width={14} height={14} className="mr-1.5" /> Export CSV
          </Button>
        } 
      />
      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search client or invoice #" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-[180px]">
            <option value="">All clients</option>
            {(clientsQ.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-[160px]">
            <option value="">All categories</option>
            {PAYMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[145px]" placeholder="From" />
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[145px]" placeholder="To" />
        </div>

        {paymentsQ.isError ? (
          <ErrorState message={apiErrorMsg(paymentsQ.error)} onRetry={() => paymentsQ.refetch()} />
        ) : paymentsQ.isPending ? (
          <div className="p-6"><div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No payments found" hint="Try adjusting your filters or date range." />
        ) : (
          <Table minWidth="min-w-[1000px]" head={<><Th>Date</Th><Th>Invoice</Th><Th>Client</Th><Th className="text-right">Amount</Th><Th>Method</Th><Th>Category</Th><Th>Recorded By</Th><Th>Notes</Th></>}>
            {rows.map((p: PaymentRow) => (
              <tr key={p.id} className="group transition-colors hover:bg-brand-50/40">
                <Td className="text-mute">{fmtDate(p.paymentDate)}</Td>
                <Td className="font-mono font-bold text-brand-800">{p.invoice.invoiceNumber}</Td>
                <Td className="font-medium">{p.invoice.client.companyName}</Td>
                <Td className="text-right"><span className="tnum font-mono font-bold text-emerald-700">{fmtMoney(p.amount)}</span></Td>
                <Td><Badge tone="slate">{p.method || "N/A"}</Badge></Td>
                <Td><Badge tone="teal">{p.category}</Badge></Td>
                <Td className="text-mute text-[13px]">{p.createdBy?.name || "Unknown"}</Td>
                <Td className="max-w-[150px] truncate text-[12.5px] text-mute">{p.notes || "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
        {!paymentsQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>
    </div>
  );
}