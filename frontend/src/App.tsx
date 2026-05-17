import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { sendChatMessage } from './api/chat'
import { ChatMessage } from './components/ChatMessage'
import { EvaluationPanel } from './components/EvaluationPanel'
import type { Message } from './types/chat'
import './App.css'

type AppTab = 'chat' | 'evaluation'

function getCurrentTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const canSend = draft.trim().length > 0 && !isSending
  const questionCount = useMemo(
    () => messages.filter((message) => message.role === 'user').length,
    [messages],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setDraft('')
    setErrorMessage('')
    setIsSending(true)

    try {
      const response = await sendChatMessage(content)
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        time: getCurrentTime(),
      }

      setMessages((currentMessages) => [...currentMessages, assistantMessage])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <nav className="app-tabs" aria-label="Primary navigation">
          <button
            type="button"
            className={activeTab === 'chat' ? 'active-tab' : ''}
            onClick={() => setActiveTab('chat')}
          >
            채팅
          </button>
          <button
            type="button"
            className={activeTab === 'evaluation' ? 'active-tab' : ''}
            onClick={() => setActiveTab('evaluation')}
          >
            평가
          </button>
        </nav>
      </header>

      <aside className="sidebar" aria-label="Workspace summary">
        <div>
          <p className="eyebrow">LLM Lab</p>
          <h1>Travel QA Lab</h1>
        </div>

        <div className="session-summary">
          <div>
            <span>{activeTab === 'chat' ? '질문' : '데이터'}</span>
            <strong>{activeTab === 'chat' ? questionCount : 'Gold'}</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>
              {activeTab === 'chat' && isSending ? 'Sending' : 'Ready'}
            </strong>
          </div>
        </div>

        {activeTab === 'chat' ? (
          <nav className="chat-list" aria-label="Recent chats">
            <button type="button" className="active-chat">
              여행자보험 QA
            </button>
            <button type="button">Baseline LLM</button>
            <button type="button">RAG 비교</button>
          </nav>
        ) : (
          <nav className="chat-list" aria-label="Evaluation views">
            <button type="button" className="active-chat">
              Golden QA
            </button>
            <button type="button">Baseline 평가</button>
            <button type="button">결과 비교</button>
          </nav>
        )}
      </aside>

      {activeTab === 'chat' ? (
        <section className="chat-panel" aria-label="Chatbot">
          <header className="chat-header">
            <div>
              <p className="eyebrow">Baseline Assistant</p>
              <h2>질문을 입력해보세요</h2>
            </div>
            <span className="status-pill">Ready</span>
          </header>

          <div className="message-list" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>첫 질문을 입력하면 백엔드 API로 전송됩니다.</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}
            {isSending ? (
              <div className="typing-indicator">답변을 생성하고 있습니다.</div>
            ) : null}
            {errorMessage ? (
              <div className="error-message" role="alert">
                {errorMessage}
              </div>
            ) : null}
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
              {isSending ? '전송 중' : '전송'}
            </button>
          </form>
        </section>
      ) : (
        <EvaluationPanel />
      )}
    </main>
  )
}

export default App
