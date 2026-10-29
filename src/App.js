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


function FileUpload({token, onClose }) {
  const [file, setFile] = useState(null)
  const [uploadType, setUploadType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleUpload = async () => {
    if (!file || !uploadType) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const endpoint = uploadType === 'train' ? '/documents/train' : '/documents/ocr'
      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-modal">
      <div className="upload-box">
        <div className="upload-header">
          <h3>Attach Document</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {!uploadType && (
          <div className="upload-options">
            <p>What would you like to do?</p>
            <button 
              className="upload-option-btn"
              onClick={() => setUploadType('train')}
            >
              📚 Train DocMind
              <span>Feed document to knowledge base</span>
            </button>
            <button 
              className="upload-option-btn"
              onClick={() => setUploadType('ocr')}
            >
              🔍 Scan Document
              <span>Extract text via OCR</span>
            </button>
          </div>
        )}

        {uploadType && !result && (
          <div className="upload-form">
            <p className="upload-type-label">
              {uploadType === 'train' ? '📚 Training DocMind' : '🔍 Scanning Document'}
            </p>
            <input
              type="file"
              accept={uploadType === 'train' ? '.pdf,.docx,.txt' : '.pdf,.png,.jpg,.jpeg'}
              onChange={(e) => setFile(e.target.files[0])}
              className="file-input"
            />
            {file && <p className="file-name">Selected: {file.name}</p>}
            {error && <p className="error-message">{error}</p>}
            <div className="upload-actions">
              <button onClick={() => setUploadType(null)}>Back</button>
              <button 
                onClick={handleUpload} 
                disabled={!file || loading}
                className="primary-btn"
              >
                {loading ? 'Processing...' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="upload-result">
            <p className="success">✅ {result.message}</p>
            {result.extracted_text && (
              <div className="extracted-text">
                <p>Extracted Text:</p>
                <textarea 
                  readOnly 
                  value={result.extracted_text}
                  rows={8}
                />
              </div>
            )}
            <button onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [orgId, setOrgId] = useState('01');
  const [showUpload, setShowUpload] = useState(false);

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
        content: error.response?.status === 429
          ? 'You are sending messages too quickly. Please wait a moment.'
          : 'Error connecting to OrgMind API.'
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
        <button 
          className="attach-btn"
          onClick={() => setShowUpload(true)}
          title="Attach document"
        >
          📎
        </button>
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

      {showUpload && (
        <FileUpload 
          orgId={orgId} 
          token={token}
          onClose={() => setShowUpload(false)} 
        />
      )}
    </div>
  );
}

export default App;