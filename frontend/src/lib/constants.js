// Must match the CHECK constraints in backend/src/schema.sql.
export const REASONS = [
  'Lack of motivation',
  'Social media distraction',
  'Tiredness',
  'Fear of failure',
  'Task feels difficult',
  'Other',
];

export const STATUSES = {
  pending: { label: 'Pending', badge: 'bg-stone-100 text-stone-700' },
  in_progress: { label: 'In progress', badge: 'bg-sky-50 text-sky-700' },
  completed: { label: 'Completed', badge: 'bg-teal-50 text-teal-700' },
  delayed: { label: 'Delayed', badge: 'bg-amber-50 text-amber-800' },
};
