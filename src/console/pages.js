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

// ---------------------------------------------------------------------------
// Home pages: what staff see first
// ---------------------------------------------------------------------------

// The server may return a plain list or an object holding the list; accept both.
const asList = (data) =>
  Array.isArray(data) ? data : (data?.tickets || data?.users || data?.documents || data?.items || []);

const isOpenStatus = (status) =>
  !['resolved', 'closed', 'done'].includes(String(status || '').toLowerCase().replace(' ', '_'));

const words = (text) => String(text || '').replace(/_/g, ' ');

const ROLE_LABELS = { admin: 'Administrators', member: 'Employees', customer: 'Customers' };

const VISIBILITY_LABELS = {
  public: 'Public',
  registered: 'Registered users',
  internal: 'Everyone in the organization',
  department: 'One department',
  admin_only: 'Admins only'
};

const EVENT_LABELS = {
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in',
  CONVERSATION: 'Question asked',
  TICKET_CREATED: 'Ticket created',
  TICKET_STATUS_CHANGED: 'Ticket status changed',
  INVITE_CREATED: 'Invite created'
};
const eventLabel = (type) => EVENT_LABELS[type] || words(String(type).toLowerCase());

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

function Rows({ items, empty }) {
  if (!items.length) return <p className="aside-note">{empty}</p>;
  return items.map(([label, value]) => (
    <div key={label} className="kv-row"><span>{label}</span><strong>{value}</strong></div>
  ));
}

function AdminHome({ session }) {
  const [overview, setOverview] = useState(null);
  const [docs, setDocs] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${session.token}` };
    axios.get(`${API_URL}/admin/overview`, { headers })
      .then(r => setOverview(r.data))
      .catch(() => setFailed(true));
    axios.get(`${API_URL}/admin/documents`, { headers })
      .then(r => setDocs(asList(r.data)))
      .catch(() => setDocs([]));
  }, [session.token]);

  if (failed) return <p className="error-message">Could not load the overview. Please try again in a moment.</p>;
  if (!overview) return <p className="aside-note">Loading…</p>;

  const totalPeople = overview.usersByRole.reduce((sum, r) => sum + r.count, 0);
  const openTickets = overview.ticketsByStatus
    .filter(s => isOpenStatus(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  const deptNames = [...new Set([
    ...overview.departments.map(d => d.department),
    ...overview.openByDepartment.map(d => d.department)
  ])];
  const deptRows = deptNames.map(name => {
    const people = overview.departments.find(d => d.department === name)?.people || 0;
    const open = overview.openByDepartment.find(d => d.department === name)?.count || 0;
    return [name, `${people} people · ${open} open`];
  });

  const visibilityCounts = {};
  (docs || []).forEach(d => { visibilityCounts[d.visibility] = (visibilityCounts[d.visibility] || 0) + 1; });

  return (
    <div className="home">
      <h2 className="home-title">Overview</h2>

      <div className="stat-grid">
        <Link to="/console/people" className="stat-card"><strong>{totalPeople}</strong><span>People</span></Link>
        <Link to="/console/tickets" className="stat-card"><strong>{openTickets}</strong><span>Open tickets</span></Link>
        <Link to="/console/knowledge" className="stat-card"><strong>{docs ? docs.length : '–'}</strong><span>Documents</span></Link>
        <Link to="/console/people" className="stat-card"><strong>{overview.newUsers}</strong><span>New this week</span></Link>
      </div>

      <div className="home-grid">
        <section className="aside-card">
          <h3>People by role</h3>
          <Rows
            items={overview.usersByRole.map(r => [ROLE_LABELS[r.role] || r.role, r.count])}
            empty="No people yet."
          />
        </section>

        <section className="aside-card">
          <h3>Departments</h3>
          <Rows items={deptRows} empty="No departments yet. Invite employees with a department." />
        </section>

        <section className="aside-card">
          <h3>Tickets by status</h3>
          <Rows
            items={overview.ticketsByStatus.map(s => [words(s.status), s.count])}
            empty="No tickets yet."
          />
        </section>

        <section className="aside-card">
          <h3>Knowledge base</h3>
          <Rows
            items={Object.entries(visibilityCounts).map(([v, n]) => [VISIBILITY_LABELS[v] || v, n])}
            empty="No documents yet."
          />
        </section>

        <section className="aside-card wide">
          <h3>Recent activity</h3>
          {overview.recent.length === 0 && <p className="aside-note">Nothing yet.</p>}
          {overview.recent.map((e, i) => (
            <div key={i} className="kv-row">
              <span>{eventLabel(e.eventType)} <small className="muted">· {e.userId || 'unknown'}</small></span>
              <small className="muted">{localTime(e.timestamp)}</small>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function EmployeeHome({ session }) {
  const [tickets, setTickets] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => setTickets(asList(r.data)))
      .catch(() => setTickets([]));
  }, [session.token]);

  const open = tickets ? tickets.filter(t => isOpenStatus(t.status)) : null;

  return (
    <div className="home">
      <h2 className="home-title">My work</h2>

      <div className="stat-grid two">
        <Link to="/console/tickets" className="stat-card">
          <strong>{open ? open.length : '–'}</strong><span>Open tickets</span>
        </Link>
        <Link to="/console/assistant" className="stat-card">
          <strong>?</strong><span>Ask OrgMind a question</span>
        </Link>
      </div>

      <section className="aside-card">
        <h3>Tickets that need you</h3>
        {open === null && <p className="aside-note">Loading…</p>}
        {open && open.length === 0 && <p className="aside-note">No open tickets. Everything is handled.</p>}
        {open && open.slice(0, 6).map((t, i) => (
          <Link key={t.id || i} to="/console/tickets" className="aside-ticket">
            <span>{String(t.issue || 'Ticket').slice(0, 90)}</span>
            <small>{t.priority} · {words(t.status)}</small>
          </Link>
        ))}
      </section>
    </div>
  );
}

export function HomePage() {
  const { session } = useAuth();
  return session.role === 'admin' ? <AdminHome session={session} /> : <EmployeeHome session={session} />;
}

// ---------------------------------------------------------------------------
// Assistant page: now one item in the sidebar, no longer the landing page
// ---------------------------------------------------------------------------

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

export function AssistantPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = session.role === 'admin';

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

  return (
    <div className={isAdmin ? 'assistant-layout single' : 'assistant-layout'}>
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

      {!isAdmin && (
        <aside className="assistant-aside">
          <section className="aside-card">
            <h3>Your access</h3>
            <p className="aside-role">Employee</p>
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
        </aside>
      )}
    </div>
  );
}