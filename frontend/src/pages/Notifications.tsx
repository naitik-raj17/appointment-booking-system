import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Mail, MailCheck, MailX } from 'lucide-react';
import { notificationApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import type { Notification } from '../types';
import { Button, EmptyState, ErrorState, PageHeader, Pagination, Skeleton } from '../components/ui';
import { formatDateTime } from '../utils/format';

const EMAIL_ICON = { sent: MailCheck, failed: MailX, skipped: Mail, pending: Mail };
const EMAIL_LABEL = { sent: 'Email sent', failed: 'Email failed', skipped: 'Email (dev mode)', pending: 'Email queued' };

export default function Notifications() {
  const [page, setPage] = useState(1);
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload, setData } = useAsync(() => notificationApi.list(page, 15), [page]);

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      reload();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const open = async (n: Notification) => {
    if (!n.isRead) {
      await notificationApi.markRead(n._id).catch(() => {});
      setData((d) => d && { ...d, data: d.data.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)) });
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={data?.meta.unread ? `${data.meta.unread} unread` : 'Booking updates and account messages.'}
        actions={
          <Button variant="outline" onClick={markAll} disabled={!data?.meta.unread}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-80" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No notifications yet" message="You'll see booking confirmations, changes and reminders here." />
      ) : (
        <>
          <ul className="card divide-y divide-slate-100">
            {data.data.map((n) => {
              const Icon = EMAIL_ICON[n.emailStatus];
              return (
                <li key={n._id}>
                  <button onClick={() => open(n)} className={`flex w-full gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:px-5 ${n.isRead ? '' : 'bg-brand-50/40'}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-slate-200' : 'bg-brand-500'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">{n.title}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{n.message}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                        <Icon className="h-3.5 w-3.5" /> {EMAIL_LABEL[n.emailStatus]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
