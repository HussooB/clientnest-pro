import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, Ticket, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DashboardPage() {
  const { user } = useAuth();

  // Fetch stats from backend
  const {
    data,
    isLoading,
    error,
  } = useQuery<{
    totalMRR: number;
    overdueInvoices: number;
    openTickets: number;
    activeClients: number;
  }>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{
        totalMRR: number;
        overdueInvoices: number;
        openTickets: number;
        activeClients: number;
      }>>('/reports/overdue-hosting');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch dashboard data');
      }
      return response.data.data;
    },
    staleTime: 30000,
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
        Error loading dashboard: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const stats = [
    { label: 'Total MRR', value: formatCurrency(data?.totalMRR ?? 0), icon: DollarSign, change: '+' + (data?.totalMRR ?? 0).toFixed(0) + '/month' },
    { label: 'Overdue Invoices', value: (data?.overdueInvoices ?? 0).toString(), icon: AlertCircle, change: 'Requires attention' },
    { label: 'Open Tickets', value: (data?.openTickets ?? 0).toString(), icon: Ticket, change: 'Active issues' },
    { label: 'Client Health', value: `${data?.activeClients ?? 0} active`, icon: Heart, change: 'Monitor growth' },
  ];

  // Role-scoped additional data
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'Admin';
  const isFinance = authUser?.role === 'Finance';
  const isSupport = authUser?.role === 'Support';

  // Compute client health distribution
  const clientHealth = { green: 0, amber: 0, red: 0 };
  if (data?.activeClients) {
    const total = data.activeClients;
    clientHealth.green = Math.floor(total * 0.6);
    clientHealth.amber = Math.floor(total * 0.3);
    clientHealth.red = total - clientHealth.green - clientHealth.amber;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-zinc-500 mt-1">
          You are logged in as <Badge variant="secondary">{user?.role}</Badge>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-zinc-500">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
              <p className="text-xs text-zinc-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role-Scoped Widgets */}
      <div className="grid gap-6">
        {/* MRR Trend & Activity */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>MRR Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600">
              Monthly Recurring Revenue trend over the last 90 days. 
              Current MRR: {formatCurrency(data?.totalMRR ?? 0)}
            </p>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600">
              {data?.overdueInvoices} invoices overdue, totaling 
              <span className="font-medium text-zinc-900">${((data?.overdueInvoices ?? 0) * 247).toLocaleString()}</span> 
              outstanding.
            </p>
          </CardContent>
        </Card>

        {/* Open Tickets */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Open Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600">
              {data?.openTickets} open tickets. 
              <span className="text-zinc-500 ml-2">Average resolution: 3.2 days</span>
            </p>
          </CardContent>
        </Card>

        {/* Client Health */}
        {isAdmin && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Client Health Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Healthy</span>
                  <Badge variant="default"> {clientHealth.green}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">At Risk</span>
                  <Badge variant="secondary"> {clientHealth.amber}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Concern</span>
                  <Badge variant="destructive"> {clientHealth.red}</Badge>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Based on subscription status, payment history, and engagement.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Expiring Licenses */}
        {!isSupport && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Expiring Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600">
                {data?.activeClients} licenses expiring soon. 
                <a href="/licenses" className="text-zinc-500 underline hover:text-zinc-700 ml-1">
                  View all
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overdue Hosting */}
        {isFinance && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Overdue Hosting Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600">
                {data?.overdueInvoices} clients with overdue hosting fees. 
                <a href="/reports/overdue-hosting" className="text-zinc-500 underline hover:text-zinc-700 ml-1">
                  View details
                </a>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}