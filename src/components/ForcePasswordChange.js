import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

// Shown instead of the whole app when the person signed in with a temporary password.
// The server refuses everything else until the password is changed, so this is the only way forward.
export default function ForcePasswordChange({ token, onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!current || !next) { setError('Fill in every box.'); return; }
    if (next !== again) { setError('The two new passwords do not match.'); return; }
    if (next === current) { setError('Choose a password different from the temporary one.'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/me/password`,
        { currentPassword: current, newPassword: next },
        { headers: { Authorization: `Bearer ${token}` } });
      setChanged(true);
      setTimeout(onDone, 2000);   // sign out, then sign in with the new password
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change the password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const box = { maxWidth: 420, margin: '10vh auto', padding: 28, background: '#fff', color: '#111827',
    border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,.08)' };
  const input = { width: '100%', padding: '10px 12px', margin: '6px 0 14px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 15, boxSizing: 'border-box', background: '#fff', color: '#111827' };
  const label = { fontSize: 13, fontWeight: 600, color: '#374151' };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 16 }}>
      <form style={box} onSubmit={submit}>
        <h2 style={{ margin: '0 0 6px', color: '#111827' }}>Set a new password</h2>
        <p style={{ margin: '0 0 18px', color: '#4b5563', fontSize: 14 }}>
          An administrator gave you a temporary password. Choose your own before you continue.
        </p>

        <label style={label}>Temporary password</label>
        <input style={input} type="password" autoComplete="current-password" value={current}
               onChange={(e) => setCurrent(e.target.value)} disabled={changed} />
        <label style={label}>New password</label>
        <input style={input} type="password" autoComplete="new-password" value={next}
               onChange={(e) => setNext(e.target.value)} disabled={changed} />
        <label style={label}>New password again</label>
        <input style={input} type="password" autoComplete="new-password" value={again}
               onChange={(e) => setAgain(e.target.value)} disabled={changed} />

        {error && <p style={{ color: '#b91c1c', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}
        {changed && <p style={{ color: '#047857', fontSize: 14, margin: '0 0 12px' }}>
          Password changed. Taking you to sign in...</p>}

        <button type="submit" disabled={saving || changed}
                style={{ width: '100%', padding: '11px 14px', border: 0, borderRadius: 8, fontSize: 15,
                  fontWeight: 600, background: '#2563eb', color: '#ffffff', cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save new password'}
        </button>
        <button type="button" onClick={onDone}
                style={{ width: '100%', marginTop: 10, padding: '10px 14px', border: '1px solid #d1d5db',
                  borderRadius: 8, fontSize: 14, background: '#ffffff', color: '#374151', cursor: 'pointer' }}>
          Sign out
        </button>
      </form>
    </div>
  );
}