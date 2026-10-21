import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireRole } from '../auth.js';
import { HttpError, isEmail, requireFields, wrap } from '../util.js';

const router = Router();

const COLUMNS = 'u.id, u.name, u.email, u.role, u.title, u.active, u.created_at';

const serialize = (u) => ({
  ...u,
  active: Boolean(u.active),
  ...(u.open_leads !== undefined && {
    open_leads: Number(u.open_leads),
    won_leads: Number(u.won_leads),
    pipeline_value: Number(u.pipeline_value),
  }),
});

async function findUser(id) {
  const [user] = await query(`SELECT ${COLUMNS} FROM users u WHERE u.id = ?`, [id]);
  if (!user) throw new HttpError(404, 'User not found');
  return serialize(user);
}

router.get('/directory', wrap(async (req, res) => {
  const users = await query("SELECT u.id, u.name, u.role FROM users u WHERE u.active = TRUE ORDER BY u.name");
  res.json(users);
}));

router.use(requireRole('admin'));

router.get('/', wrap(async (req, res) => {
  const users = await query(
    `SELECT ${COLUMNS},
            COALESCE(SUM(l.status NOT IN ('converted', 'lost')), 0) AS open_leads,
            COALESCE(SUM(l.status = 'converted'), 0) AS won_leads,
            COALESCE(SUM(CASE WHEN l.status NOT IN ('converted', 'lost') THEN l.value END), 0) AS pipeline_value
     FROM users u LEFT JOIN leads l ON l.assigned_to = u.id
     GROUP BY u.id ORDER BY u.active DESC, u.role, u.name`,
  );
  res.json(users.map(serialize));
}));

router.post('/', wrap(async (req, res) => {
  requireFields(req.body, ['name', 'email', 'password']);
  const { name, email, password, role = 'sales', title } = req.body;
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email address');
  if (!['admin', 'sales'].includes(role)) throw new HttpError(400, 'Invalid role');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) throw new HttpError(409, 'A user with that email already exists');

  const result = await query('INSERT INTO users (name, email, password_hash, role, title) VALUES (?, ?, ?, ?, ?)', [
    name.trim(), email.toLowerCase(), await bcrypt.hash(password, 10), role, title?.trim() || null,
  ]);
  res.status(201).json(await findUser(result.insertId));
}));

router.put('/:id', wrap(async (req, res) => {
  const user = await findUser(req.params.id);
  const isSelf = user.id === req.user.id;
  const updates = {};

  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) throw new HttpError(400, 'Name is required');
    updates.name = req.body.name.trim();
  }
  if (req.body.title !== undefined) updates.title = String(req.body.title).trim() || null;
  if (req.body.role !== undefined && req.body.role !== user.role) {
    if (!['admin', 'sales'].includes(req.body.role)) throw new HttpError(400, 'Invalid role');
    if (isSelf) throw new HttpError(400, 'You cannot change your own role');
    updates.role = req.body.role;
  }
  if (req.body.active !== undefined && Boolean(req.body.active) !== user.active) {
    if (isSelf) throw new HttpError(400, 'You cannot deactivate your own account');
    updates.active = Boolean(req.body.active);
  }
  if (req.body.password) {
    if (req.body.password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    updates.password_hash = await bcrypt.hash(req.body.password, 10);
  }

  if (Object.keys(updates).length) await query('UPDATE users SET ? WHERE id = ?', [updates, user.id]);
  if (updates.active === false && req.body.reassign_to) {
    await query('UPDATE leads SET assigned_to = ? WHERE assigned_to = ? AND status NOT IN (\'converted\', \'lost\')', [
      req.body.reassign_to, user.id,
    ]);
  }
  res.json(await findUser(user.id));
}));

export default router;
