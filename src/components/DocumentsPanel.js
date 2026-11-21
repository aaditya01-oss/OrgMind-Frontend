import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';
import { VISIBILITY, VisibilityBadge, visibilityOf } from './visibility';
import { DepartmentSelect, useDepartmentNames } from './departmentPicker';
import './knowledge.css';

export function DocumentsPanel({ token }) {
  const [docs, setDocs] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const departments = useDepartmentNames(token);

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/documents`, auth);
        setDocs(response.data.documents || []);
      } catch (e) {
        setError('Could not load documents.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftOf = (d) => drafts[d.doc_name] || { visibility: d.visibility, department: d.department || '' };
  const edit = (d, patch) => setDrafts(prev => ({ ...prev, [d.doc_name]: { ...draftOf(d), ...patch } }));
  const changed = (d) => {
    const x = draftOf(d);
    if (x.visibility === 'department' && !x.department.trim()) return false;
    return x.visibility !== d.visibility || (x.visibility === 'department' && x.department !== (d.department || ''));
  };

  const save = async (d) => {
    const x = draftOf(d);
    setError('');
    setSaved('');
    try {
      await axios.post(`${API_URL}/admin/documents/relabel`, {
        docName: d.doc_name,
        visibility: x.visibility,
        department: x.visibility === 'department' ? x.department : '',
      }, auth);
      setDocs(prev => prev.map(row => (row.doc_name === d.doc_name
        ? { ...row, visibility: x.visibility, department: x.visibility === 'department' ? x.department.trim().toLowerCase() : null }
        : row)));
      setDrafts(prev => { const next = { ...prev }; delete next[d.doc_name]; return next; });
      setSaved(`${d.doc_name} updated.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the change.');
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.doc_name}"? The assistant will no longer be able to use it. This cannot be undone.`)) return;
    setError('');
    setSaved('');
    try {
      await axios.post(`${API_URL}/admin/documents/delete`, { docName: d.doc_name }, auth);
      setDocs(prev => prev.filter(row => row.doc_name !== d.doc_name));
      setSaved(`${d.doc_name} deleted.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the document.');
    }
  };

  return (
    <div>
      {error && <p className="kb-banner bad">{error}</p>}
      {saved && <p className="kb-banner ok">{saved}</p>}
      {loading && <p className="kb-meta">Loading...</p>}

      {!loading && docs.length === 0 && !error && (
        <div className="kb-empty">
          <strong>No documents yet</strong>
          Add your first document and the assistant will start answering from it.
        </div>
      )}

      <div className="kb-list">
        {docs.map(d => {
          const x = draftOf(d);
          return (
            <div key={d.doc_name} className="kb-card">
              <div className="kb-card-top">
                <div>
                  <div className="kb-name">{d.doc_name}</div>
                  <p className="kb-meta">
                    {d.chunks} text pieces{d.uploaded_by ? ` · added by ${d.uploaded_by}` : ''}
                  </p>
                </div>
                <VisibilityBadge value={d.visibility} department={d.department} />
              </div>

              <div className="kb-controls">
                <select
                  className="kb-select"
                  value={x.visibility}
                  onChange={(e) => edit(d, { visibility: e.target.value })}
                  aria-label="Who can see this document"
                >
                  {VISIBILITY.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {x.visibility === 'department' && (
                  <DepartmentSelect
                    className="kb-select"
                    value={x.department}
                    names={departments}
                    onChange={(v) => edit(d, { department: v })}
                  />
                )}
                <button className="kb-btn kb-btn-primary" onClick={() => save(d)} disabled={!changed(d)}>Save</button>
                <button className="kb-btn kb-btn-danger" onClick={() => remove(d)}>Delete</button>
              </div>
              <p className="kb-help">{visibilityOf(x.visibility).help}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}