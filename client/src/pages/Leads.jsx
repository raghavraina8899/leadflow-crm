import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowDownUp, ChevronLeft, ChevronRight, Download, Flag, Plus, Search, SearchX, Tag, Trash2, Upload, UserRoundCog, X, Layers,
} from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { PRIORITIES, STAGES } from '../lib/constants.js';
import { announceLeadsChanged, useDebounced, useLeadsChanged, useQuery } from '../lib/hooks.js';
import { dueLabel, formatDate, formatMoney, formatNumber, pluralize } from '../lib/format.js';
import { invalidateDirectory, useLeadMeta, useTeam } from '../lib/directory.js';
import { useAuth } from '../context/auth.jsx';
import { useToast } from '../context/toast.jsx';
import { useLeadEditor } from '../context/leadEditor.jsx';
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, Tabs } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Checkbox, Input, Select } from '../components/ui/Field.jsx';
import { Menu, MenuItem, MenuLabel } from '../components/ui/Menu.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Overlay.jsx';
import { PriorityIcon, ScoreBadge, StatusBadge, TagList } from '../components/leads/LeadBadges.jsx';
import { ImportDialog } from '../components/leads/ImportDialog.jsx';
import { LostReasonDialog } from '../components/leads/LostReasonDialog.jsx';

const VIEWS = [
  { id: 'all', label: 'All leads', params: {} },
  { id: 'open', label: 'Open', params: { status: 'open' } },
  { id: 'overdue', label: 'Overdue follow-up', params: { followUp: 'overdue' } },
  { id: 'stalled', label: 'No next step', params: { followUp: 'none' } },
  { id: 'won', label: 'Won', params: { status: 'converted' } },
  { id: 'lost', label: 'Lost', params: { status: 'lost' } },
];

const SORTS = [
  { id: 'created', label: 'Newest first', dir: 'desc' },
  { id: 'score', label: 'Lead score', dir: 'desc' },
  { id: 'value', label: 'Deal value', dir: 'desc' },
  { id: 'follow_up', label: 'Next follow-up', dir: 'asc' },
  { id: 'close', label: 'Expected close', dir: 'asc' },
  { id: 'name', label: 'Name (A–Z)', dir: 'asc' },
  { id: 'updated', label: 'Recently updated', dir: 'desc' },
];

const FILTER_KEYS = ['search', 'status', 'priority', 'source', 'tag', 'assignedTo', 'followUp'];
const PAGE_SIZE = 25;

function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries([...FILTER_KEYS, 'sort', 'dir', 'page'].map((k) => [k, params.get(k) || '']));
  const update = (changes, { keepPage } = {}) => {
    const next = { ...filters, ...(keepPage ? {} : { page: '' }), ...changes };
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  };
  return [filters, update];
}

function BulkTagDialog({ open, onClose, onApply, suggestions }) {
  const [tag, setTag] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Add a tag"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!tag.trim()} onClick={() => onApply(tag)}>Add tag</Button></>}
    >
      <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. q4-push" list="bulk-tags" data-autofocus onKeyDown={(e) => e.key === 'Enter' && tag.trim() && onApply(tag)} />
      <datalist id="bulk-tags">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
    </Modal>
  );
}

export default function Leads() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const openLeadForm = useLeadEditor();
  const team = useTeam();
  const meta = useLeadMeta();
  const [filters, update] = useFilters();
  const [search, setSearch] = useState(filters.search);
  const debouncedSearch = useDebounced(search, 300);
  const [selected, setSelected] = useState(new Set());
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== filters.search) update({ search: debouncedSearch });
  }, [debouncedSearch]);

  const queryKey = JSON.stringify(filters);
  const result = useQuery(() => api.get(`/leads${qs({ ...filters, limit: PAGE_SIZE })}`), [queryKey]);
  useLeadsChanged(result.reload);
  useEffect(() => setSelected(new Set()), [queryKey]);

  const activeView = VIEWS.find((v) => {
    const keys = FILTER_KEYS.filter((k) => k !== 'search');
    return keys.every((k) => (v.params[k] || '') === filters[k]);
  })?.id;

  const extraFilters = ['priority', 'source', 'tag', 'assignedTo'].filter((k) => filters[k]).length
    + (filters.status && !['open', 'converted', 'lost'].includes(filters.status) ? 1 : 0);

  const rows = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const page = Number(filters.page) || 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const sort = SORTS.find((s) => s.id === (filters.sort || 'created'));
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const runBulk = async (action, value, successMessage, reason) => {
    setBusy(true);
    try {
      const res = await api.post('/leads/bulk', { ids: [...selected], action, value, reason });
      toast.success(successMessage(res.updated));
      setSelected(new Set());
      setDialog(null);
      invalidateDirectory();
      announceLeadsChanged();
    } catch (err) {
      toast.error('Bulk update failed', err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      await api.download(`/leads/export${qs(filters)}`, 'leads.csv');
      toast.success('Export ready', `${pluralize(total, 'lead')} exported to CSV.`);
    } catch (err) {
      toast.error('Export failed', err.message);
    }
  };

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);
  const ownerName = useMemo(() => Object.fromEntries(team.map((u) => [String(u.id), u.name])), [team]);

  return (
    <>
      <PageHeader
        title="Leads"
        description={result.data ? `${pluralize(total, 'lead')}${hasFilters ? ' match your filters' : ''}` : 'Loading…'}
        actions={(
          <>
            <Button icon={Upload} onClick={() => setDialog('import')}>Import</Button>
            <Button icon={Download} onClick={exportCsv} disabled={!total}>Export</Button>
            <Button variant="primary" icon={Plus} onClick={() => openLeadForm()}>New lead</Button>
          </>
        )}
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="scrollbar-thin -mx-4 min-w-0 flex-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs
            tabs={VIEWS.map((v) => ({ id: v.id, label: v.label }))}
            value={activeView}
            onChange={(id) => update({ ...Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])), search: filters.search, ...VIEWS.find((v) => v.id === id).params })}
          />
        </div>
        <Menu
          className="shrink-0"
          trigger={({ toggle }) => <Button size="sm" icon={ArrowDownUp} onClick={toggle}>{sort.label}</Button>}
        >
          <MenuLabel>Sort by</MenuLabel>
          {SORTS.map((s) => (
            <MenuItem key={s.id} selected={s.id === sort.id} onClick={() => update({ sort: s.id, dir: s.dir })}>
              {s.label}
            </MenuItem>
          ))}
        </Menu>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, email, phone, city…" className="w-full md:w-80" />
        <Select size="sm" value={STAGES.some((s) => s.id === filters.status) ? filters.status : ''} onChange={(e) => update({ status: e.target.value })} className="w-[calc(50%-4px)] sm:w-36">
          <option value="">Any stage</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
        <Select size="sm" value={filters.priority} onChange={(e) => update({ priority: e.target.value })} className="w-[calc(50%-4px)] sm:w-36">
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label} priority</option>)}
        </Select>
        <Select size="sm" value={filters.source} onChange={(e) => update({ source: e.target.value })} className="w-[calc(50%-4px)] sm:w-36">
          <option value="">Any source</option>
          {meta.sources.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select size="sm" value={filters.tag} onChange={(e) => update({ tag: e.target.value })} className="w-[calc(50%-4px)] sm:w-36">
          <option value="">Any tag</option>
          {meta.tags.map((t) => <option key={t}>{t}</option>)}
        </Select>
        {isAdmin && (
          <Select size="sm" value={filters.assignedTo} onChange={(e) => update({ assignedTo: e.target.value })} className="w-[calc(50%-4px)] sm:w-40">
            <option value="">Any owner</option>
            <option value="unassigned">Unassigned</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
        {(extraFilters > 0 || filters.search) && (
          <Button variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); update(Object.fromEntries(FILTER_KEYS.map((k) => [k, '']))); }}>
            Clear
          </Button>
        )}
      </div>

      {result.error ? <ErrorState error={result.error} onRetry={result.reload} /> : (
        <div className={clsx('card overflow-hidden transition-opacity', result.loading && result.data && 'opacity-60')}>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-240 text-[13.5px]">
              <thead className="border-b border-line bg-surface-2/60 text-left text-xs text-muted">
                <tr>
                  <th className="w-10 py-2.5 pr-1 pl-4">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && rows.some((r) => selected.has(r.id))}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">Lead</th>
                  <th className="px-3 py-2.5 font-medium">Stage</th>
                  <th className="px-3 py-2.5 font-medium">Score</th>
                  <th className="px-3 py-2.5 text-right font-medium">Value</th>
                  {isAdmin && <th className="px-3 py-2.5 font-medium">Owner</th>}
                  <th className="px-3 py-2.5 font-medium">Next follow-up</th>
                  <th className="px-3 py-2.5 font-medium">Source</th>
                  <th className="px-3 py-2.5 pr-5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {!result.data && Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td colSpan={9} className="px-4 py-3"><Skeleton className="h-8" /></td>
                  </tr>
                ))}
                {rows.map((l) => {
                  const overdue = l.next_follow_up && new Date(l.next_follow_up) < new Date();
                  return (
                    <tr
                      key={l.id}
                      onClick={() => navigate(`/leads/${l.id}`)}
                      className={clsx('cursor-pointer border-b border-line transition-colors last:border-0', selected.has(l.id) ? 'bg-indigo-50/60 dark:bg-indigo-500/[0.07]' : 'hover:bg-surface-2/60')}
                    >
                      <td className="py-3 pr-1 pl-4"><Checkbox checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`} /></td>
                      <td className="max-w-75 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.name} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate font-medium">
                              {l.name}
                              <PriorityIcon priority={l.priority} />
                            </p>
                            <p className="truncate text-xs text-muted">{[l.job_title, l.company].filter(Boolean).join(' · ') || l.email || '—'}</p>
                          </div>
                        </div>
                        {l.tags.length > 0 && <div className="mt-1.5 ml-10"><TagList tags={l.tags} onClick={(t) => update({ tag: t })} /></div>}
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-3 py-3"><ScoreBadge score={l.score} /></td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{formatMoney(l.value)}</td>
                      {isAdmin && (
                        <td className="px-3 py-3">
                          {l.assigned_name ? (
                            <span className="flex items-center gap-2"><Avatar name={l.assigned_name} size="xs" /><span className="truncate">{l.assigned_name}</span></span>
                          ) : <span className="text-subtle">Unassigned</span>}
                        </td>
                      )}
                      <td className={clsx('px-3 py-3 whitespace-nowrap', overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted')}>
                        {l.next_follow_up ? dueLabel(l.next_follow_up) : <span className="text-subtle">—</span>}
                      </td>
                      <td className="px-3 py-3 text-muted">{l.source || '—'}</td>
                      <td className="px-3 py-3 pr-5 whitespace-nowrap text-muted">{formatDate(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.data && !rows.length && (
            <EmptyState
              icon={hasFilters ? SearchX : Layers}
              title={hasFilters ? 'No leads match these filters' : 'No leads yet'}
              description={hasFilters ? 'Try a different search or clear some filters.' : 'Add your first lead or import a CSV to get started.'}
              action={hasFilters
                ? <Button onClick={() => { setSearch(''); update(Object.fromEntries(FILTER_KEYS.map((k) => [k, '']))); }}>Clear filters</Button>
                : <Button variant="primary" icon={Plus} onClick={() => openLeadForm()}>New lead</Button>}
            />
          )}

          {total > 0 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-muted">
              <span>
                Showing <span className="font-medium text-fg">{formatNumber((page - 1) * PAGE_SIZE + 1)}–{formatNumber(Math.min(page * PAGE_SIZE, total))}</span> of {formatNumber(total)}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" icon={ChevronLeft} disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, { keepPage: true })} aria-label="Previous page" />
                <span className="px-2 tabular-nums">{page} / {pages}</span>
                <Button size="icon-sm" variant="ghost" icon={ChevronRight} disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, { keepPage: true })} aria-label="Next page" />
              </div>
            </div>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="animate-toast-in fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 pl-4 shadow-2xl shadow-black/15">
            <span className="mr-2 text-[13px] font-medium">{selected.size} selected</span>
            <Menu placement="top" align="left" trigger={({ toggle }) => <Button size="sm" variant="ghost" icon={Layers} onClick={toggle}>Stage</Button>}>
              {STAGES.map((s) => (
                <MenuItem key={s.id} onClick={() => (s.id === 'lost' ? setDialog('lost') : runBulk('status', s.id, (n) => `${pluralize(n, 'lead')} moved to ${s.label}`))}>
                  <span className="flex items-center gap-2"><span className={clsx('size-2 rounded-full', s.dot)} />{s.label}</span>
                </MenuItem>
              ))}
            </Menu>
            <Menu placement="top" align="left" width="w-44" trigger={({ toggle }) => <Button size="sm" variant="ghost" icon={Flag} onClick={toggle}>Priority</Button>}>
              {PRIORITIES.map((p) => (
                <MenuItem key={p.id} onClick={() => runBulk('priority', p.id, (n) => `Priority set to ${p.label.toLowerCase()} for ${pluralize(n, 'lead')}`)}>
                  <PriorityIcon priority={p.id} showLabel />
                </MenuItem>
              ))}
            </Menu>
            <Button size="sm" variant="ghost" icon={Tag} onClick={() => setDialog('tag')}>Tag</Button>
            {isAdmin && (
              <Menu placement="top" align="left" trigger={({ toggle }) => <Button size="sm" variant="ghost" icon={UserRoundCog} onClick={toggle}>Assign</Button>}>
                <MenuLabel>Assign to</MenuLabel>
                {team.map((u) => (
                  <MenuItem key={u.id} onClick={() => runBulk('assign', u.id, (n) => `${pluralize(n, 'lead')} assigned to ${ownerName[u.id]}`)}>
                    <span className="flex items-center gap-2"><Avatar name={u.name} size="xs" />{u.name}</span>
                  </MenuItem>
                ))}
                <MenuItem onClick={() => runBulk('assign', null, (n) => `${pluralize(n, 'lead')} unassigned`)}>Unassigned</MenuItem>
              </Menu>
            )}
            {isAdmin && <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setDialog('delete')}>Delete</Button>}
            <Button size="icon-sm" variant="ghost" icon={X} onClick={() => setSelected(new Set())} aria-label="Clear selection" />
          </div>
        </div>
      )}

      <ImportDialog
        open={dialog === 'import'}
        onClose={() => setDialog(null)}
        onImported={(res) => {
          if (res.created) {
            invalidateDirectory();
            announceLeadsChanged();
          }
        }}
      />
      <BulkTagDialog
        key={dialog === 'tag' ? 'tag-open' : 'tag'}
        open={dialog === 'tag'}
        onClose={() => setDialog(null)}
        suggestions={meta.tags}
        onApply={(tag) => runBulk('tag', tag, (n) => `Tagged ${pluralize(n, 'lead')} with “${tag.trim().toLowerCase()}”`)}
      />
      <LostReasonDialog
        key={dialog === 'lost' ? 'lost-open' : 'lost'}
        open={dialog === 'lost'}
        leadName={`${selected.size} selected leads`}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runBulk('status', 'lost', (n) => `${pluralize(n, 'lead')} marked as lost`, reason)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        danger
        loading={busy}
        title={`Delete ${pluralize(selected.size, 'lead')}?`}
        description="Their activity history and follow-ups will be removed too. This cannot be undone."
        confirmLabel="Delete permanently"
        onConfirm={() => runBulk('delete', null, (n) => `${pluralize(n, 'lead')} deleted`)}
      />
    </>
  );
}
