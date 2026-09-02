import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-medium text-zinc-900">ClientNest Pro</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-900">{user?.name}</span>
          <Badge variant="secondary">{user?.role}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
