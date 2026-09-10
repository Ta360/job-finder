// SQLite persistence using Node's built-in driver (node:sqlite, Node >=22.5).
// No native npm dependency required.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'job-finder.db'));

// journal_mode = DELETE (not WAL): the cloud DATA_DIR is an Azure Files (SMB)
// mount, and WAL needs shared-memory/mmap that network filesystems don't provide.
// Single low-traffic replica, so WAL's concurrency win doesn't matter here.
db.exec(`
  PRAGMA journal_mode = DELETE;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location_type TEXT DEFAULT '',
    source TEXT DEFAULT '',
    channel TEXT DEFAULT 'application',
    status TEXT DEFAULT 'applied',
    applied_via TEXT DEFAULT '',
    recruiter_name TEXT DEFAULT '',
    recruiter_contact TEXT DEFAULT '',
    next_action TEXT DEFAULT '',
    next_action_date TEXT DEFAULT '',
    first_reply_date TEXT DEFAULT '',
    url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS outreach (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    company TEXT DEFAULT '',
    role TEXT DEFAULT '',
    recruiter_name TEXT DEFAULT '',
    recruiter_contact TEXT DEFAULT '',
    channel TEXT DEFAULT 'email',
    message_type TEXT DEFAULT 'cold',
    sent INTEGER DEFAULT 0,
    follow_up_date TEXT DEFAULT '',
    replied INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'interview',
    start TEXT NOT NULL,
    end TEXT DEFAULT '',
    company TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export const Settings = {
  get: (k) => {
    const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
    return r ? r.value : null;
  },
  set: (k, v) => {
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(k, v == null ? null : String(v));
  },
};

// --- generic helpers -------------------------------------------------------
const APP_FIELDS = [
  'date', 'company', 'role', 'location_type', 'source', 'channel', 'status',
  'applied_via', 'recruiter_name', 'recruiter_contact', 'next_action',
  'next_action_date', 'first_reply_date', 'url', 'notes',
];
const OUT_FIELDS = [
  'date', 'company', 'role', 'recruiter_name', 'recruiter_contact', 'channel',
  'message_type', 'sent', 'follow_up_date', 'replied', 'notes',
];
const EVENT_FIELDS = ['title', 'type', 'start', 'end', 'company', 'notes'];

function pick(obj, fields) {
  const out = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

function insert(table, fields, body) {
  const data = pick(body, fields);
  const keys = Object.keys(data);
  if (!keys.length) throw new Error('no fields');
  const stmt = db.prepare(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`
  );
  const info = stmt.run(...keys.map((k) => data[k]));
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
}

function update(table, fields, id, body) {
  const data = pick(body, fields);
  const keys = Object.keys(data);
  if (!keys.length) return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  const set = keys.map((k) => `${k} = ?`).join(', ');
  const extra = table === 'applications' ? ", updated_at = datetime('now')" : '';
  db.prepare(`UPDATE ${table} SET ${set}${extra} WHERE id = ?`).run(...keys.map((k) => data[k]), id);
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

export const Applications = {
  all: () => db.prepare('SELECT * FROM applications ORDER BY date DESC, id DESC').all(),
  get: (id) => db.prepare('SELECT * FROM applications WHERE id = ?').get(id),
  create: (b) => insert('applications', APP_FIELDS, b),
  update: (id, b) => update('applications', APP_FIELDS, id, b),
  remove: (id) => db.prepare('DELETE FROM applications WHERE id = ?').run(id),
  findDup: (company, role) =>
    db.prepare('SELECT * FROM applications WHERE lower(company)=lower(?) AND lower(role)=lower(?)').get(company, role),
};

export const Outreach = {
  all: () => db.prepare('SELECT * FROM outreach ORDER BY date DESC, id DESC').all(),
  create: (b) => insert('outreach', OUT_FIELDS, b),
  update: (id, b) => update('outreach', OUT_FIELDS, id, b),
  remove: (id) => db.prepare('DELETE FROM outreach WHERE id = ?').run(id),
};

export const Events = {
  all: () => db.prepare('SELECT * FROM events ORDER BY start ASC').all(),
  create: (b) => insert('events', EVENT_FIELDS, b),
  remove: (id) => db.prepare('DELETE FROM events WHERE id = ?').run(id),
};

// --- analytics -----------------------------------------------------------
const FUNNEL = ['applied', 'emailed', 'recruiter-replied', 'screening', 'interview', 'offer'];

export function stats() {
  const rows = Applications.all();
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return iso(d);
  };

  const rank = (s) => FUNNEL.indexOf(s);
  const replied = rows.filter((r) => r.first_reply_date || rank(r.status) > 1).length;
  const interviews = rows.filter((r) => ['interview', 'offer'].includes(r.status)).length;
  const offers = rows.filter((r) => r.status === 'offer').length;
  const last7 = rows.filter((r) => r.date >= daysAgo(6)).length;

  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    daily.push({
      date: d,
      applications: rows.filter((r) => r.date === d).length,
      outreach: Outreach.all().filter((o) => o.date === d).length,
    });
  }

  const funnel = FUNNEL.map((s) => ({
    stage: s,
    count: rows.filter((r) => rank(r.status) >= rank(s)).length,
  }));

  const group = (key) => {
    const m = {};
    rows.forEach((r) => {
      const k = r[key] || '—';
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  return {
    totals: {
      applications: rows.length,
      last7,
      replies: replied,
      replyRate: rows.length ? Math.round((replied / rows.length) * 100) : 0,
      interviews,
      offers,
      outreach: Outreach.all().length,
    },
    daily,
    funnel,
    byChannel: group('channel'),
    byLocation: group('location_type'),
  };
}
