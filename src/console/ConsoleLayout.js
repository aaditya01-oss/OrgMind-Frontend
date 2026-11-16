import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import './console.css';
import { useLive } from '../live';

export default function ConsoleLayout() {
  const { session, signOut } = useAuth();
  const token = session?.token;
  const [unread, setUnread] = useState(0);

  // The number next to "Messages" in the sidebar, checked every 30 seconds.
    const refreshUnread = useCallback(() => {
    if (!token) return;
    axios.get(`${API_URL}/chat/channels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUnread(r.data.total || 0))
      .catch(() => {});
  }, [token]);

  // Every 30 seconds as a safety net; the live connection makes it instant.
  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 30000);
    return () => clearInterval(timer);
  }, [refreshUnread]);

  useLive(token, (event) => { if (event.area === 'chat') refreshUnread(); });
  if (!session) return <Navigate to="/console/login" replace />;

  const isAdmin = session.role === 'admin';
  const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <div className="console">
      <aside className="console-sidebar">
        <div className="console-brand">OrgMind</div>

        <details open className="nav-group">
          <summary>Workspace</summary>
          <NavLink end to="/console" className={link}>{isAdmin ? 'Overview' : 'My work'}</NavLink>
          <NavLink to="/console/assistant" className={link}>Ask OrgMind</NavLink>
          <NavLink to="/console/tickets" className={link}>Tickets</NavLink>
          <NavLink to="/console/submissions" className={link}>Submissions</NavLink>
          <NavLink to="/console/requests" className={link}>Requests</NavLink>
          <NavLink to="/console/profile" className={link}>My profile</NavLink>
          {!isAdmin && <NavLink to="/console/team" className={link}>My team</NavLink>}
          {!isAdmin && <NavLink to="/console/library" className={link}>Knowledge library</NavLink>}
          <NavLink to="/console/messages" className={link}>Messages{unread > 0 ? ` (${unread})` : ''}</NavLink>
        </details>

        {isAdmin && (
          <details open className="nav-group">
            <summary>Administration</summary>
            <NavLink to="/console/people" className={link}>People</NavLink>
            <NavLink to="/console/knowledge" className={link}>Knowledge base</NavLink>
            <NavLink to="/console/forms" className={link}>Forms</NavLink>
            <NavLink to="/console/audit" className={link}>Audit log</NavLink>
          </details>
        )}
      </aside>

      <div className="console-main">
        <header className="console-topbar">
          <span>{session.email} · {session.role === 'member' ? 'employee' : session.role}</span>
          <button onClick={signOut}>Sign out</button>
        </header>
        <main className="console-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}