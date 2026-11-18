import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!window.__turnstileLoading) {
    window.__turnstileLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return window.__turnstileLoading;
}

export const turnstileEnabled = SITE_KEY !== '';

// The small "I'm human" box. Calls onToken(token) when passed, onToken('') when it expires or fails.
export default function Turnstile({ onToken }) {
  const box = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let widgetId = null;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widgetId = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          callback: (t) => onToken(t),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken('')
        });
      })
      .catch(() => onToken(''));

    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={box} style={{ margin: '10px 0' }} />;
}