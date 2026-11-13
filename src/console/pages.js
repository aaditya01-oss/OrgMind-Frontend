import { useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
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

export function AssistantPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question) return;

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
        <button onClick={send} disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
      </div>
    </div>
  );
}