export type GoldenQaSummary = {
  count?: number
  dataset?: string | null
  dataset_version?: string | null
}

export type BaselineResponseItem = {
  qa_id: string
  question: string
  expected: string | null
  actual: string
  answer_mode: string
}

export type BaselineResponseRun = {
  target: 'baseline'
  total: number
  items: BaselineResponseItem[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

function toGoldenQaSummary(data: unknown): GoldenQaSummary | null {
  if (Array.isArray(data)) {
    const firstItem = data[0] as GoldenQaSummary | undefined

    return {
      count: data.length,
      dataset: firstItem?.dataset,
      dataset_version: firstItem?.dataset_version,
    }
  }

  if (data && typeof data === 'object') {
    return data as GoldenQaSummary
  }

  return null
}

export async function getGoldenQaSummary(): Promise<GoldenQaSummary | null> {
  const response = await fetch(`${API_BASE_URL}/eval/goldQAList`)

  if (!response.ok) {
    throw new Error('평가 데이터를 가져오지 못했습니다.')
  }

  const data = (await response.json()) as unknown
  return toGoldenQaSummary(data)
}

export async function runBaselineEvaluation(): Promise<BaselineResponseRun> {
  const response = await fetch(`${API_BASE_URL}/eval/baseline`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Baseline 응답 생성에 실패했습니다.')
  }

  return response.json() as Promise<BaselineResponseRun>
}
