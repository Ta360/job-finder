const base = '';

async function req(path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.status === 204 ? null : res.json();
}

export const api = {
  stats: () => req('/api/stats'),
  applications: () => req('/api/applications'),
  addApplication: (b) => req('/api/applications', { method: 'POST', body: b }),
  updateApplication: (id, b) => req(`/api/applications/${id}`, { method: 'PATCH', body: b }),
  deleteApplication: (id) => req(`/api/applications/${id}`, { method: 'DELETE' }),
  outreach: () => req('/api/outreach'),
  addOutreach: (b) => req('/api/outreach', { method: 'POST', body: b }),
  updateOutreach: (id, b) => req(`/api/outreach/${id}`, { method: 'PATCH', body: b }),
  deleteOutreach: (id) => req(`/api/outreach/${id}`, { method: 'DELETE' }),
  events: () => req('/api/events'),
  addEvent: (b) => req('/api/events', { method: 'POST', body: b }),
  deleteEvent: (id) => req(`/api/events/${id}`, { method: 'DELETE' }),
  importCsv: () => req('/api/import-csv', { method: 'POST' }),
  digest: () => req('/api/digest'),
};

export const STATUSES = [
  'applied', 'emailed', 'recruiter-replied', 'screening', 'interview', 'offer', 'rejected', 'no-response',
];
export const CHANNELS = ['application', 'email', 'linkedin', 'referral', 'portal'];
export const LOCATIONS = ['Remote-Global', 'Remote-India', 'Remote-USA', 'Remote-UK', 'Remote-EU', 'Hybrid'];
