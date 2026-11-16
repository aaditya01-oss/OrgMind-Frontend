import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

const ROLE = { admin: 'Administrator', member: 'Employee', customer: 'Customer' };

export default function ProfilePage() {
  const { session, signOut } = useAuth();
  const headers = { Authorization: `Bearer ${session.token}` };

  const [me, setMe] = useState(null);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/me`, { headers })
      .then(r => setMe(r.data))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = async (e) => {
    e.preventDefault();
    setError('');
    if (next !== again) { setError('The two new passwords do not match.'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/me/password`, { currentPassword: current, newPassword: next }, { headers });
      setChanged(true);
      setCurrent(''); setNext(''); setAgain('');
      setTimeout(signOut, 2500);   // sign in again with the new password
    } catch (err) {
      if (err.response?.status === 429) setError('Too many tries. Please wait a minute.');
      else setError(err.response?.data?.error || 'Could not change the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="home">
      <h2 className="home-title">My profile</h2>

      <section className="aside-card">
        <h3>Your details</h3>
        {failed && <p className="error-message">Could not load your details.</p>}
        {!me && !failed && <p className="aside-note">Loading…</p>}
        {me && (
          <>
            <div className="kv-row"><span>Email</span><strong>{me.email}</strong></div>
            <div className="kv-row"><span>Role</span><strong>{ROLE[me.role] || me.role}</strong></div>
            <div className="kv-row"><span>Department</span><strong>{me.department || 'None'}</strong></div>
            {me.employeeId && <div className="kv-row"><span>Employee ID</span><strong>{me.employeeId}</strong></div>}
          </>
        )}
      </section>

      <section className="aside-card">
        <h3>Change password</h3>
        {changed && <p className="aside-note">Password changed. You will be signed out now, please sign in again.</p>}
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={change}>
          <label className="field-label">Current password</label>
          <input className="field-input" type="password" autoComplete="current-password"
                 value={current} onChange={(e) => setCurrent(e.target.value)} required />

          <label className="field-label">New password (8 characters or more)</label>
          <input className="field-input" type="password" autoComplete="new-password"
                 value={next} onChange={(e) => setNext(e.target.value)} minLength={8} maxLength={72} required />

          <label className="field-label">New password again</label>
          <input className="field-input" type="password" autoComplete="new-password"
                 value={again} onChange={(e) => setAgain(e.target.value)} minLength={8} maxLength={72} required />

          <p className="aside-note">After changing it you are signed out of this tab.</p>
          <button type="submit" className="primary-btn" disabled={saving || changed}>
            {saving ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}