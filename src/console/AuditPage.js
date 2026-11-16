import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import { eventLabel } from './eventLabels';

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' });
};

// "department: it · status: done" from the details record.
const summarize = (details) =>
  Object.entries(details || {})
    .filter(([, v]) => v !== null && v !== '' && v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');

export default function AuditPage() {
  const { session } = useAuth();
  const token = session.token;

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warnings, setWarnings] = useState(false);
  const [applied, setApplied] = useState({ type: '', user: '', from: '', to: '', warnings: false });

  const params = useCallback((f, p) => {
    const out = {};
    if (f.type) out.type = f.type;
    if (f.user.trim()) out.user = f.user.trim();
    if (f.from) out.from = f.from;
    if (f.to) out.to = f.to;
    if (f.warnings) out.warnings = true;
    if (p) out.page = p;
    return out;
  }, []);

  useEffect(() => {
    setError('');
    axios.get(`${API_URL}/admin/audit`, {
      headers: { Authorization: `Bearer ${token}` },
      params: params(applied, page)
    })
      .then(r => setData(r.data))
      .catch(() => setError('Could not load the audit log.'));
  }, [token, applied, page, params]);

  const apply = () => {
    setPage(1);
    setApplied({ type, user, from, to, warnings });
  };

  const clear = () => {
    setType(''); setUser(''); setFrom(''); setTo(''); setWarnings(false);
    setPage(1);
    setApplied({ type: '', user: '', from: '', to: '', warnings: false });
  };

  const download = async () => {
    setError('');
    try {
      const r = await axios.get(`${API_URL}/admin/audit/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params(applied),
        responseType: 'blob'
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Could not download the log.');
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">Audit log</h2>
        <button className="secondary-btn" onClick={download}>Download CSV</button>
      </div>

      <section className="aside-card">
        <div className="people-toolbar">
          <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All events</option>
            {(data?.types || []).map(t => <option key={t} value={t}>{eventLabel(t)}</option>)}
          </select>
          <input className="field-input" value={user} onChange={(e) => setUser(e.target.value)}
                 placeholder="Person (email)" />
          <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="check-row">
            <input type="checkbox" checked={warnings} onChange={(e) => setWarnings(e.target.checked)} />
            Warnings only
          </label>
          <button className="primary-btn" onClick={apply}>Apply</button>
          <button className="secondary-btn" onClick={clear}>Clear</button>
        </div>
        <p className="aside-note">Dates use UTC. The log holds ids and statuses, never what people typed.</p>
      </section>

      {error && <p className="error-message">{error}</p>}
      {!data && !error && <p className="aside-note">Loading…</p>}

      {data && (
        <section className="aside-card">
          <h3>{data.total} {data.total === 1 ? 'event' : 'events'}</h3>
          {data.items.length === 0 && <p className="aside-note">No events match.</p>}
          {data.items.length > 0 && (
            <table className="people-table">
              <thead>
                <tr><th>Time</th><th>Person</th><th>Event</th><th>Details</th></tr>
              </thead>
              <tbody>
                {data.items.map(a => (
                  <tr key={a.id}>
                    <td>{localTime(a.timestamp)}</td>
                    <td>{a.userId || '—'}</td>
                    <td>
                      {eventLabel(a.eventType)}
                      {a.severity && a.severity !== 'INFO' && <span className="badge"> {a.severity.toLowerCase()}</span>}
                    </td>
                    <td><small className="muted">{summarize(a.details)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="edit-grid" style={{ marginTop: 12 }}>
            <button className="secondary-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              ← Newer
            </button>
            <span className="muted">Page {page} of {pages}</span>
            <button className="secondary-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>
              Older →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}