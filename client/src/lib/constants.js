import { CalendarClock, FileText, Mail, MessageSquare, Phone, Users, ArrowRightLeft } from 'lucide-react';

export const STAGES = [
  { id: 'new', label: 'New', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300' },
  { id: 'contacted', label: 'Contacted', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-300' },
  { id: 'qualified', label: 'Qualified', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/15 dark:text-violet-300' },
  { id: 'proposal', label: 'Proposal', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300' },
  { id: 'converted', label: 'Won', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'lost', label: 'Lost', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-300' },
];

export const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export const OPEN_STAGES = STAGES.filter((s) => !['converted', 'lost'].includes(s.id));

export const PRIORITIES = [
  { id: 'high', label: 'High', color: 'text-rose-600 dark:text-rose-400', bars: 3 },
  { id: 'medium', label: 'Medium', color: 'text-amber-600 dark:text-amber-400', bars: 2 },
  { id: 'low', label: 'Low', color: 'text-slate-400', bars: 1 },
];
export const PRIORITY = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]));

export const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Google Ads', 'Event', 'Cold call', 'Partner', 'Other'];

export const LOST_REASONS = ['Went with a competitor', 'Budget not approved', 'Price too high', 'No response', 'Timing — revisit later', 'Not a fit'];

export const ACTIVITY_TYPES = {
  note: { label: 'Note', icon: FileText, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  call: { label: 'Call', icon: Phone, tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  meeting: { label: 'Meeting', icon: Users, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  email: { label: 'Email', icon: Mail, tone: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  follow_up: { label: 'Follow-up', icon: CalendarClock, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  status_change: { label: 'Stage', icon: ArrowRightLeft, tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  message: { label: 'Message', icon: MessageSquare, tone: 'bg-slate-100 text-slate-600' },
};

export const CHART_THEME = {
  light: {
    series: ['#2a78d6', '#eb6834'],
    funnel: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
    grid: '#e6e6eb',
    axis: '#9a9aa6',
    cursor: '#d4d4db',
    surface: '#ffffff',
  },
  dark: {
    series: ['#3987e5', '#d95926'],
    funnel: ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
    grid: '#25252d',
    axis: '#6f6f7c',
    cursor: '#33333c',
    surface: '#131317',
  },
};
