import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import TenantsPage from './pages/Tenants';
import TenantDetailPage from './pages/TenantDetail';
import ReleasesPage from './pages/Releases';
import AdminsPage from './pages/Admins';
import PlansPage from './pages/Plans';
import InstallGuidePage from './pages/InstallGuide';
import Layout from './components/Layout';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="releases" element={<ReleasesPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="install-guide" element={<InstallGuidePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
