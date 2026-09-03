import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, Ticket, Heart } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { name: 'MRR', value: '$124,500', icon: DollarSign, change: '+12.5%' },
    { name: 'Overdue Invoices', value: '12', icon: AlertCircle, change: '−3 this week' },
    { name: 'Open Tickets', value: '24', icon: Ticket, change: '+5 new' },
    { name: 'Client Health', value: '87%', icon: Heart, change: '+4%' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-zinc-500">
          You are logged in as <Badge variant="secondary">{user?.role}</Badge>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.name}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-zinc-500">{stat.name}</span>
              <stat.icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
              <p className="text-xs text-zinc-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}