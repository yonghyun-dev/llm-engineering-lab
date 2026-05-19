import { useEffect, useMemo, useState } from 'react'
import {
  getGoldenQaList,
  runBaselineEvaluation,
  type BaselineResponseRun,
  type GoldenQaItem,
} from '../api/evaluation'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'
type RunState = 'idle' | 'running' | 'done' | 'error'

export function EvaluationPanel() {
  const [goldenItems, setGoldenItems] = useState<GoldenQaItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [runState, setRunState] = useState<RunState>('idle')
  const [baselineRun, setBaselineRun] = useState<BaselineResponseRun | null>(
    null,
  )
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadGoldenItems() {
      try {
        const data = await getGoldenQaList()

        if (!isActive) return

        setGoldenItems(data)
        setLoadState(data.length > 0 ? 'ready' : 'empty')
      } catch {
        if (!isActive) return
        setLoadState('error')
      }
    }

    void loadGoldenItems()

    return () => {
      isActive = false
    }
  }, [])

  const summary = useMemo(() => {
    const firstItem = goldenItems[0]

    return {
      count: goldenItems.length,
      dataset: firstItem?.dataset,
      dataset_version: firstItem?.dataset_version,
    }
  }, [goldenItems])

  const goldById = useMemo(
    () => new Map(goldenItems.map((item) => [item.qa_id, item])),
    [goldenItems],
  )

  const statusLabel =
    runState === 'running'
      ? 'Running'
      : baselineRun
        ? 'Generated'
        : loadState === 'loading'
          ? 'Loading'
          : 'Ready'

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
            <strong>{summary.count || 100}</strong>
          </div>
          <div>
            <span>Dataset</span>
            <strong>{summary.dataset ?? '대기 중'}</strong>
          </div>
          <div>
            <span>Version</span>
            <strong>{summary.dataset_version ?? '-'}</strong>
          </div>
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
            {runState === 'running' ? '생성 중' : '응답 생성'}
          </button>
        </div>

        {errorMessage ? (
          <div className="error-message" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {loadState === 'loading' ? (
          <div className="eval-card">
            <p>Golden QA 데이터를 불러오고 있습니다.</p>
          </div>
        ) : null}

        {loadState === 'empty' ? (
          <div className="eval-card">
            <p>Golden QA 데이터가 비어 있습니다.</p>
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="eval-card">
            <p>평가 데이터 API 연결을 확인해 주세요.</p>
          </div>
        ) : null}

        {baselineRun ? (
          <div className="eval-result-list" aria-live="polite">
            {baselineRun.items.map((item, index) => {
              const gold = goldById.get(item.qa_id)

              return (
                <article className="eval-result-item" key={item.qa_id}>
                  <div className="eval-result-header">
                    <div>
                      <span>#{index + 1}</span>
                      <strong>{item.qa_id}</strong>
                    </div>
                    <span>{gold?.question_type ?? item.answer_mode}</span>
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
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}
