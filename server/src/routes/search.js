import { Router } from 'express';
import { query } from '../db.js';
import { leadScope } from '../auth.js';
import { wrap } from '../util.js';

const router = Router();

router.get('/', wrap(async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json({ leads: [] });

  const scope = leadScope(req.user);
  const like = `%${term}%`;
  const leads = await query(
    `SELECT l.id, l.name, l.company, l.email, l.status
     FROM leads l
     WHERE (l.name LIKE ? OR l.company LIKE ? OR l.email LIKE ? OR l.phone LIKE ?) AND ${scope.sql}
     ORDER BY (l.name LIKE ?) DESC, l.updated_at DESC
     LIMIT 8`,
    [like, like, like, like, ...scope.params, `${term}%`],
  );
  res.json({ leads });
}));

export default router;
