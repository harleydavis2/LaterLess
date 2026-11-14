import { CalendarDays, Check, Hourglass, Pencil, Timer, Trash2 } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { STATUSES } from '../lib/constants.js';
import { dueLabel, formatDuration, localDate } from '../lib/stats.js';

export function StatusBadge({ status }) {
  const s = STATUSES[status];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.badge}`}>{s.label}</span>;
}

function Action({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

export default function TaskCard({ task }) {
  const { act, focus, openTaskForm, openDelay, askConfirm } = useApp();
  const done = task.status === 'completed';
  const overdue = !done && task.due_date < localDate();
  const worked = focus[task.id];

  return (
    <li className="card p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? `Mark "${task.title}" as not completed` : `Mark "${task.title}" as completed`}
          onClick={() => act(() => api.updateTask(task.id, { status: done ? 'pending' : 'completed' }))}
          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
            done ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-300 hover:border-teal-700'
          }`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`leading-snug font-medium break-words ${done ? 'text-stone-400 line-through' : ''}`}>{task.title}</h3>
            <StatusBadge status={task.status} />
          </div>
          {task.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{task.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-red-600' : ''}`}>
              <CalendarDays className="size-3.5" aria-hidden />
              {dueLabel(task.due_date)}
              {overdue && ' · overdue'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3.5" aria-hidden />
              {task.estimated_duration}m planned
              {worked ? ` · ${formatDuration(worked)} worked` : ''}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-1 border-t border-stone-100 pt-2">
        {!done && <Action icon={Hourglass} label="Delay" onClick={() => openDelay(task)} />}
        <Action icon={Pencil} label="Edit" onClick={() => openTaskForm(task)} />
        <Action
          icon={Trash2}
          label="Delete"
          danger
          onClick={() =>
            askConfirm({
              title: 'Delete task?',
              message: `"${task.title}" and all its focus sessions and delay records will be permanently deleted.`,
              onConfirm: () => act(() => api.deleteTask(task.id)),
            })
          }
        />
      </div>
    </li>
  );
}
