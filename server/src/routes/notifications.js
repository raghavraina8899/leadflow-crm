import { Router } from 'express';
import { query } from '../db.js';
import { wrap } from '../util.js';

const router = Router();

router.get('/', wrap(async (req, res) => {
  const [items, [{ unread }]] = await Promise.all([
    query(
      `SELECT n.id, n.type, n.message, n.lead_id, n.read_at, n.created_at, u.name AS actor_name
       FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 20`,
      [req.user.id],
    ),
    query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]),
  ]);
  res.json({ items, unread: Number(unread) });
}));

router.post('/read-all', wrap(async (req, res) => {
  await query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.status(204).end();
}));

router.patch('/:id/read', wrap(async (req, res) => {
  await query('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?', [
    req.params.id, req.user.id,
  ]);
  res.status(204).end();
}));

export default router;
