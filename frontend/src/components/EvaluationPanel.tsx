import { useEffect, useState } from 'react'
import {
  runBaselineEvaluation,
  getGoldenQaSummary,
  type BaselineResponseRun,
  type GoldenQaSummary,
} from '../api/evaluation'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'
type RunState = 'idle' | 'running' | 'done' | 'error'

export function EvaluationPanel() {
  const [summary, setSummary] = useState<GoldenQaSummary | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [runState, setRunState] = useState<RunState>('idle')
  const [baselineRun, setBaselineRun] = useState<BaselineResponseRun | null>(
    null,
  )
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadSummary() {
      try {
        const data = await getGoldenQaSummary()

        if (!isActive) return

        setSummary(data)
        setLoadState(data?.count ? 'ready' : 'empty')
      } catch {
        if (!isActive) return
        setLoadState('error')
      }
    }

    void loadSummary()

    return () => {
      isActive = false
    }
  }, [])

  const statusLabel =
    runState === 'running'
      ? 'Running'
      : loadState === 'loading'
        ? 'Loading'
        : baselineRun
          ? 'Generated'
          : 'Ready'

  const evaluationTotal = summary?.count ?? 100

  async function handleGenerateBaseline() {
    setRunState('running')
    setBaselineRun(null)
    setErrorMessage('')

    try {
      const result = await runBaselineEvaluation()

      setBaselineRun(result)
      setRunState('done')
    } catch (error) {
      setRunState('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.',
      )
    }
  }

  return (
    <section className="chat-panel eval-panel" aria-label="Evaluation">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Evaluation</p>
          <h2>Golden QA 평가</h2>
        </div>
        <span className="status-pill">{statusLabel}</span>
      </header>

      <div className="eval-content">
        <div className="eval-summary">
          <div>
            <span>Golden QA</span>
            <strong>{evaluationTotal}</strong>
          </div>
          <div>
            <span>Dataset</span>
            <strong>{summary?.dataset ?? '대기 중'}</strong>
          </div>
          <div>
            <span>Version</span>
            <strong>{summary?.dataset_version ?? '-'}</strong>
          </div>
        </div>

        <div className="eval-card">
          {loadState === 'loading' ? (
            <p>서버에서 golden QA 상태를 확인하고 있습니다.</p>
          ) : null}
          {loadState === 'ready' ? (
            <p>
              먼저 baseline LLM이 각 golden QA 질문에 어떤 답을 생성하는지
              확인합니다. 채점은 다음 단계에서 이 결과를 다시 보내 수행합니다.
            </p>
          ) : null}
          {loadState === 'empty' ? (
            <p>golden QA 요약 응답을 기다리는 중입니다.</p>
          ) : null}
          {loadState === 'error' ? (
            <p>평가 데이터 API 연결을 확인해 주세요.</p>
          ) : null}
        </div>

        <div className="eval-run-bar">
          <div>
            <span>Baseline LLM</span>
            <strong>
              {baselineRun
                ? `${baselineRun.total}개 응답 생성 완료`
                : '응답 생성 대기'}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerateBaseline()}
            disabled={runState === 'running' || loadState !== 'ready'}
          >
            {runState === 'running' ? '생성 중' : 'Baseline 응답 생성'}
          </button>
        </div>

        {errorMessage ? (
          <div className="error-message" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {baselineRun ? (
          <div className="eval-result-list" aria-live="polite">
            {baselineRun.items.map((item, index) => (
              <article className="eval-result-item" key={item.qa_id}>
                <div className="eval-result-header">
                  <div>
                    <span>#{index + 1}</span>
                    <strong>{item.qa_id}</strong>
                  </div>
                  <span>{item.answer_mode}</span>
                </div>

                <div className="eval-result-block">
                  <span>질문</span>
                  <p>{item.question}</p>
                </div>

                <div className="eval-result-columns">
                  <div className="eval-result-block">
                    <span>기대 답변</span>
                    <p>{item.expected ?? '-'}</p>
                  </div>
                  <div className="eval-result-block">
                    <span>생성 답변</span>
                    <p>{item.actual}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
