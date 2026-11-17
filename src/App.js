import { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import './App.css';
import './widget.css';
import { API_URL, roleFromToken } from './shared';
import { ChatMessage } from './components/ChatMessage';
import { FileUpload } from './components/FileUpload';
import { FormsPanel } from './components/FormsPanel';
import { TicketsPanel } from './components/TicketsPanel';

// The organization whose public documents the website chat answers from.
// Each company gets its own chat address: /widget?org=COMPANY_ID
// Add &signup=1 to open the "Create your account" screen first.
// With no org in the address, the old setting (or '01') is used, as before.
const urlParams = new URLSearchParams(window.location.search);
const orgFromUrl = (urlParams.get('org') || '').trim();
const PUBLIC_ORG_ID = /^[A-Za-z0-9_-]{1,64}$/.test(orgFromUrl)
  ? orgFromUrl
  : (process.env.REACT_APP_PUBLIC_ORG_ID || '01');
const OPEN_SIGNUP = urlParams.get('signup') === '1';

// Sample questions shown to visitors. Later the admin will choose these.
const FAQ_QUESTIONS = [
  'What do I need to open a savings account?',
  'What are the branch opening hours?',
  'How can I download the mobile banking app?',
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [orgId, setOrgId] = useState(PUBLIC_ORG_ID);
  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [showAuth, setShowAuth] = useState(OPEN_SIGNUP);
  const [authMode, setAuthMode] = useState(OPEN_SIGNUP ? 'customer' : 'login');
  const [menuOpen, setMenuOpen] = useState(false);

  const isVisitor = !token;
  const role = token ? roleFromToken(token) : null;
  const canOpenConsole = role === 'admin' || role === 'member';

  // Full screen only exists when the chat sits inside a website's frame.
  const embedded = window.parent !== window;
  const [expanded, setExpanded] = useState(false);

  let onPhone = false;
  try { onPhone = embedded && window.parent.innerWidth <= 480; } catch (e) { onPhone = false; }

  const setFullScreen = (value) => {
    setExpanded(value);
    if (embedded) window.parent.postMessage({ type: 'orgmind:expand', value }, window.location.origin);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        if (expanded) setFullScreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const handleLogin = (authToken, email, org) => {
    setToken(authToken);
    setUserEmail(email);
    if (org) setOrgId(org);
    setMessages([]);        // the visitor's chat does not carry over into the account
    setShowAuth(false);
  };

  const handleLogout = () => {
    setToken(null);
    setMessages([]);
    setInput('');
    setUserEmail('');
    setOrgId(PUBLIC_ORG_ID);
    setShowUpload(false);
    setShowForm(false);
    setShowTickets(false);
    setShowAuth(false);
    setMenuOpen(false);
    setLoading(false);
  };

  if (!token && showAuth) {
    return <Login onLogin={handleLogin} startMode={authMode} orgId={PUBLIC_ORG_ID} onBack={() => setShowAuth(false)} />;
  }
    // Staff work in the staff console, not on the public website chat.
  if (canOpenConsole) {
    return (
      <div className="app">
        <header className="w-header">
          <div className="w-brand">
            <span className="w-logo">O</span>
            <div>
              <strong>OrgMind</strong>
              <span className="w-tag">Staff account</span>
            </div>
          </div>
        </header>
        <div className="chat-window">
          <div className="welcome">
            <span className="w-logo big">O</span>
            <h2>You are signed in as staff</h2>
            <p>Staff work happens in the staff console, not in the public website chat.</p>
            <div className="w-staff-actions">
              <button className="primary-btn" onClick={() => window.open('/console', '_blank', 'noopener')}>
                Open staff console
              </button>
              <button onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const sendMessage = async (text) => {
    const question = (typeof text === 'string' ? text : input).trim();
    if (!question) return;

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      let response;
      if (isVisitor) {
        response = await axios.post(`${API_URL}/public/chat`, { message: question, orgId });
      } else {
        response = await axios.post(`${API_URL}/chat`, {
          userMessage: question,
          userId: userEmail,
          orgId: orgId,
          orgName: 'OrgMind'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        sources: response.data.sources || []
      }]);
    } catch (error) {
      let content = 'Error connecting to OrgMind API.';
      if (error.response?.status === 429) content = 'You are sending messages too quickly. Please wait a moment.';
      else if (error.response?.status === 400 && error.response?.data?.error) content = error.response.data.error;
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openFromMenu = (setter) => {
    setMenuOpen(false);
    setter(true);
  };

  return (
    <div className="app">
      <header className="w-header">
        <div className="w-brand">
          <span className="w-logo">O</span>
          <div>
            <strong>OrgMind</strong>
            <span className="w-tag">{isVisitor ? 'Ask us anything' : 'Your secure assistant'}</span>
          </div>
        </div>

        <div className="w-actions">
          {embedded && !onPhone && (
            <button
              className="w-icon"
              onClick={() => setFullScreen(!expanded)}
              title={expanded ? 'Exit full screen (Esc)' : 'Full screen'}
              aria-label={expanded ? 'Exit full screen' : 'Full screen'}
            >
              {expanded ? '⤡' : '⤢'}
            </button>
          )}

          {isVisitor ? (
            <>
              <button className="w-link" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>
                Sign in
              </button>
              <button className="w-pill" onClick={() => { setAuthMode('customer'); setShowAuth(true); }}>
                Register
              </button>
            </>
          ) : (
            <div className="w-menu-wrap">
              <button
                className="w-avatar"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {(userEmail || '?').charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <>
                  <div className="w-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="w-menu" role="menu">
                    <div className="w-menu-who">{userEmail}</div>
                    <button onClick={() => openFromMenu(setShowTickets)}>My tickets</button>
                    <button onClick={() => openFromMenu(setShowForm)}>Forms</button>
                    <button className="w-menu-out" onClick={handleLogout}>Sign out</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="chat-window">
        {messages.length === 0 && (
          <div className="welcome">
            <span className="w-logo big">O</span>
            <h2>How can we help?</h2>
            <p>
              {isVisitor
                ? 'Ask a question, or pick one below'
                : 'Ask a question, report a problem or request a service'}
            </p>
            {isVisitor && (
              <div className="faq-list">
                {FAQ_QUESTIONS.map(q => (
                  <button key={q} className="faq-chip" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-bubble" aria-label="OrgMind is typing">
              <span className="typing"><i /><i /><i /></span>
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        {!isVisitor && (
          <button
            className="attach-btn"
            onClick={() => setShowUpload(true)}
            title="Attach document"
            aria-label="Attach document"
          >
            📎
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isVisitor ? 'Ask a question...' : 'Ask OrgMind anything...'}
          rows={2}
          maxLength={500}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading} aria-label="Send">
          ↑
        </button>
      </div>

      {!isVisitor && showUpload && (
        <FileUpload
          orgId={orgId}
          token={token}
          isAdmin={role === 'admin'}
          onClose={() => setShowUpload(false)}
        />
      )}

      {!isVisitor && showForm && (
      <FormsPanel token={token} onClose={() => setShowForm(false)} />
      )}

      {!isVisitor && showTickets && (
        <TicketsPanel
          token={token}
          isStaff={role === 'admin'}
          onClose={() => setShowTickets(false)}
        />
      )}
    </div>
  );
}
export default App;