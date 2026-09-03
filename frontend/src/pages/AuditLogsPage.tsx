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
import { Users, Building, Mail, Clipboard, Calendar, } from 'lucide-react';

type AuditLog = {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string;
  after: string;
  createdAt: string;
};

type AuditLogFormValues = {
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

const entityTypeOptions: SelectOption[] = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Client', label: 'Client' },
  { value: 'License', label: 'License' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'User', label: 'User' },
];

export function AuditLogsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check admin permission
  const isAdmin = user?.role === 'Admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-zinc-50 p-4 text-zinc-600">
          <p>Access denied. Admin role required.</p>
          <Button onClick={() => window.history.back()}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Fetch audit logs
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ auditLogs: AuditLog[] }>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ auditLogs: AuditLog[] }>>('/audit-logs');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch audit logs');
      }
      return response.data.data;
    },
    staleTime: 60000,
  });

  // Export audit logs
  const exportLogs = () => {
    // Implementation for exporting audit logs
  };

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
        Error loading audit logs: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Audit Logs</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Select
          options={entityTypeOptions}
        />
        <Input
          placeholder="Search"
        />
        <Input
          placeholder="User ID"
        />
        <Button>Export Logs</Button>
      </div>

      {/* Table */}
      {data?.auditLogs.map((log) => (
        <Card key={log.id} className="shadow-sm border-b border-zinc-200 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-sm">Timestamp</p>
                <p className="text-zinc-500">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">User</p>
                <p className="text-zinc-500">{log.userEmail}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-zinc-500 text-sm">Action</p>
                  <p className="text-zinc-500">{log.action}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Entity</p>
                  <p className="text-zinc-500">{log.entityType} (ID: {log.entityId})</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}