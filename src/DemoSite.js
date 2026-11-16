import { useState, useEffect } from 'react';
import './DemoSite.css';

// A made-up company website, only to show how the assistant sits on a real one.
export default function DemoSite() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // The chat inside the frame asks this page to make the frame bigger or smaller.
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.type === 'orgmind:expand') setExpanded(!!e.data.value);
    };
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleOpen = () => {
    setOpen(o => !o);
    setExpanded(false);
  };

  return (
    <div className="demo-site">
      <header className="demo-nav">
        <strong>Sample Bank</strong>
        <nav>
          <span>Accounts</span>
          <span>Loans</span>
          <span>Cards</span>
          <span>Contact</span>
        </nav>
      </header>

      <section className="demo-hero">
        <h1>Banking made simple</h1>
        <p>Open an account, apply for a loan and manage your money, all in one place.</p>
      </section>

      {open && (
        <div
          className="widget-frame"
          style={expanded ? { top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', borderRadius: 0, zIndex: 1002 } : undefined}
        >
          <iframe title="Assistant" src="/widget" />
        </div>
      )}

      <button
        className={`widget-bubble ${open ? 'open' : ''}`}
        style={expanded ? { display: 'none' } : undefined}
        onClick={toggleOpen}
        aria-label={open ? 'Close the assistant' : 'Open the assistant'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}