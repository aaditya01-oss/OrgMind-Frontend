import { useState, useEffect } from 'react';
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
// The fixed field names every form in OrgMind uses.
const FORM_FIELDS = [
  { key: 'fullName', label: 'Full name' },
  { key: 'idNumber', label: 'ID / citizenship number' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'fatherName', label: "Father's name" },
  { key: 'phone', label: 'Phone number', manual: true },
  { key: 'address', label: 'Address' },
  { key: 'validUpto', label: 'Valid until' },
]

function ScanToFill({ token, onClose, onFill }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState('')
  const [pickMode, setPickMode] = useState(false)
  const [assigned, setAssigned] = useState({})
  const [activeField, setActiveField] = useState('')

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

  // Fields the scanner recognized by itself (student ID cards only, for now)
  const card = result?.id_card
  const autoValues = {}
  if (card?.name) autoValues.fullName = card.name
  if (card?.student_id) autoValues.idNumber = card.student_id
  if (card?.valid_upto) autoValues.validUpto = card.valid_upto
  const hasAuto = Object.keys(autoValues).length > 0

  // Every non-empty line of the scanned text, for tapping
  const lines = (result?.extracted_text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1)

  const showPicker = result && (!hasAuto || pickMode)

  const copy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch (e) {
      // clipboard can be blocked by the browser; the value is still on screen to select by hand
    }
  }

  const startPicking = () => {
    setAssigned(autoValues)
    setActiveField('')
    setPickMode(true)
  }

    // "नामः राम बहादुर थापा," -> "राम बहादुर थापा"
  // Cuts the label before a colon (only when the label has no digits, so "10:30" stays whole)
  // and trailing punctuation. The person can still edit the value in the form.
  const cleanValue = (line) => {
    let v = line.replace(/^[^\d:ः]{1,30}[:ः]\s*(?=\S)/, '')
    v = v.replace(/[\s,;.]+$/, '')
    return v || line
  }

  const tapLine = (line) => {
    if (!activeField) return
    setAssigned(prev => ({ ...prev, [activeField]: cleanValue(line) }))
  }

  const fillForm = (values) => onFill(values)

  const assignedCount = Object.keys(assigned).length

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

        {result && !showPicker && (
          <div className="upload-result">
            <p className="success">✅ Details found. Check them before using.</p>
            {FORM_FIELDS.filter(f => autoValues[f.key]).map(f => (
              <div key={f.key} className="found-field">
                <span className="found-label">{f.label}</span>
                <span className="found-value">{autoValues[f.key]}</span>
                <button onClick={() => copy(f.key, autoValues[f.key])}>{copied === f.key ? 'Copied' : 'Copy'}</button>
              </div>
            ))}
            {card.student_id_status === 'corrected' && (
              <p className="scan-note">The ID number had a look-alike character corrected. Please verify it.</p>
            )}
            {card.needs_review.length > 0 && (
              <p className="scan-note">Please check manually: {card.needs_review.join(', ')}</p>
            )}
            <div className="upload-actions">
              <button onClick={startPicking}>Pick from the text instead</button>
              <button onClick={() => fillForm(autoValues)} className="primary-btn">Autofill the form</button>
            </div>
          </div>
        )}

        {result && showPicker && (
          <div className="upload-result">
            {!hasAuto && (
              <p className="scan-note">
                This document type is not recognised automatically. Choose a field, then tap the line
                of text that belongs there.
              </p>
            )}
            {hasAuto && <p className="scan-note">Choose a field, then tap the line of text that belongs there.</p>}

            <div className="field-pick">
              {FORM_FIELDS.filter(f => !f.manual).map(f => (
                <button
                  key={f.key}
                  className={`field-chip ${activeField === f.key ? 'active' : ''} ${assigned[f.key] ? 'done' : ''}`}
                  onClick={() => setActiveField(f.key)}
                >
                  {assigned[f.key] ? '✓ ' : ''}{f.label}
                </button>
              ))}
            </div>

            <div className="line-pick">
              {lines.length === 0 && <p className="scan-note">No text was found in this scan.</p>}
              {lines.map((line, i) => (
                <button
                  key={i}
                  className="line-chip"
                  onClick={() => tapLine(line)}
                  disabled={!activeField}
                  title={activeField ? 'Use this line' : 'Choose a field first'}
                >
                  {line}
                </button>
              ))}
            </div>

            {assignedCount > 0 && (
              <div className="assigned-box">
                {FORM_FIELDS.filter(f => assigned[f.key]).map(f => (
                  <div key={f.key} className="found-field">
                    <span className="found-label">{f.label}</span>
                    <span className="found-value">{assigned[f.key]}</span>
                    <button onClick={() => copy(f.key, assigned[f.key])}>{copied === f.key ? 'Copied' : 'Copy'}</button>
                  </div>
                ))}
              </div>
            )}

            <div className="upload-actions">
              <button onClick={onClose}>Close</button>
              <button onClick={() => fillForm(assigned)} disabled={assignedCount === 0} className="primary-btn">
                Fill the form
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ApplicationForm({ token, onClose }) {
  const [values, setValues] = useState(
    Object.fromEntries(FORM_FIELDS.map(f => [f.key, '']))
  )
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
          {FORM_FIELDS.map(f => (
            <label key={f.key}>{f.label}
              <input value={values[f.key]} onChange={change(f.key)} />
            </label>
          ))}
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

function TicketsPanel({ token, isStaff, onClose }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const auth = { headers: { Authorization: `Bearer ${token}` } }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${API_URL}/tickets`, auth)
        setTickets(response.data)
      } catch (e) {
        setError('Could not load tickets.')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeStatus = async (id, status) => {
    setError('')
    try {
      await axios.patch(`${API_URL}/tickets/${id}/status`, { status }, auth)
      setTickets(prev => prev.map(t => (t.id === id ? { ...t, status } : t)))
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change the status.')
    }
  }

  return (
    <div className="upload-modal">
      <div className="upload-box tickets-box">
        <div className="upload-header">
          <h3>{isStaff ? 'All tickets' : 'My tickets'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="scan-note">Loading...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && tickets.length === 0 && (
          <p className="scan-note">No tickets yet. Tell the assistant about a problem and it will open one.</p>
        )}

        <div className="ticket-list">
          {tickets.map(t => (
            <div key={t.id} className="ticket-row">
              <div className="ticket-top">
                <strong>{t.number}</strong>
                <span className={`ticket-status ${t.status}`}>{t.status.replace('_', ' ')}</span>
              </div>
              <p className="ticket-issue">{t.issue}</p>
              <p className="scan-note">
                Priority: {t.priority}
                {isStaff && <> · From: {t.createdBy}</>}
                {' · '}{new Date(t.createdAt).toLocaleString()}
              </p>
              {isStaff && (
                <select value={t.status} onChange={(e) => changeStatus(t.id, e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              )}
            </div>
          ))}
        </div>

        <div className="upload-actions">
          <button onClick={onClose}>Close</button>
        </div>
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
  const [showTickets, setShowTickets] = useState(false);
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
          isStaff={['admin', 'member'].includes(roleFromToken(token))}
          onClose={() => setShowTickets(false)}
        />
      )}
    </div>
  );
}
export default App;