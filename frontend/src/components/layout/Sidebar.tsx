import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Key,
  FileText,
  Ticket,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['Admin', 'Finance', 'Support', 'Sales'] as Role[] },
  { name: 'Leads', href: '/leads', icon: Users, roles: ['Admin', 'Finance', 'Support', 'Sales'] as Role[] },
  { name: 'Clients', href: '/clients', icon: Building2, roles: ['Admin', 'Finance', 'Support', 'Sales'] as Role[] },
  { name: 'Licenses', href: '/licenses', icon: Key, roles: ['Admin', 'Finance', 'Support', 'Sales'] as Role[] },
  { name: 'Invoices', href: '/invoices', icon: FileText, roles: ['Admin', 'Finance', 'Support', 'Sales'] as Role[] },
  { name: 'Support Tickets', href: '/tickets', icon: Ticket, roles: ['Admin', 'Finance', 'Support', 'Sales'] as Role[] },
  { name: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck, roles: ['Admin'] as Role[] },
  { name: 'Users', href: '/users', icon: UserCog, roles: ['Admin'] as Role[] },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const filteredNav = navigation.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  );

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-14 items-center border-b border-zinc-200 px-4">
        <Link to="/" className="text-lg font-semibold text-zinc-900">
          ClientNest Pro
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-900 text-zinc-50'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}