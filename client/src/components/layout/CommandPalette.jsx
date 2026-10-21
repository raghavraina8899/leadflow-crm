import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight, BarChart3, CalendarCheck2, CornerDownLeft, Kanban, LayoutDashboard, Plus, Search, Settings, Users,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useDebounced } from '../../lib/hooks.js';
import { useLeadEditor } from '../../context/leadEditor.jsx';
import { Avatar, Kbd } from '../ui/Display.jsx';
import { StatusBadge } from '../leads/LeadBadges.jsx';

const PAGES = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Pipeline board', to: '/pipeline', icon: Kanban },
  { label: 'All leads', to: '/leads', icon: Users },
  { label: 'Follow-ups', to: '/tasks', icon: CalendarCheck2 },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const openLeadForm = useLeadEditor();
  const [term, setTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [active, setActive] = useState(0);
  const debounced = useDebounced(term, 180);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setTerm('');
      setLeads([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounced.trim().length < 2) return setLeads([]);
    let alive = true;
    api.get(`/search?q=${encodeURIComponent(debounced.trim())}`).then((r) => alive && setLeads(r.leads)).catch(() => {});
    return () => { alive = false; };
  }, [debounced]);

  const items = useMemo(() => {
    const q = term.trim().toLowerCase();
    const actions = [
      { id: 'new', label: 'Create new lead', icon: Plus, run: () => openLeadForm() },
      ...PAGES.map((p) => ({ id: p.to, label: p.label, icon: p.icon, hint: 'Go to', run: () => navigate(p.to) })),
    ].filter((a) => !q || a.label.toLowerCase().includes(q));
    const leadItems = leads.map((l) => ({ id: `lead-${l.id}`, lead: l, run: () => navigate(`/leads/${l.id}`) }));
    return [...leadItems, ...actions];
  }, [term, leads, navigate, openLeadForm]);

  useEffect(() => setActive(0), [items.length]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (item) => {
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      run(items[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const firstAction = items.findIndex((i) => !i.lead);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="animate-fade-in absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-pop-in relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4.5 text-subtle" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search leads, companies, or jump to…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
          {leads.length > 0 && <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Leads</p>}
          {items.map((item, i) => (
            <div key={item.id}>
              {i === firstAction && <p className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Actions</p>}
              <button
                data-active={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => run(item)}
                className={clsx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', i === active && 'bg-surface-2')}
              >
                {item.lead ? (
                  <>
                    <Avatar name={item.lead.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.lead.name}</span>
                      <span className="block truncate text-xs text-muted">{[item.lead.company, item.lead.email].filter(Boolean).join(' · ')}</span>
                    </span>
                    <StatusBadge status={item.lead.status} />
                  </>
                ) : (
                  <>
                    <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface">
                      <item.icon className="size-4 text-muted" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.hint && <span className="text-xs text-subtle">{item.hint}</span>}
                  </>
                )}
                {i === active && (item.lead ? <ArrowRight className="size-4 text-subtle" /> : <CornerDownLeft className="size-3.5 text-subtle" />)}
              </button>
            </div>
          ))}
          {!items.length && <p className="px-3 py-10 text-center text-muted">No results for “{term}”</p>}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2/60 px-4 py-2 text-xs text-subtle">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
