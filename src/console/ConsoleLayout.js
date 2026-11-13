import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import './console.css';

export default function ConsoleLayout() {
  const { session, signOut } = useAuth();
  if (!session) return <Navigate to="/console/login" replace />;

  const isAdmin = session.role === 'admin';
  const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <div className="console">
      <aside className="console-sidebar">
        <div className="console-brand">OrgMind</div>

        <details open className="nav-group">
          <summary>Workspace</summary>
          <NavLink end to="/console" className={link}>Assistant</NavLink>
          <NavLink to="/console/tickets" className={link}>Tickets</NavLink>
        </details>

        {isAdmin && (
          <details open className="nav-group">
            <summary>Administration</summary>
            <NavLink to="/console/people" className={link}>People</NavLink>
            <NavLink to="/console/knowledge" className={link}>Knowledge base</NavLink>
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