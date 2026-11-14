import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { useApp } from '../App.jsx';
import TaskCard from '../components/TaskCard.jsx';
import { EmptyState } from '../components/States.jsx';
import { STATUSES } from '../lib/constants.js';

const FILTERS = [['all', 'All'], ...Object.entries(STATUSES).map(([value, { label }]) => [value, label])];

export default function Tasks() {
  const { tasks, openTaskForm } = useApp();
  const [filter, setFilter] = useState('all');
  const shown = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const count = (f) => (f === 'all' ? tasks.length : tasks.filter((t) => t.status === f).length);

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <button type="button" className="btn btn-primary px-3" onClick={() => openTaskForm({})}>
          <Plus className="size-4" aria-hidden /> Add task
        </button>
      </header>

      <div role="group" aria-label="Filter by status" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === value ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            {label} <span className="tabular-nums opacity-70">{count(value)}</span>
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={tasks.length ? `No ${STATUSES[filter]?.label.toLowerCase() ?? ''} tasks` : 'No tasks yet'}
          text={tasks.length ? 'Try another filter.' : 'Break your work into small tasks with a due date and a time estimate.'}
          action={
            !tasks.length && (
              <button className="btn btn-primary" onClick={() => openTaskForm({})}>
                <Plus className="size-4" aria-hidden /> Add your first task
              </button>
            )
          }
        />
      )}
    </>
  );
}
