import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-slate-500">Book trusted professionals in seconds. Real-time availability, instant confirmations and reminders by email.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <Link to="/providers" className="hover:text-slate-900">Find providers</Link>
          <Link to="/register?role=provider" className="hover:text-slate-900">Become a provider</Link>
          <Link to="/login" className="hover:text-slate-900">Log in</Link>
        </nav>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} BookEase · Software Engineering Lab Project</div>
    </footer>
  );
}
