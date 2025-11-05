'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains('dark'));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains('dark');
    el.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch (_) {}
    setIsDark(next);
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm bg-white text-slate-900 dark:bg-zinc-900 dark:text-slate-100 border-black/10 dark:border-white/10 shadow-sm"
      aria-label="Toggle theme"
      title="Toggle theme"
      type="button"
    >
      <span>{isDark ? 'Dark' : 'Light'}</span>
      <span aria-hidden>{isDark ? '🌙' : '☀️'}</span>
    </button>
  );
}


