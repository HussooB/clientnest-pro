import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';
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
import { DollarSign, ArrowRight, Trash, Eye, Edit } from 'lucide-react';

type Lead = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  source: string;
  estimatedValue: number;
  stage: string;
  lostReason?: string;
  convertedClientId?: string;
  createdAt: string;
  updatedAt: string;
};

type LeadFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  source: string;
  estimatedValue: number;
  stage: string;
  lostReason?: string;
};

const stageOptions: SelectOption[] = [
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Negotiation', label: 'Negotiation' },
  { value: 'Won', label: 'Won' },
  { value: 'Lost', label: 'Lost' },
];

const sourceOptions: SelectOption[] = [
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Cold Call', label: 'Cold Call' },
  { value: 'Trade Show', label: 'Trade Show' },
  { value: 'Social', label: 'Social' },
];

function stageColor(stage: string) {
  switch (stage) {
    case 'Won': return 'bg-green-100 text-green-800';
    case 'Lost': return 'bg-red-100 text-red-800';
    case 'Negotiation': return 'bg-orange-100 text-orange-800';
    case 'Proposal': return 'bg-yellow-100 text-yellow-800';
    case 'Contacted': return 'bg-blue-100 text-blue-800';
    case 'New': return 'bg-zinc-100 text-zinc-800';
    default: return 'bg-zinc-100 text-zinc-800';
  }
}

export function LeadsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch leads
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ leads: Lead[] }>({
    queryKey: ['leads'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ leads: Lead[] }>>('/leads');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch leads');
      }
      return response.data.data;
    },
    staleTime: 30000,
  });

  // Create lead mutation
  const createMutation = useMutation({
    mutationFn: async (variables: LeadFormValues) => {
      const response = await api.post<ApiResponse<Lead>>('/leads', variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create lead');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Update lead mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, variables }: { id: string; variables: LeadFormValues }) => {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}`, variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update lead');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Convert lead mutation
  const convertMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await api.post<ApiResponse<Lead>>(`/leads/${leadId}/convert`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to convert lead');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Mark lost mutation
  const markLostMutation = useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason: string }) => {
      const response = await api.post<ApiResponse<Lead>>(`/leads/lost`, { lostReason: reason });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to mark lead as lost');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
        Error loading leads: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  // Check permissions
  const canManageLeads = user?.role === 'Admin' || user?.role === 'Sales';
  const canConvert = user?.role === 'Admin' || user?.role === 'Sales';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Leads</h1>
      </div>

      {/* Table */}
      {data?.leads.map((lead) => (
        <Card key={lead.id} className={cn('shadow-sm border-b border-zinc-200 overflow-hidden', {})}>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-sm">Company</p>
                <p className="font-medium">{lead.companyName}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Contact</p>
                <p className="font-medium">{lead.contactName}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Email</p>
                <p className="font-medium text-zinc-400">{lead.email}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Est. Value</p>
                <p className="font-medium">${lead.estimatedValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-zinc-500 text-sm">Stage</p>
              <span className={cn('px-2 py-1 rounded text-xs font-medium', stageColor(lead.stage))}>
                {lead.stage}
              </span>
            </div>
          </div>
        </Card>
      ))}

      {/* Create Lead Modal */}
      {canManageLeads && (
        <Modal
          open={false}
          onClose={() => {}}
          title="Create New Lead"
        >
          <form
            className="space-y-4 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData((e.target as HTMLFormElement));
              const variables: LeadFormValues = {
                companyName: formData.get('companyName') as string,
                contactName: formData.get('contactName') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string || undefined,
                source: formData.get('source') as string,
                estimatedValue: Number(formData.get('estimatedValue')),
                stage: formData.get('stage') as string,
                lostReason: undefined,
              };
              try {
                await createMutation.mutateAsync(variables);
              } catch (err) {
                console.error('Error creating lead:', err);
              }
            }}
          >
            <Input
              id="companyName"
              name="companyName"
              placeholder="Company name"
              required
            />
            <Input
              id="contactName"
              name="contactName"
              placeholder="Contact name"
              required
            />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              required
            />
            <Input
              id="phone"
              name="phone"
              placeholder="Phone"
            />
            <Select
              options={sourceOptions}
            />
            <Select
              options={stageOptions}
            />
            <Input
              id="estimatedValue"
              name="estimatedValue"
              type="number"
              placeholder="Estimated value"
              required
            />
            <div>
              <Button type="submit">Create Lead</Button>
              <Button onClick={() => {}}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}