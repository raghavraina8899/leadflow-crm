export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'converted', 'lost'];
export const OPEN_STATUSES = ['new', 'contacted', 'qualified', 'proposal'];
export const PRIORITIES = ['low', 'medium', 'high'];
export const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'note', 'follow_up'];

export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw new HttpError(400, `Missing required field: ${missing.join(', ')}`);
}

export function toDate(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `Invalid date for ${field}`);
  return d;
}

export function toDateOnly(value, field) {
  if (value === null || value === undefined || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `Invalid date for ${field}`);
  }
  return value;
}

export function normalizeTags(tags) {
  if (tags === undefined) return undefined;
  const list = Array.isArray(tags) ? tags : String(tags ?? '').split(',');
  const clean = [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  if (clean.some((t) => t.length > 30)) throw new HttpError(400, 'Tags must be 30 characters or fewer');
  return clean.slice(0, 10);
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const toInt = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};
