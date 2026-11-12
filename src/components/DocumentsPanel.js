import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

const VISIBILITY_OPTIONS = [
  { value: 'internal', label: 'Everyone in the organization' },
  { value: 'public', label: 'Public (anyone, even without login)' },
  { value: 'registered', label: 'Registered users and employees' },
  { value: 'department', label: 'One department only' },
  { value: 'admin_only', label: 'Admins only' },
]

export function DocumentsPanel({ token, onClose }) {
  const [docs, setDocs] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const auth = { headers: { Authorization: `Bearer ${token}` } }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/documents`, auth)
        setDocs(response.data.documents || [])
      } catch (e) {
        setError('Could not load documents.')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const draftOf = (d) => drafts[d.doc_name] || { visibility: d.visibility, department: d.department || '' }
  const edit = (d, patch) => setDrafts(prev => ({ ...prev, [d.doc_name]: { ...draftOf(d), ...patch } }))
  const changed = (d) => {
    const x = draftOf(d)
    return x.visibility !== d.visibility || (x.visibility === 'department' && x.department !== (d.department || ''))
  }

  const save = async (d) => {
    const x = draftOf(d)
    setError('')
    setSaved('')
    try {
      await axios.post(`${API_URL}/admin/documents/relabel`, {
        docName: d.doc_name,
        visibility: x.visibility,
        department: x.visibility === 'department' ? x.department : ''
      }, auth)
      setDocs(prev => prev.map(row => (row.doc_name === d.doc_name
        ? { ...row, visibility: x.visibility, department: x.visibility === 'department' ? x.department.trim().toLowerCase() : null }
        : row)))
      setDrafts(prev => { const next = { ...prev }; delete next[d.doc_name]; return next })
      setSaved(`${d.doc_name} updated.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the change.')
    }
  }

  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.doc_name}"? The assistant will no longer be able to use it. This cannot be undone.`)) return
    setError('')
    setSaved('')
    try {
      await axios.post(`${API_URL}/admin/documents/delete`, { docName: d.doc_name }, auth)
      setDocs(prev => prev.filter(row => row.doc_name !== d.doc_name))
      setSaved(`${d.doc_name} deleted.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the document.')
    }
  }

  return (
    <div className="upload-modal">
      <div className="upload-box tickets-box">
        <div className="upload-header">
          <h3>Knowledge base</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="scan-note">Loading...</p>}
        {error && <p className="error-message">{error}</p>}
        {saved && <p className="success">{saved}</p>}
        {!loading && docs.length === 0 && <p className="scan-note">No documents yet.</p>}

        {docs.map(d => {
          const x = draftOf(d)
          return (
            <div key={d.doc_name} className="ticket-row user-row">
              <strong>{d.doc_name}</strong>
              <p className="scan-note">
                {d.chunks} text pieces{d.uploaded_by ? ` · added by ${d.uploaded_by}` : ''}
              </p>
              <div className="user-controls">
                <select value={x.visibility} onChange={(e) => edit(d, { visibility: e.target.value })}>
                  {VISIBILITY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {x.visibility === 'department' && (
                  <input
                    value={x.department}
                    onChange={(e) => edit(d, { department: e.target.value })}
                    placeholder="department, e.g. hr"
                  />
                )}
                <button onClick={() => save(d)} disabled={!changed(d)} className="primary-btn">Save</button>
                <button onClick={() => remove(d)}>Delete</button>
              </div>
            </div>
          )
        })}

        <div className="upload-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}