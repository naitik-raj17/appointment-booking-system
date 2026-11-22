import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarCheck2, Clock3, Search, ShieldCheck, Star } from 'lucide-react';
import { categoryApi, providerApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Avatar, Button, CategoryIcon, Rating, Skeleton } from '../components/ui';
import { formatMoney } from '../utils/format';

const FEATURES = [
  { icon: Clock3, title: 'Real-time availability', text: 'See open slots generated live from each provider’s working hours — no phone calls.' },
  { icon: ShieldCheck, title: 'No double bookings', text: 'Every booking is validated on the server and locked atomically in the database.' },
  { icon: BellRing, title: 'Instant notifications', text: 'Email and in-app updates when bookings are requested, confirmed, moved or cancelled.' },
  { icon: CalendarCheck2, title: 'Easy changes', text: 'Reschedule or cancel in two clicks, within the provider’s change window.' },
];

const STEPS = [
  { n: 1, title: 'Search', text: 'Filter providers by category, city, price and rating.' },
  { n: 2, title: 'Pick a slot', text: 'Choose a date on the calendar and a free time slot.' },
  { n: 3, title: 'Get confirmed', text: 'The provider accepts your request and you get notified.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const categories = useAsync(() => categoryApi.list(), []);
  const featured = useAsync(() => providerApi.search({ sort: 'rating', limit: 4 }), []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/providers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
              <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" /> Trusted by clinics, studios and consultants
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Book appointments with the right professional, <span className="text-brand-600">in seconds.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              BookEase connects customers with doctors, trainers, stylists, lawyers and tutors. Live availability, instant requests and zero scheduling conflicts.
            </p>
            <form onSubmit={onSearch} className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 px-2">
                <Search className="h-5 w-5 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “dentist”, “yoga” or “New York”" className="w-full border-0 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" aria-label="Search providers" />
              </div>
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>
            {!user && (
              <p className="mt-4 text-sm text-slate-500">
                Are you a professional?{' '}
                <Link to="/register?role=provider" className="font-medium text-brand-600 hover:underline">
                  List your services for free
                </Link>
              </p>
            )}
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
            <div className="card relative p-6">
              <div className="flex items-center gap-3">
                <Avatar name="Sarah Mitchell" size="lg" />
                <div>
                  <p className="font-semibold">Dr. Sarah Mitchell</p>
                  <p className="text-sm text-slate-500">General Physician · New York</p>
                </div>
              </div>
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">Available tomorrow</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {['9:00 AM', '9:30 AM', '10:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:30 PM', '4:30 PM'].map((t, i) => (
                  <span key={t} className={`rounded-lg border py-2 text-center text-xs font-medium ${i === 2 ? 'border-brand-600 bg-brand-600 text-white' : i === 4 ? 'border-slate-100 bg-slate-50 text-slate-300 line-through' : 'border-slate-200 text-slate-700'}`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span className="font-medium">Appointment confirmed</span>
                <CalendarCheck2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Browse by category</h2>
            <p className="mt-1 text-sm text-slate-500">Find the right kind of professional for what you need.</p>
          </div>
          <Link to="/providers" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:underline sm:inline-flex">
            All providers <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.loading
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)
            : categories.data?.map((c) => (
                <Link key={c._id} to={`/providers?category=${c.slug}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white">
                    <CategoryIcon icon={c.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-500">
                      {c.providerCount} provider{c.providerCount === 1 ? '' : 's'}
                    </span>
                  </span>
                </Link>
              ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Top-rated providers</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.loading
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44" />)
              : featured.data?.data.map((p) => (
                  <Link key={p.id} to={`/providers/${p.id}`} className="card flex flex-col p-5 transition hover:border-brand-300 hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="truncate text-sm text-slate-500">{p.specialization}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <Rating value={p.ratingAverage} count={p.ratingCount} />
                      <span className="font-semibold">{formatMoney(p.price, p.currency)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{p.city}</p>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Why BookEase?</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title}>
                  <Icon className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-2 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-semibold">How it works</h2>
            <ol className="mt-6 space-y-5">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{s.n}</span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-slate-600">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button className="mt-8 w-full" size="lg" onClick={() => navigate(user ? '/providers' : '/register')}>
              {user ? 'Find a provider' : 'Create a free account'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
