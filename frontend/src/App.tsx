import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              {/* Placeholder routes for future pages */}
              <Route path="/leads" element={<div className="p-4 text-zinc-600">Leads Page - Coming Soon</div>} />
              <Route path="/clients" element={<div className="p-4 text-zinc-600">Clients Page - Coming Soon</div>} />
              <Route path="/licenses" element={<div className="p-4 text-zinc-600">Licenses Page - Coming Soon</div>} />
              <Route path="/invoices" element={<div className="p-4 text-zinc-600">Invoices Page - Coming Soon</div>} />
              <Route path="/tickets" element={<div className="p-4 text-zinc-600">Support Tickets Page - Coming Soon</div>} />
              <Route path="/audit-logs" element={<div className="p-4 text-zinc-600">Audit Logs Page - Coming Soon</div>} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
