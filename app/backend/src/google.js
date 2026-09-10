// Google Calendar integration for Job Finder.
//
// Two auth paths, same token store:
//  - LOCAL: OAuth "Desktop app" client JSON in data/, one-time `npm run gcal-auth`.
//  - CLOUD: OAuth "Web application" client via env vars, browser consent through
//    GET /api/google/connect -> /api/google/callback.
// The refresh token is persisted in the DB (settings.google_token) so it survives
// container restarts, and mirrored to data/google-token.json when that's writable.
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Settings } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');

export const CREDENTIALS_PATH =
  process.env.GOOGLE_CREDENTIALS_PATH || join(DATA_DIR, 'google-credentials.json');
export const TOKEN_PATH = join(DATA_DIR, 'google-token.json');
const TOKEN_KEY = 'google_token';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'openid',
  'email',
];

// Desktop loopback default; the web flow passes an explicit https callback.
export const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:4288';

// --- client config: env web client first, then the desktop JSON file ----
function envClient() {
  const id = process.env.GOOGLE_WEB_CLIENT_ID;
  const secret = process.env.GOOGLE_WEB_CLIENT_SECRET;
  return id && secret ? { client_id: id, client_secret: secret } : null;
}

function fileClient() {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  const raw = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  const c = raw.installed || raw.web || raw;
  return c.client_id && c.client_secret ? c : null;
}

function readClientConfig() {
  const c = envClient() || fileClient();
  if (!c) {
    throw new Error(
      'No Google client configured — set GOOGLE_WEB_CLIENT_ID/SECRET or add data/google-credentials.json (see SETUP_GOOGLE.md)'
    );
  }
  return c;
}

export function hasCredentials() {
  return !!(envClient() || fileClient());
}

// --- token store: DB first, file fallback -----------------------------
function loadToken() {
  const fromDb = Settings.get(TOKEN_KEY);
  if (fromDb) {
    try {
      return JSON.parse(fromDb);
    } catch {
      /* ignore */
    }
  }
  if (existsSync(TOKEN_PATH)) {
    try {
      return JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
    } catch {
      /* ignore */
    }
  }
  return null;
}

function saveToken(tokens) {
  const prev = loadToken() || {};
  const merged = { ...prev, ...tokens };
  if (!merged.refresh_token && prev.refresh_token) merged.refresh_token = prev.refresh_token;
  Settings.set(TOKEN_KEY, JSON.stringify(merged));
  try {
    writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  } catch {
    /* read-only fs in cloud — DB copy is authoritative */
  }
  return merged;
}

export function isConnected() {
  const t = loadToken();
  return !!(t && t.refresh_token);
}

export function makeOAuthClient(redirectUri = REDIRECT_URI) {
  const c = readClientConfig();
  return new google.auth.OAuth2(c.client_id, c.client_secret, redirectUri);
}

export function consentUrl(redirectUri = REDIRECT_URI) {
  return makeOAuthClient(redirectUri).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function exchangeCode(code, redirectUri = REDIRECT_URI) {
  const oauth = makeOAuthClient(redirectUri);
  const { tokens } = await oauth.getToken(code);
  return saveToken(tokens);
}

export function authedClient() {
  const t = loadToken();
  if (!t || !t.refresh_token) throw new Error('Google not connected');
  const oauth = makeOAuthClient();
  oauth.setCredentials(t);
  oauth.on('tokens', (nt) => saveToken(nt));
  return oauth;
}

export function calendarApi() {
  return google.calendar({ version: 'v3', auth: authedClient() });
}

export async function connectedEmail() {
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: authedClient() });
    const { data } = await oauth2.userinfo.get();
    return data.email || null;
  } catch {
    return null;
  }
}

export function disconnect() {
  Settings.set(TOKEN_KEY, null);
  try {
    writeFileSync(TOKEN_PATH, '{}');
  } catch {
    /* ignore */
  }
}

// --- high-level helpers ------------------------------------------------
export async function findCalendarByName(summary = 'Job Finder') {
  const { data } = await calendarApi().calendarList.list({ maxResults: 250 });
  const hit = (data.items || []).find(
    (c) => (c.summary || '').trim().toLowerCase() === summary.trim().toLowerCase()
  );
  return hit ? { id: hit.id, summary: hit.summary } : null;
}

// Reuse an existing "Job Finder" calendar if the account already has one.
export async function createCalendar(summary = 'Job Finder', timeZone = 'Asia/Kolkata') {
  const existing = await findCalendarByName(summary);
  if (existing) return { ...existing, reused: true };
  const { data } = await calendarApi().calendars.insert({ requestBody: { summary, timeZone } });
  return data;
}

export async function listUpcoming(calendarId, max = 50) {
  const { data } = await calendarApi().events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: max,
  });
  return data.items || [];
}

export async function addEvent(calendarId, ev) {
  const tz = ev.timeZone || 'Asia/Kolkata';
  const body = {
    summary: ev.summary,
    description: ev.description || '',
    location: ev.location || '',
    start: ev.allDay ? { date: ev.start } : { dateTime: ev.start, timeZone: tz },
    end: ev.allDay ? { date: ev.end || ev.start } : { dateTime: ev.end || ev.start, timeZone: tz },
  };
  if (ev.recurrence) body.recurrence = Array.isArray(ev.recurrence) ? ev.recurrence : [ev.recurrence];
  if (ev.reminderMinutes != null) {
    body.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: ev.reminderMinutes }] };
  }
  const { data } = await calendarApi().events.insert({ calendarId, requestBody: body });
  return data;
}

export async function deleteEvent(calendarId, eventId) {
  await calendarApi().events.delete({ calendarId, eventId });
}
