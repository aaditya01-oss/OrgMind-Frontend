import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';
import { prettyDepartment } from './DepartmentsDrawer';

// The names of this organization's departments (admins only, because that is the list the server keeps).
export function useDepartmentNames(token, enabled = true) {
  const [names, setNames] = useState([]);

  useEffect(() => {
    if (!enabled) return;
    axios.get(`${API_URL}/admin/departments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setNames(r.data.map(d => d.name)))
      .catch(() => {});
  }, [token, enabled]);

  return names;
}

// A dropdown instead of a text box, so a department can never be mistyped.
// If the saved value is not in the list (older data), it stays visible instead of silently disappearing.
export function DepartmentSelect({ value, onChange, names, className = 'field-input', placeholder = 'Choose a department' }) {
  const current = (value || '').trim().toLowerCase();
  const list = current && !names.includes(current) ? [current, ...names] : names;

  return (
    <select className={className} value={current} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {list.map(n => <option key={n} value={n}>{prettyDepartment(n)}</option>)}
    </select>
  );
}