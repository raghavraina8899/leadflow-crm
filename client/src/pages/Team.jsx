import { useState } from 'react';
import clsx from 'clsx';
import { KeyRound, MoreHorizontal, Pencil, RefreshCw, UserCheck, UserPlus, UserX } from 'lucide-react';
import { api } from '../lib/api.js';
import { useQuery } from '../lib/hooks.js';
import { formatMoneyShort } from '../lib/format.js';
import { invalidateDirectory } from '../lib/directory.js';
import { useAuth } from '../context/auth.jsx';
import { useToast } from '../context/toast.jsx';
import { Avatar, Badge, ErrorState, PageHeader, Skeleton } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import { Menu, MenuItem, MenuSeparator } from '../components/ui/Menu.jsx';
import { Modal } from '../components/ui/Overlay.jsx';

const generatePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => chars[n % chars.length]).join('');
};

function UserDialog({ user, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(user?.id);
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', title: user?.title ?? '', role: user?.role ?? 'sales', password: editing ? '' : generatePassword(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/users/${user.id}`, { name: form.name, title: form.title, role: form.role });
        toast.success('Teammate updated');
      } else {
        await api.post('/users', form);
        toast.success(`${form.name} added`, `Share their temporary password: ${form.password}`);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${user.name}` : 'Add a teammate'}
      description={editing ? undefined : 'They can sign in right away with the temporary password below.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="user-form" loading={saving}>{editing ? 'Save' : 'Add teammate'}</Button></>}
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <Input label="Full name" value={form.name} onChange={set('name')} required data-autofocus />
        <Input label="Job title" value={form.title} onChange={set('title')} placeholder="e.g. Account Executive" />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required disabled={editing} className="sm:col-span-2" />
        <Select label="Role" value={form.role} onChange={set('role')} disabled={user?.isSelf} hint={form.role === 'admin' ? 'Full access to all leads, reports and team settings.' : 'Works their own leads only.'} className="sm:col-span-2">
          <option value="sales">Sales</option>
          <option value="admin">Admin</option>
        </Select>
        {!editing && (
          <div className="flex items-end gap-2 sm:col-span-2">
            <Input label="Temporary password" value={form.password} onChange={set('password')} minLength={8} required className="flex-1 font-mono" />
            <Button icon={RefreshCw} onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))} aria-label="Generate password" />
          </div>
        )}
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, { password });
      toast.success('Password reset', `New password for ${user.name}: ${password}`);
      onClose();
    } catch (err) {
      toast.error('Could not reset password', err.message);
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Reset password for ${user.name}`}
      description="Share the new password with them securely."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} loading={saving} disabled={password.length < 8}>Reset password</Button></>}
    >
      <div className="flex gap-2">
        <Input value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 font-mono" />
        <Button icon={RefreshCw} onClick={() => setPassword(generatePassword())} aria-label="Generate password" />
      </div>
    </Modal>
  );
}

function DeactivateDialog({ user, team, onClose, onSaved }) {
  const toast = useToast();
  const [reassignTo, setReassignTo] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, { active: false, reassign_to: reassignTo || undefined });
      toast.success(`${user.name} deactivated`);
      onSaved();
    } catch (err) {
      toast.error('Could not deactivate', err.message);
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Deactivate ${user.name}?`}
      description="They will be signed out immediately and won't be able to sign in. Their history is kept."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={save} loading={saving}>Deactivate</Button></>}
    >
      {user.open_leads > 0 && (
        <Select label={`Hand over their ${user.open_leads} open deals to`} value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
          <option value="">Keep assigned to {user.name}</option>
          {team.filter((u) => u.active && u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      )}
    </Modal>
  );
}

export default function Team() {
  const { user: me } = useAuth();
  const toast = useToast();
  const users = useQuery(() => api.get('/users'), []);
  const [dialog, setDialog] = useState(null);

  const done = () => {
    setDialog(null);
    invalidateDirectory();
    users.reload();
  };

  const reactivate = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { active: true });
      toast.success(`${u.name} reactivated`);
      done();
    } catch (err) {
      toast.error('Could not reactivate', err.message);
    }
  };

  if (users.error) return <ErrorState error={users.error} onRetry={users.reload} />;
  const active = users.data?.filter((u) => u.active).length ?? 0;

  return (
    <>
      <PageHeader
        title="Team"
        description={users.data ? `${active} active member${active === 1 ? '' : 's'} · admins see every lead, sales reps see only their own.` : 'Loading…'}
        actions={<Button variant="primary" icon={UserPlus} onClick={() => setDialog({ type: 'edit', user: null })}>Add teammate</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!users.data && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        {users.data?.map((u) => {
          const isSelf = u.id === me.id;
          return (
            <article key={u.id} className={clsx('card flex flex-col p-5', !u.active && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={u.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{u.name}{isSelf && <span className="font-normal text-subtle"> (you)</span>}</p>
                    <p className="truncate text-[13px] text-muted">{u.title || (u.role === 'admin' ? 'Administrator' : 'Sales')}</p>
                  </div>
                </div>
                <Menu trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" icon={MoreHorizontal} onClick={toggle} aria-label="Actions" />}>
                  <MenuItem icon={Pencil} onClick={() => setDialog({ type: 'edit', user: { ...u, isSelf } })}>Edit details</MenuItem>
                  <MenuItem icon={KeyRound} onClick={() => setDialog({ type: 'password', user: u })}>Reset password</MenuItem>
                  {!isSelf && (
                    <>
                      <MenuSeparator />
                      {u.active
                        ? <MenuItem icon={UserX} danger onClick={() => setDialog({ type: 'deactivate', user: u })}>Deactivate</MenuItem>
                        : <MenuItem icon={UserCheck} onClick={() => reactivate(u)}>Reactivate</MenuItem>}
                    </>
                  )}
                </Menu>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className={u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/15 dark:bg-indigo-500/15 dark:text-indigo-300' : 'bg-surface-2 text-muted ring-line'}>
                  {u.role === 'admin' ? 'Admin' : 'Sales'}
                </Badge>
                {!u.active && <Badge className="bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-300">Deactivated</Badge>}
                <span className="truncate text-xs text-subtle">{u.email}</span>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                {[['Open deals', u.open_leads], ['Won', u.won_leads], ['Pipeline', formatMoneyShort(u.pipeline_value)]].map(([label, value]) => (
                  <div key={label}>
                    <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                    <dt className="text-xs text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>

      {dialog?.type === 'edit' && <UserDialog user={dialog.user} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.type === 'password' && <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} />}
      {dialog?.type === 'deactivate' && <DeactivateDialog user={dialog.user} team={users.data} onClose={() => setDialog(null)} onSaved={done} />}
    </>
  );
}
