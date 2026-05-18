import { useEffect, useMemo, useState } from 'react'
import {
  getGoldenQaList,
  runBaselineEvaluation,
  type BaselineResponseItem,
  type BaselineResponseRun,
  type GoldenQaItem,
} from '../api/evaluation'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'
type RunState = 'idle' | 'running' | 'done' | 'error'
type EvaluationFilter = 'all' | 'pass' | 'review' | 'fail'
type Verdict = 'pass' | 'review' | 'fail'
type Polarity = 'positive' | 'negative' | null

type SystemEvaluation = {
  qa_id: string
  score: number
  verdict: Verdict
  reasons: string[]
  coverageScore: number
  numericScore: number
  polarityScore: number
  modeScore: number
}

type EvaluatedItem = BaselineResponseItem & {
  gold?: GoldenQaItem
  system?: SystemEvaluation
}

const FILTERS: { id: EvaluationFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'fail', label: '실패' },
  { id: 'review', label: '검토필요' },
  { id: 'pass', label: '통과' },
]

const STOP_WORDS = new Set([
  '아니요',
  '네',
  '상품',
  '페이지',
  '안내',
  '합니다',
  '됩니다',
  '있는',
  '없는',
  '경우',
  '기준',
  '보험',
  '해당',
  '관련',
  '대한',
  '통해',
  '전',
  '후',
])

const NEGATIVE_TERMS = [
  '아니요',
  '않',
  '안 됩니다',
  '안됩니다',
  '없',
  '제외',
  '불가',
  '불가능',
  '하지 않습니다',
  '중복보상하지',
  '보상하지',
]

const POSITIVE_TERMS = [
  '네',
  '가능',
  '보장',
  '포함',
  '제공',
  '적용',
  '보상',
]

const NUMBER_PATTERN =
  /[0-9]+(?:\.[0-9]+)?\s*(?:년|월|일|시간|명|인|만원|억원|%|퍼센트)?/g

function normalizeText(text: string) {
  return text.toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim()
}

function compactText(text: string) {
  return normalizeText(text).replace(/\s+/g, '')
}

function includesLoose(haystack: string, needle: string) {
  return compactText(haystack).includes(compactText(needle))
}

function extractNumbers(text: string) {
  return Array.from(text.matchAll(NUMBER_PATTERN), ([match]) =>
    compactText(match),
  ).filter(Boolean)
}

function extractMeaningTokens(text: string) {
  return Array.from(
    new Set(
      normalizeText(text)
        .split(/[^\p{L}\p{N}.%]+/u)
        .map((token) => token.replace(/^[.,!?]+|[.,!?]+$/g, ''))
        .filter((token) => token.length >= 2)
        .filter((token) => !STOP_WORDS.has(token)),
    ),
  )
}

function detectPolarity(text: string): Polarity {
  const normalized = normalizeText(text)

  if (NEGATIVE_TERMS.some((term) => normalized.includes(term))) {
    return 'negative'
  }

  if (POSITIVE_TERMS.some((term) => normalized.includes(term))) {
    return 'positive'
  }

  return null
}

function getModeScore(answerMode: string, actual: string) {
  const normalized = normalizeText(actual)

  if (answerMode === 'abstention') {
    return /모르|확인|제공할 수|답변할 수|가진 문서|범위/.test(normalized)
      ? 1
      : 0.35
  }

  if (answerMode === 'clarification') {
    return /확인|알려|어떤|추가|구체|다시|\?/.test(normalized) ? 1 : 0.45
  }

  return actual.trim().length >= 8 ? 1 : 0.4
}

function getVerdict(score: number, hasHardFail: boolean): Verdict {
  if (hasHardFail) return 'fail'
  if (score >= 0.78) return 'pass'
  if (score <= 0.52) return 'fail'
  return 'review'
}

function evaluateSystem(item: BaselineResponseItem, gold?: GoldenQaItem) {
  const expected = item.expected ?? gold?.answer ?? ''
  const actual = item.actual
  const questionType = gold?.question_type ?? ''
  const expectedNumbers = extractNumbers(expected)
  const actualNumbers = extractNumbers(actual)
  const expectedPolarity = detectPolarity(expected)
  const actualPolarity = detectPolarity(actual)
  const expectedTokens = extractMeaningTokens(expected).slice(0, 12)
  const matchedTokens = expectedTokens.filter((token) =>
    includesLoose(actual, token),
  )

  const coverageScore =
    expectedTokens.length > 0 ? matchedTokens.length / expectedTokens.length : 0.6
  const numericScore =
    expectedNumbers.length > 0
      ? expectedNumbers.filter((number) =>
          actualNumbers.some((actualNumber) => actualNumber === number),
        ).length / expectedNumbers.length
      : 1
  const polarityScore = expectedPolarity
    ? expectedPolarity === actualPolarity
      ? 1
      : actualPolarity === null
        ? 0.45
        : 0
    : 1
  const modeScore = getModeScore(item.answer_mode, actual)

  let score =
    coverageScore * 0.4 +
    numericScore * 0.25 +
    polarityScore * 0.2 +
    modeScore * 0.15

  if (questionType === 'numeric_threshold') {
    score =
      numericScore * 0.5 +
      coverageScore * 0.25 +
      polarityScore * 0.15 +
      modeScore * 0.1
  }

  if (
    questionType === 'coverage_exclusion' ||
    questionType === 'coverage_inclusion'
  ) {
    score =
      polarityScore * 0.42 +
      coverageScore * 0.28 +
      numericScore * 0.18 +
      modeScore * 0.12
  }

  if (questionType === 'source_authority') {
    const authorityScore = /약관|상품설명서|보험다모아|공식|비교|출처/.test(
      normalizeText(actual),
    )
      ? 1
      : 0.45

    score =
      authorityScore * 0.35 +
      coverageScore * 0.3 +
      polarityScore * 0.2 +
      modeScore * 0.15
  }

  const reasons: string[] = []
  const missingNumbers = expectedNumbers.filter(
    (number) => !actualNumbers.some((actualNumber) => actualNumber === number),
  )
  const hasPolarityMismatch =
    expectedPolarity !== null &&
    actualPolarity !== null &&
    expectedPolarity !== actualPolarity

  if (missingNumbers.length > 0) {
    reasons.push(`필수 숫자/단위 누락: ${missingNumbers.join(', ')}`)
  }

  if (hasPolarityMismatch) {
    reasons.push('기대 답변과 긍정/부정 방향이 다릅니다.')
  }

  if (coverageScore < 0.45) {
    reasons.push('기대 답변의 핵심 표현과 겹치는 부분이 적습니다.')
  }

  if (modeScore < 0.8) {
    reasons.push(`${item.answer_mode} 응답 방식과 맞는지 확인이 필요합니다.`)
  }

  if (reasons.length === 0) {
    reasons.push('핵심 값과 답변 방향이 일치합니다.')
  }

  const hasHardFail =
    hasPolarityMismatch ||
    (questionType === 'numeric_threshold' && missingNumbers.length > 0)

  return {
    qa_id: item.qa_id,
    score,
    verdict: getVerdict(score, hasHardFail),
    reasons,
    coverageScore,
    numericScore,
    polarityScore,
    modeScore,
  }
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}`
}

function getVerdictLabel(verdict?: Verdict) {
  if (verdict === 'pass') return '통과'
  if (verdict === 'fail') return '실패'
  if (verdict === 'review') return '검토필요'
  return '대기'
}

export function EvaluationPanel() {
  const [goldenItems, setGoldenItems] = useState<GoldenQaItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [runState, setRunState] = useState<RunState>('idle')
  const [baselineRun, setBaselineRun] = useState<BaselineResponseRun | null>(
    null,
  )
  const [systemResults, setSystemResults] = useState<SystemEvaluation[]>([])
  const [filter, setFilter] = useState<EvaluationFilter>('all')
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

  const systemById = useMemo(
    () => new Map(systemResults.map((item) => [item.qa_id, item])),
    [systemResults],
  )

  const evaluatedItems = useMemo<EvaluatedItem[]>(() => {
    if (!baselineRun) return []

    return baselineRun.items.map((item) => ({
      ...item,
      gold: goldById.get(item.qa_id),
      system: systemById.get(item.qa_id),
    }))
  }, [baselineRun, goldById, systemById])

  const evaluationStats = useMemo(() => {
    const pass = systemResults.filter((item) => item.verdict === 'pass').length
    const fail = systemResults.filter((item) => item.verdict === 'fail').length
    const review = systemResults.filter(
      (item) => item.verdict === 'review',
    ).length
    const average =
      systemResults.length > 0
        ? systemResults.reduce((sum, item) => sum + item.score, 0) /
          systemResults.length
        : 0

    return {
      pass,
      fail,
      review,
      average,
      total: systemResults.length,
    }
  }, [systemResults])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return evaluatedItems

    return evaluatedItems.filter((item) => item.system?.verdict === filter)
  }, [evaluatedItems, filter])

  const statusLabel =
    runState === 'running'
      ? 'Running'
      : systemResults.length > 0
        ? 'Scored'
        : baselineRun
          ? 'Generated'
          : loadState === 'loading'
            ? 'Loading'
            : 'Ready'

  async function handleGenerateBaseline() {
    setRunState('running')
    setBaselineRun(null)
    setSystemResults([])
    setFilter('all')
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

  function handleRunSystemEvaluation() {
    if (!baselineRun) return

    const results = baselineRun.items.map((item) =>
      evaluateSystem(item, goldById.get(item.qa_id)),
    )

    setSystemResults(results)
    setFilter(results.some((item) => item.verdict === 'fail') ? 'fail' : 'all')
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

        <div className="eval-scoreboard">
          <div>
            <span>응답 생성</span>
            <strong>{baselineRun ? baselineRun.total : 0}</strong>
          </div>
          <div>
            <span>평균 점수</span>
            <strong>
              {systemResults.length > 0
                ? formatScore(evaluationStats.average)
                : '-'}
            </strong>
          </div>
          <div>
            <span>통과</span>
            <strong>{evaluationStats.pass}</strong>
          </div>
          <div>
            <span>검토필요</span>
            <strong>{evaluationStats.review}</strong>
          </div>
          <div>
            <span>실패</span>
            <strong>{evaluationStats.fail}</strong>
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
          <div className="eval-actions">
            <button
              type="button"
              onClick={() => void handleGenerateBaseline()}
              disabled={runState === 'running' || loadState !== 'ready'}
            >
              {runState === 'running' ? '생성 중' : '응답 생성'}
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={handleRunSystemEvaluation}
              disabled={!baselineRun || runState === 'running'}
            >
              시스템 평가
            </button>
          </div>
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

        {loadState === 'error' ? (
          <div className="eval-card">
            <p>평가 데이터 API 연결을 확인해 주세요.</p>
          </div>
        ) : null}

        {baselineRun ? (
          <div className="eval-filter-bar" aria-label="Evaluation filters">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={filter === item.id ? 'active-filter' : ''}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {baselineRun ? (
          <div className="eval-result-list" aria-live="polite">
            {filteredItems.map((item, index) => (
              <article className="eval-result-item" key={item.qa_id}>
                <div className="eval-result-header">
                  <div>
                    <span>#{index + 1}</span>
                    <strong>{item.qa_id}</strong>
                  </div>
                  <div className="eval-result-badges">
                    <span>{item.gold?.question_type ?? item.answer_mode}</span>
                    <span
                      className={`eval-verdict eval-verdict-${item.system?.verdict ?? 'pending'}`}
                    >
                      {getVerdictLabel(item.system?.verdict)}
                    </span>
                  </div>
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

                {item.system ? (
                  <div className="eval-judge-grid">
                    <div className="eval-score-card">
                      <span>시스템 점수</span>
                      <strong>{formatScore(item.system.score)}</strong>
                    </div>
                    <div className="eval-mini-metrics">
                      <div>
                        <span>핵심표현</span>
                        <strong>{formatScore(item.system.coverageScore)}</strong>
                      </div>
                      <div>
                        <span>숫자</span>
                        <strong>{formatScore(item.system.numericScore)}</strong>
                      </div>
                      <div>
                        <span>방향성</span>
                        <strong>{formatScore(item.system.polarityScore)}</strong>
                      </div>
                      <div>
                        <span>응답방식</span>
                        <strong>{formatScore(item.system.modeScore)}</strong>
                      </div>
                    </div>
                    <div className="eval-reason-list">
                      <span>판정 사유</span>
                      <ul>
                        {item.system.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="eval-llm-slot">
                      <span>LLM Judge</span>
                      <strong>대기</strong>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
