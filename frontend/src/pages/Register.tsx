import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, UserRound } from 'lucide-react';
import { categoryApi } from '../api';
import { ApiError } from '../api/client';
import { homePathFor, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { Alert, Button, Input, Select } from '../components/ui';
import { Logo } from '../components/layout/Logo';
import { isEmail, isValid, passwordError, phoneError, type Errors } from '../utils/validation';

type Role = 'customer' | 'provider';

const initial = { name: '', email: '', phone: '', password: '', confirm: '', categoryId: '', specialization: '', city: '', price: '' };
type Form = typeof initial;

export default function Register() {
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role>(params.get('role') === 'provider' ? 'provider' : 'customer');
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Errors<Form>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const categories = useAsync(() => categoryApi.list(), []);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): Errors<Form> => ({
    name: form.name.trim().length >= 2 ? undefined : 'Enter your full name',
    email: isEmail(form.email) ? undefined : 'Enter a valid email address',
    phone: phoneError(form.phone),
    password: passwordError(form.password),
    confirm: form.confirm === form.password ? undefined : 'Passwords do not match',
    ...(role === 'provider' && {
      categoryId: form.categoryId ? undefined : 'Choose a category',
      specialization: form.specialization.trim().length >= 2 ? undefined : 'Enter your specialization',
      price: form.price === '' || Number(form.price) >= 0 ? undefined : 'Price cannot be negative',
    }),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (!isValid(errs)) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        ...(role === 'provider' && {
          categoryId: form.categoryId,
          specialization: form.specialization.trim(),
          city: form.city.trim(),
          price: Number(form.price || 0),
        }),
      });
      toast.success('Account created. Welcome to BookEase!');
      navigate(role === 'provider' ? '/provider/availability' : homePathFor(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])) as Errors<Form>);
      }
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const RoleOption = ({ value, icon, title, text }: { value: Role; icon: React.ReactNode; title: string; text: string }) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={`flex flex-1 items-start gap-3 rounded-lg border p-3 text-left transition ${role === value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <span className={role === value ? 'text-brand-600' : 'text-slate-400'}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </button>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Log in
            </Link>
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <RoleOption value="customer" icon={<UserRound className="h-5 w-5" />} title="I want to book" text="Find and book providers" />
            <RoleOption value="provider" icon={<Briefcase className="h-5 w-5" />} title="I offer services" text="Accept appointments" />
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {serverError && <Alert kind="error">{serverError}</Alert>}
            <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
              <Input label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="8+ characters, letters and numbers" />
              <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
            </div>

            {role === 'provider' && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm font-medium text-slate-700">Professional details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Category" value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId} disabled={categories.loading}>
                    <option value="">{categories.loading ? 'Loading…' : 'Select a category'}</option>
                    {categories.data?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Input label="Specialization" placeholder="e.g. Dental Surgeon" value={form.specialization} onChange={set('specialization')} error={errors.specialization} />
                  <Input label="City" value={form.city} onChange={set('city')} />
                  <Input label="Price per session (USD)" type="number" min={0} value={form.price} onChange={set('price')} error={errors.price} />
                </div>
                <p className="text-xs text-slate-500">Your profile becomes visible to customers after an administrator approves it.</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={submitting}>
              Create account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
