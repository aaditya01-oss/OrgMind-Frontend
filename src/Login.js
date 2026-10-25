import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5147';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgId, setOrgId] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister 
        ? { email, password, orgId } 
        : { email, password };

      const response = await axios.post(`${API_URL}${endpoint}`, body);
      const token = response.data.token || response.data.Token;
      
      onLogin(token, email, orgId);
    } catch (err) {
      setError(err.response?.data || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">OrgMind AI</h1>
        <p className="login-subtitle">
          {isRegister ? 'Create your account' : 'Sign in to your organization'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {isRegister && (
          <div className="form-group">
            <input
              type="text"
              placeholder="Organization ID"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            />
          </div>
        )}

        <button 
          className="login-button" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <p className="toggle-auth">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? ' Sign in' : ' Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;