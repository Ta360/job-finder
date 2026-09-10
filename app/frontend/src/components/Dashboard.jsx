import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const KPI = ({ n, l }) => (
  <div className="card kpi"><div className="n">{n}</div><div className="l">{l}</div></div>
);

export default function Dashboard({ stats, onImport }) {
  if (!stats) return <p className="muted">Loading…</p>;
  const { totals, daily, funnel, byChannel } = stats;

  return (
    <>
      <div className="toolbar">
        <button className="primary" onClick={onImport}>Import applications.csv</button>
        <span className="muted">Pulls rows from the repo's flat tracker into the database.</span>
      </div>

      <div className="grid kpis">
        <KPI n={totals.applications} l="Applied / tracked" />
        <KPI n={totals.last7} l="Last 7 days" />
        <KPI n={totals.outreach} l="Recruiter messages" />
        <KPI n={totals.replies} l="Recruiter replies" />
        <KPI n={`${totals.replyRate}%`} l="Reply rate" />
        <KPI n={totals.interviews} l="Interviews" />
        <KPI n={totals.offers} l="Offers" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', marginBottom: 16 }}>
        <div className="card">
          <h2>Activity — last 14 days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
              <Legend />
              <Bar dataKey="applications" fill="var(--accent)" name="Applications" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outreach" fill="var(--good)" name="Outreach" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h2>Pipeline funnel</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnel} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>By channel</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byChannel}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
              <Bar dataKey="count" fill="var(--good)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
