import { useState } from 'react';
import { CalendarCheck, CircleUserRound, LogOut, Plus } from 'lucide-react';
import { useApp } from '../App.jsx';
import Modal from '../components/Modal.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import InstallApp from '../components/InstallApp.jsx';
import TaskCard from '../components/TaskCard.jsx';
import { EmptyState } from '../components/States.jsx';
import { WeeklyChart } from '../components/Charts.jsx';
import { formatDuration, todaySummary, weekSummary, weeklyCompletions } from '../lib/stats.js';
import { KEY as TIMER_KEY } from './Focus.jsx';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function Stat({ label, value, tone = 'text-stone-900' }) {
  return (
    <div className="card px-3 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{label}</p>
    </div>
  );
}

export default function Home() {
  const { user, tasks, sessions, logs, reload, openTaskForm, signOut, askConfirm } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);

  const confirmSignOut = () => {
    setProfileOpen(false);
    if (!localStorage.getItem(TIMER_KEY)) return signOut();
    askConfirm({
      title: 'Sign out?',
      message: 'Your focus timer is still running. Signing out discards that unsaved time.',
      confirmLabel: 'Sign out',
      onConfirm: signOut,
    });
  };
  const today = todaySummary(tasks);
  const week = weekSummary({ tasks, sessions, logs });

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {greeting()}, {user.name}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="btn btn-primary px-3" onClick={() => openTaskForm({})}>
            <Plus className="size-4" aria-hidden /> Add task
          </button>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Profile and sign out"
            className="grid size-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
          >
            <CircleUserRound className="size-5" />
          </button>
        </div>
      </header>

      <section aria-label="Today's progress" className="card mb-3 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-stone-600">Today's completion</h2>
          <span className="text-2xl font-semibold tabular-nums">{today.percent}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={today.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Today's completion">
          <div className="h-full rounded-full bg-teal-700 transition-[width]" style={{ width: `${today.percent}%` }} />
        </div>
      </section>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Planned today" value={today.planned} />
        <Stat label="Completed" value={today.completed} tone="text-teal-700" />
        <Stat label="Delayed" value={today.delayed} tone={today.delayed ? 'text-amber-700' : 'text-stone-900'} />
      </div>

      <section aria-labelledby="today-heading" className="mb-6">
        <h2 id="today-heading" className="mb-3 text-base font-semibold">
          Today's tasks
        </h2>
        {today.list.length ? (
          <ul className="space-y-3">
            {today.list.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title="Nothing planned for today"
            text="Add one small task you can finish today."
            action={
              <button className="btn btn-primary" onClick={() => openTaskForm({})}>
                <Plus className="size-4" aria-hidden /> Add task
              </button>
            }
          />
        )}
      </section>

      <section aria-labelledby="week-heading" className="card p-4">
        <h2 id="week-heading" className="text-base font-semibold">
          This week
        </h2>
        <dl className="mt-3 mb-2 grid grid-cols-3 gap-2 text-center">
          {[
            ['Completed', week.completed],
            ['Focused', formatDuration(week.focusSeconds)],
            ['Delays', week.delays],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-stone-50 py-2">
              <dt className="text-xs text-stone-500">{label}</dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <WeeklyChart data={weeklyCompletions(tasks)} height={130} />
      </section>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Your profile">
        {profileOpen && (
          <>
            <p className="mb-4 text-sm text-stone-500">
              Signed in as <span className="font-medium text-stone-800">{user.email}</span>
            </p>
            <ProfileForm
              initialName={user.name}
              submitLabel="Save name"
              onSaved={async () => {
                await reload();
                setProfileOpen(false);
              }}
            />
            <div className="mt-5 border-t border-stone-100 pt-4">
              <InstallApp />
            </div>
            <button type="button" className="btn btn-secondary mt-3 w-full" onClick={confirmSignOut}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
