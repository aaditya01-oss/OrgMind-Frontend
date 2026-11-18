import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';

// "hr" -> "HR", "finance" -> "Finance"
export const prettyDepartment = (name) =>
  (name.length <= 3 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1));

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "2 people, 1 form" - what a department is still used for.
const usageText = (d) => [
  d.people > 0 && plural(d.people, 'person', 'people'),
  d.forms > 0 && plural(d.forms, 'form', 'forms'),
  d.tickets > 0 && plural(d.tickets, 'ticket', 'tickets'),
  d.documents > 0 && plural(d.documents, 'document', 'documents'),
].filter(Boolean).join(', ');

const isUsed = (d) => d.people + d.forms + d.tickets + d.documents > 0;

// People always; the rest only when there is something to show.
const summaryText = (d) => [
  plural(d.people, 'person', 'people'),
  d.forms > 0 && plural(d.forms, 'form', 'forms'),
  d.tickets > 0 && plural(d.tickets, 'ticket', 'tickets'),
  d.documents > 0 && plural(d.documents, 'document', 'documents'),
].filter(Boolean).join(' \u00B7 ');

function DotsIcon() {
  const dot = { fill: '#475569' };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden="true">
      <circle cx="5" cy="12" r="2" style={dot} />
      <circle cx="12" cy="12" r="2" style={dot} />
      <circle cx="19" cy="12" r="2" style={dot} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// departments: [{ name, people, tickets, forms, documents }] owned by the page.
// onChanged(goneName): the page reloads its lists (goneName is a department that no longer exists).
export function DepartmentsDrawer({ token, departments, onClose, onChanged }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [menuFor, setMenuFor] = useState(null);
  const [rename, setRename] = useState(null);   // { name, value }
  const [remove, setRemove] = useState(null);   // { name, value }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (work) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startAdd = () => { setAdding(true); setRename(null); setRemove(null); setMenuFor(null); setError(''); };
  const startRename = (d) => { setRename({ name: d.name, value: d.name }); setAdding(false); setRemove(null); setMenuFor(null); setError(''); };
  const startRemove = (d) => { setRemove({ name: d.name, value: '' }); setAdding(false); setRename(null); setMenuFor(null); setError(''); };

  const add = () => run(async () => {
    const r = await axios.post(`${API_URL}/admin/departments`, { name: newName }, auth);
    setNewName('');
    setAdding(false);
    await onChanged(null);
    setNotice(`"${prettyDepartment(r.data.name)}" added.`);
  });

  const doRename = () => run(async () => {
    const was = rename.name;
    const r = await axios.patch(`${API_URL}/admin/departments/${encodeURIComponent(was)}`,
      { newName: rename.value }, auth);
    setRename(null);
    await onChanged(was);
    setNotice(`Renamed to "${prettyDepartment(r.data.name)}" (${plural(r.data.peopleMoved, 'person', 'people')} moved).`);
  });

  const doDelete = () => run(async () => {
    const was = remove.name;
    const r = await axios.delete(`${API_URL}/admin/departments/${encodeURIComponent(was)}`, {
      ...auth,
      params: remove.value ? { moveTo: remove.value } : {},
    });
    setRemove(null);
    await onChanged(was);
    setNotice(`"${prettyDepartment(r.data.deleted)}" deleted`
      + (r.data.peopleMoved > 0 ? ` (${plural(r.data.peopleMoved, 'person', 'people')} moved).` : '.'));
  });

  return (
    <div className="dd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="dd-panel" role="dialog" aria-modal="true" aria-label="Departments">
        <header className="dd-head">
          <div>
            <h3>Departments</h3>
            <p className="dd-sub">{plural(departments.length, 'department', 'departments')}</p>
          </div>
          <div className="dd-head-actions">
            <button className="primary-btn dd-new-btn" onClick={startAdd} disabled={busy}>
              <PlusIcon /> New department
            </button>
            <button className="dd-x" onClick={onClose} aria-label="Close">&times;</button>
          </div>
        </header>

        <div className="dd-body">
          {error && <p className="error-message" style={{ marginTop: 12 }}>{error}</p>}
          {notice && <p className="dd-notice">{notice}</p>}

          {adding && (
            <div className="dd-new">
              <div className="dd-inline">
                <input className="field-input" autoFocus value={newName} maxLength={50}
                       placeholder="Department name, e.g. finance"
                       onChange={(e) => setNewName(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && newName.trim() && !busy) add();
                         if (e.key === 'Escape') { e.stopPropagation(); setAdding(false); setNewName(''); }
                       }} />
                <button className="primary-btn" onClick={add} disabled={busy || !newName.trim()}>Add</button>
                <button className="secondary-btn" onClick={() => { setAdding(false); setNewName(''); }}>Cancel</button>
              </div>
            </div>
          )}

          {departments.length === 0 && !adding && (
            <div className="dd-empty">
              <strong>No departments yet</strong>
              Create your first one to start grouping your staff.
            </div>
          )}

          <ul className="dd-list">
            {departments.map(d => {
              const others = departments.filter(x => x.name !== d.name);
              const used = isUsed(d);
              return (
                <li key={d.name} className="dd-row">
                  {rename && rename.name === d.name ? (
                    <div>
                      <div className="dd-inline">
                        <input className="field-input" autoFocus value={rename.value} maxLength={50}
                               onChange={(e) => setRename({ ...rename, value: e.target.value })}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && rename.value.trim() && rename.value.trim().toLowerCase() !== d.name && !busy) doRename();
                                 if (e.key === 'Escape') { e.stopPropagation(); setRename(null); }
                               }} />
                        <button className="primary-btn" onClick={doRename}
                                disabled={busy || !rename.value.trim() || rename.value.trim().toLowerCase() === d.name}>Save</button>
                        <button className="secondary-btn" onClick={() => setRename(null)}>Cancel</button>
                      </div>
                      <p className="dd-hint">
                        Everything using it is renamed too: people, forms, tickets, documents and the group chat.
                      </p>
                    </div>
                  ) : (
                    <div className="dd-line">
                      <div className="dd-info">
                        <span className="dd-name">{prettyDepartment(d.name)}</span>
                        <span className="dd-meta">{summaryText(d)}</span>
                      </div>
                      <div className="dd-menu-wrap">
                        <button className="dd-kebab" aria-label={`Options for ${prettyDepartment(d.name)}`}
                                onClick={() => setMenuFor(menuFor === d.name ? null : d.name)}>
                          <DotsIcon />
                        </button>
                        {menuFor === d.name && (
                          <>
                            <div className="dd-backdrop" onClick={() => setMenuFor(null)} />
                            <div className="dd-menu" role="menu">
                              <button role="menuitem" onClick={() => startRename(d)}>Rename</button>
                              <button role="menuitem" className="danger" onClick={() => startRemove(d)}>Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {remove && remove.name === d.name && (
                    <div className="dd-box">
                      {used ? (
                        <>
                          <p>"{prettyDepartment(d.name)}" is still used by {usageText(d)}. Choose where to move everything:</p>
                          {others.length === 0 ? (
                            <p className="dd-hint">Create another department first, then you can move everything there.</p>
                          ) : (
                            <select className="field-input" value={remove.value}
                                    onChange={(e) => setRemove({ ...remove, value: e.target.value })}>
                              <option value="">Choose a department...</option>
                              {others.map(x => <option key={x.name} value={x.name}>{prettyDepartment(x.name)}</option>)}
                            </select>
                          )}
                        </>
                      ) : (
                        <p>Delete "{prettyDepartment(d.name)}"? It is not used anywhere.</p>
                      )}
                      <p className="dd-warn">The department's group chat history is deleted with it.</p>
                      <div className="dd-inline" style={{ marginTop: 10 }}>
                        <button className="secondary-btn" onClick={() => setRemove(null)}>Cancel</button>
                        <button className="danger-btn" onClick={doDelete} disabled={busy || (used && !remove.value)}>
                          Delete department
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="dd-foot">
          Changes reach people the next time they sign in.
        </footer>
      </aside>
    </div>
  );
}