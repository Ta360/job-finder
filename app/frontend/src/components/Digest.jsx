import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Digest() {
  const [md, setMd] = useState('Loading…');
  useEffect(() => { api.digest().then((d) => setMd(d.markdown)).catch((e) => setMd(String(e))); }, []);
  return (
    <div className="card">
      <h2>Latest job digest — job-search/digest-latest.md</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Refreshed every morning by the <code>job-finder-daily-digest</code> scheduled task.
      </p>
      <div className="digest">{md}</div>
    </div>
  );
}
