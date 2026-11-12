import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

export function UsersPanel({ token, onClose }) {
  const [users, setUsers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const auth = { headers: { Authorization: `Bearer ${token}` } }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/users`, auth)
        setUsers(response.data)
      } catch (e) {
        setError('Could not load users.')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const draftOf = (u) => drafts[u.id] || { role: u.role, department: u.department || '' }
  const edit = (u, patch) => setDrafts(prev => ({ ...prev, [u.id]: { ...draftOf(u), ...patch } }))
  const changed = (u) => {
    const d = draftOf(u)
    return d.role !== u.role || d.department !== (u.department || '')
  }

  const save = async (u) => {
    const d = draftOf(u)
    setError('')
    setSaved('')
    try {
      const response = await axios.patch(`${API_URL}/admin/users/${u.id}`, {
        role: d.role,
        department: d.role === 'customer' ? '' : d.department
      }, auth)
      setUsers(prev => prev.map(x => (x.id === u.id
        ? { ...x, role: response.data.role, department: response.data.department }
        : x)))
      setDrafts(prev => { const next = { ...prev }; delete next[u.id]; return next })
      setSaved(`${u.email} updated. The change applies the next time they sign in.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the change.')
    }
  }

  return (
    <div className="upload-modal">
      <div className="upload-box tickets-box">
        <div className="upload-header">
          <h3>People in your organization</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="scan-note">Loading...</p>}
        {error && <p className="error-message">{error}</p>}
        {saved && <p className="success">{saved}</p>}

        {users.map(u => {
          const d = draftOf(u)
          return (
            <div key={u.id} className="ticket-row user-row">
              <strong>{u.email}</strong>
              <div className="user-controls">
                <select value={d.role} onChange={(e) => edit(u, { role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="member">Employee</option>
                  <option value="customer">Customer</option>
                </select>
                <input
                  value={d.role === 'customer' ? '' : d.department}
                  onChange={(e) => edit(u, { department: e.target.value })}
                  placeholder={d.role === 'customer' ? 'no department' : 'department, e.g. it'}
                  disabled={d.role === 'customer'}
                />
                <button onClick={() => save(u)} disabled={!changed(u)} className="primary-btn">Save</button>
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
