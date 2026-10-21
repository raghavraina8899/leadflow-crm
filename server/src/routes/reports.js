import { Router } from 'express';
import { query } from '../db.js';
import { isAdmin, leadScope } from '../auth.js';
import { toInt, wrap } from '../util.js';
import { countByWeek, isoDate, monthBuckets, weekBuckets } from '../lib/timeseries.js';

const router = Router();
const RANGES = [30, 90, 180, 365];
const FUNNEL = ['new', 'contacted', 'qualified', 'proposal', 'converted'];

router.get('/', wrap(async (req, res) => {
  const days = RANGES.includes(toInt(req.query.days, 90)) ? toInt(req.query.days, 90) : 90;
  const scope = leadScope(req.user);
  const ownerFilter = isAdmin(req.user) && req.query.owner ? 'AND l.assigned_to = ?' : '';
  const params = [...scope.params, ...(ownerFilter ? [req.query.owner] : [])];
  const inRange = `l.created_at >= NOW() - INTERVAL ${days} DAY AND ${scope.sql} ${ownerFilter}`;
  const weeks = weekBuckets(Math.ceil(days / 7));
  const months = monthBuckets(Math.min(12, Math.max(3, Math.ceil(days / 30))));

  const [[summary], statusRows, sources, lostReasons, createdDates, convertedDates, revenueRows, owners] = await Promise.all([
    query(
      `SELECT COUNT(*) AS leads,
              COALESCE(SUM(l.status = 'converted'), 0) AS converted,
              COALESCE(SUM(l.status = 'lost'), 0) AS lost,
              COALESCE(SUM(CASE WHEN l.status = 'converted' THEN l.value END), 0) AS won_value,
              AVG(CASE WHEN l.status = 'converted' THEN l.value END) AS avg_deal,
              AVG(CASE WHEN l.converted_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, l.created_at, l.converted_at) / 24 END) AS avg_days
       FROM leads l WHERE ${inRange}`,
      params,
    ),
    query(`SELECT l.status, COUNT(*) AS count FROM leads l WHERE ${inRange} GROUP BY l.status`, params),
    query(
      `SELECT COALESCE(l.source, 'Unknown') AS source, COUNT(*) AS leads,
              COALESCE(SUM(l.status = 'converted'), 0) AS converted,
              COALESCE(SUM(CASE WHEN l.status = 'converted' THEN l.value END), 0) AS won_value
       FROM leads l WHERE ${inRange} GROUP BY COALESCE(l.source, 'Unknown') ORDER BY leads DESC`,
      params,
    ),
    query(
      `SELECT COALESCE(NULLIF(l.lost_reason, ''), 'Not specified') AS reason, COUNT(*) AS count
       FROM leads l WHERE l.status = 'lost' AND ${inRange} GROUP BY reason ORDER BY count DESC LIMIT 6`,
      params,
    ),
    query(`SELECT l.created_at AS d FROM leads l WHERE ${inRange}`, params),
    query(
      `SELECT l.converted_at AS d FROM leads l
       WHERE l.converted_at >= NOW() - INTERVAL ${days} DAY AND ${scope.sql} ${ownerFilter}`,
      params,
    ),
    query(
      `SELECT DATE_FORMAT(l.converted_at, '%Y-%m') AS month, SUM(l.value) AS value, COUNT(*) AS deals
       FROM leads l WHERE l.converted_at >= ? AND ${scope.sql} ${ownerFilter}
       GROUP BY month`,
      [`${months[0]}-01`, ...params],
    ),
    isAdmin(req.user)
      ? query(
        `SELECT u.id, u.name,
                COUNT(l.id) AS leads,
                COALESCE(SUM(l.status = 'converted'), 0) AS converted,
                COALESCE(SUM(l.status = 'lost'), 0) AS lost,
                COALESCE(SUM(CASE WHEN l.status = 'converted' THEN l.value END), 0) AS won_value,
                (SELECT COUNT(*) FROM activities a
                  WHERE a.user_id = u.id AND a.type IN ('call', 'meeting', 'email')
                    AND a.created_at >= NOW() - INTERVAL ${days} DAY) AS touches
         FROM users u
         LEFT JOIN leads l ON l.assigned_to = u.id AND l.created_at >= NOW() - INTERVAL ${days} DAY
         WHERE u.role = 'sales' AND u.active = TRUE
         GROUP BY u.id, u.name ORDER BY won_value DESC`,
      )
      : null,
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)]));
  const reached = FUNNEL.map((stage, i) => ({
    stage,
    count: i === 0 ? Number(summary.leads) : FUNNEL.slice(i).reduce((sum, s) => sum + (byStatus[s] || 0), 0),
  }));
  const revenue = new Map(revenueRows.map((r) => [r.month, r]));
  const created = countByWeek(weeks, createdDates.map((r) => r.d));
  const won = countByWeek(weeks, convertedDates.map((r) => r.d));
  const leads = Number(summary.leads);
  const converted = Number(summary.converted);
  const closed = converted + Number(summary.lost);

  res.json({
    days,
    summary: {
      leads,
      converted,
      lost: Number(summary.lost),
      wonValue: Number(summary.won_value),
      avgDeal: Math.round(Number(summary.avg_deal) || 0),
      avgDaysToConvert: summary.avg_days === null ? null : Math.round(Number(summary.avg_days) * 10) / 10,
      conversionRate: leads ? Math.round((converted / leads) * 1000) / 10 : 0,
      winRate: closed ? Math.round((converted / closed) * 1000) / 10 : 0,
    },
    funnel: reached,
    trend: weeks.map((w, i) => ({ week: isoDate(w), created: created[i], converted: won[i] })),
    revenue: months.map((m) => ({
      month: m,
      value: Number(revenue.get(m)?.value || 0),
      deals: Number(revenue.get(m)?.deals || 0),
    })),
    sources: sources.map((s) => ({
      source: s.source,
      leads: Number(s.leads),
      converted: Number(s.converted),
      wonValue: Number(s.won_value),
      rate: Number(s.leads) ? Math.round((Number(s.converted) / Number(s.leads)) * 1000) / 10 : 0,
    })),
    lostReasons: lostReasons.map((r) => ({ reason: r.reason, count: Number(r.count) })),
    owners: owners?.map((o) => ({
      id: o.id,
      name: o.name,
      leads: Number(o.leads),
      converted: Number(o.converted),
      lost: Number(o.lost),
      wonValue: Number(o.won_value),
      touches: Number(o.touches),
      winRate: Number(o.converted) + Number(o.lost)
        ? Math.round((Number(o.converted) / (Number(o.converted) + Number(o.lost))) * 1000) / 10
        : 0,
    })),
  });
}));

export default router;
