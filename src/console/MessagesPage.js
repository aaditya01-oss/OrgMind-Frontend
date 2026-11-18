import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import '../components/thread.css';
import { useLive } from '../live';
import { PersonAvatar } from '../components/PersonAvatar';
import { PersonCard } from '../components/PersonCard';

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const asUtc = (ts) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);

export default function MessagesPage() {
  const { session } = useAuth();
  const token = session.token;

  const [channels, setChannels] = useState({ departments: [], direct: [], total: 0 });
  const [directory, setDirectory] = useState([]);
  const [active, setActive] = useState(null);       // { type: 'direct' | 'department', key, title }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [card, setCard] = useState(null);           // email of the person whose profile card is open
  const [copiedId, setCopiedId] = useState(null);
  const listRef = useRef(null);

  const auth = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const personOf = (email) => directory.find(p => p.email === email);
  const nameOf = (email) => personOf(email)?.displayName || email;
  const subtitleOf = (email) => personOf(email)?.jobTitle || email;

  const loadChannels = useCallback(() => {
    axios.get(`${API_URL}/chat/channels`, auth())
      .then(r => setChannels(r.data))
      .catch(() => setError('Could not load your conversations.'));
  }, [auth]);

  const loadMessages = useCallback((conv) => {
    const request = conv.type === 'direct'
      ? axios.get(`${API_URL}/chat/direct`, { ...auth(), params: { person: conv.key } })
      : axios.get(`${API_URL}/chat/department`, { ...auth(), params: { name: conv.key } });
    request
      .then(r => { setMessages(r.data.messages); loadChannels(); })
      .catch(() => setError('Could not open this conversation.'));
  }, [auth, loadChannels]);

  useEffect(() => {
    loadChannels();
    axios.get(`${API_URL}/chat/directory`, auth()).then(r => setDirectory(r.data)).catch(() => {});
  }, [loadChannels, auth]);

  // Refresh by itself every 15 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      if (active) loadMessages(active); else loadChannels();
    }, 15000);
    return () => clearInterval(timer);
  }, [active, loadMessages, loadChannels]);

  useLive(token, (event) => {
    if (event.area !== 'chat') return;
    if (active) loadMessages(active); else loadChannels();
  });

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const open = (conv) => {
    setActive(conv);
    setMessages([]);
    setError('');
    loadMessages(conv);
  };

  const send = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    setError('');
    try {
      const url = active.type === 'direct' ? `${API_URL}/chat/direct` : `${API_URL}/chat/department`;
      await axios.post(url, { to: active.key, body: text }, auth());
      setText('');
      loadMessages(active);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  // ---- message actions ----
  const copyText = async (m) => {
    try {
      await navigator.clipboard.writeText(m.body);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(id => (id === m.id ? null : id)), 1500);
    } catch (e) {
      setError('Could not copy. Select the text and copy it by hand.');
    }
  };

  const removeForEveryone = async (m) => {
    const question = m.fromYou
      ? 'Unsend this message? It will be removed for everyone.'
      : 'Remove this message for everyone in the group? This is recorded in the audit log.';
    if (!window.confirm(question)) return;
    setError('');
    try {
      await axios.delete(`${API_URL}/chat/message/${m.id}`, auth());
      loadMessages(active);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove the message.');
    }
  };

  const hideForMe = async (m) => {
    if (!window.confirm('Delete this message for you only? Other people will still see it.')) return;
    setError('');
    try {
      await axios.post(`${API_URL}/chat/message/${m.id}/hide`, {}, auth());
      setMessages(prev => prev.filter(x => x.id !== m.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the message.');
    }
  };

  const isActive = (type, key) => active && active.type === type && active.key === key;

  const optionLabel = (p) => {
    const who = p.displayName ? `${p.displayName} (${p.email})` : p.email;
    const detail = p.jobTitle || (p.role === 'admin' ? 'admin' : (p.department || 'no department'));
    return `${who} \u00B7 ${detail}`;
  };

  return (
    <div className="home">
      <h2 className="home-title">Messages</h2>
      {error && <p className="error-message">{error}</p>}

      <div className="msg-layout">
        <aside className="aside-card msg-side">
          <h3>Departments</h3>
          {channels.departments.length === 0 && <p className="aside-note">You are not in a department yet.</p>}
          {channels.departments.map(d => (
            <button key={d.name}
                    className={isActive('department', d.name) ? 'msg-item active' : 'msg-item'}
                    onClick={() => open({ type: 'department', key: d.name, title: `${d.name} department` })}>
              <span>{d.name}</span>
              {d.unread > 0 && <span className="msg-dot">{d.unread}</span>}
            </button>
          ))}

          <h3>Direct</h3>
          <select className="field-input" value=""
                  onChange={(e) => e.target.value && open({ type: 'direct', key: e.target.value })}>
            <option value="">New message to...</option>
            {directory.map(p => (
              <option key={p.email} value={p.email}>{optionLabel(p)}</option>
            ))}
          </select>
          {channels.direct.map(c => (
            <button key={c.person}
                    className={isActive('direct', c.person) ? 'msg-item active' : 'msg-item'}
                    onClick={() => open({ type: 'direct', key: c.person })}>
              <span className="msg-person">
                <PersonAvatar email={c.person} name={nameOf(c.person)} token={token} size={30} />
                <span className="msg-person-text">
                  <span>{nameOf(c.person)}</span>
                  <small className="muted">{subtitleOf(c.person)}</small>
                </span>
              </span>
              {c.unread > 0 && <span className="msg-dot">{c.unread}</span>}
            </button>
          ))}
        </aside>

        <section className="aside-card msg-main">
          {!active && <p className="aside-note">Choose a department or a person to start.</p>}
          {active && (
            <div className="msg-thread">
              <h3>
                {active.type === 'direct'
                  ? (
                    <button className="pf-link msg-title-link thread-who" onClick={() => setCard(active.key)}>
                      <PersonAvatar email={active.key} name={nameOf(active.key)} token={token} size={28} />
                      {nameOf(active.key)}
                    </button>
                  )
                  : active.title}
              </h3>
              {active.type === 'direct'
                ? <p className="thread-note">Private: only you and this person can read it.</p>
                : <p className="thread-note">Everyone in this department and all admins can read it.</p>}

              <div className="thread-list" ref={listRef}>
                {messages.length === 0 && <p className="thread-note">No messages yet. Say hello.</p>}
                {messages.map(m => (
                  <div key={m.id} className={m.fromYou ? 'thread-msg mine' : 'thread-msg'}>
                    <small className="thread-meta">
                      {m.fromYou
                        ? 'You'
                        : (
                          <button className="pf-link thread-who" onClick={() => setCard(m.author)}>
                            <PersonAvatar email={m.author} name={nameOf(m.author)} token={token} size={22} />
                            {nameOf(m.author)}
                          </button>
                        )}
                      {' \u00B7 '}
                      {asUtc(m.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </small>

                    {m.removed
                      ? <p className="thread-removed">{m.removedByAdmin ? 'Removed by an admin' : 'This message was removed'}</p>
                      : <p>{m.body}</p>}

                    <div className="thread-actions">
                      {!m.removed && (
                        <button onClick={() => copyText(m)}>{copiedId === m.id ? 'Copied' : 'Copy'}</button>
                      )}
                      {!m.removed && m.canRemove && (
                        <button className="danger" onClick={() => removeForEveryone(m)}>
                          {m.fromYou ? 'Unsend' : 'Remove'}
                        </button>
                      )}
                      <button onClick={() => hideForMe(m)}>Delete for me</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="thread-reply">
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                />
                <p className="thread-note">Never share passwords, PINs or customers' private details here.</p>
                <button className="primary-btn" onClick={send} disabled={sending || !text.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {card && <PersonCard email={card} token={token} onClose={() => setCard(null)} />}
    </div>
  );
}