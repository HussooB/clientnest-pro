import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-900">403</h1>
        <h2 className="mt-4 text-2xl font-semibold text-zinc-900">Access Denied</h2>
        <p className="mt-2 text-zinc-600">
          You do not have permission to access this page.
        </p>
        <Button className="mt-6">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
