# LeadFlow CRM

A sales CRM for small and mid-sized teams: capture leads, move deals through a visual pipeline, never miss a follow-up, and see what's working.

Built with **React + Tailwind** on the front end, **Node.js / Express** on the back end, and **MySQL**.

## Highlights

**Pipeline**
- A drag-and-drop board across New → Contacted → Qualified → Proposal → Won / Lost.
- Shows the deal count and total value for each stage.
- Moving a deal to Lost asks for a reason, which feeds the loss analysis in Reports.

**Leads**
- Quick views: Open, Overdue follow-up, No next step, Won and Lost.
- Filter by stage, priority, source, tag and owner. Sort by lead score, value, next follow-up or close date.
- Select several leads to change their stage or priority, tag them, assign them, or delete them.
- CSV import with automatic column matching and duplicate detection. CSV export of the current filtered view.

**Lead workspace**
- A stage tracker you can click to move the deal.
- A lead score from 0 to 100, based on stage, priority, deal size, recent activity and overdue follow-ups.
- Log notes, calls, meetings, emails and follow-ups, with a timeline grouped by day.
- One-click call and email, plus snooze and complete for follow-ups.

**Follow-ups**
- Grouped into Overdue, Today, Tomorrow, Next 7 days and Later.
- Undo after completing a task, and a snooze option on each task.
- The overdue count shows on the sidebar badge and as a dashboard alert.

**Dashboard**
- Open pipeline value, revenue won, new leads and win rate, compared with the previous 30 days.
- A 12-week lead-flow chart and the open pipeline broken down by stage.
- Tasks due soon, the hottest deals, recent activity, and team performance (admins only).

**Reports**
- Choose a date range and, for admins, a single rep.
- Conversion funnel, weekly trend, revenue by month, conversion by lead source, reasons deals were lost, and a rep leaderboard.
- Every chart can switch to a data table.

**Workspace**
- ⌘K search across leads, plus keyboard shortcuts (`c` for a new lead).
- In-app notifications when a lead is assigned to you.
- Light and dark themes, and a responsive layout down to phone width.

**Roles**, enforced in the API rather than just hidden in the UI:

| | Admin | Sales |
|---|---|---|
| Sees leads | All | Assigned to them |
| Assign / reassign leads | ✓ | — |
| Delete leads | ✓ | — |
| Team management | ✓ | — |
| Team reports & leaderboard | ✓ | Own numbers only |

Deactivating a user signs them out immediately. When you deactivate someone, you can hand their open deals to another rep.

## Getting started

Requires Node 20.6+ and MySQL 8.

```bash
npm install && npm run install:all
cp server/.env.example server/.env   # set DB_USER / DB_PASSWORD and a JWT_SECRET
npm run db:reset                      # creates the database with ~140 realistic demo leads
npm run dev                           # API on :4000, app on :5173
```

Open http://localhost:5173 and use the demo account buttons on the sign-in page.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@crm.test | admin123 |
| Sales | priya@crm.test | sales123 |
| Sales | arjun@crm.test, kavya@crm.test, rahul@crm.test | sales123 |

`npm run db:setup` applies the schema without touching existing data. `npm run db:reset` drops the database and reseeds it.

## Sharing a live demo

```bash
npm run share        # public HTTPS link for 30 minutes
npm run share -- 60  # custom duration in minutes
```

This builds the app, serves it from this machine, and opens a temporary [Cloudflare quick tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/). When the time is up, or you press Ctrl+C, the server and tunnel shut down and the link stops working. Requires `brew install cloudflared`.

## Project structure

```
server/src
  routes/        auth, leads, activities, dashboard, reports, notifications, search, users
  lib/           lead query builder & scoring, CSV export, notifications, time-series helpers
  schema.sql     tables and indexes
  seed.js        deterministic demo data generator
client/src
  pages/         Dashboard, Pipeline, Leads, LeadDetail, Tasks, Reports, Team, Settings, Login
  components/    ui primitives, layout shell, lead components, charts
  context/       auth, theme, toasts, lead editor
  lib/           API client, formatting, hooks, CSV parsing
```

## API

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/login` | Returns a JWT |
| GET / PUT | `/api/auth/me` | Profile and password change |
| GET | `/api/dashboard` | KPIs, trend, stages, due soon, activity, team |
| GET | `/api/reports?days=&owner=` | Funnel, trend, revenue, sources, loss reasons, reps |
| GET | `/api/leads` | `search, status, priority, source, tag, assignedTo, followUp, sort, dir, page, limit` |
| GET | `/api/leads/board` | Pipeline board data |
| GET | `/api/leads/meta` | Sources and tags in use |
| GET | `/api/leads/export` | CSV with the same filters as the list |
| POST | `/api/leads/import` | `{ rows, assigned_to }` |
| POST | `/api/leads/bulk` | `{ ids, action: status \| priority \| tag \| assign \| delete, value }` |
| GET / POST / PUT / DELETE | `/api/leads/:id` | Delete is admin-only |
| POST | `/api/leads/:id/activities` | Notes, calls, meetings, emails, follow-ups |
| GET | `/api/activities/tasks?filter=` | `overdue, today, upcoming, pending, completed` |
| PATCH | `/api/activities/:id/complete` · `/reschedule` | Complete, reopen or snooze |
| GET | `/api/notifications` · POST `/read-all` | In-app notifications |
| GET | `/api/search?q=` | Powers ⌘K |
| GET / POST / PUT | `/api/users` | Admin only. `/api/users/directory` is open to everyone |
