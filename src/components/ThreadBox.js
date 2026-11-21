import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';
import './thread.css';
import { useLive } from '../live';

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const asUtc = (ts) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
const when = (ts) => asUtc(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// "hr" -> "HR", "finance" -> "Finance"
const pretty = (name) => (!name ? 'no department'
  : name.length <= 3 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1));

const QUICK_REPLIES = [
  'We are still working on this and will update you within 24 hours.',
  'We need one more detail from you. Could you please reply here?',
  'This has been fixed. Please check it and tell us if you still have the problem.'
];

// Which of my own tickets / requests have an unread reply.
export function useUnread(token) {
  const [map, setMap] = useState({ ticket: {}, submission: {} });

  useEffect(() => {
    axios.get(`${API_URL}/threads/unread`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const next = { ticket: {}, submission: {} };
        (r.data.tickets || []).forEach(x => { next.ticket[x.refId] = x.count; });
        (r.data.submissions || []).forEach(x => { next.submission[x.refId] = x.count; });
        setMap(next);
      })
      .catch(() => {});
  }, [token]);

  const clear = (kind, id) => setMap(prev => ({ ...prev, [kind]: { ...prev[kind], [id]: 0 } }));
  return [map, clear];
}

export function ThreadBox({ token, kind, id, onChanged }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // hand-over
  const [history, setHistory] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [handing, setHanding] = useState(false);
  const [handError, setHandError] = useState('');
  const [handedTo, setHandedTo] = useState('');

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const loadHistory = () =>
    axios.get(`${API_URL}/handover/${kind}/${id}`, auth)
      .then(r => setHistory(r.data))
      .catch(() => {});

  const load = () =>
    axios.get(`${API_URL}/threads/${kind}/${id}`, auth)
      .then(r => {
        setError('');
        setData(r.data);
        if (r.data.isStaff) loadHistory();
      })
      .catch((err) => {
        // After a hand-over the old department can no longer open the item.
        if (err.response?.status === 404 && !handedTo) setError('This conversation is no longer with your department.');
        else if (!handedTo) setError('Could not load the conversation.');
      });

  useEffect(() => {
    setHandedTo(''); setPanelOpen(false); setHistory([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  useLive(token, (event) => {
    if (event.area === 'thread' && event.kind === kind && event.id === id) load();
  });

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await axios.post(`${API_URL}/threads/${kind}/${id}`, { body: text }, auth);
      setText('');
      await load();
    } catch (err) {
      if (err.response?.status === 429) setError('You are sending too quickly. Please wait a moment.');
      else setError(err.response?.data?.error || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  const openPanel = async () => {
    setPanelOpen(true);
    setHandError('');
    if (departments.length === 0) {
      try {
        const r = await axios.get(`${API_URL}/staff/departments`, auth);
        setDepartments(r.data);
      } catch (e) {
        setHandError('Could not load the departments.');
      }
    }
  };

  const handOver = async () => {
    setHanding(true);
    setHandError('');
    try {
      const r = await axios.post(`${API_URL}/handover/${kind}/${id}`, { toDepartment: target, reason }, auth);
      setHandedTo(r.data.department);
      setPanelOpen(false);
      setReason('');
      setTarget('');
      if (onChanged) onChanged();
    } catch (err) {
      if (err.response?.status === 429) setHandError('Too many requests. Please wait a moment.');
      else setHandError(err.response?.data?.error || 'Could not hand this over.');
    } finally {
      setHanding(false);
    }
  };

  if (handedTo) {
    return (
      <div className="thread">
        <p className="thread-note">
          Handed over to the {pretty(handedTo)} department. They have been notified and it is now in their list.
          The customer's conversation continues as normal.
        </p>
      </div>
    );
  }

  const panel = {
    border: '1px solid #d6e3df', background: '#f4faf8', color: '#16202a',
    borderRadius: 10, padding: 12, margin: '8px 0'
  };
  const field = {
    width: '100%', padding: '8px 10px', margin: '4px 0 8px', border: '1px solid #cbd5d1',
    borderRadius: 8, fontSize: 14, background: '#ffffff', color: '#16202a', boxSizing: 'border-box'
  };

  return (
    <div className="thread">
      {error && <p className="error-message">{error}</p>}
      {!data && !error && <p className="thread-note">Loading...</p>}

      {data && (
        <>
          <div className="thread-list">
            {data.messages.length === 0 && <p className="thread-note">No messages yet.</p>}
            {data.messages.map(m => (
              <div key={m.id} className={m.fromYou ? 'thread-msg mine' : 'thread-msg'}>
                <small className="thread-meta">
                  {m.fromYou ? 'You' : m.author} {'\u00B7'} {when(m.createdAt)}
                </small>
                <p>{m.body}</p>
              </div>
            ))}
          </div>

          {data.isStaff && history.length > 0 && (
            <div style={{ ...panel, background: '#fafafa' }}>
              <strong style={{ fontSize: 13 }}>Hand-over history</strong>
              <small className="thread-note"> (staff only, the customer cannot see this)</small>
              {history.map(h => (
                <p key={h.id} style={{ margin: '6px 0 0', fontSize: 13, textTransform: 'none' }}>
                  {pretty(h.from)} {'\u2192'} {pretty(h.to)} {'\u00B7'} {h.by} {'\u00B7'} {when(h.at)}
                  <br /><span style={{ color: '#5b6773' }}>{h.reason}</span>
                </p>
              ))}
            </div>
          )}

          {data.canReply ? (
            <div className="thread-reply">
              {data.isStaff && (
                <div className="thread-quick">
                  {QUICK_REPLIES.map(q => (
                    <button key={q} type="button" onClick={() => setText(q)}>{q.split('.')[0]}...</button>
                  ))}
                </div>
              )}
              <textarea
                rows={3}
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a message..."
              />
              <p className="thread-note">Never share or ask for passwords, PINs or full card numbers.</p>
              <button className="primary-btn" onClick={send} disabled={sending || !text.trim()}>
                {sending ? 'Sending...' : 'Send'}
              </button>
              {data.isStaff && !data.closed && !panelOpen && (
                <button className="secondary-btn" style={{ marginLeft: 8 }} onClick={openPanel}>
                  Hand over to another department
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="thread-note">{data.closed ? 'This conversation is closed.' : 'You cannot write here.'}</p>
            </>
          )}

          {data.isStaff && !data.closed && panelOpen && (
            <div style={panel}>
              <strong>Hand over to another department</strong>
              <p className="thread-note">
                It moves to their list and leaves yours. The customer keeps the same conversation and does not see this.
              </p>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Department</label>
              <select style={field} value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose a department</option>
                {departments.map(d => <option key={d} value={d}>{pretty(d)}</option>)}
              </select>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Why? (required, only staff see it)</label>
              <textarea
                style={field}
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example: this needs the network team."
              />
              {handError && <p className="error-message">{handError}</p>}
              <button className="primary-btn" onClick={handOver}
                      disabled={handing || !target || reason.trim().length < 5}>
                {handing ? 'Handing over...' : 'Hand over'}
              </button>
              <button className="secondary-btn" style={{ marginLeft: 8 }}
                      onClick={() => { setPanelOpen(false); setHandError(''); }}>
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}