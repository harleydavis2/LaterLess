import { useState } from 'react';
import { api } from '../api.js';

const FIELDS = [
  ['current', 'Current password', 'current-password'],
  ['next', 'New password', 'new-password'],
  ['confirm', 'Confirm new password', 'new-password'],
];

export default function ChangePasswordForm({ onDone }) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (values.next !== values.confirm) return setError("The new passwords don't match.");
    setSaving(true);
    setError(null);
    try {
      await api.changePassword(values.current, values.next);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {FIELDS.map(([key, label, autoComplete]) => (
        <div key={key}>
          <label htmlFor={`pw-${key}`} className="label">
            {label}
          </label>
          <input
            id={`pw-${key}`}
            type="password"
            className="input"
            required
            minLength={key === 'current' ? undefined : 8}
            maxLength={128}
            autoComplete={autoComplete}
            value={values[key]}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        </div>
      ))}
      <p className="text-xs text-stone-500">At least 8 characters. You'll stay signed in here; other devices are signed out.</p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={saving}>
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}
