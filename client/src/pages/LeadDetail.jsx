import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlarmClock, ArrowLeft, Building2, CalendarDays, Check, ChevronRight, Clock, Globe, IndianRupee, Mail, MapPin,
  MoreHorizontal, Pencil, Phone, Radio, RotateCcw, Trash2, UserRound, XCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { OPEN_STAGES, STAGE } from '../lib/constants.js';
import { announceLeadsChanged, useQuery } from '../lib/hooks.js';
import { dueLabel, formatDate, formatMoney, timeAgo } from '../lib/format.js';
import { useTeam } from '../lib/directory.js';
import { useAuth } from '../context/auth.jsx';
import { useToast } from '../context/toast.jsx';
import { useLeadEditor } from '../context/leadEditor.jsx';
import { Avatar, EmptyState, ErrorState, Skeleton } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Field.jsx';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../components/ui/Menu.jsx';
import { ConfirmDialog } from '../components/ui/Overlay.jsx';
import { PriorityIcon, ScoreBadge, StatusBadge, TagList } from '../components/leads/LeadBadges.jsx';
import { LostReasonDialog } from '../components/leads/LostReasonDialog.jsx';
import { ActivityComposer } from '../components/leads/ActivityComposer.jsx';
import { Timeline } from '../components/leads/Timeline.jsx';

const PATH = [...OPEN_STAGES, STAGE.converted];

function StageTrack({ status, onChange, disabled }) {
  const current = PATH.findIndex((s) => s.id === status);
  return (
    <div className="flex overflow-hidden rounded-xl border border-line bg-surface">
      {PATH.map((stage, i) => {
        const done = status !== 'lost' && i < current;
        const active = i === current;
        return (
          <button
            key={stage.id}
            disabled={disabled || active}
            onClick={() => onChange(stage.id)}
            className={clsx(
              'relative flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[13px] font-medium transition',
              i > 0 && 'border-l border-line',
              active && stage.id === 'converted' && 'bg-emerald-600 text-white',
              active && stage.id !== 'converted' && 'bg-indigo-600 text-white',
              done && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
              !active && !done && 'text-muted hover:bg-surface-2 hover:text-fg',
              status === 'lost' && 'opacity-60',
            )}
            title={active ? `Current stage: ${stage.label}` : `Move to ${stage.label}`}
          >
            {done && <Check className="size-3.5" />}
            <span className="truncate">{stage.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-subtle" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <div className="mt-0.5 truncate text-[13.5px]">{children || <span className="text-subtle">—</span>}</div>
      </div>
    </div>
  );
}

function FollowUps({ tasks, onComplete, onSnooze }) {
  if (!tasks.length) {
    return <p className="px-1 pb-1 text-[13px] text-muted">No open follow-ups. Every open deal should have a next step.</p>;
  }
  return (
    <ul className="-mx-2">
      {tasks.map((t) => {
        const overdue = new Date(t.due_at) < new Date();
        return (
          <li key={t.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/70">
            <button
              onClick={() => onComplete(t)}
              className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line-strong text-transparent transition hover:border-emerald-500 hover:text-emerald-500"
              aria-label={`Complete ${t.subject}`}
            >
              <Check className="size-3" strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">{t.subject}</p>
              <p className={clsx('text-xs', overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted')}>{dueLabel(t.due_at)}</p>
            </div>
            <Menu
              width="w-40"
              trigger={({ toggle }) => (
                <button onClick={toggle} className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-fg" aria-label="Snooze">
                  <AlarmClock className="size-4" />
                </button>
              )}
            >
              <MenuLabel>Snooze</MenuLabel>
              {[[1, '1 day'], [3, '3 days'], [7, '1 week']].map(([days, label]) => (
                <MenuItem key={days} onClick={() => onSnooze(t, days)}>{label}</MenuItem>
              ))}
            </Menu>
          </li>
        );
      })}
    </ul>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const openLeadForm = useLeadEditor();
  const { user, isAdmin } = useAuth();
  const team = useTeam();
  const lead = useQuery(() => api.get(`/leads/${id}`), [id]);
  const [dialog, setDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (lead.error) {
    return lead.error.status === 404 ? (
      <EmptyState
        icon={XCircle}
        title="Lead not found"
        description="It may have been deleted, or it's assigned to someone else."
        action={<Button to="/leads" icon={ArrowLeft}>Back to leads</Button>}
      />
    ) : <ErrorState error={lead.error} onRetry={lead.reload} />;
  }

  if (!lead.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-xl lg:col-span-2" /><Skeleton className="h-96 rounded-xl" /></div>
      </div>
    );
  }

  const l = lead.data;
  const openTasks = l.activities.filter((a) => a.due_at && !a.completed_at).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  const history = l.activities.filter((a) => !a.due_at || a.completed_at);
  const closed = l.status === 'converted' || l.status === 'lost';

  const refresh = () => {
    lead.reload();
    announceLeadsChanged();
  };

  const update = async (changes, message) => {
    try {
      await api.put(`/leads/${l.id}`, changes);
      toast.success(message);
      refresh();
    } catch (err) {
      toast.error('Update failed', err.message);
    }
  };

  const changeStage = (status) => {
    if (status === 'converted') return update({ status }, `${l.name} marked as won · ${formatMoney(l.value)}`);
    return update({ status }, `Moved to ${STAGE[status].label}`);
  };

  const completeTask = async (task) => {
    lead.setData((d) => ({ ...d, activities: d.activities.map((a) => (a.id === task.id ? { ...a, completed_at: new Date().toISOString() } : a)) }));
    try {
      await api.patch(`/activities/${task.id}/complete`, { completed: true });
      toast.info('Follow-up completed', task.subject, {
        label: 'Undo',
        onClick: () => api.patch(`/activities/${task.id}/complete`, { completed: false }).then(refresh),
      });
      refresh();
    } catch (err) {
      toast.error('Could not complete', err.message);
      lead.reload();
    }
  };

  const snooze = async (task, days) => {
    try {
      await api.patch(`/activities/${task.id}/reschedule`, { days });
      toast.success(`Snoozed for ${days === 7 ? 'a week' : `${days} day${days > 1 ? 's' : ''}`}`);
      refresh();
    } catch (err) {
      toast.error('Could not snooze', err.message);
    }
  };

  const deleteActivity = async (activity) => {
    try {
      await api.del(`/activities/${activity.id}`);
      refresh();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const deleteLead = async () => {
    setDeleting(true);
    try {
      await api.del(`/leads/${l.id}`);
      announceLeadsChanged();
      toast.success('Lead deleted', l.name);
      navigate('/leads');
    } catch (err) {
      toast.error('Could not delete', err.message);
      setDeleting(false);
    }
  };

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Leads
      </Link>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={l.name} size="xl" square />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{l.name}</h1>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-1 truncate text-muted">{[l.job_title, l.company].filter(Boolean).join(' at ') || 'No company'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                <span className="font-semibold tabular-nums">{formatMoney(l.value)}</span>
                <PriorityIcon priority={l.priority} showLabel />
                {!closed && <ScoreBadge score={l.score} size="md" />}
                {l.assigned_name && <span className="flex items-center gap-1.5 text-muted"><Avatar name={l.assigned_name} size="xs" />{l.assigned_name}</span>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {l.phone && <Button href={`tel:${l.phone.replace(/\s/g, '')}`} icon={Phone}>Call</Button>}
            {l.email && <Button href={`mailto:${l.email}`} icon={Mail}>Email</Button>}
            <Button icon={Pencil} onClick={() => openLeadForm(l, { onSaved: lead.reload })}>Edit</Button>
            <Menu trigger={({ toggle }) => <Button size="icon" icon={MoreHorizontal} onClick={toggle} aria-label="More actions" />}>
              {l.status === 'lost' || l.status === 'converted'
                ? <MenuItem icon={RotateCcw} onClick={() => update({ status: 'proposal' }, 'Deal reopened')}>Reopen deal</MenuItem>
                : <MenuItem icon={XCircle} onClick={() => setDialog('lost')}>Mark as lost</MenuItem>}
              {isAdmin && (
                <>
                  <MenuSeparator />
                  <MenuItem icon={Trash2} danger onClick={() => setDialog('delete')}>Delete lead</MenuItem>
                </>
              )}
            </Menu>
          </div>
        </div>

        <div className="mt-6">
          <StageTrack status={l.status} onChange={changeStage} />
          {l.status === 'lost' && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              <XCircle className="size-4" />
              <span className="flex-1">Lost{l.lost_reason ? ` — ${l.lost_reason}` : ''}</span>
              <button onClick={() => update({ status: 'proposal' }, 'Deal reopened')} className="font-medium underline-offset-2 hover:underline">Reopen</button>
            </div>
          )}
          {!closed && (
            <button onClick={() => setDialog('lost')} className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-rose-600">
              Mark as lost <ChevronRight className="size-3" />
            </button>
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ActivityComposer leadId={l.id} onSaved={refresh} />
          <section className="card p-5">
            <h2 className="mb-5 font-semibold">Activity</h2>
            <Timeline
              activities={history}
              canDelete={(a) => isAdmin || a.user_id === user.id}
              onDelete={deleteActivity}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <section className={clsx('card p-5', openTasks.some((t) => new Date(t.due_at) < new Date()) && 'ring-1 ring-rose-200 dark:ring-rose-500/30')}>
            <h2 className="mb-3 flex items-center justify-between font-semibold">
              Next steps
              {openTasks.length > 0 && <span className="text-xs font-medium text-muted">{openTasks.length} open</span>}
            </h2>
            <FollowUps tasks={openTasks} onComplete={completeTask} onSnooze={snooze} />
          </section>

          <section className="card p-5">
            <h2 className="mb-1 font-semibold">About</h2>
            <div className="divide-y divide-line">
              <DetailRow icon={Mail} label="Email">{l.email && <a href={`mailto:${l.email}`} className="text-indigo-600 hover:underline dark:text-indigo-400">{l.email}</a>}</DetailRow>
              <DetailRow icon={Phone} label="Phone">{l.phone && <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="hover:underline">{l.phone}</a>}</DetailRow>
              <DetailRow icon={Building2} label="Company">{l.company}</DetailRow>
              <DetailRow icon={Globe} label="Website">{l.website && <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{l.website.replace(/^https?:\/\//, '')}</a>}</DetailRow>
              <DetailRow icon={MapPin} label="City">{l.city}</DetailRow>
              <DetailRow icon={Radio} label="Source">{l.source}</DetailRow>
              <DetailRow icon={IndianRupee} label="Deal value">{formatMoney(l.value)}</DetailRow>
              <DetailRow icon={CalendarDays} label="Expected close">{l.expected_close && formatDate(l.expected_close)}</DetailRow>
              <DetailRow icon={UserRound} label="Owner">
                {isAdmin ? (
                  <Select size="sm" value={l.assigned_to ?? ''} onChange={(e) => update({ assigned_to: e.target.value || null }, 'Owner updated')} className="mt-1">
                    <option value="">Unassigned</option>
                    {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                ) : l.assigned_name}
              </DetailRow>
              <DetailRow icon={Clock} label="Created">{formatDate(l.created_at)} · last activity {l.last_activity_at ? timeAgo(l.last_activity_at) : 'never'}</DetailRow>
            </div>
            {l.tags.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <p className="mb-2 text-xs text-muted">Tags</p>
                <TagList tags={l.tags} max={10} onClick={(t) => navigate(`/leads?tag=${encodeURIComponent(t)}`)} />
              </div>
            )}
          </section>

          {l.notes && (
            <section className="card p-5">
              <h2 className="mb-2 font-semibold">Notes</h2>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-muted">{l.notes}</p>
            </section>
          )}
        </aside>
      </div>

      <LostReasonDialog
        key={dialog === 'lost' ? 'open' : 'closed'}
        open={dialog === 'lost'}
        leadName={l.name}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await update({ status: 'lost', lost_reason: reason }, 'Marked as lost');
          setDialog(null);
        }}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        danger
        loading={deleting}
        title={`Delete ${l.name}?`}
        description="All activity and follow-ups for this lead will be removed. This cannot be undone."
        confirmLabel="Delete lead"
        onConfirm={deleteLead}
      />
    </>
  );
}
