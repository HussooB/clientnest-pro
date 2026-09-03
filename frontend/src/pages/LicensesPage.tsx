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
import { DollarSign, Clock, Trash, Eye, } from 'lucide-react';

type License = {
  id: string;
  clientId: string;
  productId: string;
  type: 'Perpetual' | 'Subscription';
  startDate: string;
  endDate?: string;
  seats: number;
  client: { companyName: string };
  product: { name: string };
  daysToExpiry?: number;
};

type LicenseFormValues = {
  clientId: string;
  productId: string;
  type: string;
  startDate: string;
  endDate?: string;
  seats: number;
};

const licenseTypeOptions: SelectOption[] = [
  { value: 'Perpetual', label: 'Perpetual' },
  { value: 'Subscription', label: 'Subscription' },
];

const typeColor = {
  Perpetual: 'bg-zinc-100 text-zinc-800',
  Subscription: 'bg-blue-100 text-blue-800',
};

export function LicensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch licenses
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ licenses: License[] }>({
    queryKey: ['licenses'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ licenses: License[] }>>('/licenses');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch licenses');
      }
      return response.data.data;
    },
    staleTime: 30000,
  });

  // Create license mutation
  const createMutation = useMutation({
    mutationFn: async (variables: LicenseFormValues) => {
      const response = await api.post<ApiResponse<License>>('/licenses', variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create license');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
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
        Error loading licenses: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Licenses</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select
          options={licenseTypeOptions}
        />
        <Select
          options={[
            { value: '30', label: 'Expiring Within 30 Days' },
            { value: '60', label: 'Expiring Within 60 Days' },
            { value: '90', label: 'Expiring Within 90 Days' },
          ]}
        />
      </div>

      {/* Table */}
      {data?.licenses.map((license) => {
        const expiryClass = license.daysToExpiry
          ? license.daysToExpiry < 30
            ? 'bg-red-100 text-red-800'
            : license.daysToExpiry < 60
              ? 'bg-orange-100 text-orange-800'
              : 'bg-yellow-100 text-yellow-800'
          : 'bg-zinc-100 text-zinc-800';

        return (
          <Card key={license.id} className="shadow-sm border-b border-zinc-200 overflow-hidden">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-zinc-500 text-sm">Client</p>
                  <p className="font-medium">{license.client.companyName}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Product</p>
                  <p className="font-medium">{license.product.name}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Type</p>
                  <span className={cn('px-2 py-1 rounded text-xs font-medium', typeColor[license.type])}>
                    {license.type}
                  </span>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Seats</p>
                  <p className="font-medium">{license.seats}</p>
                </div>
              </div>

              {license.daysToExpiry && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <p className="text-zinc-500 text-sm">Days to Expiry</p>
                  <span className={cn('px-2 py-1 rounded text-xs font-medium', expiryClass)}>
                    {license.daysToExpiry} days
                  </span>
                </div>
              )}

              {!license.endDate && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <p className="text-zinc-500 text-sm">License Type</p>
                  <span>Perpetual</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}