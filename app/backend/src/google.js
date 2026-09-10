// Google Calendar integration for Job Finder.
// Auth model: OAuth 2.0 "Desktop app" client owned by the user. A one-time
// consent (npm run gcal-auth) stores a refresh token; the server then mints
// access tokens on demand. No Google APIs are touched unless the user has
// dropped their credentials file in place and completed consent.
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');

export const CREDENTIALS_PATH =
  process.env.GOOGLE_CREDENTIALS_PATH || join(DATA_DIR, 'google-credentials.json');
export const TOKEN_PATH = join(DATA_DIR, 'google-token.json');

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'openid',
  'email',
];

// Loopback redirect — always permitted for Desktop-app clients, any port.
export const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:4288';

export function hasCredentials() {
  return existsSync(CREDENTIALS_PATH);
}

export function isConnected() {
  if (!existsSync(TOKEN_PATH)) return false;
  try {
    return !!JSON.parse(readFileSync(TOKEN_PATH, 'utf8')).refresh_token;
  } catch {
    return false;
  }
}

function readClientConfig() {
  if (!hasCredentials()) {
    throw new Error(
      `Google credentials not found. Save your OAuth client JSON to ${CREDENTIALS_PATH} — see SETUP_GOOGLE.md`
    );
  }
  const raw = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  const c = raw.installed || raw.web || raw;
  if (!c.client_id || !c.client_secret) {
    throw new Error('Google credentials file is missing client_id / client_secret');
  }
  return c;
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
  // preserve an existing refresh_token if Google didn't re-send one
  let merged = tokens;
  if (!tokens.refresh_token && existsSync(TOKEN_PATH)) {
    const prev = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
    merged = { ...tokens, refresh_token: prev.refresh_token };
  }
  writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

export function authedClient() {
  if (!isConnected()) throw new Error('Google not connected — run: npm run gcal-auth');
  const oauth = makeOAuthClient();
  oauth.setCredentials(JSON.parse(readFileSync(TOKEN_PATH, 'utf8')));
  oauth.on('tokens', (t) => {
    try {
      const cur = existsSync(TOKEN_PATH) ? JSON.parse(readFileSync(TOKEN_PATH, 'utf8')) : {};
      writeFileSync(TOKEN_PATH, JSON.stringify({ ...cur, ...t }, null, 2));
    } catch {
      /* best effort */
    }
  });
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

// --- high-level helpers ------------------------------------------------
export async function createCalendar(summary = 'Job Finder', timeZone = 'Asia/Kolkata') {
  const cal = calendarApi();
  const { data } = await cal.calendars.insert({ requestBody: { summary, timeZone } });
  return data; // { id, summary, timeZone, ... }
}

export async function listUpcoming(calendarId, max = 50) {
  const cal = calendarApi();
  const { data } = await cal.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: max,
  });
  return data.items || [];
}

export async function addEvent(calendarId, ev) {
  const cal = calendarApi();
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
  const { data } = await cal.events.insert({ calendarId, requestBody: body });
  return data;
}

export async function deleteEvent(calendarId, eventId) {
  await calendarApi().events.delete({ calendarId, eventId });
}
