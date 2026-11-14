import { useState } from 'react';
import { REASONS } from '../lib/constants.js';

export default function DelayForm({ task, onSave, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ reason, note: note.trim() || null });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-stone-600">
        Delaying <span className="font-medium text-stone-900">{task.title}</span>. Noticing the reason is the first step.
      </p>
      <fieldset className="space-y-2">
        <legend className="sr-only">Reason</legend>
        {REASONS.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              reason === r ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-stone-200 hover:bg-stone-50'
            }`}
          >
            <input type="radio" name="reason" value={r} required checked={reason === r} onChange={() => setReason(r)} className="accent-teal-700" />
            {r}
          </label>
        ))}
      </fieldset>
      <label htmlFor="note" className="label mt-4">
        Note <span className="font-normal text-stone-400">(optional)</span>
      </label>
      <textarea id="note" className="input resize-none" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What got in the way?" />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !reason}>
          {saving ? 'Saving…' : 'Log delay'}
        </button>
      </div>
    </form>
  );
}
