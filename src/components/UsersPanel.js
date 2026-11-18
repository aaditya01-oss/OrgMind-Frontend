import { Fragment, useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { API_URL } from '../shared';
import { PersonAvatar } from './PersonAvatar';
import { DepartmentsDrawer, prettyDepartment as pretty } from './DepartmentsDrawer';

const NO_DEPT = '__none__';

const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export function UsersPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ department: '', employeeId: '' });
  const [deptOpen, setDeptOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState('');

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const loadUsers = () => axios.get(`${API_URL}/admin/users`, auth)
    .then(r => setUsers(r.data))
    .catch(() => setError('Could not load users.'));

  const loadDepartments = () => axios.get(`${API_URL}/admin/departments`, auth)
    .then(r => setDepartments(r.data))
    .catch(() => setError('Could not load departments.'));

  useEffect(() => {
    Promise.all([loadUsers(), loadDepartments()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The Departments panel calls this after every add / rename / delete.
  const departmentsChanged = async (goneName) => {
    if (goneName && filter === goneName) setFilter('all');
    await Promise.all([loadUsers(), loadDepartments()]);
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setDraft({ department: u.department || '', employeeId: u.employeeId || '' });
    setError('');
    setSaved('');
  };

  const dirty = (u) => draft.department !== (u.department || '') || draft.employeeId !== (u.employeeId || '');

  const update = async (u, body, message) => {
    setError('');
    setSaved('');
    try {
      const r = await axios.patch(`${API_URL}/admin/users/${u.id}`, body, auth);
      setUsers(prev => prev.map(x => (x.id === u.id
        ? { ...x, role: r.data.role, department: r.data.department, employeeId: r.data.employeeId }
        : x)));
      setEditingId(null);
      setSaved(message);
      loadDepartments();   // the counts changed
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the change.');
    }
  };

  const save = (u) =>
    update(u, { department: draft.department, employeeId: draft.employeeId },
      `${u.email} updated. The change applies the next time they sign in.`);

  const setAdmin = (u, makeAdmin) => {
    const question = makeAdmin
      ? `Make ${u.email} an admin? Admins can see and change everything in the organization.`
      : `Remove admin rights from ${u.email}? They will become an employee.`;
    if (!window.confirm(question)) return;
    update(u, { role: makeAdmin ? 'admin' : 'member' },
      makeAdmin
        ? `${u.email} is now an admin. It applies the next time they sign in.`
        : `${u.email} is now an employee. It applies the next time they sign in.`);
  };

  // ---- invites ----
  const createInvite = async () => {
    setInviteBusy(true);
    setInviteError('');
    setInvite(null);
    setCopied('');
    const department = inviteRole === 'member' ? inviteDept.trim() : '';
    try {
      const r = await axios.post(`${API_URL}/orgs/invites`,
        { role: inviteRole, department: department || undefined }, auth);
      setInvite(r.data);
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Could not create the invite.');
    } finally {
      setInviteBusy(false);
    }
  };

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch (e) { /* the code is on screen to select by hand */ }
  };

  const signUpLink = invite
    ? `${window.location.origin}/console/login#invite=${encodeURIComponent(invite.code)}`
    : '';

  const closeInvite = () => {
    setInviteOpen(false);
    setInvite(null);       // the code is not kept after the panel is closed
    setInviteError('');
    setCopied('');
  };

  // ---- grouping ----
  const staffAll = users.filter(u => u.role !== 'customer');
  const customers = users.filter(u => u.role === 'customer');
  const adminCount = staffAll.filter(u => u.role === 'admin').length;
  const deptNames = [...new Set([
    ...departments.map(d => d.name),
    ...staffAll.filter(u => u.role !== 'admin' && u.department).map(u => u.department),
  ])].sort();

  const q = search.trim().toLowerCase();
  const matches = (u) => !q || u.email.toLowerCase().includes(q) || (u.employeeId || '').toLowerCase().includes(q);
  const shown = staffAll.filter(matches);
  const admins = shown.filter(u => u.role === 'admin');
  const employees = shown.filter(u => u.role !== 'admin');

  const groups = [];
  if (filter === 'all' && admins.length) groups.push(['Administrators', admins]);
  deptNames.forEach(d => {
    if (filter !== 'all' && filter !== d) return;
    const list = employees.filter(u => u.department === d);
    if (list.length) groups.push([`${pretty(d)} department`, list]);
  });
  const noDept = employees.filter(u => !u.department);
  if ((filter === 'all' || filter === NO_DEPT) && noDept.length) groups.push(['No department', noDept]);

  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">People</h2>
        <div className="people-actions">
          <button className="secondary-btn" onClick={() => setDeptOpen(true)}>
            Departments<span className="count-pill">{departments.length}</span>
          </button>
          <button className="primary-btn" onClick={() => (inviteOpen ? closeInvite() : setInviteOpen(true))}>
            {inviteOpen ? 'Close invite' : 'Invite someone'}
          </button>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {saved && <p className="aside-note">{saved}</p>}

      {adminCount === 1 && (
        <section className="aside-card" style={{ borderColor: '#f59e0b' }}>
          <strong>Only one administrator.</strong>{' '}
          <span className="aside-note">
            Nobody can take over if this account is locked out, and this administrator's own admin-only
            requests cannot be handled by anyone else. Invite a second administrator.
          </span>
        </section>
      )}

      {inviteOpen && (
        <section className="aside-card">
          <h3>Invite someone</h3>
          <div className="edit-grid">
            <select className="field-input" value={inviteRole} onChange={(e) => { setInviteRole(e.target.value); setInvite(null); }}>
              <option value="member">Employee</option>
              <option value="admin">Administrator</option>
            </select>
            {inviteRole === 'member' && (
              <select className="field-input" value={inviteDept}
                      onChange={(e) => { setInviteDept(e.target.value); setInvite(null); }}>
                <option value="">No department (optional)</option>
                {deptNames.map(d => <option key={d} value={d}>{pretty(d)}</option>)}
              </select>
            )}
            <button className="primary-btn" onClick={createInvite} disabled={inviteBusy}>
              {inviteBusy ? 'Creating...' : 'Create invite code'}
            </button>
          </div>
          {inviteError && <p className="error-message">{inviteError}</p>}

          {invite && (
            <div className="invite-card">
              <div>
                <p className="aside-note">Invite code</p>
                <div className="invite-code">{invite.code}</div>
                <div className="invite-actions">
                  <button className="secondary-btn" onClick={() => copy(invite.code, 'code')}>
                    {copied === 'code' ? 'Copied' : 'Copy code'}
                  </button>
                  <button className="secondary-btn" onClick={() => copy(signUpLink, 'link')}>
                    {copied === 'link' ? 'Copied' : 'Copy sign-up link'}
                  </button>
                </div>
                <p className="aside-note">
                  Valid until {localTime(invite.expiresAt)}. Share it only with the person you are inviting.
                  It is shown once: closing this panel removes it.
                </p>
              </div>
              <div className="invite-qr">
                <QRCodeSVG value={signUpLink} size={160} level="M" includeMargin />
                <small className="muted">Scan with a phone to join</small>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="people-toolbar">
        <input className="field-input" value={search} onChange={(e) => setSearch(e.target.value)}
               placeholder="Search by email or employee ID" />
        <select className="field-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All departments</option>
          {deptNames.map(d => <option key={d} value={d}>{pretty(d)}</option>)}
          <option value={NO_DEPT}>No department</option>
        </select>
        <span className="muted">{staffAll.length} staff {'\u00B7'} {customers.length} customers</span>
      </div>

      {loading && <p className="aside-note">Loading...</p>}
      {!loading && groups.length === 0 && <p className="aside-note">No staff match.</p>}

      {groups.map(([name, list]) => (
        <section key={name} className="aside-card">
          <h3>{name} {'\u00B7'} {list.length}</h3>
          <table className="people-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Department</th><th>Employee ID</th><th /></tr>
            </thead>
            <tbody>
              {list.map(u => (
                <Fragment key={u.id}>
                  <tr>
                    <td>
                      <div className="people-who">
                        <PersonAvatar email={u.email} name={u.displayName || u.email} token={token} size={34} />
                        <div>
                          <strong>{u.email}</strong>
                          {(u.displayName || u.jobTitle) && (
                            <small className="muted">{[u.displayName, u.jobTitle].filter(Boolean).join(' \u00B7 ')}</small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className={u.role === 'admin' ? 'badge on' : 'badge'}>{u.role === 'admin' ? 'Admin' : 'Employee'}</span></td>
                    <td>{u.department ? pretty(u.department) : '\u2014'}</td>
                    <td>{u.employeeId || '\u2014'}</td>
                    <td>
                      <button className="secondary-btn" onClick={() => (editingId === u.id ? setEditingId(null) : startEdit(u))}>
                        {editingId === u.id ? 'Close' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                  {editingId === u.id && (
                    <tr className="edit-row">
                      <td colSpan={5}>
                        <div className="edit-grid">
                          <select className="field-input" value={draft.department}
                                  onChange={(e) => setDraft(d => ({ ...d, department: e.target.value }))}>
                            <option value="">No department</option>
                            {deptNames.map(d => <option key={d} value={d}>{pretty(d)}</option>)}
                          </select>
                          <input className="field-input" value={draft.employeeId}
                                 onChange={(e) => setDraft(d => ({ ...d, employeeId: e.target.value }))}
                                 placeholder="employee ID, e.g. EMP-0001" />
                          <button className="primary-btn" onClick={() => save(u)} disabled={!dirty(u)}>Save</button>
                          {u.role === 'admin'
                            ? <button className="secondary-btn" onClick={() => setAdmin(u, false)}>Remove admin rights</button>
                            : <button className="secondary-btn" onClick={() => setAdmin(u, true)}>Make admin</button>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <details className="aside-card">
        <summary><strong>Customers {'\u00B7'} {customers.length}</strong></summary>
        {customers.length === 0 && <p className="aside-note">No customers have registered yet.</p>}
        {customers.map(u => (
          <div key={u.id} className="kv-row">
            <span>{u.email}</span>
            <small className="muted">Joined {localTime(u.createdAt)}</small>
          </div>
        ))}
      </details>

      {deptOpen && (
        <DepartmentsDrawer
          token={token}
          departments={departments}
          onClose={() => setDeptOpen(false)}
          onChanged={departmentsChanged}
        />
      )}
    </div>
  );
}