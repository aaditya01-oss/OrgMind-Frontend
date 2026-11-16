import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

const WHO = {
  public: 'Everyone',
  registered: 'Registered users and staff',
  internal: 'All staff',
  department: 'Your department',
  admin_only: 'Admins only'
};

export default function LibraryPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/library`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => setDocs(r.data))
      .catch(() => setFailed(true));
  }, [session.token]);

  const shown = (docs || []).filter(d => d.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="home">
      <h2 className="home-title">Knowledge library</h2>
      <p className="aside-note">Documents the assistant can use for you. Ask it a question about any of them.</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search documents"
        style={{ margin: '12px 0', padding: '8px 10px', width: '100%', maxWidth: 360 }}
      />

      {failed && <p className="error-message">Could not load the library.</p>}
      {!docs && !failed && <p className="aside-note">Loading…</p>}
      {docs && shown.length === 0 && (
        <section className="aside-card">
          <p className="aside-note">{docs.length === 0 ? 'No documents have been added yet.' : 'Nothing matches your search.'}</p>
        </section>
      )}

      {shown.map(d => (
        <section key={d.name} className="aside-card">
          <div className="kv-row">
            <span><strong>{d.name}</strong></span>
            <button
              className="primary-btn"
              onClick={() => navigate('/console/assistant', { state: { prefill: `Tell me about the document "${d.name}": ` } })}
            >
              Ask about this
            </button>
          </div>
          <p className="aside-note">
            Available to: {d.visibility === 'department' && d.department ? `${d.department} department` : (WHO[d.visibility] || d.visibility)}
          </p>
        </section>
      ))}
    </div>
  );
}