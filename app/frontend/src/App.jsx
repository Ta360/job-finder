import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import Applications from './components/Applications.jsx';
import Outreach from './components/Outreach.jsx';
import Digest from './components/Digest.jsx';
import Calendar from './components/Calendar.jsx';

const TABS = ['Dashboard', 'Applications', 'Outreach', 'Digest', 'Calendar'];

export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [apps, setApps] = useState([]);
  const [reach, setReach] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  const reload = useCallback(async () => {
    try {
      const [a, o, e, s] = await Promise.all([
        api.applications(), api.outreach(), api.events(), api.stats(),
      ]);
      setApps(a); setReach(o); setEvents(e); setStats(s); setErr('');
    } catch (e) {
      setErr(String(e.message || e));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <>
      <header className="top">
        <div>
          <h1>Job Finder <span className="muted">· remote IT support search</span></h1>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </header>
      <main>
        {err && <div className="banner">API error: {err}. Is the backend running on :4200?</div>}
        {tab === 'Dashboard' && <Dashboard stats={stats} onImport={async () => { await api.importCsv(); reload(); }} />}
        {tab === 'Applications' && <Applications rows={apps} reload={reload} />}
        {tab === 'Outreach' && <Outreach rows={reach} reload={reload} />}
        {tab === 'Digest' && <Digest />}
        {tab === 'Calendar' && <Calendar events={events} apps={apps} reload={reload} />}
      </main>
    </>
  );
}
