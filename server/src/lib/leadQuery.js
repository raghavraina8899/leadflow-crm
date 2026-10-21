import { isAdmin, leadScope } from '../auth.js';
import { LEAD_STATUSES, PRIORITIES } from '../util.js';

const SCORE_SQL = `CASE WHEN l.status IN ('converted', 'lost') THEN NULL ELSE LEAST(100, GREATEST(0,
  CASE l.status WHEN 'new' THEN 15 WHEN 'contacted' THEN 30 WHEN 'qualified' THEN 50 ELSE 65 END
  + CASE l.priority WHEN 'high' THEN 15 WHEN 'medium' THEN 5 ELSE 0 END
  + CASE WHEN l.value >= 300000 THEN 10 WHEN l.value >= 100000 THEN 5 ELSE 0 END
  + CASE WHEN s.last_activity_at >= NOW() - INTERVAL 7 DAY THEN 10 ELSE 0 END
  - CASE WHEN s.next_follow_up < NOW() THEN 15 ELSE 0 END
)) END`;

export const LEAD_FROM = `
  FROM leads l
  LEFT JOIN users u ON u.id = l.assigned_to
  LEFT JOIN (
    SELECT lead_id,
           MAX(created_at) AS last_activity_at,
           MIN(CASE WHEN due_at IS NOT NULL AND completed_at IS NULL THEN due_at END) AS next_follow_up
    FROM activities GROUP BY lead_id
  ) s ON s.lead_id = l.id`;

export const LEAD_COLUMNS = `
  l.id, l.name, l.company, l.job_title, l.email, l.phone, l.website, l.city, l.source, l.status,
  l.priority, l.value, l.expected_close, l.tags, l.notes, l.lost_reason, l.assigned_to, l.created_by,
  l.converted_at, l.created_at, l.updated_at,
  u.name AS assigned_name, s.last_activity_at, s.next_follow_up,
  ${SCORE_SQL} AS score`;

export const SORTS = {
  created: 'l.created_at',
  updated: 'l.updated_at',
  name: 'l.name',
  value: 'l.value',
  status: 'FIELD(l.status, \'new\', \'contacted\', \'qualified\', \'proposal\', \'converted\', \'lost\')',
  score: 'score',
  follow_up: 'COALESCE(s.next_follow_up, \'9999-12-31\')',
  close: 'COALESCE(l.expected_close, \'9999-12-31\')',
};

export function buildLeadFilters(user, filters = {}) {
  const scope = leadScope(user);
  const where = [scope.sql];
  const params = [...scope.params];

  if (filters.search) {
    where.push('(l.name LIKE ? OR l.company LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.city LIKE ?)');
    params.push(...Array(5).fill(`%${filters.search}%`));
  }

  const statuses = String(filters.status || '').split(',').filter((s) => LEAD_STATUSES.includes(s));
  if (statuses.length) {
    where.push(`l.status IN (${statuses.map(() => '?').join(', ')})`);
    params.push(...statuses);
  } else if (filters.status === 'open') {
    where.push("l.status NOT IN ('converted', 'lost')");
  }

  if (PRIORITIES.includes(filters.priority)) {
    where.push('l.priority = ?');
    params.push(filters.priority);
  }
  if (filters.source) {
    where.push('l.source = ?');
    params.push(filters.source);
  }
  if (filters.tag) {
    where.push('JSON_CONTAINS(l.tags, JSON_QUOTE(?))');
    params.push(filters.tag);
  }
  if (filters.followUp === 'overdue') where.push('s.next_follow_up < NOW()');
  if (filters.followUp === 'none') where.push("s.next_follow_up IS NULL AND l.status NOT IN ('converted', 'lost')");

  if (filters.assignedTo && isAdmin(user)) {
    if (filters.assignedTo === 'unassigned') where.push('l.assigned_to IS NULL');
    else {
      where.push('l.assigned_to = ?');
      params.push(filters.assignedTo);
    }
  }

  return { where: where.join(' AND '), params };
}

export function serializeLead(row) {
  return {
    ...row,
    value: Number(row.value),
    score: row.score === null ? null : Number(row.score),
    tags: row.tags ?? [],
  };
}
