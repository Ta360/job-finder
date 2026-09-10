import { useState, useMemo } from 'react';
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

  // upcoming follow-ups derived from applications
  const followUps = useMemo(
    () => apps.filter((a) => a.next_action_date).sort((x, y) => x.next_action_date.localeCompare(y.next_action_date)),
    [apps]
  );

  return (
    <>
      <div className="banner">
        Local calendar. Reconnect the Google Calendar connector (write access) and these can sync to a real
        “Job Finder” Google calendar with reminders.
      </div>

      <form className="card" onSubmit={submit}>
        <h2>Add event (interview / call)</h2>
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
        <h2>Scheduled ({events.length})</h2>
        <table>
          <thead><tr><th>When</th><th>Title</th><th>Type</th><th>Company</th><th></th></tr></thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.start?.replace('T', ' ')}</td>
                <td>{ev.title}</td>
                <td>{ev.type}</td>
                <td>{ev.company}</td>
                <td><button className="ghost danger" onClick={() => del(ev.id)}>✕</button></td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={5} className="muted">No events yet.</td></tr>}
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
