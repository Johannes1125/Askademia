"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const el = document.documentElement;
      const stored = localStorage.getItem("theme");
      if (stored === "dark") {
        el.classList.add("dark");
        setIsDark(true);
      } else if (stored === "light") {
        el.classList.remove("dark");
        setIsDark(false);
      } else {
        // follow system preference if no stored value
        const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
        el.classList.toggle("dark", prefers);
        setIsDark(prefers);
      }
    } catch (_) {}
  }, []);

  function toggle() {
    try {
      const el = document.documentElement;
      const next = !el.classList.contains("dark");
      el.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      setIsDark(next);
    } catch (_) {}
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={isDark}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      type="button"
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2`}
      style={{
        background: "var(--card)",
        color: "var(--foreground)",
        borderColor: "var(--border)",
      }}
    >
      <span className="sr-only">Toggle color theme</span>
      <span aria-hidden className="text-sm">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span className="text-sm font-medium">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}


