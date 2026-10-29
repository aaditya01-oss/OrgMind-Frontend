import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5147';

function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'join' | 'create'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => { setMode(m); setError(''); };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let endpoint, body;
      if (mode === 'login') {
        endpoint = '/auth/login';
        body = { email, password };
      } else if (mode === 'join') {
        endpoint = '/auth/register';
        body = { email, password, inviteCode };
      } else {
        endpoint = '/auth/register-org';
        body = { email, password, orgName };
      }

      const response = await axios.post(`${API_URL}${endpoint}`, body);
      const token = response.data.token || response.data.Token;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      onLogin(token, email.trim().toLowerCase(), payload.orgId);

    } catch (err) {
      const data = err.response?.data;
      if (data?.error) setError(data.error);
      else if (err.response?.status === 401) setError('Invalid email or password');
      else if (err.response?.status === 429) setError('Too many attempts. Please wait a minute and try again.');
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">OrgMind AI</h1>
        <p className="login-subtitle">
          {mode === 'login' && 'Sign in to your organization'}
          {mode === 'join' && 'Join your organization with an invite code'}
          {mode === 'create' && 'Create a new organization'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <input type="email" placeholder="Email address" value={email}
                 onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="form-group">
          <input type="password" placeholder="Password (min 8 characters)" value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </div>

        {mode === 'join' && (
          <div className="form-group">
            <input type="text" placeholder="Invite code" value={inviteCode}
                   onChange={(e) => setInviteCode(e.target.value)} />
          </div>
        )}

        {mode === 'create' && (
          <div className="form-group">
            <input type="text" placeholder="Organization name" value={orgName}
                   onChange={(e) => setOrgName(e.target.value)} />
          </div>
        )}

        <button className="login-button" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...'
            : mode === 'login' ? 'Sign In'
            : mode === 'join' ? 'Join Organization'
            : 'Create Organization'}
        </button>

        <p className="toggle-auth">
          {mode === 'login' ? (
            <>
              New here?
              <span onClick={() => switchMode('join')}> Join with invite code</span>
              {' · '}
              <span onClick={() => switchMode('create')}>Create organization</span>
            </>
          ) : (
            <>
              Already have an account?
              <span onClick={() => switchMode('login')}> Sign in</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default Login;