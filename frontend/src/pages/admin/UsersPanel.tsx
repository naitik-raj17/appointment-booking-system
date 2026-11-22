import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Ban, Pencil, RotateCcw, Search, ShieldOff, Trash2 } from 'lucide-react';
import { adminApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { AdminUser } from '../../types';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Pagination, Skeleton } from '../../components/ui';
import { formatMoney } from '../../utils/format';
import { phoneError } from '../../utils/validation';

type Confirm = { user: AdminUser; action: 'deactivate' | 'activate' | 'delete' | 'approve' | 'suspend' };

const CONFIRM_COPY: Record<Confirm['action'], { title: string; message: (u: AdminUser) => string; label: string; variant: 'primary' | 'danger' | 'success' }> = {
  deactivate: { title: 'Deactivate account?', message: (u) => `${u.name} will be signed out and unable to log in until reactivated.`, label: 'Deactivate', variant: 'danger' },
  activate: { title: 'Reactivate account?', message: (u) => `${u.name} will be able to log in again.`, label: 'Reactivate', variant: 'success' },
  delete: { title: 'Delete user permanently?', message: (u) => `This permanently removes ${u.name}. Users with appointment history cannot be deleted — deactivate them instead.`, label: 'Delete', variant: 'danger' },
  approve: { title: 'Approve provider?', message: (u) => `${u.name} will become visible in search and can receive bookings.`, label: 'Approve', variant: 'success' },
  suspend: { title: 'Hide provider from search?', message: (u) => `${u.name} will no longer be bookable. Existing appointments are kept.`, label: 'Hide provider', variant: 'danger' },
};

export function UsersPanel({ role }: { role: 'customer' | 'provider' }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const debouncedQ = useDebounce(q);

  const { data, loading, error, reload } = useAsync(() => adminApi.users({ role, status: status || undefined, q: debouncedQ || undefined, page, limit: 10 }), [role, status, debouncedQ, page]);

  const runConfirm = async () => {
    if (!confirm) return;
    const { user, action } = confirm;
    try {
      if (action === 'delete') await adminApi.deleteUser(user._id);
      else if (action === 'approve' || action === 'suspend') await adminApi.setApproval(user._id, action === 'approve');
      else await adminApi.updateUser(user._id, { isActive: action === 'activate' });
      toast.success(`${user.name}: ${CONFIRM_COPY[action].label.toLowerCase()} done`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
      throw err;
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editForm.name.trim().length < 2 || phoneError(editForm.phone)) {
      toast.error('Enter a valid name and phone number');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateUser(editing._id, { name: editForm.name.trim(), phone: editForm.phone.trim() });
      toast.success('User updated');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update user');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = role === 'provider' ? [['', 'All'], ['pending', 'Awaiting approval'], ['active', 'Active'], ['inactive', 'Deactivated']] : [['', 'All'], ['active', 'Active'], ['inactive', 'Deactivated']];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={`Search ${role}s by name or email`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search users" />
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {statusOptions.map(([value, label]) => (
            <button key={value} onClick={() => { setStatus(value); setPage(1); }} className={`rounded-md px-3 py-1.5 text-xs font-medium ${status === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title={`No ${role}s found`} />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  {role === 'provider' && <th className="px-3 py-2.5 font-medium">Service</th>}
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Bookings</th>
                  <th className="px-3 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((u) => (
                  <tr key={u._id} className={u.isActive ? '' : 'bg-slate-50/70'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    {role === 'provider' && (
                      <td className="px-3 py-3">
                        <p>{u.providerProfile?.specialization}</p>
                        <p className="text-xs text-slate-500">
                          {u.providerProfile?.category?.name} · {formatMoney(u.providerProfile?.price ?? 0)}
                        </p>
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.isActive ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge> : <Badge>Deactivated</Badge>}
                        {role === 'provider' && !u.providerProfile?.isApproved && <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Unapproved</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">{u.appointmentCount}</td>
                    <td className="px-3 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {role === 'provider' &&
                          (u.providerProfile?.isApproved ? (
                            <>
                              <Link to={`/providers/${u._id}`} className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                                View
                              </Link>
                              <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'suspend' })} title="Hide from search">
                                <ShieldOff className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="success" onClick={() => setConfirm({ user: u, action: 'approve' })}>
                              <BadgeCheck className="h-3.5 w-3.5" /> Approve
                            </Button>
                          ))}
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(u); setEditForm({ name: u.name, phone: u.phone || '' }); }} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {u.isActive ? (
                          <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-50" onClick={() => setConfirm({ user: u, action: 'deactivate' })} title="Deactivate">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-emerald-700 hover:bg-emerald-50" onClick={() => setConfirm({ user: u, action: 'activate' })} title="Reactivate">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm({ user: u, action: 'delete' })} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? CONFIRM_COPY[confirm.action].title : ''}
        message={confirm ? CONFIRM_COPY[confirm.action].message(confirm.user) : ''}
        confirmLabel={confirm ? CONFIRM_COPY[confirm.action].label : ''}
        variant={confirm ? CONFIRM_COPY[confirm.action].variant : 'primary'}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit user"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} error={phoneError(editForm.phone)} />
          <p className="text-xs text-slate-500">Email: {editing?.email}</p>
        </div>
      </Modal>
    </div>
  );
}
