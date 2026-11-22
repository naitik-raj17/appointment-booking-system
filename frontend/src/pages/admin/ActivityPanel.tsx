import { useState } from 'react';
import { adminApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Badge, EmptyState, ErrorState, Pagination, Skeleton } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

const ACTION_TONE: Record<string, string> = {
  appointment: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  user: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  provider: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  category: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function ActivityPanel() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => adminApi.activity(page, 20), [page]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Skeleton className="h-96" />;
  if (!data || data.data.length === 0) return <EmptyState title="No activity yet" />;

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-3 py-2.5 font-medium">Actor</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.data.map((a) => (
              <tr key={a._id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatDateTime(a.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium">{a.actor?.name ?? 'System'}</p>
                  <p className="text-xs capitalize text-slate-500">{a.actorRole}</p>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={ACTION_TONE[a.action.split('.')[0]]}>{a.action}</Badge>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{a.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
    </>
  );
}
