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
import { Users, UserCheck, Building, Mail, LogOut, Settings } from 'lucide-react';

type Client = {
  id: string;
  companyName: string;
  taxId: string;
  billingAddress: string;
  industryType: string;
  status: 'Active' | 'Inactive' | 'Churned';
  accountOwnerId: string;
  taxRatePct: number;
  hostingFeeAmount: number;
  hostingCycle: 'Monthly' | 'Quarterly' | 'Annual';
  amcEndDate?: string;
  amcIncludedHours: number;
  hourlyRate: number;
  deletedAt?: string;
  contacts: [];
  licenses: [];
  invoices: [];
  createdAt: string;
  updatedAt: string;
};

type ClientFormValues = {
  companyName: string;
  taxId: string;
  billingAddress: string;
  industryType: string;
  status: string;
  taxRatePct: number;
  hostingFeeAmount: number;
  hostingCycle: string;
  amcEndDate?: string;
  amcIncludedHours: number;
  hourlyRate: number;
};

const industryOptions: SelectOption[] = [
  { value: 'Technology', label: 'Technology' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Education', label: 'Education' },
  { value: 'Other', label: 'Other' },
];

const hostingCycleOptions: SelectOption[] = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Annual', label: 'Annual' },
];

function statusColor(status: string) {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800';
    case 'Inactive': return 'bg-zinc-100 text-zinc-800';
    case 'Churned': return 'bg-red-100 text-red-800';
    default: return 'bg-zinc-100 text-zinc-800';
  }
}

export function ClientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch clients
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ clients: Client[] }>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ clients: Client[] }>>('/clients');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch clients');
      }
      return response.data.data;
    },
    staleTime: 30000,
  });

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (variables: ClientFormValues) => {
      const response = await api.post<ApiResponse<Client>>('/clients', variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create client');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
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
        Error loading clients: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Clients</h1>
      </div>

      {/* Table */}
      {data?.clients.map((client) => (
        <Card key={client.id} className="shadow-sm border-b border-zinc-200 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-sm">Company</p>
                <p className="font-medium">{client.companyName}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Tax ID</p>
                <p className="font-medium">{client.taxId}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Status</p>
                <span className={cn('px-2 py-1 rounded text-xs font-medium', statusColor(client.status))}>
                  {client.status}
                </span>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Account Owner</p>
                <p className="font-medium">{client.accountOwnerId}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-zinc-500 text-sm">Industry</p>
              <p className="text-zinc-500 text-sm">{client.industryType}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}