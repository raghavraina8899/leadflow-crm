import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { CalendarClock, Plus, Search } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { STAGES } from '../lib/constants.js';
import { announceLeadsChanged, useDebounced, useLeadsChanged, useQuery } from '../lib/hooks.js';
import { dueLabel, formatMoney, formatMoneyShort } from '../lib/format.js';
import { useTeam } from '../lib/directory.js';
import { useAuth } from '../context/auth.jsx';
import { useToast } from '../context/toast.jsx';
import { useLeadEditor } from '../context/leadEditor.jsx';
import { Avatar, ErrorState, PageHeader, Skeleton } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import { PriorityIcon, TagList } from '../components/leads/LeadBadges.jsx';
import { LostReasonDialog } from '../components/leads/LostReasonDialog.jsx';

function DealCard({ lead, dragging, overlay }) {
  const overdue = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
  return (
    <div
      className={clsx(
        'rounded-xl border bg-surface p-3.5 text-left transition',
        overlay ? 'rotate-[1.5deg] border-indigo-300 shadow-xl shadow-black/10 dark:border-indigo-500/60' : 'border-line shadow-[0_1px_2px_rgba(16,16,24,0.05)] hover:border-line-strong hover:shadow-md',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{lead.name}</p>
          <p className="truncate text-xs text-muted">{lead.company || lead.email || '—'}</p>
        </div>
        <PriorityIcon priority={lead.priority} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight tabular-nums">{formatMoney(lead.value)}</span>
        {lead.assigned_name ? <Avatar name={lead.assigned_name} size="xs" /> : <span className="text-[11px] text-subtle">Unassigned</span>}
      </div>

      {(lead.next_follow_up || lead.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          {lead.next_follow_up && (
            <span className={clsx('inline-flex items-center gap-1 text-[11px] font-medium', overdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted')}>
              <CalendarClock className="size-3" />
              {dueLabel(lead.next_follow_up)}
            </span>
          )}
          <TagList tags={lead.tags} max={2} />
        </div>
      )}
    </div>
  );
}

function DraggableCard({ lead }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/leads/${lead.id}`)}
      onKeyDown={(e) => {
        listeners.onKeyDown?.(e);
        if (e.key === 'Enter' && !e.defaultPrevented) navigate(`/leads/${lead.id}`);
      }}
      className="cursor-grab touch-none rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 active:cursor-grabbing"
    >
      <DealCard lead={lead} dragging={isDragging} />
    </div>
  );
}

function Column({ stage, leads, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = leads.reduce((sum, l) => sum + l.value, 0);
  const closed = stage.id === 'converted' || stage.id === 'lost';

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={clsx('size-2 rounded-full', stage.dot)} />
          <span className="font-semibold">{stage.label}</span>
          <span className="rounded-md bg-surface-3 px-1.5 text-xs font-medium text-muted tabular-nums">{leads.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-muted tabular-nums" title={formatMoney(total)}>{formatMoneyShort(total)}</span>
          {!closed && (
            <button onClick={() => onAdd(stage.id)} className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-fg" aria-label={`Add lead to ${stage.label}`}>
              <Plus className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          'scrollbar-thin flex min-h-40 flex-1 flex-col gap-2.5 overflow-y-auto rounded-2xl p-2 transition-colors',
          isOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset dark:bg-indigo-500/10 dark:ring-indigo-500/40' : 'bg-surface-2/80',
        )}
      >
        {leads.map((lead) => <DraggableCard key={lead.id} lead={lead} />)}
        {!leads.length && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line px-4 py-8 text-center text-xs text-subtle">
            {closed ? `${stage.label} deals from the last 30 days appear here` : 'Drop a deal here'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const openLeadForm = useLeadEditor();
  const team = useTeam();
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState('');
  const [activeLead, setActiveLead] = useState(null);
  const [pendingLoss, setPendingLoss] = useState(null);
  const debouncedSearch = useDebounced(search);

  const board = useQuery(
    () => api.get(`/leads/board${qs({ search: debouncedSearch, assignedTo: owner, priority })}`),
    [debouncedSearch, owner, priority],
  );
  useLeadsChanged(board.reload);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(() => {
    const grouped = Object.fromEntries(STAGES.map((s) => [s.id, []]));
    for (const lead of board.data ?? []) grouped[lead.status]?.push(lead);
    return grouped;
  }, [board.data]);

  const openValue = useMemo(
    () => (board.data ?? []).filter((l) => !['converted', 'lost'].includes(l.status)).reduce((s, l) => s + l.value, 0),
    [board.data],
  );

  const move = async (lead, status, lostReason) => {
    const previous = board.data;
    board.setData((leads) => leads.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await api.put(`/leads/${lead.id}`, { status, ...(lostReason && { lost_reason: lostReason }) });
      announceLeadsChanged();
      if (status === 'converted') toast.success('Deal won', `${lead.name} · ${formatMoney(lead.value)}`);
      else toast.success(`Moved to ${STAGES.find((s) => s.id === status).label}`, lead.name);
    } catch (err) {
      board.setData(previous);
      toast.error('Could not move deal', err.message);
    }
  };

  const onDragEnd = ({ active, over }) => {
    setActiveLead(null);
    const lead = active.data.current?.lead;
    if (!over || !lead || over.id === lead.status) return;
    if (over.id === 'lost') setPendingLoss(lead);
    else move(lead, over.id);
  };

  if (board.error) return <ErrorState error={board.error} onRetry={board.reload} />;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col lg:h-[calc(100vh-9rem)]">
      <PageHeader
        title="Pipeline"
        description={board.data ? `${formatMoney(openValue)} in open deals · drag cards to update their stage` : 'Loading pipeline…'}
        actions={<Button variant="primary" icon={Plus} onClick={() => openLeadForm()}>New deal</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter deals…" className="w-full sm:w-64" />
        {isAdmin && (
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full sm:w-44">
            <option value="">All owners</option>
            <option value="unassigned">Unassigned</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full sm:w-40">
          <option value="">Any priority</option>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </Select>
      </div>

      {board.data ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveLead(active.data.current.lead)}
          onDragCancel={() => setActiveLead(null)}
          onDragEnd={onDragEnd}
        >
          <div className={clsx('scrollbar-thin -mx-4 flex min-h-0 flex-1 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8', board.loading && 'opacity-70')}>
            {STAGES.map((stage) => (
              <Column key={stage.id} stage={stage} leads={columns[stage.id]} onAdd={(status) => openLeadForm({ status })} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {activeLead && <div className="w-68"><DealCard lead={activeLead} overlay /></div>}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex gap-4 overflow-hidden">
          {STAGES.map((s) => <Skeleton key={s.id} className="h-[60vh] w-72 shrink-0 rounded-2xl" />)}
        </div>
      )}

      <LostReasonDialog
        key={pendingLoss?.id}
        open={Boolean(pendingLoss)}
        leadName={pendingLoss?.name}
        onClose={() => setPendingLoss(null)}
        onConfirm={async (reason) => {
          await move(pendingLoss, 'lost', reason);
          setPendingLoss(null);
        }}
      />
    </div>
  );
}
