import { useState } from 'react';
import { api, STATUSES, CHANNELS, LOCATIONS } from '../api.js';

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({
  date: today(), company: '', role: '', location_type: 'Remote-Global',
  source: '', channel: 'application', status: 'applied', url: '',
  next_action: 'follow-up', next_action_date: '', notes: '',
});

export default function Applications({ rows, reload }) {
  const [form, setForm] = useState(blank());
  const [editId, setEditId] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (editId) await api.updateApplication(editId, form);
    else await api.addApplication(form);
    setForm(blank()); setEditId(null); reload();
  };
  const edit = (r) => { setForm({ ...blank(), ...r }); setEditId(r.id); };
  const del = async (id) => { if (confirm('Delete this application?')) { await api.deleteApplication(id); reload(); } };
  const quickStatus = async (r, status) => { await api.updateApplication(r.id, { status }); reload(); };

  return (
    <>
      <form className="card" onSubmit={submit}>
        <h2>{editId ? 'Edit application' : 'Log an application'}</h2>
        <div className="form-grid">
          <label>Date<input type="date" value={form.date} onChange={set('date')} required /></label>
          <label>Company<input value={form.company} onChange={set('company')} required /></label>
          <label>Role<input value={form.role} onChange={set('role')} required /></label>
          <label>Location
            <select value={form.location_type} onChange={set('location_type')}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label>Source<input value={form.source} onChange={set('source')} placeholder="LinkedIn, WWR…" /></label>
          <label>Channel
            <select value={form.channel} onChange={set('channel')}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Status
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Next action<input value={form.next_action} onChange={set('next_action')} /></label>
          <label>Next date<input type="date" value={form.next_action_date || ''} onChange={set('next_action_date')} /></label>
          <label>URL<input value={form.url} onChange={set('url')} /></label>
        </div>
        <label>Notes<textarea rows={2} value={form.notes} onChange={set('notes')} /></label>
        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="primary" type="submit">{editId ? 'Save' : 'Add'}</button>
          {editId && <button type="button" className="ghost" onClick={() => { setForm(blank()); setEditId(null); }}>Cancel</button>}
        </div>
      </form>

      <div className="card overflow" style={{ marginTop: 16 }}>
        <h2>{rows.length} applications</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Company</th><th>Role</th><th>Loc</th><th>Channel</th>
              <th>Status</th><th>Next</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.company}</a> : r.company}</td>
                <td>{r.role}</td>
                <td>{(r.location_type || '').replace('Remote-', '')}</td>
                <td>{r.channel}</td>
                <td>
                  <select value={r.status} onChange={(e) => quickStatus(r, e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>{r.next_action} {r.next_action_date}</td>
                <td className="row-actions">
                  <button className="ghost" onClick={() => edit(r)}>✎</button>
                  <button className="ghost danger" onClick={() => del(r.id)}>✕</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="muted">Nothing logged yet — add one above or import the CSV from the Dashboard.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
