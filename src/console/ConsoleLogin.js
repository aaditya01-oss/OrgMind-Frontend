import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../Login';
import { useAuth } from '../auth';
import { roleFromToken } from '../shared';

export default function ConsoleLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');

  const handleLogin = (token, email, orgId) => {
    // The staff console is not for customers. The session is simply not kept.
    if (roleFromToken(token) === 'customer') {
      setNotice('This area is for staff. Customers can use the chat on the company website.');
      return;
    }
    signIn(token, email, orgId);
    navigate('/console');
  };

  return <Login onLogin={handleLogin} staffOnly notice={notice} />;
}