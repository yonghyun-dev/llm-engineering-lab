export type GoldenQaSummary = {
  count?: number
  dataset?: string | null
  dataset_version?: string | null
}

export type GoldenQaItem = {
  qa_id: string
  question: string
  answer: string | null
  answer_mode: string
  dataset: string
  dataset_version: string
  difficulty?: string | null
  question_type?: string | null
  evidence_span_ids?: string[]
  source_ids?: string[]
  scoring_notes?: string | null
  authority_requirement?: string | null
  clarification_prompt?: string | null
}

export type JudgeVerdict = 'pass' | 'fail'

export type BaselineJudgeItem = {
  qa_id: string
  question?: string
  expected_answer?: string | null
  actual_answer?: string
  answer_mode?: string
  question_type?: string | null
  scoring_notes?: string | null
  clarification_prompt?: string | null
  verdict: JudgeVerdict
  score: number
  reason: string
}

export type LlmJudgeResult = {
  qa_id: string
  verdict: JudgeVerdict
  score: number
  reason: string
}

export type BaselineJudgeRun = {
  target: 'baseline_judge'
  total: number
  items: BaselineJudgeItem[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// 서버 응답이 예상한 배열 형태인지 확인하고, Golden QA로 다룰 수 있는 항목만 남깁니다.
function toGoldenQaItems(data: unknown): GoldenQaItem[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((item): item is GoldenQaItem => {
    if (!item || typeof item !== 'object') return false

    const candidate = item as Partial<GoldenQaItem>

    return (
      typeof candidate.qa_id === 'string' &&
      typeof candidate.question === 'string' &&
      typeof candidate.answer_mode === 'string'
    )
  })
}

// Golden QA 목록의 첫 항목 메타데이터를 이용해 화면 상단 요약 정보를 만듭니다.
function toGoldenQaSummary(items: GoldenQaItem[]): GoldenQaSummary {
  const firstItem = items[0]

  return {
    count: items.length,
    dataset: firstItem?.dataset,
    dataset_version: firstItem?.dataset_version,
  }
}

// Golden QA 원본 목록을 가져옵니다. 평가 화면에서는 이 메타데이터로 결과를 보강합니다.
export async function getGoldenQaList(): Promise<GoldenQaItem[]> {
  const response = await fetch(`${API_BASE_URL}/eval/goldQAList`)

  if (!response.ok) {
    throw new Error('평가 데이터를 가져오지 못했습니다.')
  }

  const data = (await response.json()) as unknown
  return toGoldenQaItems(data)
}

// Golden QA 목록을 불러온 뒤, 개수/데이터셋/버전만 추려서 반환합니다.
export async function getGoldenQaSummary(): Promise<GoldenQaSummary | null> {
  const items = await getGoldenQaList()
  return toGoldenQaSummary(items)
}

function toBaselineJudgeRun(data: unknown): BaselineJudgeRun {
  if (!data || typeof data !== 'object') {
    throw new Error('Baseline Judge 응답 형식이 올바르지 않습니다.')
  }

  const candidate = data as Partial<BaselineJudgeRun>

  if (candidate.target !== 'baseline_judge' || !Array.isArray(candidate.items)) {
    throw new Error('Baseline Judge 응답 형식이 올바르지 않습니다.')
  }

  const items = candidate.items.filter((item): item is BaselineJudgeItem => {
    if (!item || typeof item !== 'object') return false

    const judgeItem = item as Partial<BaselineJudgeItem>

    return (
      typeof judgeItem.qa_id === 'string' &&
      (judgeItem.verdict === 'pass' || judgeItem.verdict === 'fail') &&
      typeof judgeItem.score === 'number' &&
      typeof judgeItem.reason === 'string'
    )
  })

  return {
    target: 'baseline_judge',
    total: typeof candidate.total === 'number' ? candidate.total : items.length,
    items,
  }
}

// 저장된 baseline 답변을 LLM Judge로 채점하고, 화면에 표시할 결과 묶음을 요청합니다.
export async function runBaselineEvaluation(): Promise<BaselineJudgeRun> {
  const response = await fetch(`${API_BASE_URL}/eval/baseline`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Baseline 응답 생성에 실패했습니다.')
  }

  const data = (await response.json()) as unknown
  return toBaselineJudgeRun(data)
}
