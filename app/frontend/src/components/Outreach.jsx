import { useState } from 'react';
import { api } from '../api.js';

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({
  date: today(), company: '', role: '', recruiter_name: '', recruiter_contact: '',
  channel: 'email', message_type: 'cold', sent: 0, replied: 0, follow_up_date: '', notes: '',
});

export default function Outreach({ rows, reload }) {
  const [form, setForm] = useState(blank());
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await api.addOutreach(form);
    setForm(blank()); reload();
  };
  const toggle = async (r, field) => { await api.updateOutreach(r.id, { [field]: r[field] ? 0 : 1 }); reload(); };
  const del = async (id) => { if (confirm('Delete?')) { await api.deleteOutreach(id); reload(); } };

  return (
    <>
      <form className="card" onSubmit={submit}>
        <h2>Log recruiter outreach</h2>
        <div className="form-grid">
          <label>Date<input type="date" value={form.date} onChange={set('date')} required /></label>
          <label>Company<input value={form.company} onChange={set('company')} /></label>
          <label>Role<input value={form.role} onChange={set('role')} /></label>
          <label>Recruiter<input value={form.recruiter_name} onChange={set('recruiter_name')} /></label>
          <label>Contact<input value={form.recruiter_contact} onChange={set('recruiter_contact')} placeholder="email / LinkedIn" /></label>
          <label>Channel
            <select value={form.channel} onChange={set('channel')}>
              <option>email</option><option>linkedin</option><option>whatsapp</option><option>phone</option>
            </select>
          </label>
          <label>Type
            <select value={form.message_type} onChange={set('message_type')}>
              <option>cold</option><option>follow-up-1</option><option>follow-up-2</option><option>reply</option><option>thank-you</option>
            </select>
          </label>
          <label>Follow-up date<input type="date" value={form.follow_up_date} onChange={set('follow_up_date')} /></label>
        </div>
        <label>Notes<textarea rows={2} value={form.notes} onChange={set('notes')} /></label>
        <button className="primary" style={{ marginTop: 10 }} type="submit">Add</button>
      </form>

      <div className="card overflow" style={{ marginTop: 16 }}>
        <h2>{rows.length} messages</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Company</th><th>Recruiter</th><th>Channel</th><th>Type</th><th>Sent</th><th>Replied</th><th>Follow-up</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.company}</td>
                <td>{r.recruiter_name}<br /><span className="muted">{r.recruiter_contact}</span></td>
                <td>{r.channel}</td>
                <td>{r.message_type}</td>
                <td><input type="checkbox" checked={!!r.sent} onChange={() => toggle(r, 'sent')} style={{ width: 'auto' }} /></td>
                <td><input type="checkbox" checked={!!r.replied} onChange={() => toggle(r, 'replied')} style={{ width: 'auto' }} /></td>
                <td>{r.follow_up_date}</td>
                <td><button className="ghost danger" onClick={() => del(r.id)}>✕</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="muted">No outreach logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
