import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The model sometimes writes <br> inside tables. Turn those into spaces before showing the text.
const clean = (text) => (text || '').replace(/<br\s*\/?>/gi, ' ');

export function ChatMessage({ message }) {
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
      </div>
    </div>
  );
}