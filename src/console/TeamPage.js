import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

export default function TeamPage() {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/team`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
  }, [session.token]);

  return (
    <div className="home">
      <h2 className="home-title">My team</h2>
      {failed && <p className="error-message">Could not load your team.</p>}
      {!data && !failed && <p className="aside-note">Loading…</p>}

      {data && !data.department && (
        <section className="aside-card">
          <p className="aside-note">You are not in a department yet. Ask an administrator to add you to one.</p>
        </section>
      )}

      {data && data.department && (
        <section className="aside-card">
          <h3>{data.department} department · {data.members.length} {data.members.length === 1 ? 'person' : 'people'}</h3>
          {data.members.map(m => (
            <div key={m.email} className="kv-row">
              <span>{m.email}{m.isYou ? ' (you)' : ''}</span>
              <strong>{m.employeeId || '—'}</strong>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}