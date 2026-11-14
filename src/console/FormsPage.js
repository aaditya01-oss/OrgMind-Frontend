import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

const AUDIENCES = [
  { value: 'customer', label: 'Customers (registered users)' },
  { value: 'employee', label: 'Employees' },
  { value: 'public', label: 'Public (visitors must sign in for now)' }
];

const TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date (calendar)' },
  { value: 'daterange', label: 'Date range (from - to)' },
  { value: 'datetime', label: 'Date and time' },
  { value: 'time', label: 'Time' },
  { value: 'phone', label: 'Phone number' },
  { value: 'email', label: 'Email' },
  { value: 'select', label: 'Choice from a list' }
];

// What a scanned document can fill in. The customer side uses these names in the next stage.
const AUTOFILL = [
  { value: '', label: 'No' },
  { value: 'full_name', label: 'Full name' },
  { value: 'date_of_birth', label: 'Date of birth' },
  { value: 'father_name', label: 'Father’s name' },
  { value: 'mother_name', label: 'Mother’s name' },
  { value: 'address', label: 'Address' },
  { value: 'citizenship_number', label: 'Citizenship number' }
];
const DATE_LIMITS = [
  { value: '', label: 'Any date' },
  { value: 'past', label: 'Only dates in the past (e.g. date of birth)' },
  { value: 'future', label: 'Only dates today or later (e.g. events, leave)' }
];

const isDateType = (type) => ['date', 'daterange', 'datetime'].includes(type);

const blankQuestion = () => ({
    key: '', label: '', type: 'text', required: false, sensitive: false, autofill: '', optionsText: '', dateLimit: ''
});

const blankForm = () => ({
  id: null, name: '', description: '', audience: 'customer', department: '', active: true,
  questions: [blankQuestion()]
});

// Turn what the server sent into what the editor edits.
const toEditor = (f) => ({
  id: f.id,
  name: f.name,
  description: f.description || '',
  audience: f.audience,
  department: f.department || '',
  active: f.active,
  questions: (f.fields || []).map(q => ({
    key: q.key,
    label: q.label,
    type: q.type,
    required: !!q.required,
    sensitive: !!q.sensitive,
    autofill: q.autofill || '',
    dateLimit: q.dateLimit || '',
    optionsText: (q.options || []).join(', ')
  }))
});

const slug = (label) => {
  const s = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
  return /^[a-z]/.test(s) ? s : `q_${s || 'field'}`;
};

// Turn the editor's state into what the server expects.
// A question that already has a key keeps it; a new one gets a key made from its label.
function toPayload(form) {
  const used = new Set(form.questions.map(q => q.key).filter(Boolean));
  const fields = form.questions.map(q => {
    let key = q.key;
    if (!key) {
      const base = slug(q.label);
      key = base;
      let n = 2;
      while (used.has(key)) key = `${base}_${n++}`;
      used.add(key);
    }
    const field = { key, label: q.label.trim(), type: q.type, required: q.required, sensitive: q.sensitive };
    if (q.type === 'select') field.options = q.optionsText.split(',').map(o => o.trim()).filter(Boolean);
    if (q.autofill) field.autofill = q.autofill;
    if (q.dateLimit && isDateType(q.type)) field.dateLimit = q.dateLimit;
    return field;
  });
  return {
    name: form.name,
    description: form.description,
    audience: form.audience,
    department: form.department,
    active: form.active,
    fields
  };
}

function FormEditor({ initial, departments, headers, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (patch) => setForm(prev => ({ ...prev, ...patch }));
  const setQuestion = (i, patch) =>
    setForm(prev => ({ ...prev, questions: prev.questions.map((q, n) => (n === i ? { ...q, ...patch } : q)) }));
  const addQuestion = () => setForm(prev => ({ ...prev, questions: [...prev.questions, blankQuestion()] }));
  const removeQuestion = (i) =>
    setForm(prev => ({ ...prev, questions: prev.questions.filter((_, n) => n !== i) }));
  const move = (i, direction) =>
    setForm(prev => {
      const j = i + direction;
      if (j < 0 || j >= prev.questions.length) return prev;
      const next = [...prev.questions];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...prev, questions: next };
    });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = toPayload(form);
      if (form.id) await axios.put(`${API_URL}/admin/forms/${form.id}`, payload, { headers });
      else await axios.post(`${API_URL}/admin/forms`, payload, { headers });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save the form.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-editor">
      <h2 className="home-title">{form.id ? 'Edit form' : 'New form'}</h2>
      {error && <p className="error-message">{error}</p>}

      <section className="aside-card">
        <h3>About this form</h3>
        <label className="field-label">Name</label>
        <input className="field-input" value={form.name} maxLength={100}
               onChange={(e) => set({ name: e.target.value })}
               placeholder="e.g. Mobile banking request" />

        <label className="field-label">Description (optional)</label>
        <input className="field-input" value={form.description} maxLength={500}
               onChange={(e) => set({ description: e.target.value })}
               placeholder="One line that tells people what this form is for" />

        <div className="field-row">
          <div>
            <label className="field-label">Who fills it</label>
            <select className="field-input" value={form.audience} onChange={(e) => set({ audience: e.target.value })}>
              {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Department that handles it</label>
            <input className="field-input" list="department-list" value={form.department} maxLength={50}
                   onChange={(e) => set({ department: e.target.value })}
                   placeholder="e.g. it, hr" />
            <datalist id="department-list">
              {departments.map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
        </div>

        {!form.department.trim() && (
          <p className="aside-note">
            With no department, only admins will see the submissions.
          </p>
        )}
        {form.id && (
          <p className="aside-note">
            Changing the questions does not change submissions that were already received.
          </p>
        )}

        <label className="check-row">
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
          Form is on (people can fill it)
        </label>
      </section>

      <section className="aside-card">
        <h3>Questions</h3>
        {form.questions.map((q, i) => (
          <div key={i} className="q-row">
            <div className="q-top">
              <input className="field-input" value={q.label} maxLength={80}
                     onChange={(e) => setQuestion(i, { label: e.target.value })}
                     placeholder={`Question ${i + 1}, e.g. Full name`} />
              <select className="field-input q-type" value={q.type} onChange={(e) => setQuestion(i, { type: e.target.value })}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {q.type === 'select' && (
              <input className="field-input" value={q.optionsText}
                     onChange={(e) => setQuestion(i, { optionsText: e.target.value })}
                     placeholder="Choices, separated by commas: Savings, Current" />
            )}

            {isDateType(q.type) && (
              <select className="field-input" value={q.dateLimit} onChange={(e) => setQuestion(i, { dateLimit: e.target.value })}>
                {DATE_LIMITS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            )}

            <div className="q-bottom">
              <label className="check-row">
                <input type="checkbox" checked={q.required} onChange={(e) => setQuestion(i, { required: e.target.checked })} />
                Required
              </label>
              <label className="check-row">
                <input type="checkbox" checked={q.sensitive} onChange={(e) => setQuestion(i, { sensitive: e.target.checked })} />
                Sensitive
              </label>
              <label className="check-row">
                Fill from scan:
                <select className="field-input q-autofill" value={q.autofill} onChange={(e) => setQuestion(i, { autofill: e.target.value })}>
                  {AUTOFILL.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </label>
              <span className="q-actions">
                <button type="button" className="link-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="link-btn" onClick={() => move(i, 1)} disabled={i === form.questions.length - 1}>↓</button>
                <button type="button" className="link-btn danger" onClick={() => removeQuestion(i)} disabled={form.questions.length === 1}>Remove</button>
              </span>
            </div>
          </div>
        ))}
        <button type="button" className="secondary-btn" onClick={addQuestion} disabled={form.questions.length >= 30}>
          + Add a question
        </button>
      </section>

      <div className="editor-actions">
        <button className="primary-btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save form'}</button>
        <button className="secondary-btn" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

export default function FormsPage() {
  const { session } = useAuth();
  const [forms, setForms] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${session.token}` };

  const load = () => {
    setError('');
    axios.get(`${API_URL}/admin/forms`, { headers })
      .then(r => setForms(r.data))
      .catch(() => { setForms([]); setError('Could not load the forms.'); });
  };

  useEffect(() => {
    load();
    // Department names already in use, offered as suggestions in the editor.
    axios.get(`${API_URL}/admin/overview`, { headers })
      .then(r => setDepartments((r.data.departments || []).map(d => d.department)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (f) => {
    setError('');
    try {
      await axios.put(`${API_URL}/admin/forms/${f.id}`, { ...toPayload(toEditor(f)), active: !f.active }, { headers });
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not change the form.');
    }
  };

  if (editing) {
    return (
      <FormEditor
        initial={editing}
        departments={departments}
        headers={headers}
        onCancel={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    );
  }

  return (
    <div className="home">
      <div className="forms-head">
        <h2 className="home-title">Forms</h2>
        <button className="primary-btn" onClick={() => setEditing(blankForm())}>New form</button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {forms === null && <p className="aside-note">Loading…</p>}
      {forms && forms.length === 0 && !error && (
        <section className="aside-card">
          <p className="aside-note">No forms yet. Create one, for example “Mobile banking request” or “Leave request”.</p>
        </section>
      )}

      {forms && forms.map(f => (
        <section key={f.id} className={f.active ? 'aside-card form-card' : 'aside-card form-card off'}>
          <div className="form-card-main">
            <strong>{f.name}</strong>
            <div className="badges">
              <span className="badge">{AUDIENCES.find(a => a.value === f.audience)?.label.split(' (')[0] || f.audience}</span>
              <span className="badge">{f.department ? `Handled by ${f.department}` : 'No department'}</span>
              <span className={f.active ? 'badge on' : 'badge'}>{f.active ? 'Open' : 'Closed'}</span>
            </div>
            {f.description && <p className="aside-note">{f.description}</p>}
          </div>
          <div className="form-card-side">
            <span className="muted">{f.submissions} submissions · {f.open} open</span>
            <span>
              <button className="secondary-btn" onClick={() => setEditing(toEditor(f))}>Edit</button>{' '}
              <button className="secondary-btn" onClick={() => toggle(f)}>{f.active ? 'Close form' : 'Reopen form'}</button>
            </span>
          </div>
        </section>
      ))}
    </div>
  );
}