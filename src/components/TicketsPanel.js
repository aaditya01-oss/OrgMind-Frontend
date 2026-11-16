import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../shared'
import { ThreadBox, useUnread } from './ThreadBox'

const isOpen = (t) => t.status !== 'resolved' && t.status !== 'closed'
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const asUtc = (ts) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`)

const isUpset = (t) => t.canManage && t.sentiment === 'negative' && isOpen(t)

export function TicketsPanel({ token, isStaff, onClose }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('active')
  const [openThread, setOpenThread] = useState(null)
  const [unread, clearUnread] = useUnread(token)

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

  const toggleThread = (id) => {
    setOpenThread(openThread === id ? null : id)
    clearUnread('ticket', id)
  }

  const byNewest = (a, b) => asUtc(b.createdAt) - asUtc(a.createdAt)

  // Needs attention: upset first, then priority, then newest.
  const active = tickets.filter(isOpen).sort((a, b) =>
    (isUpset(b) - isUpset(a)) ||
    ((PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)) ||
    byNewest(a, b))
  const resolved = tickets.filter(t => !isOpen(t)).sort(byNewest)

  const list = tab === 'active' ? active : resolved

  return (
    <div className="upload-modal">
      <div className="upload-box tickets-box">
        <div className="upload-header">
          <h3>{isStaff ? 'All tickets' : 'Tickets'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ticket-tabs">
          <button className={tab === 'active' ? 'primary-btn' : 'secondary-btn'} onClick={() => setTab('active')}>
            Active ({active.length})
          </button>{' '}
          <button className={tab === 'resolved' ? 'primary-btn' : 'secondary-btn'} onClick={() => setTab('resolved')}>
            Resolved ({resolved.length})
          </button>
        </div>

        {loading && <p className="scan-note">Loading...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && list.length === 0 && (
          <p className="scan-note">
            {tab === 'active'
              ? (tickets.length === 0
                  ? 'No tickets to show. Tell the assistant about a problem and it will open one.'
                  : 'Nothing is waiting. Everything is handled.')
              : 'No resolved tickets yet.'}
          </p>
        )}

        <div className="ticket-list">
          {list.map(t => (
            <div key={t.id} className="ticket-row">
              <div className="ticket-top">
                <strong>{t.number}</strong>
                <span className={`ticket-status ${t.status}`}>{t.status.replace('_', ' ')}</span>
                {isUpset(t) && <span className="ticket-upset">Upset</span>}
              </div>
              <p className="ticket-issue">{t.issue}</p>
              <p className="scan-note">
                Priority: {t.priority}
                {' · '}Team: {t.department || 'not assigned yet'}
                {t.canManage && <> · From: {t.createdBy}</>}
                {' · '}{asUtc(t.createdAt).toLocaleString()}
              </p>
              {t.canManage && (
                <select value={t.status} onChange={(e) => changeStatus(t.id, e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              )}{' '}
              <button onClick={() => toggleThread(t.id)}>
                {t.canManage ? 'Conversation' : 'Messages'}{unread.ticket[t.id] ? ' ●' : ''}
              </button>
              {openThread === t.id && <ThreadBox token={token} kind="ticket" id={t.id} />}
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