import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../api.js';

// Sign in and sign up share one screen; the tabs switch between the two forms.
export default function Auth({ onDone }) {
  const [mode, setMode] = useState('signin');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === 'signup';
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value });

  const switchTo = (m) => {
    setMode(m);
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (signup ? api.signup(values) : api.login({ email: values.email, password: values.password }));
      await onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="text-center">
        <img src="/icons/icon-192.png" alt="" className="mx-auto size-14 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{signup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1.5 text-sm text-stone-500">
          {signup ? 'Track what you put off, and why.' : 'Sign in to see your tasks and progress.'}
        </p>
      </div>

      <div role="group" aria-label="Choose sign in or sign up" className="mt-8 mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-medium">
        {[
          ['signin', 'Sign in'],
          ['signup', 'Sign up'],
        ].map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => switchTo(m)}
            className={`rounded-lg py-2 transition-colors ${mode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {signup && (
          <div>
            <label htmlFor="name" className="label">
              Name
            </label>
            <input id="name" className="input" required maxLength={50} autoComplete="name" value={values.name} onChange={set('name')} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" type="email" className="input" required maxLength={254} autoComplete="email" value={values.email} onChange={set('email')} />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-11"
              required
              minLength={signup ? 8 : undefined}
              maxLength={128}
              autoComplete={signup ? 'new-password' : 'current-password'}
              aria-describedby={signup ? 'password-hint' : undefined}
              value={values.password}
              onChange={set('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-stone-500 hover:text-stone-800"
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
          {signup && (
            <p id="password-hint" className="mt-1.5 text-xs text-stone-500">
              At least 8 characters.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full py-3" disabled={busy}>
          {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        {signup ? 'Already have an account? ' : 'New to LaterLess? '}
        <button type="button" className="font-medium text-teal-700 hover:underline" onClick={() => switchTo(signup ? 'signin' : 'signup')}>
          {signup ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </main>
  );
}
