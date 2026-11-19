import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

// Admin tool: gives a staff member a temporary password. It is shown once and never saved here.
export function ResetPassword({ user, token }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const reset = async () => {
    if (!window.confirm(
      `Reset the password for ${user.email}?\n\nThey will get a temporary password and must choose a new one when they sign in.`)) return;
    setBusy(true); setError(''); setResult(null); setCopied(false);
    try {
      const r = await axios.post(`${API_URL}/admin/users/${user.id}/reset-password`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(result.temporaryPassword); setCopied(true); } catch (e) {}
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button className="secondary-btn" onClick={reset} disabled={busy}>
        {busy ? 'Resetting...' : 'Reset password'}
      </button>
      {error && <p className="error-message">{error}</p>}
      {result && (
        <div style={{ marginTop: 10, padding: 14, border: '1px solid #f59e0b', borderRadius: 10,
                      background: '#fffbeb', color: '#78350f' }}>
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            Temporary password for <strong>{result.email}</strong>. It is shown only once.
          </p>
          <div style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 1, color: '#111827',
                        background: '#ffffff', padding: '8px 12px', borderRadius: 8, display: 'inline-block',
                        textTransform: 'none', userSelect: 'all' }}>
            {result.temporaryPassword}
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="secondary-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            <button className="secondary-btn" style={{ marginLeft: 8 }} onClick={() => setResult(null)}>Done, hide it</button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12 }}>
            Tell them in person or by phone, not in a chat message. They must change it at their next sign-in.
            If they are already signed in somewhere, that session can continue for up to 8 hours.
          </p>
        </div>
      )}
    </div>
  );
}