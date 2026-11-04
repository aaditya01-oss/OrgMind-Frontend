import { useState } from 'react';
import axios from 'axios';
import Login from './Login';
import './App.css';

const API_URL = 'http://localhost:5147';

// Only for showing or hiding buttons. The server checks the role again on every request.
function roleFromToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).role || 'member'
  } catch (e) {
    return 'member'
  }
}

function ChatMessage({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        {message.content}
        {message.sources && message.sources.length > 0 && (
          <div className="sources">
            <span className="sources-label">Sources:</span>
            {message.sources.map(name => (
              <span key={name} className="source-chip">{name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function FileUpload({ token, isAdmin, onClose }) {
  const [file, setFile] = useState(null)
  const [uploadType, setUploadType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [visibility, setVisibility] = useState('internal')
  const [department, setDepartment] = useState('')

  const handleUpload = async () => {
    if (!file || !uploadType) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
      if (uploadType === 'train') {
      formData.append('visibility', visibility)
      formData.append('department', department)
    }

    try {
      const endpoint = uploadType === 'train' ? '/documents/train' : '/documents/ocr'
      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(response.data)
        } catch (err) {
      if (err.response?.status === 403) {
        setError('Only administrators can add documents to the knowledge base.')
        return
      }
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
              {isAdmin && (
              <button 
                className="upload-option-btn"
                onClick={() => setUploadType('train')}
              >
                📚 Train DocMind
                <span>Feed document to knowledge base</span>
              </button>
            )}
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
                        {uploadType === 'train' && (
              <div className="visibility-box">
                <label>Who can see this document?
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="internal">Everyone in the organization</option>
                    <option value="public">Public (anyone, even without login)</option>
                    <option value="registered">Registered users and employees</option>
                    <option value="department">One department only</option>
                    <option value="admin_only">Admins only</option>
                  </select>
                </label>
                {visibility === 'department' && (
                  <label>Department name
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. hr" />
                  </label>
                )}
              </div>
            )}
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
              {result.id_card && (
              <div className={`id-card-notice ${result.id_card.needs_review.length > 0 ? 'warn' : ''}`}>
                <p className="id-card-title">Student ID card detected</p>
                <p>
                  ID: <strong>{result.id_card.student_id || 'not readable'}</strong>
                  {result.id_card.student_id_status === 'corrected' &&
                    ' (a look-alike character was corrected, please verify)'}
                </p>
                <p>Name: <strong>{result.id_card.name || 'not readable'}</strong></p>
                <p>
                  Valid until: <strong>{result.id_card.valid_upto || 'not readable'}</strong>
                  {result.id_card.expired === true && ' (EXPIRED)'}
                </p>
                {result.id_card.needs_review.length > 0 && (
                  <p>Please check manually: {result.id_card.needs_review.join(', ')}</p>
                )}
              </div>
            )}
            <button onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
function ScanToFill({ token, onClose, onFill }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState('')

  const scan = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await axios.post(`${API_URL}/documents/ocr`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Scan failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const card = result?.id_card
  const fields = card
    ? [
        { key: 'fullName', label: 'Name', value: card.name },
        { key: 'idNumber', label: 'ID number', value: card.student_id },
        { key: 'validUpto', label: 'Valid until', value: card.valid_upto },
      ].filter(f => f.value)
    : []

  const copy = async (field) => {
    try {
      await navigator.clipboard.writeText(field.value)
      setCopied(field.key)
      setTimeout(() => setCopied(''), 1500)
    } catch (e) {
      // clipboard can be blocked by the browser; the value is still on screen to select by hand
    }
  }

  const fillForm = () => {
    const values = {}
    fields.forEach(f => { values[f.key] = f.value })
    onFill(values)
  }

  return (
    <div className="upload-modal">
      <div className="upload-box">
        <div className="upload-header">
          <h3>Scan a document</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {!result && (
          <div className="upload-form">
            <p className="upload-type-label">Choose a photo or PDF of your document</p>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0])}
              className="file-input"
            />
            {file && <p className="file-name">Selected: {file.name}</p>}
            {error && <p className="error-message">{error}</p>}
            <p className="scan-note">The scan is not saved. It is only used to fill this form.</p>
            <div className="upload-actions">
              <button onClick={onClose}>Cancel</button>
              <button onClick={scan} disabled={!file || loading} className="primary-btn">
                {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="upload-result">
            {fields.length > 0 ? (
              <>
                <p className="success">✅ Details found. Check them before using.</p>
                {fields.map(f => (
                  <div key={f.key} className="found-field">
                    <span className="found-label">{f.label}</span>
                    <span className="found-value">{f.value}</span>
                    <button onClick={() => copy(f)}>{copied === f.key ? 'Copied' : 'Copy'}</button>
                  </div>
                ))}
                {card.student_id_status === 'corrected' && (
                  <p className="scan-note">The ID number had a look-alike character corrected. Please verify it.</p>
                )}
                {card.needs_review.length > 0 && (
                  <p className="scan-note">Please check manually: {card.needs_review.join(', ')}</p>
                )}
                <div className="upload-actions">
                  <button onClick={onClose}>Close</button>
                  <button onClick={fillForm} className="primary-btn">Autofill the form</button>
                </div>
              </>
            ) : (
              <>
                <p className="scan-note">
                  This document type is not recognised yet, so nothing can be filled automatically.
                  You can copy from the text below.
                </p>
                <textarea readOnly value={result.extracted_text || ''} rows={8} />
                <div className="upload-actions">
                  <button onClick={onClose}>Close</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ApplicationForm({ token, onClose }) {
  const [values, setValues] = useState({ fullName: '', idNumber: '', validUpto: '' })
  const [scanning, setScanning] = useState(false)

  const change = (key) => (e) => setValues(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="upload-modal">
      <div className="upload-box">
        <div className="upload-header">
          <h3>Application form (demo)</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <button className="scan-btn" onClick={() => setScanning(true)}>📷 Scan document to fill</button>

        <div className="form-fields">
          <label>Full name
            <input value={values.fullName} onChange={change('fullName')} />
          </label>
          <label>ID number
            <input value={values.idNumber} onChange={change('idNumber')} />
          </label>
          <label>Valid until
            <input value={values.validUpto} onChange={change('validUpto')} />
          </label>
        </div>

        <div className="upload-actions">
          <button onClick={onClose}>Close</button>
        </div>

        {scanning && (
          <ScanToFill
            token={token}
            onClose={() => setScanning(false)}
            onFill={(found) => {
              setValues(prev => ({ ...prev, ...found }))
              setScanning(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
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
    </div>
  );
}
export default App;