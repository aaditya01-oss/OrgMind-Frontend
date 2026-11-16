import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import { ThreadBox } from '../components/ThreadBox';

const STATUSES = ['new', 'in_progress', 'approved', 'rejected', 'done'];
const words = (t) => String(t || '').replace(/_/g, ' ');
const isWaiting = (s) => s === 'new' || s === 'in_progress';

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const show = (field, value) => {
  if (field.type === 'daterange') return String(value).replace('/', ' to ');
  if (field.type === 'datetime') return String(value).replace('T', ' ');
  return value;
};

function Detail({ id, headers, token, email, onBack, onChanged }) {
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/submissions/${id}`, { headers })
      .then(r => setSub(r.data))
      .catch(() => setError('Could not open this submission.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

    const changeStatus = async (status, note = '') => {
    setError('');
    try {
      await axios.patch(`${API_URL}/submissions/${id}/status`, { status, note }, { headers });
      setSub(prev => ({ ...prev, status, handledBy: email, note: note || null }));
      onChanged();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change the status.');
      return false;
    }
  };

  const onStatusPick = (status) => {
    if (status === 'rejected') { setRejecting(true); setReason(''); }
    else { setRejecting(false); changeStatus(status); }
  };

  const confirmReject = async () => {
    if (await changeStatus('rejected', reason.trim())) setRejecting(false);
  };

  const reveal = async (key) => {
    setError('');
    try {
      const r = await axios.post(`${API_URL}/submissions/${id}/reveal`, { key }, { headers });
      setRevealed(prev => ({ ...prev, [key]: r.data.value }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not show this answer.');
    }
  };

  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">{sub ? `${sub.number} · ${sub.templateName}` : 'Submission'}</h2>
        <button className="secondary-btn" onClick={onBack}>Back to the list</button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {!sub && !error && <p className="aside-note">Loading…</p>}

      {sub && (
        <>
          <section className="aside-card">
            <h3>Details</h3>
            <div className="kv-row"><span>Sent by</span><strong>{sub.submittedBy}</strong></div>
            <div className="kv-row"><span>Handled by team</span><strong>{sub.department || 'No team (admins only)'}</strong></div>
            <div className="kv-row"><span>Sent</span><strong>{localTime(sub.createdAt)}</strong></div>
            {sub.handledBy && <div className="kv-row"><span>Last changed by</span><strong>{sub.handledBy}</strong></div>}
            <div className="kv-row">
              <span>Status</span>
              {sub.canManage ? (
                <select className="field-input" value={sub.status} onChange={(e) => onStatusPick(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{words(s)}</option>)}
                </select>
              ) : (
                <strong>{words(sub.status)}</strong>
              )}
            </div>
                        {!sub.canManage && sub.submittedBy === email && (
              <p className="aside-note">
                This is your own request. You cannot change its status; someone else must handle it.
              </p>
            )}
            {!sub.canManage && sub.submittedBy !== email && ['approved', 'rejected', 'done'].includes(sub.status) && (
              <p className="aside-note">This request is closed. Only an administrator can change it again.</p>
            )}
                        {rejecting && (
              <div className="reject-box">
                <label className="field-label">Reason for rejecting (the person will see this)</label>
                <textarea
                  className="field-input"
                  rows={3}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. The details do not match. Please send the form again."
                />
                <p className="aside-note">Do not write ID numbers or other private details here.</p>
                <button className="primary-btn" onClick={confirmReject} disabled={!reason.trim()}>Reject</button>{' '}
                <button className="secondary-btn" onClick={() => setRejecting(false)}>Cancel</button>
              </div>
            )}
            {sub.note && !rejecting && (
              <div className="kv-row"><span>Reason</span><strong>{sub.note}</strong></div>
            )}
          </section>

          <section className="aside-card">
            <h3>Answers</h3>
            {sub.fields.map(f => {
              const isMasked = (sub.maskedKeys || []).includes(f.key);
              const value = sub.data[f.key];
              let shown;
              if (isMasked) {
                shown = revealed[f.key] !== undefined
                  ? show(f, revealed[f.key])
                  : (
                    <span>
                      ••••••••{' '}
                      <button className="link-btn" onClick={() => reveal(f.key)}>Show</button>
                    </span>
                  );
              } else {
                shown = value ? show(f, value) : <span className="muted">Not answered</span>;
              }
              return (
                <div key={f.key} className="kv-row">
                  <span>{f.label}{f.sensitive ? ' 🔒' : ''}</span>
                  <strong>{shown}</strong>
                </div>
              );
            })}
            {(sub.maskedKeys || []).length > 0 && (
              <p className="aside-note">Protected answers are hidden. Showing one is recorded in the audit log.</p>
            )}
          </section>
                    <section className="aside-card">
            <h3>Conversation</h3>
            <ThreadBox token={token} kind="submission" id={id} />
          </section>
        </>
      )}
    </div>
  );
}

export default function SubmissionsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('waiting');
  const [openId, setOpenId] = useState(null);

  const headers = { Authorization: `Bearer ${session.token}` };

  const load = () => {
    axios.get(`${API_URL}/submissions`, { headers })
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setItems([]); setError('Could not load the submissions.'); });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (openId) {
    return (
      <Detail
        id={openId}
        headers={headers}
        email={session.email}
        onBack={() => setOpenId(null)}
        onChanged={load}
        token={session.token}
      />
    );
  }

  const sorted = [...(items || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const shown = filter === 'waiting' ? sorted.filter(s => isWaiting(s.status)) : sorted;

  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">Submissions</h2>
        <span>
          <button className={filter === 'waiting' ? 'primary-btn' : 'secondary-btn'} onClick={() => setFilter('waiting')}>
            Needs attention
          </button>{' '}
          <button className={filter === 'all' ? 'primary-btn' : 'secondary-btn'} onClick={() => setFilter('all')}>
            All
          </button>
        </span>
      </div>

      {error && <p className="error-message">{error}</p>}
      {items === null && <p className="aside-note">Loading…</p>}
      {items && shown.length === 0 && !error && (
        <section className="aside-card">
          <p className="aside-note">
            {filter === 'waiting' ? 'Nothing is waiting. Everything is handled.' : 'No submissions yet.'}
          </p>
        </section>
        
      )}

      {shown.map(s => (
        <button key={s.id} className="sub-row" onClick={() => setOpenId(s.id)}>
          <span>
            <strong>{s.number}</strong> {s.templateName}
            <small className="muted"> · {s.submittedBy}{session.role === 'admin' ? ` · ${s.department || 'no team'}` : ''}</small>
          </span>
          <span className="sub-meta">
            <span className="badge">{words(s.status)}</span>
            <small className="muted">{localTime(s.createdAt)}</small>
          </span>
        </button>
      ))}
    </div>
  );
}