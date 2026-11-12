export function ChatMessage({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        {message.content}
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