import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { categoryApi, providerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Badge, Button, ErrorState, Input, PageHeader, PageLoader, Select, Textarea } from '../../components/ui';
import { isValid, type Errors } from '../../utils/validation';

interface Form {
  categoryId: string;
  specialization: string;
  bio: string;
  experienceYears: string;
  city: string;
  address: string;
  price: string;
  tags: string[];
}

export default function ProviderProfileSettings() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const profile = useAsync(() => providerApi.myProfile(), []);
  const categories = useAsync(() => categoryApi.list(), []);
  const [form, setForm] = useState<Form | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Errors<Form>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (p) {
      setForm({
        categoryId: p.category?._id ?? '',
        specialization: p.specialization,
        bio: p.bio,
        experienceYears: String(p.experienceYears),
        city: p.city,
        address: p.address,
        price: String(p.price),
        tags: p.tags,
      });
    }
  }, [profile.data]);

  if (profile.loading || (!form && !profile.error)) return <PageLoader />;
  if (profile.error || !form) return <ErrorState message={profile.error || 'Profile not found'} onRetry={profile.reload} />;

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t) && form.tags.length < 10) setForm({ ...form, tags: [...form.tags, t] });
    setTagInput('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors<Form> = {
      specialization: form.specialization.trim().length >= 2 ? undefined : 'Required',
      categoryId: form.categoryId ? undefined : 'Required',
      price: Number(form.price) >= 0 && form.price !== '' ? undefined : 'Enter a valid price',
      experienceYears: Number.isInteger(Number(form.experienceYears)) && Number(form.experienceYears) >= 0 && Number(form.experienceYears) <= 70 ? undefined : '0–70 years',
    };
    setErrors(errs);
    if (!isValid(errs)) return;
    setSaving(true);
    try {
      await providerApi.updateMyProfile({
        categoryId: form.categoryId,
        specialization: form.specialization.trim(),
        bio: form.bio.trim(),
        experienceYears: Number(form.experienceYears),
        city: form.city.trim(),
        address: form.address.trim(),
        price: Number(form.price),
        tags: form.tags,
      });
      await refresh();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Public profile"
        subtitle="This is what customers see when they find you."
        actions={
          profile.data?.isApproved ? (
            <Link to={`/providers/${user?._id}`}>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4" /> Preview
              </Button>
            </Link>
          ) : (
            <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Awaiting approval</Badge>
          )
        }
      />
      <form onSubmit={submit} className="card space-y-5 p-5 sm:p-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId}>
            <option value="">Select a category</option>
            {categories.data?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input label="Specialization" value={form.specialization} onChange={set('specialization')} error={errors.specialization} />
        </div>
        <Textarea label="About you" rows={5} maxLength={1500} value={form.bio} onChange={set('bio')} hint={`${form.bio.length}/1500`} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Price per session (USD)" type="number" min={0} value={form.price} onChange={set('price')} error={errors.price} />
          <Input label="Years of experience" type="number" min={0} max={70} value={form.experienceYears} onChange={set('experienceYears')} error={errors.experienceYears} />
          <Input label="City" value={form.city} onChange={set('city')} />
        </div>
        <Input label="Address" value={form.address} onChange={set('address')} />
        <div>
          <p className="label">Services / keywords</p>
          <div className="flex gap-2">
            <input
              className="input"
              value={tagInput}
              maxLength={30}
              placeholder="e.g. root canal"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              aria-label="Add keyword"
            />
            <Button variant="outline" onClick={addTag} disabled={!tagInput.trim() || form.tags.length >= 10}>
              Add
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.tags.map((t) => (
              <Badge key={t}>
                {t}
                <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })} aria-label={`Remove ${t}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
