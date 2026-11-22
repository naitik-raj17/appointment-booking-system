import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import type { Category } from '../../types';
import { Badge, Button, CATEGORY_ICONS, CategoryIcon, ConfirmDialog, ErrorState, Input, Modal, Skeleton, Textarea } from '../../components/ui';

const EMPTY = { name: '', description: '', icon: 'briefcase', isActive: true };

export function CategoriesPanel() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminApi.categories(), []);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [nameError, setNameError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const open = (c: Category | 'new') => {
    setEditing(c);
    setNameError(undefined);
    setForm(c === 'new' ? EMPTY : { name: c.name, description: c.description, icon: c.icon, isActive: c.isActive });
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      if (editing === 'new') await adminApi.createCategory(payload);
      else if (editing) await adminApi.updateCategory(editing._id, payload);
      toast.success(editing === 'new' ? 'Category created' : 'Category updated');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open('new')}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((c) => (
            <div key={c._id} className={`card flex gap-4 p-4 ${c.isActive ? '' : 'opacity-70'}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <CategoryIcon icon={c.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{c.name}</p>
                  {!c.isActive && <Badge>Hidden</Badge>}
                </div>
                <p className="line-clamp-2 text-xs text-slate-500">{c.description || 'No description'}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {c.providerCount} approved provider{c.providerCount === 1 ? '' : 's'} · /{c.slug}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" onClick={() => open(c)} aria-label={`Edit ${c.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New category' : 'Edit category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} maxLength={60} error={nameError} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <p className="label">Icon</p>
            <div className="grid grid-cols-6 gap-2">
              {Object.keys(CATEGORY_ICONS).map((key) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, icon: key })} aria-pressed={form.icon === key} aria-label={key} className={`flex h-10 items-center justify-center rounded-lg border ${form.icon === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <CategoryIcon icon={key} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Visible to customers
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete category?"
        message={deleting ? `"${deleting.name}" will be removed. Categories used by providers cannot be deleted — hide them instead.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await adminApi.deleteCategory(deleting!._id);
            toast.success('Category deleted');
            reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not delete');
            throw err;
          }
        }}
      />
    </div>
  );
}
