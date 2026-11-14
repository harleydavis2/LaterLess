import { BarChart3, Hourglass } from 'lucide-react';
import { useApp } from '../App.jsx';
import { EmptyState } from '../components/States.jsx';
import { PlannedActualChart, WeeklyChart } from '../components/Charts.jsx';
import { formatDuration, insights } from '../lib/stats.js';

function Stat({ label, value, hint, small }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${small ? 'text-base leading-snug' : 'text-2xl'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="card mb-4 p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Insights() {
  const { tasks, sessions, logs } = useApp();

  if (!tasks.length)
    return (
      <>
        <h1 className="mb-5 text-2xl font-semibold tracking-tight">Insights</h1>
        <EmptyState icon={BarChart3} title="No data yet" text="Add tasks, time your focus sessions and log delays — your stats will show up here." />
      </>
    );

  const s = insights({ tasks, sessions, logs });
  const maxReason = s.reasonCounts[0]?.count ?? 1;

  return (
    <>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">Insights</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Tasks completed" value={s.completed} />
        <Stat label="Tasks delayed" value={s.delayedTasks} hint={`${s.delayCount} delay${s.delayCount === 1 ? '' : 's'} logged`} />
        <Stat label="Avg. time per task" value={s.avgSecondsPerTask ? formatDuration(s.avgSecondsPerTask) : '—'} hint="Across tasks you've timed" />
        <Stat
          label="Most common reason"
          value={s.topReason?.reason ?? '—'}
          hint={s.topReason ? `${s.topReason.count} time${s.topReason.count === 1 ? '' : 's'}` : 'No delays logged'}
          small
        />
      </div>

      <Section title="Completed this week">
        <WeeklyChart data={s.weekly} />
      </Section>

      <Section title="Why you delay">
        {s.reasonCounts.length ? (
          <ul className="space-y-3">
            {s.reasonCounts.map(({ reason, count }) => (
              <li key={reason}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{reason}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${(count / maxReason) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">No delays logged yet. Use “Delay” on a task when you put it off.</p>
        )}
      </Section>

      <Section title="Planned vs. actual time">
        {s.plannedVsActual.length ? (
          <PlannedActualChart data={s.plannedVsActual} />
        ) : (
          <p className="text-sm text-stone-500">Time a task in Focus to compare it with your estimate.</p>
        )}
      </Section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-base font-semibold">
          Delay history
        </h2>
        {logs.length ? (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="card px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium break-words">{l.task_title}</p>
                  <time dateTime={l.created_at} className="shrink-0 text-xs text-stone-500">
                    {new Date(l.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </time>
                </div>
                <p className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">{l.reason}</p>
                {l.note && <p className="mt-1.5 text-stone-600">{l.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Hourglass} title="No delays logged" text="Every time you put a task off, log why. Patterns appear quickly." />
        )}
      </section>
    </>
  );
}
