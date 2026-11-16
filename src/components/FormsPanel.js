import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../shared'
import { ScanToFill } from './FormScan'
import { ThreadBox, useUnread } from './ThreadBox'

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const asUtc = (ts) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`)

// Today's date in Nepal (UTC+5:45), the same "today" the server uses for past/future limits.
const nepalToday = () => new Date(Date.now() + 345 * 60000).toISOString().slice(0, 10)

// "full_name" and "fullName" both become "fullname", so scan names and form names can be compared.
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// One input for one form field. The value is always a string, in the format the server expects.
export function FieldInput({ field, value, onChange }) {
  const today = nepalToday()
  const limit = field.dateLimit
  const required = !!field.required
  const dmin = limit === 'future' ? today : undefined
  const dmax = limit === 'past' ? today : undefined
  const set = (e) => onChange(e.target.value)

  switch (field.type) {
    case 'textarea':
      return <textarea value={value} onChange={set} rows={3} maxLength={2000} required={required} />
    case 'number':
      return <input type="number" step="any" value={value} onChange={set} required={required} />
    case 'email':
      return <input type="email" value={value} onChange={set} maxLength={200} required={required} />
    case 'phone':
      return <input type="tel" value={value} onChange={set} maxLength={200} required={required} />
    case 'date':
      return <input type="date" value={value} onChange={set} min={dmin} max={dmax} required={required} />
    case 'time':
      return <input type="time" value={value} onChange={set} required={required} />
    case 'datetime':
      return (
        <input
          type="datetime-local"
          value={value}
          onChange={set}
          min={limit === 'future' ? `${today}T00:00` : undefined}
          max={limit === 'past' ? `${today}T23:59` : undefined}
          required={required}
        />
      )
    case 'daterange': {
      const [start = '', end = ''] = (value || '').split('/')
      const update = (s, e) => onChange(s || e ? `${s}/${e}` : '')
      return (
        <div className="w-range">
          <input type="date" value={start} min={dmin} max={dmax} required={required}
                 onChange={(ev) => update(ev.target.value, end)} />
          <span>to</span>
          <input type="date" value={end} min={start || dmin} max={dmax} required={required}
                 onChange={(ev) => update(start, ev.target.value)} />
        </div>
      )
    }
    case 'select':
      return (
        <select value={value} onChange={set} required={required}>
          <option value="">Choose...</option>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    default:
      return <input type="text" value={value} onChange={set} maxLength={200} required={required} />
  }
}

export function FormsPanel({ token, onClose }) {
  const [tab, setTab] = useState('forms')
  const [forms, setForms] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [values, setValues] = useState({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanNote, setScanNote] = useState('')
    const [openThread, setOpenThread] = useState(null)
  const [unread, clearUnread] = useUnread(token)

  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const load = async () => {
    setLoading(true)
    try {
      const [f, s] = await Promise.all([
        axios.get(`${API_URL}/forms`, auth),
        axios.get(`${API_URL}/submissions`, auth),
      ])
      setForms(Array.isArray(f.data) ? f.data : [])
      setSubs(Array.isArray(s.data) ? s.data : [])
    } catch (e) {
      setError('Could not load forms.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openForm = (form) => {
    setSelected(form)
    setValues({})
    setDone(null)
    setError('')
    setScanNote('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const data = {}
    Object.entries(values).forEach(([k, v]) => { if (v !== '' && v != null) data[k] = v })
    try {
      const response = await axios.post(`${API_URL}/forms/${selected.id}/submit`, { data }, auth)
      setDone(response.data)
      setSelected(null)
      load()
    } catch (err) {
      if (err.response?.status === 429) setError('You are sending too quickly. Please wait a moment.')
      else setError(err.response?.data?.error || 'Could not send the form. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Put scanned values into the fields whose scan name matches. The person still checks everything.
  const applyScan = (found) => {
    const byName = {}
    Object.entries(found).forEach(([k, v]) => { byName[norm(k)] = v })
      if (byName.idnumber && !byName.citizenshipnumber) byName.citizenshipnumber = byName.idnumber
    const next = { ...values }
    let filled = 0
    selected.fields.forEach(f => {
      if (!f.autofill) return
      let v = byName[norm(f.autofill)]
      if (!v) return
      if (f.type === 'date') {
        v = String(v).replace(/\//g, '-')
        if (!ISO_DATE.test(v)) return        // an unusual date format is left for the person to pick
      } else if (!['text', 'textarea', 'phone', 'email'].includes(f.type)) {
        return
      }
      next[f.key] = v
      filled += 1
    })
    setValues(next)
    setScanning(false)
    setScanNote(filled
      ? `${filled} field(s) filled from the scan. Please check them before sending.`
      : 'The scan did not match any field of this form. Please fill it in by hand.')
  }

  const canScan = selected && selected.fields.some(f => f.autofill)
  const showLists = !selected && !done

  return (
    <div className="upload-modal">
      <div className="upload-box tickets-box">
        <div className="upload-header">
          <h3>{selected ? selected.name : 'Forms'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {showLists && (
          <div className="w-tabs">
            <button className={`w-tab ${tab === 'forms' ? 'active' : ''}`} onClick={() => setTab('forms')}>
              Open forms
            </button>
            <button className={`w-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
              My forms
            </button>
          </div>
        )}

        {loading && showLists && <p className="scan-note">Loading...</p>}

        {showLists && tab === 'forms' && !loading && (
          <>
            {forms.length === 0 && <p className="scan-note">No forms are open right now.</p>}
            {forms.map(f => (
              <div key={f.id} className="ticket-row">
                <strong>{f.name}</strong>
                {f.description && <p className="scan-note">{f.description}</p>}
                <div className="upload-actions">
                  <button className="primary-btn" onClick={() => openForm(f)}>Fill in</button>
                </div>
              </div>
            ))}
          </>
        )}

        {showLists && tab === 'mine' && !loading && (
          <>
            {subs.length === 0 && <p className="scan-note">You have not sent any forms yet.</p>}
            {subs.map(s => (
              <div key={s.id} className="ticket-row">
                <div className="ticket-top">
                  <strong>{s.number}</strong>
                  <span className={`ticket-status ${s.status}`}>{String(s.status).replace('_', ' ')}</span>
                </div>
                <p className="ticket-issue">{s.templateName}</p>
                <p className="scan-note">
                  Team: {s.department || 'not assigned yet'}
                  {' · '}{asUtc(s.createdAt).toLocaleString()}
                </p>
                {s.note && <p className="scan-note"><strong>Reason from the team:</strong> {s.note}</p>}
                                <button onClick={() => { setOpenThread(openThread === s.id ? null : s.id); clearUnread('submission', s.id) }}>
                  Messages{unread.submission[s.id] ? ' ●' : ''}
                </button>
                {openThread === s.id && <ThreadBox token={token} kind="submission" id={s.id} />}
              </div>
            ))}
          </>
        )}

        {done && (
          <div className="upload-result">
            <p className="success">✅ Sent. Your reference is {done.number}.</p>
            <p className="scan-note">You can follow it under My forms.</p>
            <div className="upload-actions">
              <button className="primary-btn" onClick={() => { setDone(null); setTab('mine') }}>
                See My forms
              </button>
            </div>
          </div>
        )}

        {selected && (
          <form onSubmit={submit}>
            {selected.description && <p className="scan-note">{selected.description}</p>}

            {canScan && (
              <button type="button" className="scan-btn" onClick={() => setScanning(true)}>
                📷 Scan document to fill
              </button>
            )}
            {scanNote && <p className="scan-note">{scanNote}</p>}

            <div className="form-fields">
              {selected.fields.map(f => (
                <label key={f.key}>
                  {f.label}{f.required ? ' *' : ''}
                  <FieldInput
                    field={f}
                    value={values[f.key] || ''}
                    onChange={(v) => setValues(prev => ({ ...prev, [f.key]: v }))}
                  />
                  {f.sensitive && <small className="w-hint">🔒 Only authorized staff can see this, and every view is recorded.</small>}
                </label>
              ))}
            </div>

            <div className="upload-actions">
              <button type="button" onClick={() => { setSelected(null); setError('') }}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>

            {scanning && (
              <ScanToFill token={token} onClose={() => setScanning(false)} onFill={applyScan} />
            )}
          </form>
        )}
      </div>
    </div>
  )
}