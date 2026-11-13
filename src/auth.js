import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { roleFromToken } from './shared';

const AuthContext = createContext(null);
const KEY = 'orgmind_console_session';

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch (e) {
    return null;
  }
}

// Keeps the staff session for the tab only (it is cleared when the tab closes).
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const signIn = (token, email, orgId) => {
    const next = { token, email, orgId, role: roleFromToken(token) };
    setSession(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
  };

  const signOut = () => {
    setSession(null);
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  };
    // If the server says the login is no longer valid (expired token), end the session.
  // The console then sends the person to the sign-in page.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => response,
      (err) => {
        const url = err.config?.url || '';
        if (err.response?.status === 401 && !url.includes('/auth/')) {
          setSession(null);
          try { sessionStorage.removeItem(KEY); } catch (e) {}
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}