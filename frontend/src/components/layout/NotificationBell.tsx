import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationApi } from '../../api';
import type { Notification } from '../../types';
import { timeAgo } from '../../utils/format';
import { Spinner } from '../ui';

const POLL_MS = 60_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await notificationApi.list(1, 6);
      setItems(res.data);
      setUnread(res.meta.unread ?? 0);
    } catch {
      /* the bell is non-critical; keep the previous state */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const openItem = async (n: Notification) => {
    setOpen(false);
    if (!n.isRead) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      notificationApi.markRead(n._id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await notificationApi.markAllRead().catch(() => {});
    setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button onClick={markAll} disabled={unread === 0} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:text-slate-400">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button key={n._id} onClick={() => openItem(n)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/40'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-brand-500'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block rounded-b-xl px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-slate-50">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
