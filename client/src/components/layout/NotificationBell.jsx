import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { api } from '../../lib/api.js';
import { timeAgo } from '../../lib/format.js';
import { Menu } from '../ui/Menu.jsx';
import { Avatar, EmptyState } from '../ui/Display.jsx';

const POLL_MS = 45000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], unread: 0 });

  const load = useCallback(() => api.get('/notifications').then(setData).catch(() => {}), []);

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const markAll = async () => {
    setData((d) => ({ unread: 0, items: d.items.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })) }));
    await api.post('/notifications/read-all');
  };

  const open = async (n, close) => {
    close();
    if (!n.read_at) {
      setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)) }));
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.lead_id) navigate(`/leads/${n.lead_id}`);
    else navigate('/leads');
  };

  return (
    <Menu
      width="w-[min(380px,calc(100vw-2rem))]"
      trigger={({ toggle, open: isOpen }) => (
        <button
          onClick={() => { toggle(); if (!isOpen) load(); }}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          aria-label={`Notifications${data.unread ? ` (${data.unread} unread)` : ''}`}
        >
          <Bell className="size-4.5" />
          {data.unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white ring-2 ring-surface">
              {data.unread > 9 ? '9+' : data.unread}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center justify-between px-3 pt-2 pb-2">
            <p className="font-semibold">Notifications</p>
            {data.unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="scrollbar-thin max-h-96 overflow-y-auto">
            {data.items.length === 0 && <EmptyState icon={Inbox} title="You're all caught up" description="Lead assignments and imports will show up here." className="py-8" />}
            {data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n, close)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface-2"
              >
                <Avatar name={n.actor_name || 'LeadFlow'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className={clsx('block text-[13px] leading-snug', n.read_at ? 'text-muted' : 'text-fg')}>{n.message}</span>
                  <span className="mt-0.5 block text-xs text-subtle">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </Menu>
  );
}
