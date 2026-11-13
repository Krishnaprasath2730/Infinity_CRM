import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const REVEAL_MS = 550;
const FADE_MS = 350;
const THEME_KEY = 'infinity_theme';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/** Centre of the pressed button, or the top-right corner (where the toggle sits). */
function revealOrigin(target) {
  if (target instanceof Element) {
    const rect = target.getBoundingClientRect();
    if (rect.width || rect.height) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }
  return { x: window.innerWidth - 48, y: 32 };
}

export function useThemeToggle() {
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-mui-color-scheme', mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
  }, [mode]);

  const toggle = useCallback(
    (event) => {
      const next = mode === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      const doc = document;
      const apply = () => {
        flushSync(() => setMode(next));
        root.setAttribute('data-theme', next);
        root.setAttribute('data-mui-color-scheme', next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {}
      };

      if (!prefersReducedMotion() && typeof doc.startViewTransition === 'function') {
        const { x, y } = revealOrigin(event?.currentTarget);
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.classList.add('theme-reveal');
        const transition = doc.startViewTransition(apply);
        transition.ready
          .then(() => {
            root.animate(
              { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
              { duration: REVEAL_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
            );
          })
          .catch(() => undefined);
        void transition.finished.finally(() => root.classList.remove('theme-reveal'));
        return;
      }

      root.classList.add('theme-fade');
      apply();
      window.setTimeout(() => root.classList.remove('theme-fade'), FADE_MS + 50);
    },
    [mode],
  );

  return { mode, toggle };
}

export function LightModeOutlinedIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function DarkModeOutlinedIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle({ className = '', style = {}, ...props }) {
  const { mode, toggle } = useThemeToggle();
  const next = mode === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`.trim()}
      style={style}
      onClick={toggle}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      {...props}
    >
      {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
    </button>
  );
}

export default ThemeToggle;
