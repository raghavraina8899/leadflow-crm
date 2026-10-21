const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat('en-IN');

export const formatMoney = (v) => currency.format(Number(v) || 0);
export const formatMoneyShort = (v) => compactCurrency.format(Number(v) || 0);
export const formatNumber = (v) => number.format(Number(v) || 0);
export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export const formatDate = (v, opts = {}) =>
  v ? new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts }) : '—';

export const formatShortDate = (v) => formatDate(v, { year: undefined });

export const formatTime = (v) =>
  new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const formatDateTime = (v) => (v ? `${formatShortDate(v)}, ${formatTime(v)}` : '—');

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

export function timeAgo(v) {
  const diff = (new Date(v).getTime() - Date.now()) / 1000;
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'just now';
}

export function dueLabel(v) {
  const due = new Date(v);
  const today = startOfDay(new Date());
  const days = Math.round((startOfDay(due) - today) / 86400000);
  if (days === 0) return `Today, ${formatTime(due)}`;
  if (days === 1) return `Tomorrow, ${formatTime(due)}`;
  if (days === -1) return `Yesterday, ${formatTime(due)}`;
  if (days < 0) return `${-days} days overdue`;
  if (days < 7) return `${due.toLocaleDateString('en-IN', { weekday: 'long' })}, ${formatTime(due)}`;
  return formatDateTime(due);
}

export function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toLocalInput(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

export const pluralize = (n, word, plural = `${word}s`) => `${formatNumber(n)} ${n === 1 ? word : plural}`;
