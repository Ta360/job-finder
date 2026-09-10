import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Applications, Outreach, Events, stats, db } from './db.js';

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
