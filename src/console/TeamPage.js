import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import { PersonAvatar } from '../components/PersonAvatar';
import { PersonCard } from '../components/PersonCard';

// "hr" -> "HR", "finance" -> "Finance"
const pretty = (name) => (name.length <= 3 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1));

export default function TeamPage() {
  const { session } = useAuth();
  const token = session.token;

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [card, setCard] = useState(null);   // email of the colleague whose profile card is open

  useEffect(() => {
    axios.get(`${API_URL}/team`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
  }, [token]);

  const count = data?.members?.length || 0;

  return (
    <div className="home">
      <div className="pf-head">
        <div>
          <h2 className="home-title">My team</h2>
          {data?.department && (
            <p className="team-sub">
              {pretty(data.department)} department {'\u00B7'} {count} {count === 1 ? 'person' : 'people'}
            </p>
          )}
        </div>
        {data?.department && (
          <Link to="/console/messages" className="secondary-btn team-chat-btn">Open team chat</Link>
        )}
      </div>

      {failed && <p className="error-message">Could not load your team.</p>}
      {!data && !failed && <p className="aside-note">Loading...</p>}

      {data && !data.department && (
        <section className="aside-card">
          <p className="aside-note">You are not in a department yet. Ask an administrator to add you to one.</p>
        </section>
      )}

      {data && data.department && (
        <div className="team-grid">
          {data.members.map(m => (
            <div key={m.email} className="team-card" role="button" tabIndex={0}
                 onClick={() => setCard(m.email)}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCard(m.email); } }}>
              <PersonAvatar email={m.email} name={m.displayName || m.email} token={token} size={60} />
              <div className="team-name">
                {m.displayName || m.email}
                {m.isYou && <span className="team-you">You</span>}
              </div>
              {m.jobTitle && <div className="team-title">{m.jobTitle}</div>}
              {m.displayName && <div className="team-email">{m.email}</div>}
              <span className="team-id">{m.employeeId || 'No employee ID'}</span>
            </div>
          ))}
        </div>
      )}

      {card && <PersonCard email={card} token={token} onClose={() => setCard(null)} />}
    </div>
  );
}