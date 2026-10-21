import { useState } from 'react';
import { Drawer } from '../ui/Overlay.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Select, TagInput, Textarea, Field } from '../ui/Field.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useLeadMeta, useTeam } from '../../lib/directory.js';
import { LOST_REASONS, PRIORITIES, SOURCES, STAGES } from '../../lib/constants.js';

const EMPTY = {
  name: '', company: '', job_title: '', email: '', phone: '', website: '', city: '',
  source: '', status: 'new', priority: 'medium', value: '', expected_close: '', tags: [], notes: '', lost_reason: '', assigned_to: '',
};

function toForm(lead) {
  const form = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) {
    if (lead?.[key] !== undefined && lead[key] !== null) form[key] = lead[key];
  }
  return form;
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold tracking-wide text-subtle uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function LeadFormDrawer({ open, lead, onClose, onSubmit }) {
  const { isAdmin, user } = useAuth();
  const team = useTeam();
  const meta = useLeadMeta();
  const [form, setForm] = useState(() => toForm(lead ?? { assigned_to: isAdmin ? '' : user.id }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = Boolean(lead?.id);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));
  const sources = [...new Set([...SOURCES, ...meta.sources])];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!isAdmin) delete payload.assigned_to;
      if (payload.status !== 'lost') delete payload.lost_reason;
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${lead.name}` : 'New lead'}
      description={editing ? 'Update contact and deal details.' : 'Capture a new opportunity. Only a name is required.'}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="lead-form" loading={saving}>
            {editing ? 'Save changes' : 'Create lead'}
          </Button>
        </>
      )}
    >
      <form id="lead-form" onSubmit={submit} className="space-y-8">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}

        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={set('name')} required data-autofocus placeholder="e.g. Meera Iyer" />
            <Input label="Job title" value={form.job_title} onChange={set('job_title')} placeholder="e.g. Head of Operations" />
            <Input label="Company" value={form.company} onChange={set('company')} placeholder="e.g. Iyer & Sons" />
            <Input label="Website" value={form.website} onChange={set('website')} placeholder="https://" />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="name@company.com" />
            <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 98xxx xxxxx" />
            <Input label="City" value={form.city} onChange={set('city')} />
            <Select label="Source" value={form.source} onChange={set('source')}>
              <option value="">Select source</option>
              {sources.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
        </Section>

        <Section title="Deal">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Stage" value={form.status} onChange={set('status')}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Select label="Priority" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
            <Input label="Deal value (₹)" type="number" min="0" step="1000" value={form.value} onChange={set('value')} placeholder="0" />
            <Input label="Expected close" type="date" value={form.expected_close} onChange={set('expected_close')} />
            {form.status === 'lost' && (
              <Select label="Lost reason" value={form.lost_reason} onChange={set('lost_reason')} className="sm:col-span-2">
                <option value="">Select a reason</option>
                {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
              </Select>
            )}
            {isAdmin && (
              <Select label="Owner" value={form.assigned_to ?? ''} onChange={set('assigned_to')} className="sm:col-span-2">
                <option value="">Unassigned</option>
                {team.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role === 'admin' ? ' (admin)' : ''}</option>)}
              </Select>
            )}
          </div>
          <Field label="Tags" hint="Press Enter or comma to add.">
            <TagInput value={form.tags} onChange={set('tags')} suggestions={meta.tags} />
          </Field>
        </Section>

        <Section title="Notes">
          <Textarea value={form.notes} onChange={set('notes')} rows={4} placeholder="Context, requirements, decision makers…" />
        </Section>
      </form>
    </Drawer>
  );
}
