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
import { Clock, Trash, Eye, } from 'lucide-react';

type Ticket = {
  id: string;
  subject: string;
  clientId: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  timeSpent: number;
};

type TicketFormValues = {
  subject: string;
  clientId: string;
  priority: string;
  status: string;
};

const priorityOptions: SelectOption[] = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const statusOptions: SelectOption[] = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

function priorityColor(priority: string) {
  switch (priority) {
    case 'Low': return 'bg-zinc-100 text-zinc-800';
    case 'Medium': return 'bg-blue-100 text-blue-800';
    case 'High': return 'bg-orange-100 text-orange-800';
    case 'Critical': return 'bg-red-100 text-red-800';
    default: return 'bg-zinc-100 text-zinc-800';
  }
}

export function SupportTicketsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tickets
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ tickets: Ticket[] }>>('/tickets');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch tickets');
      }
      return response.data.data;
    },
    staleTime: 30000,
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (variables: TicketFormValues) => {
      const response = await api.post<ApiResponse<Ticket>>('/tickets', variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create ticket');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
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
        Error loading tickets: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Support Tickets</h1>
      </div>

 {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select
          options={priorityOptions}
        />
        <Select
          options={statusOptions}
        />
      </div>

      {/* Table */}
      {data?.tickets.map((ticket) => (
        <Card key={ticket.id} className="shadow-sm border-b border-zinc-200 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-zinc-500 text-sm">Subject</p>
                <p className="font-medium truncate">{ticket.subject}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Priority</p>
                <span className={cn('px-2 py-1 rounded text-xs font-medium', priorityColor(ticket.priority))}>
                  {ticket.priority}
                </span>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Status</p>
                <span className="px-2 py-1 rounded text-xs font-medium">
                  {ticket.status}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-zinc-500 text-sm">Client</p>
                  <p className="text-zinc-500 text-sm">Assigned</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Time Spent</p>
                  <p className="font-medium">{ticket.timeSpent} min</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm">Created</p>
                  <p className="text-zinc-400">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}