import { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const blank = () => ({ title: '', type: 'interview', start: '', end: '', company: '', notes: '' });

export default function Calendar({ events, apps, reload }) {
  const [form, setForm] = useState(blank());
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await api.addEvent(form);
    setForm(blank()); reload();
  };
  const del = async (id) => { await api.deleteEvent(id); reload(); };

  const followUps = useMemo(
    () => apps.filter((a) => a.next_action_date).sort((x, y) => x.next_action_date.localeCompare(y.next_action_date)),
    [apps]
  );

  return (
    <>
      <GooglePanel />

      <form className="card" onSubmit={submit} style={{ marginTop: 16 }}>
        <h2>Add local event (interview / call)</h2>
        <div className="form-grid">
          <label>Title<input value={form.title} onChange={set('title')} required /></label>
          <label>Type
            <select value={form.type} onChange={set('type')}>
              <option>interview</option><option>screening-call</option><option>follow-up</option><option>deadline</option>
            </select>
          </label>
          <label>Company<input value={form.company} onChange={set('company')} /></label>
          <label>Start<input type="datetime-local" value={form.start} onChange={set('start')} required /></label>
          <label>End<input type="datetime-local" value={form.end} onChange={set('end')} /></label>
        </div>
        <label>Notes<textarea rows={2} value={form.notes} onChange={set('notes')} /></label>
        <button className="primary" style={{ marginTop: 10 }} type="submit">Add</button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Local events ({events.length})</h2>
        <table>
          <thead><tr><th>When</th><th>Title</th><th>Type</th><th>Company</th><th></th></tr></thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.start?.replace('T', ' ')}</td>
                <td>{ev.title}</td><td>{ev.type}</td><td>{ev.company}</td>
                <td><button className="ghost danger" onClick={() => del(ev.id)}>✕</button></td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={5} className="muted">No local events.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Upcoming follow-ups (from applications)</h2>
        <table>
          <thead><tr><th>Date</th><th>Company</th><th>Role</th><th>Action</th><th>Status</th></tr></thead>
          <tbody>
            {followUps.map((a) => (
              <tr key={a.id}>
                <td>{a.next_action_date}</td><td>{a.company}</td><td>{a.role}</td>
                <td>{a.next_action}</td><td><span className="pill">{a.status}</span></td>
              </tr>
            ))}
            {!followUps.length && <tr><td colSpan={5} className="muted">No dated follow-ups. Set “Next date” on applications.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function GooglePanel() {
  const [st, setSt] = useState(null);
  const [gev, setGev] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await api.googleStatus();
      setSt(s);
      if (s.calendarId) setGev(await api.googleEvents().catch(() => []));
    } catch (e) {
      setSt({ error: String(e.message || e) });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = (name, fn) => async () => {
    setBusy(name); setMsg('');
    try {
      const r = await fn();
      setMsg(typeof r === 'object' ? JSON.stringify(r) : String(r));
      await load();
    } catch (e) {
      setMsg('Error: ' + String(e.message || e));
    } finally {
      setBusy('');
    }
  };

  if (!st) return <div className="card">Checking Google connection…</div>;

  if (!st.hasCredentials) {
    return (
      <div className="card">
        <h2>Google Calendar</h2>
        <div className="banner">
          Not configured. Local: add an OAuth “Desktop app” client JSON at
          <code> app/backend/data/google-credentials.json</code> and run <code>npm run gcal-auth</code>.
          Cloud: set <code>GOOGLE_WEB_CLIENT_ID</code> / <code>GOOGLE_WEB_CLIENT_SECRET</code>. See <b>SETUP_GOOGLE.md</b>.
        </div>
      </div>
    );
  }

  if (!st.connected) {
    return (
      <div className="card">
        <h2>Google Calendar</h2>
        <p className="muted">Not connected yet.</p>
        {st.connectUrl
          ? <p><a className="button primary" href={st.connectUrl}>Connect Google Calendar →</a>
              <span className="muted" style={{ marginLeft: 10 }}>opens Google consent, then returns here</span></p>
          : <p>Run <code>npm run gcal-auth</code> in <code>app/</code> and approve access.</p>}
        <button onClick={load}>Re-check</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Google Calendar — connected{st.email ? ` (${st.email})` : ''}</h2>
      <div className="toolbar">
        {!st.calendarId
          ? <button className="primary" disabled={busy} onClick={run('cal', api.createCalendar)}>
              {busy === 'cal' ? 'Creating…' : 'Create “Job Finder” calendar'}
            </button>
          : <span className="pill">calendar id: {st.calendarId.slice(0, 24)}…</span>}
        {st.calendarId &&
          <button disabled={busy} onClick={run('seed', api.seedCadence)}>
            {busy === 'seed' ? 'Adding…' : 'Add the 3 recurring holds'}
          </button>}
        <button disabled={busy} onClick={load}>Refresh</button>
      </div>
      {msg && <p className="muted" style={{ wordBreak: 'break-all' }}>{msg}</p>}
      {st.calendarId && (
        <table>
          <thead><tr><th>When</th><th>Event</th><th></th></tr></thead>
          <tbody>
            {gev.map((e) => (
              <tr key={e.id}>
                <td>{(e.start?.dateTime || e.start?.date || '').replace('T', ' ').slice(0, 16)}</td>
                <td>{e.summary}{e.recurrence ? ' ↻' : ''}</td>
                <td><button className="ghost danger" onClick={run('del' + e.id, () => api.deleteGoogleEvent(e.id))}>✕</button></td>
              </tr>
            ))}
            {!gev.length && <tr><td colSpan={3} className="muted">No upcoming events on this calendar.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
