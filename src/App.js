import { useState } from 'react';
import axios from 'axios';
import Login from './Login';
import './App.css';

const API_URL = 'http://localhost:5147';

function ChatMessage({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        {message.content}
      </div>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [orgId, setOrgId] = useState('01');

  const handleLogin = (authToken, email, org) => {
    setToken(authToken);
    setUserEmail(email);
    if (org) setOrgId(org);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        userMessage: input,
        userId: userEmail,
        orgId: orgId,
        orgName: 'OrgMind'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const botMessage = {
        role: 'assistant',
        content: response.data.response
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Error connecting to OrgMind API.'
      };
      setMessages(prev => [...prev, errorMessage]);
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
          <span className="org-badge">{userEmail}</span>
          <span className="org-badge">Org: {orgId}</span>
          <button 
            onClick={() => setToken(null)}
            style={{padding: '4px 12px', fontSize: '12px'}}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="chat-window">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>Welcome to OrgMind</h2>
            <p>Your secure organizational AI assistant</p>
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
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask OrgMind anything..."
          rows={2}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default App;