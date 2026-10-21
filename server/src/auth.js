import jwt from 'jsonwebtoken';
import { query } from './db.js';

const secret = () => process.env.JWT_SECRET || 'dev-secret';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, secret(), { expiresIn: '8h' });
}

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    const { id } = jwt.verify(token, secret());
    const [user] = await query('SELECT id, name, email, role, title, active FROM users WHERE id = ?', [id]);
    if (!user || !user.active) return res.status(401).json({ error: 'Account is not active' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission to do that' });
}

export const isAdmin = (user) => user.role === 'admin';

export function leadScope(user, alias = 'l') {
  return isAdmin(user) ? { sql: '1 = 1', params: [] } : { sql: `${alias}.assigned_to = ?`, params: [user.id] };
}
