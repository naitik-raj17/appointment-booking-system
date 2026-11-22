import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, CalendarClock, CalendarDays, LayoutDashboard, ListChecks, Search, Settings2, ShieldCheck, UserCog, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  customer: [
    { to: '/customer', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
    { to: '/customer/appointments', label: 'My appointments', icon: <CalendarDays className="h-4 w-4" /> },
    { to: '/providers', label: 'Find providers', icon: <Search className="h-4 w-4" /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { to: '/account', label: 'Account', icon: <UserCog className="h-4 w-4" /> },
  ],
  provider: [
    { to: '/provider', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
    { to: '/provider/appointments', label: 'Appointments', icon: <ListChecks className="h-4 w-4" /> },
    { to: '/provider/availability', label: 'Availability', icon: <CalendarClock className="h-4 w-4" /> },
    { to: '/provider/profile', label: 'Public profile', icon: <UserRound className="h-4 w-4" /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { to: '/account', label: 'Account', icon: <UserCog className="h-4 w-4" /> },
  ],
  admin: [
    { to: '/admin', label: 'Analytics', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
    { to: '/admin/manage', label: 'Management', icon: <ShieldCheck className="h-4 w-4" /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { to: '/account', label: 'Account', icon: <Settings2 className="h-4 w-4" /> },
  ],
};

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const items = user ? NAV[user.role] : [];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:py-8">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label="Dashboard navigation">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
