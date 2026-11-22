import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout, PublicLayout } from './components/layout/Layouts';
import { GuestOnly, RequireAuth } from './components/layout/RouteGuards';
import { PageLoader } from './components/ui';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

const ProviderSearch = lazy(() => import('./pages/ProviderSearch'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerAppointments = lazy(() => import('./pages/customer/CustomerAppointments'));
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderAppointments = lazy(() => import('./pages/provider/ProviderAppointments'));
const AvailabilityPage = lazy(() => import('./pages/provider/AvailabilityPage'));
const ProviderProfileSettings = lazy(() => import('./pages/provider/ProviderProfileSettings'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'));
const Account = lazy(() => import('./pages/Account'));
const Notifications = lazy(() => import('./pages/Notifications'));

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Landing />} />
              <Route path="providers" element={<S><ProviderSearch /></S>} />
              <Route path="providers/:id" element={<S><ProviderProfile /></S>} />
              <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="register" element={<GuestOnly><Register /></GuestOnly>} />
            </Route>

            <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
              <Route path="customer" element={<RequireAuth roles={['customer']}><S><CustomerDashboard /></S></RequireAuth>} />
              <Route path="customer/appointments" element={<RequireAuth roles={['customer']}><S><CustomerAppointments /></S></RequireAuth>} />

              <Route path="provider" element={<RequireAuth roles={['provider']}><S><ProviderDashboard /></S></RequireAuth>} />
              <Route path="provider/appointments" element={<RequireAuth roles={['provider']}><S><ProviderAppointments /></S></RequireAuth>} />
              <Route path="provider/availability" element={<RequireAuth roles={['provider']}><S><AvailabilityPage /></S></RequireAuth>} />
              <Route path="provider/profile" element={<RequireAuth roles={['provider']}><S><ProviderProfileSettings /></S></RequireAuth>} />

              <Route path="admin" element={<RequireAuth roles={['admin']}><S><AdminDashboard /></S></RequireAuth>} />
              <Route path="admin/manage" element={<RequireAuth roles={['admin']}><S><AdminManagement /></S></RequireAuth>} />

              <Route path="account" element={<S><Account /></S>} />
              <Route path="notifications" element={<S><Notifications /></S>} />
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
