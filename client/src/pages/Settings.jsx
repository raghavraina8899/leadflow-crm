import { useState } from 'react';
import clsx from 'clsx';
import { Monitor, Moon, Sun } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/auth.jsx';
import { useTheme } from '../context/theme.jsx';
import { useToast } from '../context/toast.jsx';
import { Avatar, PageHeader } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';

function SettingsSection({ title, description, children }) {
  return (
    <section className="grid gap-6 border-b border-line py-8 first:pt-0 last:border-0 lg:grid-cols-[280px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-muted">{description}</p>
      </div>
      <div className="card max-w-2xl p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, title: user.title ?? '' });
  const [saving, setSaving] = useState(false);
  const dirty = form.name !== user.name || form.title !== (user.title ?? '');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setUser(await api.put('/auth/me', form));
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={form.name || user.name} size="xl" />
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-[13px] text-muted">{user.role === 'admin' ? 'Admin — full workspace access' : 'Sales — access to leads assigned to you'}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Account Executive" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>Save profile</Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const mismatch = form.confirm && form.next !== form.confirm;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', { current_password: form.current, new_password: form.next });
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error('Could not change password', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Input label="Current password" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="New password" type="password" autoComplete="new-password" minLength={8} hint="At least 8 characters." value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required />
        <Input label="Confirm new password" type="password" autoComplete="new-password" error={mismatch ? "Passwords don't match" : undefined} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving} disabled={!form.current || form.next.length < 8 || form.next !== form.confirm}>Update password</Button>
      </div>
    </form>
  );
}

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

function AppearancePicker() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setPreference(id)}
          className={clsx(
            'flex flex-col items-center gap-2 rounded-xl border p-4 text-[13px] font-medium transition',
            preference === id ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 ring-4 ring-indigo-500/10 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-line text-muted hover:border-line-strong hover:text-fg',
          )}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, security and preferences." />
      <SettingsSection title="Profile" description="How you appear to teammates across LeadFlow.">
        <ProfileForm />
      </SettingsSection>
      <SettingsSection title="Password" description="Use a strong password you don't use anywhere else.">
        <PasswordForm />
      </SettingsSection>
      <SettingsSection title="Appearance" description="Choose a theme, or follow your system setting.">
        <AppearancePicker />
      </SettingsSection>
    </>
  );
}
