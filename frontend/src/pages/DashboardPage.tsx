import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, Ticket, Heart } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { name: 'MRR', value: '$0', icon: DollarSign, change: '+0%' },
    { name: 'Overdue Invoices', value: '0', icon: AlertCircle, change: '0 pending' },
    { name: 'Open Tickets', value: '0', icon: Ticket, change: 'All resolved' },
    { name: 'Client Health', value: 'N/A', icon: Heart, change: 'No data yet' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-zinc-500">
          You are logged in as <Badge variant="secondary">{user?.role}</Badge>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
              <p className="text-xs text-zinc-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600">
            Backend Path 1-3 complete. Frontend shell ready.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
