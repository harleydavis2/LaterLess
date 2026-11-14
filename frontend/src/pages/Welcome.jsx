import ProfileForm from '../components/ProfileForm.jsx';

export default function Welcome({ onSaved }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <img src="/icons/icon-192.png" alt="" className="size-16 rounded-2xl" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome to LaterLess</h1>
      <p className="mt-2 mb-8 text-sm text-stone-500">Plan your day, track your focus time, and find out why you put things off.</p>
      <ProfileForm submitLabel="Get started" onSaved={onSaved} />
      <p className="mt-4 text-xs text-stone-400">Your data is stored on this app's own server. No account needed.</p>
    </main>
  );
}
