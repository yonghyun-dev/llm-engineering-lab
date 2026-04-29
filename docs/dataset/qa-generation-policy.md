# QA Generation Policy

Status: Draft  
Purpose: define how QA candidates are created, reviewed, accepted, rejected, and frozen.  
Rule: do not generate the final QA dataset until source snapshots and schemas are accepted.

## 1. Goal

The QA set must separate Baseline LLM, RAG, and Agent behavior.

It should reward:

- grounded answers.
- correct evidence.
- source authority judgment.
- clarification when user conditions are missing.
- abstention when the corpus is insufficient.

It should punish:

- generic insurance answers.
- confident answers without corpus support.
- using Insurance Damoa as final coverage authority when Samsung terms are required.
- ignoring rider conditions.
- answering questions about out-of-scope providers in v1.

## 2. Candidate Generation Flow

```text
section/chunk inventory
  |
  v
candidate templates by question type
  |
  v
draft question + proposed answer + proposed evidence
  |
  v
human review
  |
  +--> reject with reason
  |
  +--> revise and re-review
  |
  +--> accept into gold
```

## 3. Required QA Mix

Target v1 size: 80-150 accepted gold questions.

Minimum distribution:

| Type | Minimum Share | Why |
|---|---:|---|
| direct lookup | 20% | verifies basic retrieval |
| numeric threshold | 10% | contamination-resistant details |
| coverage inclusion/exclusion | 15% | core insurance behavior |
| rider dependency | 10% | tests condition handling |
| multi-source synthesis | 10% | gives Agent room to win |
| source authority | 10% | tests Damoa vs Samsung handling |
| clarification-needed | 10% | tests missing condition behavior |
| abstention | 10% | tests closed-corpus discipline |
| evidence conflict | 5% | tests careful comparison |

These percentages can overlap by label, but the final set must not be mostly direct lookup.

## 4. Question Writing Rules

### 4.1 Good Questions

Good questions have these properties:

- answerable from frozen corpus only.
- specific to Samsung or Insurance Damoa v1 sources.
- tied to a source type.
- requires evidence citation.
- avoids asking for personal advice.
- includes user conditions when conditions matter.

Examples:

- v1 corpus 기준, 삼성화재 다이렉트 해외여행보험 상품 페이지에서 보험기간은 최대 얼마까지로 안내되는가?
- v1 corpus 기준, 가족/동반형 가입 시 본인 외 가족/동반 가입자의 사망담보 가입 가능 여부는 어떻게 안내되는가?
- v1 corpus 기준, 항공기 지연 claim page에서 앱 청구 흐름은 어떤 단계로 안내되는가?
- v1 corpus 기준, 보험다모아 비교 결과는 실제 보험료와 다를 수 있는가? 근거를 들어 답하라.

### 4.2 Bad Questions

Reject questions like:

- 해외여행보험은 필요한가요?
- 삼성화재 여행보험이 제일 좋은가요?
- 일본 여행 갈 때 어떤 보험을 가입해야 하나요?
- 보험금 받을 수 있을까요?
- 해외여행보험 일반 보장 범위를 설명해 주세요.

These are too general, advice-seeking, or not closed-corpus grounded.

## 5. Answer Modes

Every QA item must choose one answer mode.

| Mode | Meaning | Expected System Behavior |
|---|---|---|
| `answer` | corpus contains enough evidence | answer with source evidence |
| `clarify` | corpus may answer only after missing user condition is provided | ask a focused clarification question |
| `abstain` | corpus does not contain enough information | say it cannot be answered from corpus |

Clarification example:

Question: "동반자도 사망담보에 가입할 수 있나요?"  
Expected: clarify whether the question means internet family/companion enrollment flow and whether the person is the applicant or non-applicant companion.

Abstention example:

Question: "KakaoPay 해외여행보험의 휴대품 손해 한도는 얼마인가요?"  
Expected: v1 corpus does not include KakaoPay Insurance, so abstain.

## 6. Evidence Rules

Accepted gold questions need evidence spans.

Evidence span requirements:

- original Korean text preferred.
- source ID required.
- section ID required.
- chunk ID preferred.
- exact span locator required.
- span must support the answer directly.

If the answer uses multiple facts, include multiple evidence spans.

If the answer is abstention, evidence should support scope limitation, such as source inventory or absence marker, not an unrelated text snippet.

## 7. Source Authority Rules

When documents differ:

1. official terms win over product guide.
2. product guide wins over product page.
3. claim page can answer procedure, not final coverage eligibility.
4. Insurance Damoa can answer comparison-display questions, not final Samsung coverage conditions.
5. third-party pages are excluded from v1 gold evidence.

Question authors must mark `requires_source_authority = true` when the answer depends on this ordering.

## 8. Human Review Policy

Each candidate must be reviewed before gold acceptance.

Reviewer tasks:

1. Check whether the question is in v1 scope.
2. Check whether answer mode is correct.
3. Check whether the proposed answer is supported by evidence.
4. Check whether source authority is correct.
5. Check whether the question creates legal or financial advice risk.
6. Accept, reject, or request rewrite.

Recommended reviewer roles:

- reviewer A: insurance document reader.
- reviewer B: LLM/RAG evaluation reviewer.

If reviewers disagree:

- mark `ambiguous`.
- do not include in gold until resolved.
- if useful, rewrite into a clarification-needed question.

## 9. Rejection Reasons

Use one of these rejection labels:

- `out_of_scope`
- `too_general`
- `not_grounded`
- `evidence_missing`
- `evidence_too_weak`
- `wrong_authority`
- `requires_personal_advice`
- `duplicate`
- `parser_uncertain`
- `ambiguous_wording`
- `condition_missing_but_not_marked_clarify`
- `other`

## 10. Legal And Safety Policy

Gold answers must be phrased as document-grounded statements.

Allowed:

- "v1 corpus의 삼성화재 상품 페이지에는 ...라고 안내되어 있습니다."
- "수집된 문서만으로는 해당 provider의 보장 한도를 확인할 수 없습니다."

Avoid:

- "가입하는 것이 좋습니다."
- "이 경우 보험금을 받을 수 있습니다."
- "당신은 보장 대상입니다."

The dataset tests reading and evidence use. It does not give insurance advice.

## 11. Contamination Control

Baseline LLM may know generic travel insurance facts. To reduce contamination:

- prefer snapshot-specific details.
- include source-authority questions.
- include abstention questions.
- require citations.
- include negative provider questions outside v1.
- avoid common FAQ questions unless tied to a source span.

## 12. QA Acceptance Checklist

A QA item can enter gold only if:

- question is in Korean or intentionally bilingual.
- answer mode is set.
- source IDs are present.
- evidence spans are valid.
- source authority is correct.
- reviewer accepted it.
- legal/financial risk is acceptable.
- scoring notes explain what counts as wrong.

## 13. Dataset Balance Report

Before freeze, generate a balance report manually or later by script:

- total candidates.
- accepted gold count.
- rejected count by reason.
- count by question type.
- count by answer mode.
- count by source.
- count by authority level.
- count by difficulty.
- reviewer disagreement rate.

Do not freeze if one source or one question type dominates the dataset.

