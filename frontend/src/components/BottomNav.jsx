import { BarChart3, House, ListTodo, Timer } from 'lucide-react';

const ITEMS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export default function BottomNav({ current }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = id === current;
          return (
            <li key={id}>
              <a
                href={`#/${id}`}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${active ? 'text-teal-700' : 'text-stone-500 hover:text-stone-800'}`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
