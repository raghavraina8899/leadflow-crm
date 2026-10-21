import { Router } from 'express';
import { pool, query } from '../db.js';
import { isAdmin, leadScope, requireRole } from '../auth.js';
import { LEAD_COLUMNS, LEAD_FROM, SORTS, buildLeadFilters, serializeLead } from '../lib/leadQuery.js';
import { notify, notifyAssignment } from '../lib/notify.js';
import { toCsv } from '../lib/csv.js';
import {
  ACTIVITY_TYPES, HttpError, LEAD_STATUSES, PRIORITIES,
  isEmail, normalizeTags, requireFields, toDate, toDateOnly, toInt, wrap,
} from '../util.js';

const router = Router();

const TEXT_FIELDS = ['name', 'company', 'job_title', 'email', 'phone', 'website', 'city', 'source', 'notes', 'lost_reason'];

export async function findLead(user, id) {
  const { where, params } = buildLeadFilters(user);
  const [lead] = await query(`SELECT ${LEAD_COLUMNS} ${LEAD_FROM} WHERE l.id = ? AND ${where}`, [id, ...params]);
  if (!lead) throw new HttpError(404, 'Lead not found');
  return serializeLead(lead);
}

function parseLeadFields(body) {
  const fields = {};
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined) fields[key] = body[key] === null ? null : String(body[key]).trim() || null;
  }
  if (fields.name === null) throw new HttpError(400, 'Name is required');
  if (fields.email && !isEmail(fields.email)) throw new HttpError(400, 'Invalid email address');
  if (fields.email) fields.email = fields.email.toLowerCase();

  if (body.status !== undefined) {
    if (!LEAD_STATUSES.includes(body.status)) throw new HttpError(400, 'Invalid status');
    fields.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) throw new HttpError(400, 'Invalid priority');
    fields.priority = body.priority;
  }
  if (body.value !== undefined) {
    const value = body.value === '' || body.value === null ? 0 : Number(body.value);
    if (Number.isNaN(value) || value < 0) throw new HttpError(400, 'Deal value must be a positive number');
    fields.value = value;
  }
  if (body.expected_close !== undefined) fields.expected_close = toDateOnly(body.expected_close, 'expected close');
  const tags = normalizeTags(body.tags);
  if (tags !== undefined) fields.tags = JSON.stringify(tags);
  return fields;
}

async function resolveAssignee(user, assignedTo) {
  if (!isAdmin(user)) return user.id;
  if (assignedTo === null || assignedTo === '' || assignedTo === undefined) return null;
  const [assignee] = await query('SELECT id FROM users WHERE id = ? AND active = TRUE', [assignedTo]);
  if (!assignee) throw new HttpError(400, 'Assignee must be an active user');
  return assignee.id;
}

const logStatusChange = (leadId, userId, from, to, reason) =>
  query('INSERT INTO activities (lead_id, user_id, type, subject, notes) VALUES (?, ?, ?, ?, ?)', [
    leadId, userId, 'status_change', `Moved from ${from} to ${to}`, to === 'lost' ? reason || null : null,
  ]);

function statusSideEffects(from, to) {
  if (from === to) return {};
  return {
    converted_at: to === 'converted' ? new Date() : null,
    ...(to !== 'lost' && { lost_reason: null }),
  };
}

router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 25)));
  const { where, params } = buildLeadFilters(req.user, req.query);
  const order = `${SORTS[req.query.sort] || SORTS.created} ${req.query.dir === 'asc' ? 'ASC' : 'DESC'}, l.id DESC`;

  const [[{ total }], rows] = await Promise.all([
    query(`SELECT COUNT(*) AS total ${LEAD_FROM} WHERE ${where}`, params),
    query(`SELECT ${LEAD_COLUMNS} ${LEAD_FROM} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [
      ...params, limit, (page - 1) * limit,
    ]),
  ]);
  res.json({ data: rows.map(serializeLead), total, page, limit });
}));

router.get('/board', wrap(async (req, res) => {
  const { where, params } = buildLeadFilters(req.user, { ...req.query, status: undefined });
  const rows = await query(
    `SELECT ${LEAD_COLUMNS} ${LEAD_FROM}
     WHERE ${where} AND (l.status NOT IN ('converted', 'lost') OR l.updated_at >= NOW() - INTERVAL 30 DAY)
     ORDER BY score DESC, l.updated_at DESC`,
    params,
  );
  res.json(rows.map(serializeLead));
}));

router.get('/meta', wrap(async (req, res) => {
  const scope = leadScope(req.user);
  const [sources, tags] = await Promise.all([
    query(`SELECT DISTINCT l.source FROM leads l WHERE l.source IS NOT NULL AND ${scope.sql} ORDER BY l.source`, scope.params),
    query(
      `SELECT jt.tag, COUNT(*) AS count
       FROM leads l, JSON_TABLE(l.tags, '$[*]' COLUMNS (tag VARCHAR(50) PATH '$')) jt
       WHERE ${scope.sql} GROUP BY jt.tag ORDER BY count DESC, jt.tag`,
      scope.params,
    ),
  ]);
  res.json({ sources: sources.map((r) => r.source), tags: tags.map((r) => r.tag) });
}));

const EXPORT_COLUMNS = [
  ['id', 'ID'], ['name', 'Name'], ['company', 'Company'], ['job_title', 'Job title'], ['email', 'Email'],
  ['phone', 'Phone'], ['city', 'City'], ['website', 'Website'], ['source', 'Source'], ['status', 'Status'],
  ['priority', 'Priority'], ['value', 'Deal value'], ['expected_close', 'Expected close'], ['tags', 'Tags'],
  ['assigned_name', 'Owner'], ['score', 'Score'], ['next_follow_up', 'Next follow-up'],
  ['created_at', 'Created'], ['converted_at', 'Converted'], ['lost_reason', 'Lost reason'],
].map(([key, label]) => ({ key, label }));

router.get('/export', wrap(async (req, res) => {
  const { where, params } = buildLeadFilters(req.user, req.query);
  const rows = await query(`SELECT ${LEAD_COLUMNS} ${LEAD_FROM} WHERE ${where} ORDER BY l.created_at DESC`, params);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${stamp}.csv"`);
  res.send(`﻿${toCsv(EXPORT_COLUMNS, rows.map(serializeLead))}`);
}));

router.post('/import', wrap(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) throw new HttpError(400, 'No rows to import');
  if (rows.length > 2000) throw new HttpError(400, 'Import up to 2,000 rows at a time');

  const assignee = await resolveAssignee(req.user, req.body.assigned_to);
  const emails = rows.map((r) => String(r.email || '').trim().toLowerCase()).filter(Boolean);
  const existing = new Set(
    emails.length ? (await query('SELECT email FROM leads WHERE email IN (?)', [emails])).map((r) => r.email) : [],
  );

  const valid = [];
  const errors = [];
  rows.forEach((row, index) => {
    try {
      requireFields(row, ['name']);
      const fields = parseLeadFields({ status: 'new', ...row, lost_reason: undefined });
      if (fields.email && existing.has(fields.email)) throw new HttpError(409, `${fields.email} already exists`);
      if (fields.email) existing.add(fields.email);
      valid.push(fields);
    } catch (err) {
      errors.push({ row: index + 2, message: err.message });
    }
  });

  if (valid.length) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const f of valid) {
        await conn.query('INSERT INTO leads SET ?', [{
          ...f,
          tags: f.tags ?? '[]',
          assigned_to: assignee,
          created_by: req.user.id,
          converted_at: f.status === 'converted' ? new Date() : null,
        }]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    await notify({
      userId: assignee,
      actor: req.user,
      type: 'leads_imported',
      message: `${req.user.name} imported ${valid.length} lead${valid.length === 1 ? '' : 's'} assigned to you`,
    });
  }

  res.status(valid.length ? 201 : 200).json({ created: valid.length, skipped: errors.length, errors: errors.slice(0, 50) });
}));

router.post('/bulk', wrap(async (req, res) => {
  const { action, value } = req.body;
  const ids = [...new Set((req.body.ids || []).map(Number).filter(Boolean))].slice(0, 500);
  if (!ids.length) throw new HttpError(400, 'Select at least one lead');

  const scope = leadScope(req.user);
  const leads = await query(
    `SELECT l.id, l.name, l.company, l.status, l.tags FROM leads l WHERE l.id IN (?) AND ${scope.sql}`,
    [ids, ...scope.params],
  );
  if (!leads.length) throw new HttpError(404, 'No matching leads');
  const leadIds = leads.map((l) => l.id);

  switch (action) {
    case 'status': {
      if (!LEAD_STATUSES.includes(value)) throw new HttpError(400, 'Invalid status');
      const changing = leads.filter((l) => l.status !== value);
      if (changing.length) {
        const reason = value === 'lost' ? String(req.body.reason || '').trim().slice(0, 255) || null : null;
        await query('UPDATE leads SET status = ?, converted_at = ?, lost_reason = ? WHERE id IN (?)', [
          value, value === 'converted' ? new Date() : null, reason, changing.map((l) => l.id),
        ]);
        await query('INSERT INTO activities (lead_id, user_id, type, subject, notes) VALUES ?', [
          changing.map((l) => [l.id, req.user.id, 'status_change', `Moved from ${l.status} to ${value}`, reason]),
        ]);
      }
      break;
    }
    case 'priority':
      if (!PRIORITIES.includes(value)) throw new HttpError(400, 'Invalid priority');
      await query('UPDATE leads SET priority = ? WHERE id IN (?)', [value, leadIds]);
      break;
    case 'tag': {
      const [tag] = normalizeTags([value]) ?? [];
      if (!tag) throw new HttpError(400, 'Enter a tag');
      for (const lead of leads) {
        const tags = normalizeTags([...(lead.tags ?? []), tag]);
        await query('UPDATE leads SET tags = ? WHERE id = ?', [JSON.stringify(tags), lead.id]);
      }
      break;
    }
    case 'assign': {
      if (!isAdmin(req.user)) throw new HttpError(403, 'Only admins can reassign leads');
      const assignee = await resolveAssignee(req.user, value);
      await query('UPDATE leads SET assigned_to = ? WHERE id IN (?)', [assignee, leadIds]);
      await notify({
        userId: assignee,
        actor: req.user,
        leadId: leads.length === 1 ? leads[0].id : null,
        type: 'lead_assigned',
        message: leads.length === 1
          ? `${req.user.name} assigned ${leads[0].name} to you`
          : `${req.user.name} assigned ${leads.length} leads to you`,
      });
      break;
    }
    case 'delete':
      if (!isAdmin(req.user)) throw new HttpError(403, 'Only admins can delete leads');
      await query('DELETE FROM leads WHERE id IN (?)', [leadIds]);
      break;
    default:
      throw new HttpError(400, 'Unknown bulk action');
  }

  res.json({ updated: leadIds.length });
}));

router.get('/:id', wrap(async (req, res) => {
  const lead = await findLead(req.user, req.params.id);
  const activities = await query(
    `SELECT a.*, u.name AS user_name FROM activities a JOIN users u ON u.id = a.user_id
     WHERE a.lead_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [lead.id],
  );
  res.json({ ...lead, activities });
}));

router.post('/', wrap(async (req, res) => {
  requireFields(req.body, ['name']);
  const fields = parseLeadFields(req.body);
  const status = fields.status || 'new';
  const assignedTo = await resolveAssignee(req.user, req.body.assigned_to);

  const result = await query('INSERT INTO leads SET ?', [{
    ...fields,
    status,
    tags: fields.tags ?? '[]',
    assigned_to: assignedTo,
    created_by: req.user.id,
    converted_at: status === 'converted' ? new Date() : null,
  }]);
  const lead = await findLead(req.user, result.insertId);
  await notifyAssignment(req.user, lead, assignedTo);
  res.status(201).json(lead);
}));

router.put('/:id', wrap(async (req, res) => {
  const lead = await findLead(req.user, req.params.id);
  const updates = parseLeadFields(req.body);

  const newAssignee = req.body.assigned_to === undefined ? undefined : req.body.assigned_to || null;
  if (newAssignee !== undefined && String(newAssignee ?? '') !== String(lead.assigned_to ?? '')) {
    if (!isAdmin(req.user)) throw new HttpError(403, 'Only admins can reassign leads');
    updates.assigned_to = await resolveAssignee(req.user, newAssignee);
  }

  const statusChanged = updates.status && updates.status !== lead.status;
  if (statusChanged) Object.assign(updates, statusSideEffects(lead.status, updates.status));

  if (Object.keys(updates).length) await query('UPDATE leads SET ? WHERE id = ?', [updates, lead.id]);
  if (statusChanged) {
    await logStatusChange(lead.id, req.user.id, lead.status, updates.status, updates.lost_reason ?? req.body.lost_reason);
  }
  if (updates.assigned_to) await notifyAssignment(req.user, lead, updates.assigned_to);

  res.json(await findLead(req.user, lead.id));
}));

router.delete('/:id', requireRole('admin'), wrap(async (req, res) => {
  const lead = await findLead(req.user, req.params.id);
  await query('DELETE FROM leads WHERE id = ?', [lead.id]);
  res.status(204).end();
}));

router.post('/:id/activities', wrap(async (req, res) => {
  const lead = await findLead(req.user, req.params.id);
  requireFields(req.body, ['type', 'subject']);
  if (!ACTIVITY_TYPES.includes(req.body.type)) throw new HttpError(400, 'Invalid activity type');

  const dueAt = toDate(req.body.due_at, 'due date');
  if (req.body.type === 'follow_up' && !dueAt) throw new HttpError(400, 'A follow-up needs a due date');

  const result = await query(
    'INSERT INTO activities (lead_id, user_id, type, subject, notes, due_at) VALUES (?, ?, ?, ?, ?, ?)',
    [lead.id, req.user.id, req.body.type, String(req.body.subject).trim(), req.body.notes || null, dueAt],
  );

  if (lead.status === 'new' && ['call', 'meeting', 'email'].includes(req.body.type)) {
    await query("UPDATE leads SET status = 'contacted' WHERE id = ?", [lead.id]);
    await logStatusChange(lead.id, req.user.id, 'new', 'contacted');
  }

  const [activity] = await query(
    'SELECT a.*, u.name AS user_name FROM activities a JOIN users u ON u.id = a.user_id WHERE a.id = ?',
    [result.insertId],
  );
  res.status(201).json(activity);
}));

export default router;
