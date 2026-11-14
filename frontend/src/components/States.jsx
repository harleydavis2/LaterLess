import { CircleAlert, LoaderCircle, WifiOff } from 'lucide-react';

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-stone-100 text-stone-500">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-stone-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function FullScreen({ children }) {
  return <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">{children}</main>;
}

export function Loading() {
  return (
    <FullScreen>
      <LoaderCircle className="size-8 animate-spin text-teal-700" aria-hidden />
      <p className="mt-3 text-sm text-stone-500" role="status">
        Loading LaterLess…
      </p>
    </FullScreen>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <FullScreen>
      <CircleAlert className="size-10 text-red-500" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-stone-500">{message}</p>
      <button className="btn btn-primary mt-5" onClick={onRetry}>
        Try again
      </button>
    </FullScreen>
  );
}

// Offline fallback page: shown when there's no connection and nothing has been cached yet.
export function OfflinePage({ onRetry }) {
  return (
    <FullScreen>
      <WifiOff className="size-10 text-stone-400" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">You're offline</h1>
      <p className="mt-1 text-sm text-stone-500">
        LaterLess needs a connection the first time it loads your data. After that, your tasks stay viewable offline.
      </p>
      <button className="btn btn-primary mt-5" onClick={onRetry}>
        Try again
      </button>
    </FullScreen>
  );
}
