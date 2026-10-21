import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../auth.js';
import { HttpError, requireFields, wrap } from '../util.js';

export const publicAuth = Router();
export const account = Router();

const PROFILE = 'SELECT id, name, email, role, title, active, created_at FROM users WHERE id = ?';

publicAuth.post('/login', wrap(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const [user] = await query('SELECT * FROM users WHERE email = ?', [String(req.body.email).toLowerCase().trim()]);
  if (!user || !(await bcrypt.compare(String(req.body.password), user.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!user.active) throw new HttpError(403, 'This account has been deactivated');
  const [profile] = await query(PROFILE, [user.id]);
  res.json({ token: signToken(user), user: { ...profile, active: true } });
}));

account.get('/me', (req, res) => res.json(req.user));

account.put('/me', wrap(async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) throw new HttpError(400, 'Name is required');
    updates.name = req.body.name.trim();
  }
  if (req.body.title !== undefined) updates.title = String(req.body.title).trim() || null;

  if (req.body.new_password) {
    const [{ password_hash }] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(String(req.body.current_password || ''), password_hash))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    if (req.body.new_password.length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
    updates.password_hash = await bcrypt.hash(req.body.new_password, 10);
  }

  if (Object.keys(updates).length) await query('UPDATE users SET ? WHERE id = ?', [updates, req.user.id]);
  const [profile] = await query(PROFILE, [req.user.id]);
  res.json({ ...profile, active: Boolean(profile.active) });
}));
