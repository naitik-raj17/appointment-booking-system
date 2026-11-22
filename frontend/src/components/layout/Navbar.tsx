import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, UserCog, X } from 'lucide-react';
import { homePathFor, useAuth } from '../../context/AuthContext';
import { Avatar, Button } from '../ui';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/providers" className={linkClass}>
              Find providers
            </NavLink>
            {user && (
              <NavLink to={homePathFor(user.role)} className={linkClass}>
                Dashboard
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <div className="relative hidden md:block" ref={menuRef}>
                <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={menuOpen}>
                  <Avatar name={user.name} size="sm" />
                  <span className="max-w-[140px] truncate text-sm font-medium text-slate-700">{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-12 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs capitalize text-slate-500">
                        {user.role} · {user.email}
                      </p>
                    </div>
                    <Link to={homePathFor(user.role)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link to="/account" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
                      <UserCog className="h-4 w-4" /> Account settings
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button onClick={() => navigate('/register')}>Get started</Button>
            </div>
          )}
          <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link to="/providers" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Search className="h-4 w-4" /> Find providers
            </Link>
            {user ? (
              <>
                <Link to={homePathFor(user.role)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link to="/account" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <UserCog className="h-4 w-4" /> Account settings
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button onClick={() => navigate('/register')}>Get started</Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
