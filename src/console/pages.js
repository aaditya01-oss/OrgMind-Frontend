import { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import { ChatMessage } from '../components/ChatMessage';
import { FileUpload } from '../components/FileUpload';
import { TicketsPanel } from '../components/TicketsPanel';
import { UsersPanel } from '../components/UsersPanel';
import { DocumentsPanel } from '../components/DocumentsPanel';

const noop = () => {};

// Admin pages send everyone else back to the console home. The server checks the role again anyway.
export function AdminOnly({ children }) {
  const { session } = useAuth();
  return session?.role === 'admin' ? children : <Navigate to="/console" replace />;
}

export function TicketsPage() {
  const { session } = useAuth();
  return (
    <div className="console-page">
      <TicketsPanel token={session.token} isStaff={session.role === 'admin'} onClose={noop} />
    </div>
  );
}

export function PeoplePage() {
  const { session } = useAuth();
  return (
    <div className="console-page">
      <UsersPanel token={session.token} onClose={noop} />
    </div>
  );
}

export function KnowledgePage() {
  const { session } = useAuth();
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);

  return (
    <div className="console-page">
      <button className="primary-btn" onClick={() => setAdding(true)}>Add document</button>
      <DocumentsPanel key={version} token={session.token} onClose={noop} />
      {adding && (
        <FileUpload
          token={session.token}
          isAdmin
          onClose={() => { setAdding(false); setVersion(v => v + 1); }}
        />
      )}
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  'What is the leave policy?',
  'How many days of sick leave do we get?',
  'Who do I contact for HR?',
  'What are the IT help desk hours?'
];

function accessLines(role) {
  if (role === 'admin') {
    return ['All documents in your organization', 'Admin-only documents', 'Every department'];
  }
  return ['Public documents', 'Registered-customer documents', 'Internal documents', 'Your own department’s documents'];
}

// The server may return a plain list or an object holding the list; accept both.
const asList = (data) =>
  Array.isArray(data) ? data : (data?.tickets || data?.users || data?.documents || data?.items || []);

const isOpenTicket = (t) =>
  !['resolved', 'closed', 'done'].includes(String(t.status || '').toLowerCase().replace(' ', '_'));

function AdminOverview({ session }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${session.token}` };
      const get = (path) => axios.get(`${API_URL}${path}`, { headers })
      .then(r => asList(r.data))
      .catch((e) => { console.log('overview failed:', path, e.response?.status, e.message); return null; });
    Promise.all([get('/tickets'), get('/admin/users'), get('/admin/documents')])
      .then(([tickets, users, documents]) => setData({ tickets, users, documents }));
  }, [session.token]);

  const open = data?.tickets ? data.tickets.filter(isOpenTicket) : null;
  const show = (list) => (list ? list.length : '–');

  return (
    <>
      <section className="aside-card">
        <h3>Overview</h3>
        <div className="stat-row">
          <Link to="/console/tickets" className="stat"><strong>{show(open)}</strong><span>Open tickets</span></Link>
          <Link to="/console/knowledge" className="stat"><strong>{show(data?.documents)}</strong><span>Documents</span></Link>
          <Link to="/console/people" className="stat"><strong>{show(data?.users)}</strong><span>People</span></Link>
        </div>
      </section>

      <section className="aside-card">
        <h3>Needs attention</h3>
                {open === null && <p className="aside-note">{data ? 'Could not load tickets.' : 'Loading…'}</p>}
        {open && open.length === 0 && <p className="aside-note">No open tickets. Everything is handled.</p>}
        {open && open.slice(0, 3).map((t, i) => (
          <Link key={t.id || i} to="/console/tickets" className="aside-ticket">
            <span>{String(t.issue || 'Ticket').slice(0, 70)}</span>
            <small>{t.priority} · {t.status}</small>
          </Link>
        ))}
      </section>
    </>
  );
}

export function AssistantPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        userMessage: question,
        userId: session.email,
        orgId: session.orgId,
        orgName: 'OrgMind'
      }, { headers: { Authorization: `Bearer ${session.token}` } });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        sources: response.data.sources || []
      }]);
    } catch (error) {
      const content = error.response?.status === 429
        ? 'You are sending messages too quickly. Please wait a moment.'
        : 'Error connecting to OrgMind API.';
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const roleLabel = session.role === 'member' ? 'Employee' : 'Administrator';

  return (
    <div className="assistant-layout">
      <div className="console-chat">
        <div className="chat-window">
          {messages.length === 0 && (
            <div className="welcome">
              <h2>Ask about your organization</h2>
              <p>Answers come from the documents you are allowed to see.</p>
            </div>
          )}
          {messages.map((m, i) => <ChatMessage key={i} message={m} />)}
          {loading && (
            <div className="message assistant">
              <div className="message-bubble loading">OrgBot is thinking...</div>
            </div>
          )}
        </div>
        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Ask OrgMind anything..."
            rows={2}
            maxLength={500}
          />
          <button onClick={() => send()} disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
        </div>
      </div>

            <aside className="assistant-aside">
        {session.role === 'admin' ? (
          <AdminOverview session={session} />
        ) : (
          <>
            <section className="aside-card">
              <h3>Your access</h3>
              <p className="aside-role">{roleLabel}</p>
              <ul>
                {accessLines(session.role).map(line => <li key={line}>{line}</li>)}
              </ul>
              <p className="aside-note">The assistant can only use what is listed here.</p>
            </section>

            <section className="aside-card">
              <h3>Try asking</h3>
              {EXAMPLE_QUESTIONS.map(q => (
                <button key={q} className="aside-example" onClick={() => send(q)} disabled={loading}>
                  {q}
                </button>
              ))}
            </section>
          </>
        )}
      </aside>
    </div>
  );
}