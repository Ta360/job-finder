import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Applications, Outreach, Events, Settings, stats, db } from './db.js';
import * as G from './google.js';

const CAL_KEY = 'google_job_calendar_id';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..'); // .../Job Finder
const FRONTEND_DIST = join(__dirname, '..', '..', 'frontend', 'dist');

const app = express();
app.use(cors());
app.use(express.json());

const wrap = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: String(e.message || e) });
  }
};

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// --- applications ------------------------------------------------------
app.get('/api/applications', wrap((_req, res) => res.json(Applications.all())));
app.post('/api/applications', wrap((req, res) => res.status(201).json(Applications.create(req.body))));
app.patch('/api/applications/:id', wrap((req, res) => res.json(Applications.update(req.params.id, req.body))));
app.delete('/api/applications/:id', wrap((req, res) => {
  Applications.remove(req.params.id);
  res.status(204).end();
}));

// --- outreach --------------------------------------------------------
app.get('/api/outreach', wrap((_req, res) => res.json(Outreach.all())));
app.post('/api/outreach', wrap((req, res) => res.status(201).json(Outreach.create(req.body))));
app.patch('/api/outreach/:id', wrap((req, res) => res.json(Outreach.update(req.params.id, req.body))));
app.delete('/api/outreach/:id', wrap((req, res) => {
  Outreach.remove(req.params.id);
  res.status(204).end();
}));

// --- events (local calendar) ----------------------------------------
app.get('/api/events', wrap((_req, res) => res.json(Events.all())));
app.post('/api/events', wrap((req, res) => res.status(201).json(Events.create(req.body))));
app.delete('/api/events/:id', wrap((req, res) => {
  Events.remove(req.params.id);
  res.status(204).end();
}));

// --- stats ----------------------------------------------------------
app.get('/api/stats', wrap((_req, res) => res.json(stats())));

// --- Google Calendar --------------------------------------------------
const awrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: String(e.errors?.[0]?.message || e.message || e) });
  }
};

app.get('/api/google/status', awrap(async (_req, res) => {
  const connected = G.isConnected();
  res.json({
    hasCredentials: G.hasCredentials(),
    connected,
    email: connected ? await G.connectedEmail() : null,
    calendarId: Settings.get(CAL_KEY),
    consentUrl: G.hasCredentials() ? G.consentUrl() : null,
  });
}));

// Create the dedicated calendar (default name "Job Finder") and remember its id.
app.post('/api/calendar', awrap(async (req, res) => {
  const existing = Settings.get(CAL_KEY);
  if (existing && !req.body.force) {
    return res.status(200).json({ id: existing, reused: true });
  }
  const cal = await G.createCalendar(req.body.summary || 'Job Finder', req.body.timeZone || 'Asia/Kolkata');
  Settings.set(CAL_KEY, cal.id);
  res.status(201).json({ id: cal.id, summary: cal.summary, reused: false });
}));

const needCal = (res) => {
  const id = Settings.get(CAL_KEY);
  if (!id) {
    res.status(400).json({ error: 'No Job Finder calendar yet — POST /api/calendar first' });
    return null;
  }
  return id;
};

app.get('/api/calendar/google-events', awrap(async (_req, res) => {
  const id = needCal(res); if (!id) return;
  res.json(await G.listUpcoming(id));
}));

app.post('/api/calendar/google-events', awrap(async (req, res) => {
  const id = needCal(res); if (!id) return;
  res.status(201).json(await G.addEvent(id, req.body));
}));

app.delete('/api/calendar/google-events/:eventId', awrap(async (req, res) => {
  const id = needCal(res); if (!id) return;
  await G.deleteEvent(id, req.params.eventId);
  res.status(204).end();
}));

// Seed the three recurring Job Finder holds onto the dedicated calendar.
app.post('/api/calendar/seed-cadence', awrap(async (_req, res) => {
  const id = needCal(res); if (!id) return;
  const d = new Date(); d.setDate(d.getDate() + 1);
  const day = d.toISOString().slice(0, 10);
  const nextSunday = new Date(d);
  nextSunday.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  const sun = nextSunday.toISOString().slice(0, 10);
  const made = [];
  made.push(await G.addEvent(id, {
    summary: '[Job Finder] Review digest + apply (15–20 min)',
    description: 'Open job-search/digest-latest.md → apply to APPLY-tier roles → submit from applications/queue/ packets → log in applications.csv.',
    start: `${day}T09:15:00`, end: `${day}T09:35:00`, recurrence: 'RRULE:FREQ=DAILY', reminderMinutes: 10,
  }));
  made.push(await G.addEvent(id, {
    summary: '[Job Finder] Send recruiter drafts + log outcomes',
    description: 'Review recruiter emails in Gmail Drafts → send → update applications.csv → check dashboard.',
    start: `${day}T18:00:00`, end: `${day}T18:20:00`, recurrence: 'RRULE:FREQ=DAILY', reminderMinutes: 10,
  }));
  made.push(await G.addEvent(id, {
    summary: '[Job Finder] Weekly review — response rates + retarget',
    description: 'Applications sent, reply rate, interview rate, which boards/roles convert. Adjust targeting + resume + templates.',
    start: `${sun}T11:00:00`, end: `${sun}T12:00:00`, recurrence: 'RRULE:FREQ=WEEKLY;BYDAY=SU', reminderMinutes: 30,
  }));
  res.status(201).json({ created: made.length, events: made.map((e) => ({ id: e.id, summary: e.summary })) });
}));

// --- import the flat applications.csv from the repo ----------------
app.post('/api/import-csv', wrap((_req, res) => {
  const csvPath = join(REPO_ROOT, 'applications', 'applications.csv');
  if (!existsSync(csvPath)) return res.status(404).json({ error: 'applications.csv not found' });
  const text = readFileSync(csvPath, 'utf8').trim();
  const [head, ...lines] = text.split(/\r?\n/);
  const cols = head.split(',').map((c) => c.trim());
  let imported = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    const row = {};
    cols.forEach((c, i) => (row[c] = (cells[i] || '').trim()));
    if (/^example/i.test(row.company || '') || (row.notes || '').toLowerCase().includes('delete this example')) continue;
    if (!row.company || !row.role) continue;
    if (Applications.findDup(row.company, row.role)) continue;
    Applications.create(row);
    imported++;
  }
  res.json({ imported });
}));

// --- latest job digest (markdown) --------------------------------
app.get('/api/digest', wrap((_req, res) => {
  const p = join(REPO_ROOT, 'job-search', 'digest-latest.md');
  res.json({ markdown: existsSync(p) ? readFileSync(p, 'utf8') : '_No digest yet._' });
}));

// --- serve built frontend in production ----------------------------
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(FRONTEND_DIST, 'index.html'));
  });
}

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => console.log(`Job Finder API on http://localhost:${PORT}`));
