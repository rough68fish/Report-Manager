import { Security, LoginCallback } from '@okta/okta-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import { oktaAuth } from './lib/oktaConfig';
import { Layout } from './components/Layout';
import { Browse } from './pages/Browse';
import { ReportDetail } from './pages/ReportDetail';
import { ReportForm } from './pages/ReportForm';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authState } = useOktaAuth();
  if (!authState) return <div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>;
  if (!authState.isAuthenticated) {
    oktaAuth.signInWithRedirect();
    return null;
  }
  return <>{children}</>;
}

const restoreOriginalUri = async (_: unknown, originalUri: string) => {
  window.location.replace(originalUri || '/');
};

export default function App() {
  return (
    <BrowserRouter>
      <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
        <Routes>
          <Route path="/login/callback" element={<LoginCallback />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Browse />} />
            <Route path="reports/new" element={<ReportForm />} />
            <Route path="reports/:id" element={<ReportDetail />} />
            <Route path="reports/:id/edit" element={<ReportForm />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Security>
    </BrowserRouter>
  );
}
