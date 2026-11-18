import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

const ROLE = { admin: 'Administrator', member: 'Employee', customer: 'Customer' };
const TABS = [['profile', 'Edit profile'], ['password', 'Password'], ['activity', 'Sign-in activity']];

// The server sends UTC times without a "Z"; add it so the browser shows local time.
const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const memberSince = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { dateStyle: 'long' });
};

// Initials from the display name, or from the email when there is no name yet.
function initialsOf(me) {
  const source = (me.displayName || '').trim() || String(me.email || '').split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

// "hr" -> "HR", "finance" -> "Finance"
function prettyDepartment(name) {
  if (!name) return 'None';
  return name.length <= 3 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1);
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ---- Tab 1: edit profile ----------------------------------------------------
function EditProfile({ me, headers, onSaved }) {
  const fromMe = (m) => ({
    displayName: m.displayName || '', jobTitle: m.jobTitle || '', phone: m.phone || '', bio: m.bio || '',
  });
  const [form, setForm] = useState(fromMe(me));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setOk(false); };
  const dirty = Object.keys(form).some(k => form[k] !== fromMe(me)[k]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setOk(false);
    try {
      const r = await axios.patch(`${API_URL}/me`, form, { headers });
      onSaved(r.data);
      setForm(fromMe(r.data));
      setOk(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="profile-form">
      {ok && <p className="profile-ok">Saved.</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="pf-two">
        <div>
          <label className="field-label">Display name</label>
          <input className="field-input" value={form.displayName} onChange={set('displayName')}
                 maxLength={60} placeholder="How your name should appear" />
        </div>
        <div>
          <label className="field-label">Job title</label>
          <input className="field-input" value={form.jobTitle} onChange={set('jobTitle')}
                 maxLength={60} placeholder="e.g. Support lead" />
        </div>
      </div>

      <label className="field-label">Phone (optional)</label>
      <input className="field-input" value={form.phone} onChange={set('phone')}
             maxLength={30} placeholder="+977 98..." inputMode="tel" />

      <label className="field-label">Bio</label>
      <textarea className="field-input" rows={4} value={form.bio} onChange={set('bio')}
                maxLength={300} placeholder="A few words about you and what you do." />
      <p className="pf-count">{form.bio.length} / 300</p>

      <div className="pf-locked">
        <strong>{me.email}</strong> &middot; {ROLE[me.role] || me.role} &middot; {prettyDepartment(me.department)}
        <br />Your email, role and department are managed by an administrator.
      </div>

      <div className="profile-actions">
        <button type="submit" className="primary-btn" disabled={busy || !dirty}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// ---- Tab 2: password -----------------------------------------------------------
function PasswordForm({ headers, signOut }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

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

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = again.length > 0 && next !== again;
  const matches = again.length > 0 && next === again && next.length >= 8;

  return (
    <form onSubmit={change} className="profile-form">
      {changed && <p className="profile-ok">Password changed. You will be signed out now, please sign in again.</p>}
      {error && <p className="error-message">{error}</p>}

      <label className="field-label">Current password</label>
      <input className="field-input" type="password" autoComplete="current-password"
             value={current} onChange={(e) => setCurrent(e.target.value)} required />

      <label className="field-label">New password</label>
      <input className="field-input" type="password" autoComplete="new-password"
             value={next} onChange={(e) => setNext(e.target.value)} minLength={8} maxLength={72} required />
      <p className={`profile-hint ${tooShort ? 'bad' : ''}`}>At least 8 characters.</p>

      <label className="field-label">New password again</label>
      <input className="field-input" type="password" autoComplete="new-password"
             value={again} onChange={(e) => setAgain(e.target.value)} minLength={8} maxLength={72} required />
      {mismatch && <p className="profile-hint bad">The two passwords do not match yet.</p>}
      {matches && <p className="profile-hint good">Passwords match.</p>}

      <div className="profile-actions">
        <button type="submit" className="primary-btn" disabled={saving || changed || tooShort || mismatch}>
          {saving ? 'Saving...' : 'Change password'}
        </button>
        <span className="profile-note">You will be signed out of this tab afterwards.</span>
      </div>
    </form>
  );
}

// ---- Tab 3: sign-in activity -----------------------------------------------------
function Activity({ headers }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/me/activity`, { headers })
      .then(r => setRows(r.data.signIns || []))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return <p className="error-message">Could not load your sign-in activity.</p>;
  if (!rows) return <p className="aside-note">Loading...</p>;
  if (rows.length === 0) return <p className="aside-note">No sign-ins recorded yet.</p>;

  return (
    <>
      <ul className="pf-signins">
        {rows.map((t, i) => (
          <li key={i}>
            <span>{localTime(t)}</span>
            {i === 0 && <span className="pf-latest">Latest</span>}
          </li>
        ))}
      </ul>
      <p className="profile-note" style={{ marginTop: 14 }}>
        Do not recognise one of these? Change your password straight away and tell your administrator.
      </p>
    </>
  );
}

// ---- The page --------------------------------------------------------------------
export default function ProfilePage() {
  const { session, signOut } = useAuth();
  const headers = { Authorization: `Bearer ${session.token}` };

  const [me, setMe] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    axios.get(`${API_URL}/me`, { headers })
      .then(r => setMe(r.data))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openSettings = (which) => { setTab(which); setOpen(true); };

  return (
    <div className="home">
      <div className="pf-head">
        <h2 className="home-title">My profile</h2>
        <button className="pf-gear" onClick={() => openSettings('profile')} disabled={!me}>
          <GearIcon /> Settings
        </button>
      </div>

      {failed && <p className="error-message">Could not load your details.</p>}
      {!me && !failed && <p className="aside-note">Loading...</p>}

      {me && (
        <div className="profile-grid">
          <section className="aside-card profile-card">
            <div className="profile-top">
              <div className="profile-avatar" aria-hidden="true">{initialsOf(me)}</div>
              <div className="pf-name">{me.displayName || me.email}</div>
              {me.jobTitle && <div className="pf-title">{me.jobTitle}</div>}
              <span className={`profile-role ${me.role}`}>{ROLE[me.role] || me.role}</span>
            </div>
            <div className="kv-row"><span>Department</span><strong>{prettyDepartment(me.department)}</strong></div>
            {me.employeeId && <div className="kv-row"><span>Employee ID</span><strong>{me.employeeId}</strong></div>}
          </section>

          <div className="pf-stack">
            <section className="aside-card">
              <h3>About</h3>
              {me.bio
                ? <p className="pf-bio">{me.bio}</p>
                : (
                  <p className="pf-empty">
                    You have not written a bio yet.{' '}
                    <button className="pf-link" onClick={() => openSettings('profile')}>Add one</button>
                  </p>
                )}
            </section>

            <section className="aside-card">
              <h3>Details</h3>
              <div className="kv-row"><span>Email</span><strong>{me.email}</strong></div>
              {me.phone && <div className="kv-row"><span>Phone</span><strong>{me.phone}</strong></div>}
              <div className="kv-row"><span>Member since</span><strong>{memberSince(me.createdAt)}</strong></div>
            </section>
          </div>
        </div>
      )}

      {open && me && (
        <div className="pf-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="pf-dialog" role="dialog" aria-modal="true" aria-label="Settings">
            <div className="pf-dialog-head">
              <h3>Settings</h3>
              <button className="pf-x" onClick={() => setOpen(false)} aria-label="Close">&times;</button>
            </div>

            <div className="pf-tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key}
                        className={`pf-tab ${tab === key ? 'on' : ''}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'profile' && <EditProfile me={me} headers={headers} onSaved={setMe} />}
            {tab === 'password' && <PasswordForm headers={headers} signOut={signOut} />}
            {tab === 'activity' && <Activity headers={headers} />}
          </div>
        </div>
      )}
    </div>
  );
}