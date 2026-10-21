import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  BarChart3, CalendarCheck2, ChevronsUpDown, Kanban, LayoutDashboard, LogOut, Settings, UserRound, Users, UsersRound,
} from 'lucide-react';
import { Logo } from './Logo.jsx';
import { Avatar } from '../ui/Display.jsx';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu.jsx';
import { useAuth } from '../../context/auth.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/tasks', label: 'Follow-ups', icon: CalendarCheck2, badge: 'overdue' },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

const WORKSPACE = [
  { to: '/team', label: 'Team', icon: UsersRound, admin: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ item, badge, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => clsx(
        'group flex items-center gap-3 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium transition',
        isActive ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:bg-surface-3/60 hover:text-fg',
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={clsx('size-4.5', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-subtle group-hover:text-muted')} />
          <span className="flex-1">{item.label}</span>
          {badge > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-px text-[11px] font-semibold text-white tabular-nums">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ counts, onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-surface-2/70 px-3 py-4">
      <div className="px-2 pb-5"><Logo /></div>

      <nav className="space-y-0.5">
        {NAV.map((item) => <NavItem key={item.to} item={item} badge={counts[item.badge]} onNavigate={onNavigate} />)}
      </nav>

      <p className="mt-7 mb-2 px-2.5 text-[11px] font-medium tracking-wider text-subtle uppercase">Workspace</p>
      <nav className="space-y-0.5">
        {WORKSPACE.filter((i) => !i.admin || isAdmin).map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}
      </nav>

      <div className="mt-auto pt-4">
        <Menu
          align="left"
          placement="top"
          width="w-full"
          className="w-full"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface-3/60">
              <Avatar name={user.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.title || (isAdmin ? 'Administrator' : 'Sales')}</span>
              </span>
              <ChevronsUpDown className="size-4 text-subtle" />
            </button>
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium">{user.email}</p>
            <p className="text-xs text-muted">{isAdmin ? 'Admin · full access' : 'Sales · own leads'}</p>
          </div>
          <MenuSeparator />
          <MenuItem icon={UserRound} onClick={() => { navigate('/settings'); onNavigate?.(); }}>Profile & settings</MenuItem>
          <MenuItem icon={LogOut} onClick={logout}>Sign out</MenuItem>
        </Menu>
      </div>
    </div>
  );
}
