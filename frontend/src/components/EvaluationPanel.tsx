import { useEffect, useMemo, useState } from 'react'
import {
  getGoldenQaList,
  runBaselineEvaluation,
  type BaselineJudgeRun,
  type GoldenQaItem,
  type JudgeVerdict,
} from '../api/evaluation'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'
type RunState = 'idle' | 'running' | 'done' | 'error'
type ResultFilter = 'all' | JudgeVerdict

export function EvaluationPanel() {
  const [goldenItems, setGoldenItems] = useState<GoldenQaItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [runState, setRunState] = useState<RunState>('idle')
  const [baselineRun, setBaselineRun] = useState<BaselineJudgeRun | null>(null)
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
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
      ? 'Judging'
      : baselineRun
        ? 'Scored'
        : loadState === 'loading'
          ? 'Loading'
          : 'Ready'

  const judgeSummary = useMemo(() => {
    if (!baselineRun) {
      return null
    }

    const passed = baselineRun.items.filter(
      (item) => item.verdict === 'pass',
    ).length
    const failed = baselineRun.items.length - passed
    const averageScore =
      baselineRun.items.reduce((sum, item) => sum + item.score, 0) /
      Math.max(baselineRun.items.length, 1)
    const passRate = passed / Math.max(baselineRun.items.length, 1)

    return {
      passed,
      failed,
      averageScore,
      passRate,
    }
  }, [baselineRun])

  const filteredItems = useMemo(() => {
    if (!baselineRun) {
      return []
    }

    if (resultFilter === 'all') {
      return baselineRun.items
    }

    return baselineRun.items.filter((item) => item.verdict === resultFilter)
  }, [baselineRun, resultFilter])

  async function handleGenerateBaseline() {
    setRunState('running')
    setBaselineRun(null)
    setResultFilter('all')
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
            <span>Baseline Judge</span>
            <strong>
              {baselineRun
                ? `${baselineRun.total}개 채점 완료`
                : '저장된 baseline 답변 채점 대기'}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerateBaseline()}
            disabled={runState === 'running' || loadState !== 'ready'}
          >
            {runState === 'running' ? '채점 중' : 'Judge 실행'}
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

        {judgeSummary ? (
          <div className="eval-scoreboard" aria-live="polite">
            <div>
              <span>Total</span>
              <strong>{baselineRun?.total ?? 0}</strong>
            </div>
            <div>
              <span>Pass</span>
              <strong>{judgeSummary.passed}</strong>
            </div>
            <div>
              <span>Fail</span>
              <strong>{judgeSummary.failed}</strong>
            </div>
            <div>
              <span>Avg Score</span>
              <strong>{judgeSummary.averageScore.toFixed(2)}</strong>
            </div>
            <div>
              <span>Pass Rate</span>
              <strong>{Math.round(judgeSummary.passRate * 100)}%</strong>
            </div>
          </div>
        ) : null}

        {baselineRun ? (
          <div className="eval-filter-bar" aria-label="Judge result filters">
            <button
              type="button"
              className={resultFilter === 'all' ? 'active-filter' : ''}
              onClick={() => setResultFilter('all')}
            >
              전체 {baselineRun.items.length}
            </button>
            <button
              type="button"
              className={resultFilter === 'pass' ? 'active-filter' : ''}
              onClick={() => setResultFilter('pass')}
            >
              Pass {judgeSummary?.passed ?? 0}
            </button>
            <button
              type="button"
              className={resultFilter === 'fail' ? 'active-filter' : ''}
              onClick={() => setResultFilter('fail')}
            >
              Fail {judgeSummary?.failed ?? 0}
            </button>
          </div>
        ) : null}

        {baselineRun ? (
          <div className="eval-result-list" aria-live="polite">
            {filteredItems.map((item, index) => {
              const gold = goldById.get(item.qa_id)
              const question = item.question ?? gold?.question ?? '-'
              const expectedAnswer = item.expected_answer ?? gold?.answer ?? '-'
              const actualAnswer = item.actual_answer ?? '-'
              const questionType = item.question_type ?? gold?.question_type
              const answerMode = item.answer_mode ?? gold?.answer_mode
              const scoreLabel = item.score.toFixed(2)

              return (
                <article className="eval-result-item" key={item.qa_id}>
                  <div className="eval-result-header">
                    <div>
                      <span>#{index + 1}</span>
                      <strong>{item.qa_id}</strong>
                    </div>
                    <div className="eval-result-badges">
                      <span
                        className={`eval-verdict eval-verdict-${item.verdict}`}
                      >
                        {item.verdict.toUpperCase()}
                      </span>
                      <span>Score {scoreLabel}</span>
                      <span>{questionType ?? answerMode ?? 'unknown'}</span>
                    </div>
                  </div>

                  <div className="eval-result-block">
                    <span>질문</span>
                    <p>{question}</p>
                  </div>

                  <div className="eval-result-columns">
                    <div className="eval-result-block">
                      <span>기대 답변</span>
                      <p>{expectedAnswer}</p>
                    </div>
                    <div className="eval-result-block">
                      <span>Baseline 답변</span>
                      <p>{actualAnswer}</p>
                    </div>
                  </div>

                  <div className="eval-result-block">
                    <span>Judge 사유</span>
                    <p>{item.reason}</p>
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
