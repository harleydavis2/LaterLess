import { useState } from 'react';
import { STATUSES } from '../lib/constants.js';
import { localDate } from '../lib/stats.js';

export default function TaskForm({ task, onSave, onCancel }) {
  const editing = !!task.id;
  const [values, setValues] = useState({
    title: task.title ?? '',
    description: task.description ?? '',
    due_date: task.due_date ?? localDate(),
    estimated_duration: task.estimated_duration ?? 30,
    status: task.status ?? 'pending',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...values, estimated_duration: Number(values.estimated_duration) });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="title" className="label">
          Title
        </label>
        <input id="title" className="input" required maxLength={120} autoFocus value={values.title} onChange={set('title')} placeholder="e.g. Finish history essay" />
      </div>
      <div>
        <label htmlFor="description" className="label">
          Description <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea id="description" className="input resize-none" rows={2} maxLength={1000} value={values.description} onChange={set('description')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="due_date" className="label">
            Due date
          </label>
          <input id="due_date" type="date" className="input" required value={values.due_date} onChange={set('due_date')} />
        </div>
        <div>
          <label htmlFor="estimated_duration" className="label">
            Estimate (min)
          </label>
          <input
            id="estimated_duration"
            type="number"
            inputMode="numeric"
            className="input"
            required
            min={1}
            max={1440}
            step={1}
            value={values.estimated_duration}
            onChange={set('estimated_duration')}
          />
        </div>
      </div>
      {editing && (
        <div>
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" className="input" value={values.status} onChange={set('status')}>
            {Object.entries(STATUSES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
        </button>
      </div>
    </form>
  );
}
