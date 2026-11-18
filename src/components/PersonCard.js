import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';
import { PersonAvatar } from './PersonAvatar';

const ROLE = { admin: 'Administrator', member: 'Employee' };

function prettyDepartment(name) {
  if (!name) return 'None';
  return name.length <= 3 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1);
}

export function PersonCard({ email, token, onClose }) {
  const [person, setPerson] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/staff/profile`, { headers: { Authorization: `Bearer ${token}` }, params: { email } })
      .then(r => setPerson(r.data))
      .catch(() => setFailed(true));
  }, [email, token]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="pf-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-dialog pf-crop-dialog" role="dialog" aria-modal="true" aria-label="Profile">
        <div className="pf-dialog-head">
          <h3>Profile</h3>
          <button className="pf-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {failed && <p className="error-message">Could not load this profile.</p>}
        {!person && !failed && <p className="aside-note">Loading...</p>}

        {person && (
          <div className="person-card">
            <PersonAvatar email={person.email} name={person.displayName || person.email} token={token} size={76} />
            <div className="pf-name">{person.displayName || person.email}</div>
            {person.jobTitle && <div className="pf-title">{person.jobTitle}</div>}
            <span className={`profile-role ${person.role}`}>{ROLE[person.role] || person.role}</span>

            <div className="person-card-rows">
              <div className="kv-row"><span>Email</span><strong>{person.email}</strong></div>
              <div className="kv-row"><span>Department</span><strong>{prettyDepartment(person.department)}</strong></div>
            </div>

            <div className="person-card-bio">
              <h3>About</h3>
              {person.bio ? <p className="pf-bio">{person.bio}</p> : <p className="pf-empty">No bio yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}