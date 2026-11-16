import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

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
export function ScanToFill({ token, onClose, onFill }) {
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

export function ApplicationForm({ token, onClose }) {
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
