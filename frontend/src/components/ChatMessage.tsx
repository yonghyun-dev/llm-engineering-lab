import type { Message } from '../types/chat'

type ChatMessageProps = {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <article className={`message message-${message.role}`}>
      <div className="message-meta">
        <span>{message.role === 'assistant' ? 'Assistant' : 'You'}</span>
        <time>{message.time}</time>
      </div>
      <p>{message.content}</p>
    </article>
  )
}
