import { useEffect, useState } from 'react';
import { CircleCheck, Pause, Play, Plus, Square, Timer, Trash2 } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { EmptyState } from '../components/States.jsx';
import { formatDuration } from '../lib/stats.js';

// The running timer lives in localStorage as timestamps, so a refresh (or closing the tab)
// never loses time: elapsed = elapsedMs (before the last pause) + time since runningSince.
export const KEY = 'laterless.timer';
const loadTimer = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};
const elapsedOf = (t, now) => (t ? t.elapsedMs + (t.runningSince ? now - t.runningSince : 0) : 0);
const clock = (ms) => {
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

export default function Focus() {
  const { tasks, sessions, act, setToast, openTaskForm, askConfirm } = useApp();
  const [timer, setTimerState] = useState(loadTimer);
  const [now, setNow] = useState(Date.now);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // { task, seconds } after a successful stop

  const setTimer = (t) => {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
    setTimerState(t);
  };

  useEffect(() => {
    if (!timer?.runningSince) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer?.runningSince]);

  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const timerTask = timer && tasks.find((t) => t.id === timer.taskId);
  const elapsed = elapsedOf(timer, now);

  const start = () => {
    const task = tasks.find((t) => t.id === Number(selected));
    if (!task) return;
    const t = Date.now();
    setNow(t);
    setSaved(null);
    setTimer({ taskId: task.id, startTime: new Date(t).toISOString(), elapsedMs: 0, runningSince: t });
    if (task.status !== 'in_progress') act(() => api.updateTask(task.id, { status: 'in_progress' }));
  };

  const pause = () => {
    const t = Date.now();
    setNow(t);
    setTimer({ ...timer, elapsedMs: elapsedOf(timer, t), runningSince: null });
  };

  const resume = () => {
    const t = Date.now();
    setNow(t);
    setTimer({ ...timer, runningSince: t });
  };

  const stop = async () => {
    const end = Date.now();
    const ms = elapsedOf(timer, end);
    // Freeze the timer first, so if saving fails (e.g. offline) the recorded time is kept.
    const frozen = { ...timer, elapsedMs: ms, runningSince: null };
    setTimer(frozen);
    setNow(end);
    if (ms < 1000) {
      setTimer(null);
      setToast('Session was too short to save.');
      return;
    }
    setSaving(true);
    const seconds = Math.round(ms / 1000);
    const ok = await act(() =>
      api.createSession({ task_id: frozen.taskId, start_time: frozen.startTime, end_time: new Date(end).toISOString(), duration: seconds })
    );
    setSaving(false);
    if (ok) {
      setSaved({ task: timerTask, seconds });
      setTimer(null);
    }
  };

  const discard = () =>
    askConfirm({
      title: 'Discard this session?',
      message: `${formatDuration(elapsed / 1000)} of focus time will not be saved.`,
      confirmLabel: 'Discard',
      onConfirm: () => setTimer(null),
    });

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="mt-0.5 text-sm text-stone-500">Pick one task and work on it. The timer keeps going if you refresh.</p>
      </header>

      {timer ? (
        <section className="card p-6 text-center" aria-label="Focus timer">
          <p className="text-sm text-stone-500">{timer.runningSince ? 'Focusing on' : 'Paused'}</p>
          <p className="mt-1 font-medium break-words">{timerTask ? timerTask.title : 'This task was deleted'}</p>
          <p className="my-6 text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl" role="timer" aria-live="off">
            {clock(elapsed)}
          </p>
          {timerTask && (
            <div className="grid grid-cols-2 gap-3">
              {timer.runningSince ? (
                <button className="btn btn-secondary" onClick={pause} disabled={saving}>
                  <Pause className="size-4" aria-hidden /> Pause
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={resume} disabled={saving}>
                  <Play className="size-4" aria-hidden /> Resume
                </button>
              )}
              <button className="btn btn-primary" onClick={stop} disabled={saving}>
                <Square className="size-4" aria-hidden /> {saving ? 'Saving…' : 'Stop & save'}
              </button>
            </div>
          )}
          <button className="btn mt-3 text-stone-500 hover:bg-stone-100" onClick={discard} disabled={saving}>
            <Trash2 className="size-4" aria-hidden /> Discard session
          </button>
        </section>
      ) : openTasks.length ? (
        <section className="card p-5" aria-label="Start a focus session">
          {saved && (
            <div role="status" className="mb-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
              <p className="flex items-center gap-2 font-medium">
                <CircleCheck className="size-4" aria-hidden /> Saved {formatDuration(saved.seconds)} on “{saved.task?.title}”
              </p>
              {saved.task && saved.task.status !== 'completed' && (
                <button
                  className="btn btn-primary mt-3 w-full"
                  onClick={async () => (await act(() => api.updateTask(saved.task.id, { status: 'completed' }))) && setSaved(null)}
                >
                  Mark task as completed
                </button>
              )}
            </div>
          )}
          <label htmlFor="focus-task" className="label">
            Task
          </label>
          <select id="focus-task" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Choose a task…</option>
            {openTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.estimated_duration}m)
              </option>
            ))}
          </select>
          <button className="btn btn-primary mt-4 w-full py-3" onClick={start} disabled={!selected}>
            <Play className="size-4" aria-hidden /> Start timer
          </button>
        </section>
      ) : (
        <EmptyState
          icon={Timer}
          title="No open tasks"
          text="Add a task first, then come back to time your work on it."
          action={
            <button className="btn btn-primary" onClick={() => openTaskForm({})}>
              <Plus className="size-4" aria-hidden /> Add task
            </button>
          }
        />
      )}

      <section aria-labelledby="recent-heading" className="mt-6">
        <h2 id="recent-heading" className="mb-3 text-base font-semibold">
          Recent sessions
        </h2>
        {sessions.length ? (
          <ul className="card divide-y divide-stone-100">
            {sessions.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.task_title}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(s.start_time).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-teal-700">{formatDuration(s.duration)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">No sessions yet. Your saved focus sessions will appear here.</p>
        )}
      </section>
    </>
  );
}
