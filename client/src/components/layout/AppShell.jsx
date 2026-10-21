import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, Moon, Plus, Search, Sun } from 'lucide-react';
import { Sidebar } from './Sidebar.jsx';
import { CommandPalette } from './CommandPalette.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { Logo } from './Logo.jsx';
import { Button } from '../ui/Button.jsx';
import { Kbd } from '../ui/Display.jsx';
import { api } from '../../lib/api.js';
import { useHotkey, useLeadsChanged } from '../../lib/hooks.js';
import { useTheme } from '../../context/theme.jsx';
import { useLeadEditor } from '../../context/leadEditor.jsx';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

function isPlainKey(e, key) {
  if (e.key !== key || e.metaKey || e.ctrlKey || e.altKey) return false;
  const el = document.activeElement;
  const typing = /INPUT|TEXTAREA|SELECT/.test(el?.tagName) || el?.isContentEditable;
  return !typing && !document.querySelector('[role=dialog]');
}

export function AppShell() {
  const location = useLocation();
  const openLeadForm = useLeadEditor();
  const { resolved, setPreference } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [counts, setCounts] = useState({ overdue: 0 });

  const loadCounts = useCallback(() => {
    api.get('/activities/tasks?filter=overdue').then((t) => setCounts({ overdue: t.length })).catch(() => {});
  }, []);

  useEffect(loadCounts, [loadCounts, location.pathname]);
  useLeadsChanged(loadCounts);
  useEffect(() => setNavOpen(false), [location.pathname]);

  useHotkey(
    useCallback((e) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k', []),
    useCallback((e) => { e.preventDefault(); setPaletteOpen((o) => !o); }, []),
  );
  useHotkey(
    useCallback((e) => isPlainKey(e, 'c'), []),
    useCallback((e) => { e.preventDefault(); openLeadForm(); }, [openLeadForm]),
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-62 shrink-0 border-r border-line lg:block">
        <Sidebar counts={counts} />
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-zinc-950/40" onClick={() => setNavOpen(false)} />
          <aside className="animate-drawer-in relative h-full w-68 border-r border-line bg-bg shadow-2xl">
            <Sidebar counts={counts} onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
          <Button variant="ghost" size="icon-sm" icon={MenuIcon} className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation" />
          <Logo className="lg:hidden [&>span:last-child]:hidden sm:[&>span:last-child]:inline" />

          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-left text-muted shadow-[0_1px_2px_rgba(16,16,24,0.04)] transition hover:border-line-strong lg:ml-0"
          >
            <Search className="size-4 shrink-0 text-subtle" />
            <span className="flex-1 truncate text-[13px]">Search leads…</span>
            <span className="hidden items-center gap-0.5 sm:flex"><Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
          </button>

          <div className="flex items-center gap-1 lg:ml-auto">
            <Button
              variant="ghost"
              size="icon"
              icon={resolved === 'dark' ? Sun : Moon}
              onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle dark mode"
            />
            <NotificationBell />
            <span className="ml-1 hidden sm:block">
              <Button variant="primary" size="sm" icon={Plus} onClick={() => openLeadForm()}>New lead</Button>
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <Button
        variant="primary"
        size="icon"
        icon={Plus}
        onClick={() => openLeadForm()}
        className="fixed right-4 bottom-4 z-30 size-12 rounded-full shadow-lg sm:hidden"
        aria-label="New lead"
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
