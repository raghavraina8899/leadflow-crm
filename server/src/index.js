import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { authenticate } from './auth.js';
import { HttpError } from './util.js';
import { account, publicAuth } from './routes/account.js';
import leads from './routes/leads.js';
import activities from './routes/activities.js';
import dashboard from './routes/dashboard.js';
import reports from './routes/reports.js';
import notifications from './routes/notifications.js';
import search from './routes/search.js';
import users from './routes/users.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', publicAuth);

app.use('/api', authenticate);
app.use('/api/auth', account);
app.use('/api/dashboard', dashboard);
app.use('/api/reports', reports);
app.use('/api/leads', leads);
app.use('/api/activities', activities);
app.use('/api/notifications', notifications);
app.use('/api/search', search);
app.use('/api/users', users);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

if (process.env.SERVE_CLIENT === 'true') {
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Upload is too large' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
