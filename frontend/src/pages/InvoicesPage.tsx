import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User, ApiResponse } from '@/types';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/modal';
import { DollarSign, History, FileText, Download, } from 'lucide-react';

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRatePct: number;
  taxAmount: number;
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue';
  deletedAt?: string;
  client: { companyName: string; };
  payments: [];
  creditNotes: [];
  paidAmount: number;
  creditTotal: number;
  balance: number;
  isOverdue: boolean;
};

type InvoiceFormValues = {
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRatePct: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
};

const statusOptions: SelectOption[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'PartiallyPaid', label: 'Partially Paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Overdue', label: 'Overdue' },
];

function statusBadgeColor(status: string) {
  switch (status) {
    case 'Draft': return 'bg-zinc-100 text-zinc-800';
    case 'Sent': return 'bg-blue-100 text-blue-800';
    case 'PartiallyPaid': return 'bg-yellow-100 text-yellow-800';
    case 'Paid': return 'bg-green-100 text-green-800';
    case 'Overdue': return 'bg-red-100 text-red-800';
    default: return 'bg-zinc-100 text-zinc-800';
  }
}

export function InvoicesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch invoices
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ invoices: Invoice[] }>>('/invoices');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch invoices');
      }
      return response.data.data;
    },
    staleTime: 30000,
  });

  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: async (variables: InvoiceFormValues) => {
      const response = await api.post<ApiResponse<Invoice>>('/invoices', variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create invoice');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-900">
        Error loading invoices: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select
          options={statusOptions}
        />
        <Input
          placeholder="Search invoices"
        />
      </div>

      {/* Table */}
      {data?.invoices.map((invoice) => (
        <Card key={invoice.id} className="shadow-sm border-b border-zinc-200 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-zinc-500 text-sm">Invoice #</p>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Client</p>
                <p className="font-medium">{invoice.client.companyName}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Status</p>
                <span className={cn('px-2 py-1 rounded text-xs font-medium', statusBadgeColor(invoice.status))}>
                  {invoice.status}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-zinc-500 text-sm">Total</p>
                  <p className="font-medium text-zinc-900">${invoice.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Paid</p>
                  <p className="text-zinc-500">${invoice.paidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Balance</p>
                  <p className="font-medium text-red-600">${invoice.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Due</p>
                  <p className="text-zinc-400">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}