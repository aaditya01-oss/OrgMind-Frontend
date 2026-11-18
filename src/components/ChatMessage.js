import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_URL } from '../shared';

// The model sometimes writes <br> inside tables. Turn those into spaces before showing the text.
const clean = (text) => (text || '').replace(/<br\s*\/?>/gi, ' ');

const row = { fontSize: 12, color: '#6b7280', marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const pill = { border: '1px solid #d6dbe6', background: '#fff', borderRadius: 14, padding: '2px 10px', cursor: 'pointer', fontSize: 13 };

// Thumbs up/down under an answer. A 👍 sends only the rating; a 👎 also sends the question,
// the answer and an optional reason, so an admin can see what to improve.
function Rating({ message, token }) {
  const [state, setState] = useState('idle');   // idle | reason | sending | thanks | failed
  const [note, setNote] = useState('');

  const send = async (rating, reason) => {
    setState('sending');
    try {
      await axios.post(`${API_URL}/feedback`,
        { rating, question: message.question, answer: message.content, note: reason || '' },
        { headers: { Authorization: `Bearer ${token}` } });
      setState('thanks');
    } catch (e) {
      setState('failed');
    }
  };

  if (state === 'thanks') return <div style={row}>Thanks for the feedback.</div>;
  if (state === 'sending') return <div style={row}>Sending…</div>;

  if (state === 'reason') {
    return (
      <div style={row}>
        <input
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was wrong? (optional)"
          style={{ flex: 1, minWidth: 160, padding: '4px 8px', border: '1px solid #d6dbe6', borderRadius: 8, fontSize: 13 }}
        />
        <button style={pill} onClick={() => send('down', note)}>Send</button>
        <button style={pill} onClick={() => setState('idle')}>Cancel</button>
      </div>
    );
  }

  return (
    <div style={row}>
      <span>{state === 'failed' ? 'Could not send. Try again:' : 'Was this helpful?'}</span>
      <button style={pill} title="Helpful" onClick={() => send('up')}>👍</button>
      <button style={pill} title="Not helpful" onClick={() => setState('reason')}>👎</button>
    </div>
  );
}

export function ChatMessage({ message, token }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        {message.role === 'assistant' ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean(message.content)}</ReactMarkdown>
        ) : (
          message.content
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="sources">
            <span className="sources-label">Sources:</span>
            {message.sources.map(name => (
              <span key={name} className="source-chip">{name}</span>
            ))}
          </div>
        )}
        {token && message.role === 'assistant' && message.question && (
          <Rating message={message} token={token} />
        )}
      </div>
    </div>
  );
}