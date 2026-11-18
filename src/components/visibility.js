import './knowledge.css';

export const VISIBILITY = [
  { value: 'public', label: 'Anyone', help: 'Everyone who opens your chat, even without signing in.' },
  { value: 'registered', label: 'Signed-in people', help: 'Customers and staff who have signed in. Visitors do not see it.' },
  { value: 'internal', label: 'Staff only', help: 'Employees and admins. Customers never see it.' },
  { value: 'department', label: 'One department', help: 'Employees of the department you name, plus admins.' },
  { value: 'admin_only', label: 'Admins only', help: 'Only administrators.' },
];

export function visibilityOf(value) {
  return VISIBILITY.find(o => o.value === value) || { value, label: value, help: '' };
}

export function VisibilityBadge({ value, department }) {
  const v = visibilityOf(value);
  const text = value === 'department' && department ? `Department: ${department}` : v.label;
  return <span className={`kb-badge ${value}`}>{text}</span>;
}

export function VisibilityPicker({ value, onChange, department, onDepartment }) {
  return (
    <div>
      {VISIBILITY.map(o => (
        <label key={o.value} className={`kb-radio ${value === o.value ? 'on' : ''}`}>
          <input
            type="radio"
            name="kb-visibility"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <div>
            <strong>{o.label}</strong>
            <span>{o.help}</span>
          </div>
        </label>
      ))}
      {value === 'department' && (
        <div>
          <input
            className="kb-input"
            value={department}
            onChange={(e) => onDepartment(e.target.value)}
            placeholder="Department name, e.g. hr"
          />
          <p className="kb-help">Type it exactly as it appears in People (for example hr or it).</p>
        </div>
      )}
    </div>
  );
}