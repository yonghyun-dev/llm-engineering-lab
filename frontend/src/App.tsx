import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ChatMessage } from './components/ChatMessage'
import type { Message } from './types/chat'
import './App.css'

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: '안녕하세요. 여행자보험에 대해 궁금한 내용을 물어보세요.',
    time: '09:30',
  },
  {
    id: 2,
    role: 'user',
    content: '보장 내용과 청구 방법을 간단히 확인하고 싶어요.',
    time: '09:31',
  },
  {
    id: 3,
    role: 'assistant',
    content:
      '좋아요. 질문을 보내면 핵심 답변, 확인할 조건, 다음에 필요한 정보를 정리해드릴게요.',
    time: '09:31',
  },
]

function getCurrentTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')

  const canSend = draft.trim().length > 0
  const questionCount = useMemo(
    () => messages.filter((message) => message.role === 'user').length,
    [messages],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = draft.trim()
    if (!content) return

    const now = getCurrentTime()
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      time: now,
    }

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content:
        '아직 백엔드 LLM은 연결되지 않았어요. 지금은 화면 흐름 확인용 응답입니다.',
      time: now,
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ])
    setDraft('')
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Chat session">
        <div>
          <p className="eyebrow">LLM Lab</p>
          <h1>Travel QA Chat</h1>
        </div>

        <div className="session-summary">
          <div>
            <span>질문</span>
            <strong>{questionCount}</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>Draft</strong>
          </div>
        </div>

        <nav className="chat-list" aria-label="Recent chats">
          <button type="button" className="active-chat">
            여행자보험 QA
          </button>
          <button type="button">Baseline LLM</button>
          <button type="button">RAG 비교</button>
        </nav>
      </aside>

      <section className="chat-panel" aria-label="Chatbot">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Baseline Assistant</p>
            <h2>질문을 입력해보세요</h2>
          </div>
          <span className="status-pill">Ready</span>
        </header>

        <div className="message-list" aria-live="polite">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="message">
            메시지
          </label>
          <textarea
            id="message"
            rows={1}
            value={draft}
            placeholder="메시지를 입력하세요"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" disabled={!canSend}>
            전송
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
