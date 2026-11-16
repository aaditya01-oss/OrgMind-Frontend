import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';
import { FieldInput } from '../components/FormsPanel';
import { ThreadBox, useUnread } from '../components/ThreadBox';

const words = (t) => String(t || '').replace(/_/g, ' ');

// The server sends UTC times without a "Z"; add it so the browser shows the local time.
const localTime = (ts) => {
  if (!ts) return '';
  const d = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export default function RequestsPage() {
  const { session } = useAuth();
  const headers = { Authorization: `Bearer ${session.token}` };

  const [tab, setTab] = useState('forms');
  const [forms, setForms] = useState(null);
  const [subs, setSubs] = useState(null);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [openThread, setOpenThread] = useState(null);
  const [unread, clearUnread] = useUnread(session.token);

  const load = () => {
    Promise.all([
      axios.get(`${API_URL}/forms`, { headers }),
      axios.get(`${API_URL}/submissions`, { headers }),
    ])
      .then(([f, s]) => {
        setForms(Array.isArray(f.data) ? f.data : []);
        setSubs(Array.isArray(s.data) ? s.data : []);
      })
      .catch(() => { setForms([]); setSubs([]); setError('Could not load the forms.'); });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (form) => {
    setSelected(form);
    setValues({});
    setDone(null);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    const data = {};
    Object.entries(values).forEach(([k, v]) => { if (v !== '' && v != null) data[k] = v; });
    try {
      const r = await axios.post(`${API_URL}/forms/${selected.id}/submit`, { data }, { headers });
      setDone(r.data);
      setSelected(null);
      load();
    } catch (err) {
      if (err.response?.status === 429) setError('You are sending too quickly. Please wait a moment.');
      else setError(err.response?.data?.error || 'Could not send the form. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const mine = (subs || []).filter(s => s.submittedBy === session.email)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  // ---- one form being filled ----
  if (selected) {
    return (
      <div className="home">
        <div className="forms-head">
          <h2 className="home-title">{selected.name}</h2>
          <button className="secondary-btn" onClick={() => { setSelected(null); setError(''); }}>Cancel</button>
        </div>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={submit}>
          <section className="aside-card">
            {selected.description && <p className="aside-note">{selected.description}</p>}
            <div className="req-fields">
              {selected.fields.map(f => (
                <label key={f.key}>
                  <span>{f.label}{f.required ? ' *' : ''}</span>
                  <FieldInput
                    field={f}
                    value={values[f.key] || ''}
                    onChange={(v) => setValues(prev => ({ ...prev, [f.key]: v }))}
                  />
                  {f.sensitive && <small className="muted">🔒 Only authorized staff can see this, and every view is recorded.</small>}
                </label>
              ))}
            </div>
            <button type="submit" className="primary-btn" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </section>
        </form>
      </div>
    );
  }

  // ---- lists ----
  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">Requests</h2>
        <span>
          <button className={tab === 'forms' ? 'primary-btn' : 'secondary-btn'} onClick={() => { setTab('forms'); setDone(null); }}>
            Open forms
          </button>{' '}
          <button className={tab === 'mine' ? 'primary-btn' : 'secondary-btn'} onClick={() => { setTab('mine'); setDone(null); }}>
            My requests
          </button>
        </span>
      </div>

      {error && <p className="error-message">{error}</p>}
      {done && (
        <section className="aside-card">
          <p><strong>Sent.</strong> Your reference is {done.number}. You can follow it under My requests.</p>
        </section>
      )}
      {forms === null && <p className="aside-note">Loading…</p>}

      {forms && tab === 'forms' && forms.length === 0 && !error && (
        <section className="aside-card">
          <p className="aside-note">No forms are open for you right now.</p>
        </section>
      )}
      {forms && tab === 'forms' && forms.map(f => (
        <section key={f.id} className="aside-card form-card">
          <div className="form-card-main">
            <strong>{f.name}</strong>
            {f.description && <p className="aside-note">{f.description}</p>}
          </div>
          <div className="form-card-side">
            <button className="primary-btn" onClick={() => openForm(f)}>Fill in</button>
          </div>
        </section>
      ))}

      {subs && tab === 'mine' && mine.length === 0 && (
        <section className="aside-card">
          <p className="aside-note">You have not sent any requests yet.</p>
        </section>
      )}
      {subs && tab === 'mine' && mine.map(s => (
        <section key={s.id} className="aside-card">
          <div className="kv-row">
            <span><strong>{s.number}</strong> {s.templateName}</span>
            <span className="badge">{words(s.status)}</span>
          </div>
          <small className="muted">{s.department ? `Team: ${s.department} · ` : ''}{localTime(s.createdAt)}</small>
          {s.note && <p className="aside-note"><strong>Reason from the team:</strong> {s.note}</p>}
                    <button className="secondary-btn" onClick={() => { setOpenThread(openThread === s.id ? null : s.id); clearUnread('submission', s.id); }}>
            Messages{unread.submission[s.id] ? ' ●' : ''}
          </button>
          {openThread === s.id && <ThreadBox token={session.token} kind="submission" id={s.id} />}
        </section>
      ))}
    </div>
  );
}