import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

export function TicketsPanel({ token, isStaff, onClose }) {
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
          <h3>{isStaff ? 'All tickets' : 'Tickets'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="scan-note">Loading...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && tickets.length === 0 && (
          <p className="scan-note">No tickets to show. Tell the assistant about a problem and it will open one.</p>
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
                {' · '}Team: {t.department || 'not assigned yet'}
                {t.canManage && <> · From: {t.createdBy}</>}
                {' · '}{new Date(t.createdAt).toLocaleString()}
              </p>
              {t.canManage && (
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