import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ConsoleHome() {
  const { session, signOut } = useAuth();

  if (!session) return <Navigate to="/console/login" replace />;

  return (
    <div style={{ padding: 32 }}>
      <h2>OrgMind console</h2>
      <p>Signed in as {session.email} ({session.role}).</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}