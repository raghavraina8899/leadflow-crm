import { Router } from 'express';
import { query } from '../db.js';
import { isAdmin, leadScope } from '../auth.js';
import { HttpError, toDate, wrap } from '../util.js';

const router = Router();

const FILTERS = {
  overdue: 'a.completed_at IS NULL AND a.due_at < NOW()',
  today: 'a.completed_at IS NULL AND a.due_at >= NOW() AND a.due_at < NOW() + INTERVAL 1 DAY',
  upcoming: 'a.completed_at IS NULL AND a.due_at >= NOW()',
  pending: 'a.completed_at IS NULL',
  completed: 'a.completed_at IS NOT NULL AND a.completed_at >= NOW() - INTERVAL 30 DAY',
};

router.get('/tasks', wrap(async (req, res) => {
  const filter = FILTERS[req.query.filter] || FILTERS.pending;
  const scope = leadScope(req.user);
  const mine = req.query.mine === 'true' ? 'AND a.user_id = ?' : '';
  const tasks = await query(
    `SELECT a.id, a.type, a.subject, a.notes, a.due_at, a.completed_at, a.created_at, a.user_id,
            l.id AS lead_id, l.name AS lead_name, l.company AS lead_company, l.status AS lead_status,
            l.priority AS lead_priority, l.phone AS lead_phone, l.email AS lead_email,
            u.name AS user_name, (a.completed_at IS NULL AND a.due_at < NOW()) AS overdue
     FROM activities a
     JOIN leads l ON l.id = a.lead_id
     JOIN users u ON u.id = a.user_id
     WHERE a.due_at IS NOT NULL AND ${filter} AND ${scope.sql} ${mine}
     ORDER BY ${req.query.filter === 'completed' ? 'a.completed_at DESC' : 'a.due_at ASC'}
     LIMIT 300`,
    [...scope.params, ...(mine ? [req.user.id] : [])],
  );
  res.json(tasks.map((t) => ({ ...t, overdue: Boolean(t.overdue) })));
}));

async function findTask(user, id) {
  const scope = leadScope(user);
  const [activity] = await query(
    `SELECT a.* FROM activities a JOIN leads l ON l.id = a.lead_id WHERE a.id = ? AND ${scope.sql}`,
    [id, ...scope.params],
  );
  if (!activity) throw new HttpError(404, 'Activity not found');
  return activity;
}

async function findFollowUp(user, id) {
  const activity = await findTask(user, id);
  if (!activity.due_at) throw new HttpError(400, 'Only follow-ups can be updated this way');
  return activity;
}

router.patch('/:id/complete', wrap(async (req, res) => {
  const activity = await findFollowUp(req.user, req.params.id);
  const completedAt = req.body.completed === false ? null : new Date();
  await query('UPDATE activities SET completed_at = ? WHERE id = ?', [completedAt, activity.id]);
  res.json({ ...activity, completed_at: completedAt });
}));

router.patch('/:id/reschedule', wrap(async (req, res) => {
  const activity = await findFollowUp(req.user, req.params.id);
  const dueAt = req.body.days
    ? new Date(Math.max(Date.now(), new Date(activity.due_at).getTime()) + Number(req.body.days) * 86400000)
    : toDate(req.body.due_at, 'due date');
  if (!dueAt) throw new HttpError(400, 'Provide a new due date');
  await query('UPDATE activities SET due_at = ?, completed_at = NULL WHERE id = ?', [dueAt, activity.id]);
  res.json({ ...activity, due_at: dueAt, completed_at: null });
}));

router.delete('/:id', wrap(async (req, res) => {
  const activity = await findTask(req.user, req.params.id);
  if (!isAdmin(req.user) && activity.user_id !== req.user.id) {
    throw new HttpError(403, 'You can only delete your own activities');
  }
  if (activity.type === 'status_change') throw new HttpError(400, 'Status history cannot be deleted');
  await query('DELETE FROM activities WHERE id = ?', [activity.id]);
  res.status(204).end();
}));

export default router;
