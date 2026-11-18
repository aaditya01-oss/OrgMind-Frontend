import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

// email -> picture address, or '' when the person has no picture. Cleared when a different person signs in.
const cache = new Map();
const pending = new Map();
let cacheOwner = null;

export function initialsOf(text) {
  const base = String(text || '').split('@')[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function load(email, token) {
  if (token !== cacheOwner) {
    cache.forEach(url => { if (url) URL.revokeObjectURL(url); });
    cache.clear();
    pending.clear();
    cacheOwner = token;
  }
  if (cache.has(email)) return Promise.resolve(cache.get(email));
  if (pending.has(email)) return pending.get(email);

  const request = axios.get(`${API_URL}/staff/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { email },
    responseType: 'blob',
  })
    .then(r => {
      const url = r.status === 200 && r.data.size > 0 ? URL.createObjectURL(r.data) : '';
      cache.set(email, url);
      return url;
    })
    .catch(() => '')                       // a failure is not remembered; it is tried again next time
    .finally(() => pending.delete(email));

  pending.set(email, request);
  return request;
}

export function PersonAvatar({ email, name, token, size = 36 }) {
  const [url, setUrl] = useState(() => (token === cacheOwner ? cache.get(email) || '' : ''));

  useEffect(() => {
    let alive = true;
    load(email, token).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [email, token]);

  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };
  return (
    <span className="person-avatar" style={style} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initialsOf(name || email)}
    </span>
  );
}