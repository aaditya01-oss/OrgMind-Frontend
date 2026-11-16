import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';
import './thread.css';
import { useLive } from '../live';

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const asUtc = (ts) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);

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

export function ThreadBox({ token, kind, id }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = () =>
    axios.get(`${API_URL}/threads/${kind}/${id}`, auth)
      .then(r => setData(r.data))
      .catch(() => setError('Could not load the conversation.'));

  useEffect(() => {
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

  return (
    <div className="thread">
      {error && <p className="error-message">{error}</p>}
      {!data && !error && <p className="thread-note">Loading…</p>}

      {data && (
        <>
          <div className="thread-list">
            {data.messages.length === 0 && <p className="thread-note">No messages yet.</p>}
            {data.messages.map(m => (
              <div key={m.id} className={m.fromYou ? 'thread-msg mine' : 'thread-msg'}>
                <small className="thread-meta">
                  {m.fromYou ? 'You' : m.author} · {asUtc(m.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </small>
                <p>{m.body}</p>
              </div>
            ))}
          </div>

          {data.canReply ? (
            <div className="thread-reply">
              {data.isStaff && (
                <div className="thread-quick">
                  {QUICK_REPLIES.map(q => (
                    <button key={q} type="button" onClick={() => setText(q)}>{q.split('.')[0]}…</button>
                  ))}
                </div>
              )}
              <textarea
                rows={3}
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a message…"
              />
              <p className="thread-note">Never share or ask for passwords, PINs or full card numbers.</p>
              <button className="primary-btn" onClick={send} disabled={sending || !text.trim()}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          ) : (
            <p className="thread-note">{data.closed ? 'This conversation is closed.' : 'You cannot write here.'}</p>
          )}
        </>
      )}
    </div>
  );
}