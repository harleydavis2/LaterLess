import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { api, loadAll } from './api.js';
import { focusByTask } from './lib/stats.js';
import BottomNav from './components/BottomNav.jsx';
import Modal from './components/Modal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import TaskForm from './components/TaskForm.jsx';
import DelayForm from './components/DelayForm.jsx';
import { ErrorState, Loading, OfflinePage } from './components/States.jsx';
import Home from './pages/Home.jsx';
import Tasks from './pages/Tasks.jsx';
import Focus from './pages/Focus.jsx';
import Insights from './pages/Insights.jsx';
import Welcome from './pages/Welcome.jsx';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const PAGES = { home: Home, tasks: Tasks, focus: Focus, insights: Insights };
const pageFromHash = () => {
  const page = location.hash.replace('#/', '');
  return page in PAGES ? page : 'home';
};

export default function App() {
  const [page, setPage] = useState(pageFromHash);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [taskForm, setTaskForm] = useState(null); // null = closed, {} = new task, task = edit
  const [delayTask, setDelayTask] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, message, confirmLabel, onConfirm }

  const reload = useCallback(async () => {
    try {
      setData(await loadAll());
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    reload();
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', reload);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', reload);
    };
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // Runs a change, refreshes all data, and shows failures as a toast. Returns true on success.
  const act = useCallback(
    async (fn) => {
      try {
        await fn();
        await reload();
        return true;
      } catch (err) {
        setToast(err.message);
        return false;
      }
    },
    [reload]
  );

  const ctx = useMemo(
    () =>
      data && {
        ...data,
        focus: focusByTask(data.sessions),
        reload,
        act,
        setToast,
        openTaskForm: setTaskForm,
        openDelay: setDelayTask,
        askConfirm: setConfirm,
      },
    [data, reload, act]
  );

  if (!data && !error) return <Loading />;
  if (!data) return error.offline ? <OfflinePage onRetry={reload} /> : <ErrorState message={error.message} onRetry={reload} />;
  if (!data.user) return <Welcome onSaved={reload} />;

  const Page = PAGES[page];

  return (
    <AppContext.Provider value={ctx}>
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
        {(data.offline || error) && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {data.offline
                ? "You're offline — showing your last saved data. Changes need a connection."
                : `Couldn't refresh: ${error.message}`}
            </span>
          </div>
        )}
        <Page />
      </div>

      <BottomNav current={page} />

      {toast && (
        <div role="alert" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <Modal open={!!taskForm} onClose={() => setTaskForm(null)} title={taskForm?.id ? 'Edit task' : 'New task'}>
        {taskForm && (
          <TaskForm
            task={taskForm}
            onCancel={() => setTaskForm(null)}
            onSave={async (values) => {
              await (taskForm.id ? api.updateTask(taskForm.id, values) : api.createTask(values));
              await reload();
              setTaskForm(null);
            }}
          />
        )}
      </Modal>

      <Modal open={!!delayTask} onClose={() => setDelayTask(null)} title="Why are you putting this off?">
        {delayTask && (
          <DelayForm
            task={delayTask}
            onCancel={() => setDelayTask(null)}
            onSave={async (values) => {
              await api.createLog({ task_id: delayTask.id, ...values });
              await reload();
              setDelayTask(null);
              setToast('Delay logged. Small steps count — try 10 minutes in Focus.');
            }}
          />
        )}
      </Modal>

      <ConfirmDialog {...confirm} open={!!confirm} onClose={() => setConfirm(null)} />
    </AppContext.Provider>
  );
}
