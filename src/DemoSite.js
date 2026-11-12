import { useState } from 'react';
import './DemoSite.css';

// A made-up company website, only to show how the assistant sits on a real one.
export default function DemoSite() {
  const [open, setOpen] = useState(false);

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
        <div className="widget-frame">
          <iframe title="Assistant" src="/widget" />
        </div>
      )}

      <button
        className={`widget-bubble ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close the assistant' : 'Open the assistant'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}