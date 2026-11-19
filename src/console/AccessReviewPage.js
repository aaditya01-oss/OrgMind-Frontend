import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

// The details column holds a small JSON record of ids and statuses. Show it as "key: value".
const detailText = (text) => {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') {
      return Object.entries(obj)
        .filter(([, v]) => v !== null && v !== '' && v !== undefined)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' \u00B7 ');
    }
  } catch (e) { /* not JSON: show as it is */ }
  return text;
};

export default function AccessReviewPage() {
  const { session } = useAuth();
  const token = session.token;
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const dates = () => {
    const out = {};
    if (from) out.from = from;
    if (to) out.to = to;
    return out;
  };

  const load = useCallback((params) => {
    setError('');
    return axios.get(`${API_URL}/admin/compliance/access-review`,
      { headers: { Authorization: `Bearer ${token}` }, params })
      .then(r => setReport(r.data))
      .catch(() => setError('Could not load the access review.'));
  }, [token]);

  useEffect(() => { load({}); }, [load]);

  const apply = () => { setNotice(''); load(dates()); };

  const download = async (section) => {
    setError('');
    try {
      const r = await axios.get(`${API_URL}/admin/compliance/export`,
        { ...auth, params: { section: section.key, ...dates() }, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `access-review-${section.key}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Could not download that list.');
    }
  };

  const markReviewed = async () => {
    if (!report) return;
    const ok = window.confirm(
      `Record that you reviewed access for ${report.from} to ${report.to}?\n\n` +
      'This is saved in the audit log with your name and the time.');
    if (!ok) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await axios.post(`${API_URL}/admin/compliance/reviewed`, dates(), auth);
      setNotice('Recorded. This review is now in the audit log.');
      await load(dates());
    } catch (e) {
      setError('Could not record the review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">Access review</h2>
        <button className="primary-btn" onClick={markReviewed} disabled={busy || !report}>
          {busy ? 'Saving...' : 'Mark as reviewed'}
        </button>
      </div>

      <section className="aside-card">
        <div className="people-toolbar">
          <label className="muted">From</label>
          <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label className="muted">To</label>
          <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="primary-btn" onClick={apply}>Show</button>
        </div>
        {report && (
          <p className="aside-note">
            Showing {report.from} to {report.to} (UTC).{' '}
            {report.lastReview
              ? `Last reviewed by ${report.lastReview.by} on ${localTime(report.lastReview.at)}.`
              : 'This access has not been reviewed yet.'}
          </p>
        )}
        <p className="aside-note">
          Read straight from your own data: people, documents and the audit log. It never includes message text
          or what people typed into forms. Each download is recorded in the audit log.
        </p>
      </section>

      {error && <p className="error-message">{error}</p>}
      {notice && <p className="aside-note">{notice}</p>}
      {!report && !error && <p className="aside-note">Loading...</p>}

      {report && report.sections.map(s => (
        <section key={s.key} className="aside-card">
          <div className="forms-head">
            <h3>{s.title} {'\u00B7'} {s.rows.length}</h3>
            <button className="secondary-btn" onClick={() => download(s)}>Download CSV</button>
          </div>
          <p className="aside-note">{s.note}</p>
          {s.rows.length === 0 && <p className="aside-note">Nothing in this period.</p>}
          {s.rows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="people-table">
                <thead>
                  <tr>{s.columns.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {s.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ textTransform: 'none' }}>
                          {s.columns[j].startsWith('Details')
                            ? <small className="muted">{detailText(cell)}</small>
                            : (cell || '\u2014')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}