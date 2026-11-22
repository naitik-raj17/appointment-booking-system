import { useState, type FormEvent } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Badge, Button, Input, PageHeader } from '../components/ui';
import { isValid, passwordError, phoneError, type Errors } from '../utils/validation';

export default function Account() {
  const { user, setSession } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [profileErrors, setProfileErrors] = useState<Errors<typeof profile>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Errors<typeof pw>>({});
  const [savingPw, setSavingPw] = useState(false);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const errs = { name: profile.name.trim().length >= 2 ? undefined : 'Enter your full name', phone: phoneError(profile.phone) };
    setProfileErrors(errs);
    if (!isValid(errs)) return;
    setSavingProfile(true);
    try {
      setSession(await authApi.updateAccount({ name: profile.name.trim(), phone: profile.phone.trim() }));
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      current: pw.current ? undefined : 'Enter your current password',
      next: passwordError(pw.next),
      confirm: pw.confirm === pw.next ? undefined : 'Passwords do not match',
    };
    setPwErrors(errs);
    if (!isValid(errs)) return;
    setSavingPw(true);
    try {
      await authApi.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setPwErrors({ current: err instanceof Error ? err.message : 'Could not change password' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Account settings" subtitle="Manage your personal details and password." />
      <section className="card p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <Badge className="mt-1 bg-brand-50 capitalize text-brand-700 ring-brand-600/20">{user.role}</Badge>
          </div>
        </div>
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input label="Full name" value={profile.name} error={profileErrors.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <Input label="Phone" type="tel" value={profile.phone} error={profileErrors.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <Input label="Email" value={user.email} disabled hint="Email cannot be changed" wrapperClassName="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" loading={savingProfile}>
              <Save className="h-4 w-4" /> Save details
            </Button>
          </div>
        </form>
      </section>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-slate-400" /> Change password
        </h2>
        <form onSubmit={savePassword} className="mt-4 grid gap-4 sm:grid-cols-3" noValidate>
          <Input label="Current password" type="password" autoComplete="current-password" value={pw.current} error={pwErrors.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <Input label="New password" type="password" autoComplete="new-password" value={pw.next} error={pwErrors.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} error={pwErrors.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" variant="outline" loading={savingPw}>
              Update password
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
