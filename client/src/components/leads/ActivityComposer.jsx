import { useState } from 'react';
import clsx from 'clsx';
import { CalendarPlus } from 'lucide-react';
import { api } from '../../lib/api.js';
import { ACTIVITY_TYPES } from '../../lib/constants.js';
import { toLocalInput } from '../../lib/format.js';
import { useToast } from '../../context/toast.jsx';
import { Button } from '../ui/Button.jsx';
import { Kbd } from '../ui/Display.jsx';

const TYPES = ['note', 'call', 'meeting', 'email', 'follow_up'];

const PLACEHOLDERS = {
  note: 'Add a note about this lead…',
  call: 'What was discussed on the call?',
  meeting: 'Who attended and what was agreed?',
  email: 'Summarise the email you sent or received…',
  follow_up: 'What needs to happen next?',
};

function at(daysFromNow, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d);
}

const QUICK_DUES = [
  { label: 'Tomorrow', value: () => at(1) },
  { label: 'In 3 days', value: () => at(3) },
  { label: 'Next week', value: () => at(7) },
];

function splitText(text) {
  const [first, ...rest] = text.trim().split('\n');
  const subject = first.length > 140 ? `${first.slice(0, 137)}…` : first;
  const notes = (first.length > 140 ? text.trim() : rest.join('\n').trim()) || null;
  return { subject, notes };
}

export function ActivityComposer({ leadId, onSaved }) {
  const toast = useToast();
  const [type, setType] = useState('note');
  const [text, setText] = useState('');
  const [due, setDue] = useState(at(1));
  const [schedule, setSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const isTask = type === 'follow_up';

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { subject, notes } = splitText(text);
      const dueAt = new Date(due).toISOString();
      if (isTask) {
        await api.post(`/leads/${leadId}/activities`, { type, subject, notes, due_at: dueAt });
      } else {
        await api.post(`/leads/${leadId}/activities`, { type, subject, notes });
        if (schedule) {
          await api.post(`/leads/${leadId}/activities`, { type: 'follow_up', subject: `Follow up: ${subject}`, due_at: dueAt });
        }
      }
      setText('');
      setSchedule(false);
      setDue(at(1));
      toast.success(isTask ? 'Follow-up scheduled' : `${ACTIVITY_TYPES[type].label} logged`);
      onSaved();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-line px-3 pt-3">
        {TYPES.map((t) => {
          const { icon: Icon, label } = ACTIVITY_TYPES[t];
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-[13px] font-medium whitespace-nowrap transition',
                type === t ? 'border-indigo-600 text-fg dark:border-indigo-400' : 'border-transparent text-muted hover:text-fg',
              )}
            >
              <Icon className="size-3.5" />
              {t === 'note' ? 'Note' : t === 'follow_up' ? 'Follow-up' : `Log ${label.toLowerCase()}`}
            </button>
          );
        })}
      </div>
      <div className="p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
          rows={isTask ? 2 : 3}
          placeholder={PLACEHOLDERS[type]}
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-subtle"
        />

        {(isTask || schedule) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2">
            <span className="px-1 text-xs font-medium text-muted">Due</span>
            {QUICK_DUES.map((q) => (
              <button
                key={q.label}
                onClick={() => setDue(q.value())}
                className={clsx('rounded-md px-2 py-1 text-xs font-medium transition', due === q.value() ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg')}
              >
                {q.label}
              </button>
            ))}
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="field ml-auto h-8 w-auto py-1 text-xs" />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          {isTask ? <span /> : (
            <button
              onClick={() => setSchedule((s) => !s)}
              className={clsx('inline-flex items-center gap-1.5 text-[13px] font-medium transition', schedule ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted hover:text-fg')}
            >
              <CalendarPlus className="size-4" />
              {schedule ? 'Follow-up will be scheduled' : 'Schedule a follow-up'}
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-subtle sm:flex"><Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
            <Button variant="primary" size="sm" onClick={submit} loading={saving} disabled={!text.trim()}>
              {isTask ? 'Schedule' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
