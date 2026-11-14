import { useEffect, useState } from 'react';
import { CircleCheck, Download } from 'lucide-react';

// Chrome/Edge/Android fire `beforeinstallprompt` once, early, when the PWA is installable.
// Catch it at module load (before any component mounts) and keep it until the user taps Install.
let deferredPrompt = null;
let installedNow = false; // installed from this tab, which keeps running in the browser
const subscribers = new Set();
const notify = () => subscribers.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installedNow = true;
  notify();
});

const isInstalled = () =>
  installedNow || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function InstallApp() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    subscribers.add(update);
    return () => subscribers.delete(update);
  }, []);

  const install = async () => {
    const prompt = deferredPrompt;
    deferredPrompt = null; // a prompt event can only be used once
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === 'accepted') installedNow = true;
    notify();
  };

  if (isInstalled())
    return (
      <p className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-sm text-teal-900">
        <CircleCheck className="size-4 shrink-0" aria-hidden /> LaterLess is installed on this device.
      </p>
    );

  if (deferredPrompt)
    return (
      <button type="button" className="btn btn-secondary w-full" onClick={install}>
        <Download className="size-4" aria-hidden /> Install app
      </button>
    );

  // Safari and Firefox have no install prompt API, so explain the manual way.
  return (
    <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-sm text-stone-600">
      <span className="font-medium text-stone-800">Install LaterLess: </span>
      {isIOS()
        ? 'tap the Share button, then “Add to Home Screen”.'
        : 'open your browser menu and choose “Install app” or “Add to Home screen”.'}
    </p>
  );
}
