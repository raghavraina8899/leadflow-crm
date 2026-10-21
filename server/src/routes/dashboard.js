import { Router } from 'express';
import { query } from '../db.js';
import { isAdmin, leadScope } from '../auth.js';
import { wrap } from '../util.js';
import { countByWeek, isoDate, weekBuckets } from '../lib/timeseries.js';

const router = Router();

const percentChange = (current, previous) =>
  previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0;

router.get('/', wrap(async (req, res) => {
  const scope = leadScope(req.user);
  const weeks = weekBuckets(12);

  const [[totals], [tasks], stages, recentActivity, dueSoon, createdDates, convertedDates, team] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total_leads,
              COALESCE(SUM(l.status = 'converted'), 0) AS converted,
              COALESCE(SUM(l.status NOT IN ('converted', 'lost')), 0) AS open_leads,
              COALESCE(SUM(l.created_at >= NOW() - INTERVAL 30 DAY), 0) AS created_30,
              COALESCE(SUM(l.created_at >= NOW() - INTERVAL 60 DAY AND l.created_at < NOW() - INTERVAL 30 DAY), 0) AS created_prev_30,
              COALESCE(SUM(l.converted_at >= NOW() - INTERVAL 30 DAY), 0) AS converted_30,
              COALESCE(SUM(l.converted_at >= NOW() - INTERVAL 60 DAY AND l.converted_at < NOW() - INTERVAL 30 DAY), 0) AS converted_prev_30,
              COALESCE(SUM(CASE WHEN l.converted_at >= NOW() - INTERVAL 30 DAY THEN l.value END), 0) AS won_30,
              COALESCE(SUM(CASE WHEN l.converted_at >= NOW() - INTERVAL 60 DAY AND l.converted_at < NOW() - INTERVAL 30 DAY THEN l.value END), 0) AS won_prev_30,
              COALESCE(SUM(CASE WHEN l.status NOT IN ('converted', 'lost') THEN l.value END), 0) AS pipeline_value,
              COALESCE(SUM(l.status = 'lost'), 0) AS lost
       FROM leads l WHERE ${scope.sql}`,
      scope.params,
    ),
    query(
      `SELECT COALESCE(SUM(a.due_at >= NOW()), 0) AS upcoming,
              COALESCE(SUM(a.due_at < NOW()), 0) AS overdue,
              COALESCE(SUM(a.due_at >= NOW() AND a.due_at < NOW() + INTERVAL 1 DAY), 0) AS today
       FROM activities a JOIN leads l ON l.id = a.lead_id
       WHERE a.due_at IS NOT NULL AND a.completed_at IS NULL AND ${scope.sql}`,
      scope.params,
    ),
    query(
      `SELECT l.status, COUNT(*) AS count, COALESCE(SUM(l.value), 0) AS value
       FROM leads l WHERE ${scope.sql} GROUP BY l.status`,
      scope.params,
    ),
    query(
      `SELECT a.id, a.type, a.subject, a.created_at, l.id AS lead_id, l.name AS lead_name, u.name AS user_name
       FROM activities a JOIN leads l ON l.id = a.lead_id JOIN users u ON u.id = a.user_id
       WHERE ${scope.sql} ORDER BY a.created_at DESC, a.id DESC LIMIT 8`,
      scope.params,
    ),
    query(
      `SELECT a.id, a.subject, a.due_at, l.id AS lead_id, l.name AS lead_name, l.company AS lead_company,
              (a.due_at < NOW()) AS overdue
       FROM activities a JOIN leads l ON l.id = a.lead_id
       WHERE a.due_at IS NOT NULL AND a.completed_at IS NULL AND a.due_at < NOW() + INTERVAL 2 DAY AND ${scope.sql}
       ORDER BY a.due_at ASC LIMIT 6`,
      scope.params,
    ),
    query(`SELECT l.created_at AS d FROM leads l WHERE l.created_at >= ? AND ${scope.sql}`, [weeks[0], ...scope.params]),
    query(`SELECT l.converted_at AS d FROM leads l WHERE l.converted_at >= ? AND ${scope.sql}`, [weeks[0], ...scope.params]),
    isAdmin(req.user)
      ? query(
        `SELECT u.id, u.name,
                COUNT(l.id) AS leads,
                COALESCE(SUM(l.status = 'converted'), 0) AS converted,
                COALESCE(SUM(CASE WHEN l.status = 'converted' THEN l.value END), 0) AS won_value,
                COALESCE(SUM(CASE WHEN l.status NOT IN ('converted', 'lost') THEN l.value END), 0) AS pipeline_value
         FROM users u LEFT JOIN leads l ON l.assigned_to = u.id
         WHERE u.role = 'sales' AND u.active = TRUE
         GROUP BY u.id, u.name ORDER BY won_value DESC, converted DESC`,
      )
      : null,
  ]);

  const total = Number(totals.total_leads);
  const converted = Number(totals.converted);
  const closed = converted + Number(totals.lost);
  const created = countByWeek(weeks, createdDates.map((r) => r.d));
  const won = countByWeek(weeks, convertedDates.map((r) => r.d));

  res.json({
    kpis: {
      totalLeads: total,
      openLeads: Number(totals.open_leads),
      newLeads30: Number(totals.created_30),
      newLeadsChange: percentChange(Number(totals.created_30), Number(totals.created_prev_30)),
      converted,
      converted30: Number(totals.converted_30),
      convertedChange: percentChange(Number(totals.converted_30), Number(totals.converted_prev_30)),
      conversionRate: total ? Math.round((converted / total) * 1000) / 10 : 0,
      winRate: closed ? Math.round((converted / closed) * 1000) / 10 : 0,
      pipelineValue: Number(totals.pipeline_value),
      won30: Number(totals.won_30),
      wonChange: percentChange(Number(totals.won_30), Number(totals.won_prev_30)),
      followUpsUpcoming: Number(tasks.upcoming),
      followUpsOverdue: Number(tasks.overdue),
      followUpsToday: Number(tasks.today),
    },
    stages: Object.fromEntries(stages.map((s) => [s.status, { count: Number(s.count), value: Number(s.value) }])),
    trend: weeks.map((w, i) => ({ week: isoDate(w), created: created[i], converted: won[i] })),
    dueSoon: dueSoon.map((t) => ({ ...t, overdue: Boolean(t.overdue) })),
    recentActivity,
    team: team?.map((t) => ({
      ...t,
      leads: Number(t.leads),
      converted: Number(t.converted),
      won_value: Number(t.won_value),
      pipeline_value: Number(t.pipeline_value),
    })),
  });
}));

export default router;
