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
import { UserPlus, Users, Trash, Eye, Edit, } from 'lucide-react';

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Finance' | 'Support' | 'Sales';
  active: boolean;
};

const roleOptions: SelectOption[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Support', label: 'Support' },
  { value: 'Sales', label: 'Sales' },
];

export function UsersPage() {
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

  // Fetch users
  const {
    data,
    isLoading,
    error,
  } = useQuery<{ users: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ users: User[] }>>('/users');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
      return response.data.data;
    },
    staleTime: 30000,
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (variables: UserFormValues) => {
      const response = await api.post<ApiResponse<User>>('/users', variables);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create user');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
        Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
      </div>

      {/* Action */}
      <div className="mb-4">
        <Button>Create User</Button>
      </div>

      {/* Table */}
      {data?.users.map((user) => (
        <Card key={user.id} className="shadow-sm border-b border-zinc-200 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-sm">Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Email</p>
                <p className="font-medium text-zinc-400">{user.email}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Role</p>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Status</p>
                <Badge
                  variant={user.isActive ? 'default' : 'destructive'}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}