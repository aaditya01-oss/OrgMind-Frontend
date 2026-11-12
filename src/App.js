import { useState } from 'react';
import axios from 'axios';
import Login from './Login';
import './App.css';
import { API_URL, roleFromToken } from './shared';
import { ChatMessage } from './components/ChatMessage';
import { FileUpload } from './components/FileUpload';
import { ApplicationForm } from './components/FormScan';
import { TicketsPanel } from './components/TicketsPanel';
import { UsersPanel } from './components/UsersPanel';
import { DocumentsPanel } from './components/DocumentsPanel';













// The organization whose public documents the website chat answers from.
// Each company that buys OrgMind sets its own id here (REACT_APP_PUBLIC_ORG_ID).
const PUBLIC_ORG_ID = process.env.REACT_APP_PUBLIC_ORG_ID || '01';

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
  const [showUsers, setShowUsers] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const isVisitor = !token;

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
    setShowUsers(false);
    setShowDocs(false);
    setShowAuth(false);
    setLoading(false);
  };

  if (!token && showAuth) {
      return <Login onLogin={handleLogin} startMode={authMode} orgId={PUBLIC_ORG_ID} onBack={() => setShowAuth(false)} />;
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

  return (
    <div className="app">
      <header className="header">
        <h1>OrgMind AI</h1>
        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
          {isVisitor ? (
            <>
              <button onClick={() => { setAuthMode('login'); setShowAuth(true); }} style={{padding: '4px 12px', fontSize: '12px'}}>
                Sign in
              </button>
              <button onClick={() => { setAuthMode('customer'); setShowAuth(true); }} style={{padding: '4px 12px', fontSize: '12px'}}>
                Register
              </button>
            </>
          ) : (
            <>
              <span className="org-badge">{userEmail}</span>
              <span className="org-badge">Org: {orgId}</span>
              <button onClick={() => setShowTickets(true)} style={{padding: '4px 12px', fontSize: '12px'}}>
                Tickets
              </button>
              {roleFromToken(token) === 'admin' && (
              <button onClick={() => setShowUsers(true)} style={{padding: '4px 12px', fontSize: '12px'}}>
                  Users
              </button>
              )}
              {roleFromToken(token) === 'admin' && (
              <button onClick={() => setShowDocs(true)} style={{padding: '4px 12px', fontSize: '12px'}}>
                  Documents
                </button>
              )}
              <button onClick={() => setShowForm(true)} style={{padding: '4px 12px', fontSize: '12px'}}>
                Demo form
              </button>
              <button onClick={handleLogout} style={{padding: '4px 12px', fontSize: '12px'}}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <div className="chat-window">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>Welcome to OrgMind</h2>
            <p>{isVisitor ? 'Ask a question, or pick one below' : 'Your secure organizational AI assistant'}</p>
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
            <div className="message-bubble loading">
              OrgBot is thinking...
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
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {!isVisitor && showUpload && (
        <FileUpload
          orgId={orgId}
          token={token}
          isAdmin={roleFromToken(token) === 'admin'}
          onClose={() => setShowUpload(false)}
        />
      )}

      {!isVisitor && showForm && (
        <ApplicationForm token={token} onClose={() => setShowForm(false)} />
      )}

      {!isVisitor && showTickets && (
        <TicketsPanel
          token={token}
          isStaff={roleFromToken(token) === 'admin'}
          onClose={() => setShowTickets(false)}
        />
      )}
      {!isVisitor && showUsers && roleFromToken(token) === 'admin' && (
        <UsersPanel token={token} onClose={() => setShowUsers(false)} />
      )}
      {!isVisitor && showDocs && roleFromToken(token) === 'admin' && (
      <DocumentsPanel token={token} onClose={() => setShowDocs(false)} />
      )}
    </div>
  );
}
export default App;