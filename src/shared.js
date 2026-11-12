export const API_URL = 'http://localhost:5147';

// Only for showing or hiding buttons. The server checks the role again on every request.
export function roleFromToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role || 'member';
  } catch (e) {
    return 'member';
  }
}

export function authHeader(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}