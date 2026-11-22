import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { homePathFor, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Button, Input } from '../components/ui';
import { Logo } from '../components/layout/Logo';
import { isEmail, isValid, type Errors } from '../utils/validation';

const DEMO = [
  { role: 'Customer', email: 'alice@example.com', password: 'Customer@123' },
  { role: 'Provider', email: 'sarah.mitchell@bookease.com', password: 'Provider@123' },
  { role: 'Admin', email: 'admin@bookease.com', password: 'Admin@123' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors<typeof form>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent, override?: typeof form) => {
    e.preventDefault();
    const values = override ?? form;
    const errs: Errors<typeof form> = {
      email: isEmail(values.email) ? undefined : 'Enter a valid email address',
      password: values.password ? undefined : 'Password is required',
    };
    setErrors(errs);
    if (!isValid(errs)) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(from && !from.startsWith('/login') ? from : homePathFor(user.role), { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Log in to your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            New to BookEase?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              Create an account
            </Link>
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {serverError && <Alert kind="error">{serverError}</Alert>}
            <Input label="Email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Password" type="password" autoComplete="current-password" value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button type="submit" className="w-full" loading={submitting}>
              <LogIn className="h-4 w-4" /> Log in
            </Button>
          </form>
        </div>
        <div className="card mt-4 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEMO.map((d) => (
              <button
                key={d.role}
                type="button"
                disabled={submitting}
                onClick={(e) => {
                  setForm({ email: d.email, password: d.password });
                  submit(e, { email: d.email, password: d.password });
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="block font-medium text-slate-800">{d.role}</span>
                <span className="block truncate text-xs text-slate-500">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
