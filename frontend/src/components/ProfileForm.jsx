import { useState } from 'react';
import { api } from '../api.js';

export default function ProfileForm({ initialName = '', submitLabel, onSaved }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.saveUser(name);
      await onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full text-left">
      <label htmlFor="name" className="label">
        Your name
      </label>
      <input id="name" className="input" required maxLength={50} autoFocus autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary mt-4 w-full" disabled={saving || !name.trim()}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
