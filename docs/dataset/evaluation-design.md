# Evaluation Design

Status: Draft  
Purpose: define how Baseline LLM, RAG, and Agent systems will be compared later.  
Implementation status: no harness yet.

## 1. Evaluation Principle

All systems answer the same gold questions. What differs is the allowed context and allowed actions.

The evaluation is not "which system sounds better." It is:

- Did the system answer from the frozen corpus?
- Did it cite the right evidence?
- Did it know when not to answer?
- Did it handle source authority correctly?
- Did it ask for clarification when the question was underspecified?

## 2. System Definitions

### 2.1 Baseline LLM

Allowed input:

- question
- system instruction explaining closed-corpus rule

Not allowed:

- retrieved chunks
- source manifest
- web search
- tools

Expected behavior:

- answer only when the question can be answered without pretending corpus access.
- otherwise abstain.

Why this matters:

Baseline LLMs may know generic travel insurance facts. Unsupported confidence is the failure mode.

### 2.2 RAG Single-Pass

Allowed input:

- question
- top-k chunks from one retrieval pass
- minimal chunk metadata

Not allowed:

- query rewrite loops
- second retrieval pass
- web search
- clarification loop
- external sources

Expected behavior:

- answer from retrieved chunks.
- cite retrieved evidence.
- abstain if retrieved evidence is insufficient.

Record separately:

- retrieval miss: correct evidence was not retrieved.
- generation miss: evidence was retrieved but answer was wrong.

### 2.3 Agent

Allowed actions:

- multiple searches over frozen corpus.
- query rewriting.
- source manifest lookup.
- source authority comparison.
- evidence comparison.
- clarification request for questions marked `clarify`.
- abstention.

Not allowed:

- live web access.
- out-of-corpus provider lookup.
- changing the question.
- using unstated personal assumptions.

Expected behavior:

- spend more steps only when needed.
- identify missing conditions.
- compare Samsung official documents against Insurance Damoa when authority matters.
- cite final evidence.

## 3. Evaluation Flow

```text
gold QA
  |
  +--> baseline LLM prompt
  |       |
  |       v
  |    baseline answer
  |
  +--> RAG single retrieval
  |       |
  |       v
  |    RAG answer + retrieved chunks
  |
  +--> Agent corpus tools
          |
          v
       Agent answer + tool trace

all outputs
  |
  v
scoring rubric
  |
  v
comparison report
```

## 4. Metrics

Primary metrics:

| Metric | Meaning |
|---|---|
| answer correctness | answer matches gold answer mode and content |
| evidence correctness | cited evidence supports answer |
| citation precision | citation is specific enough, not just whole document |
| abstention correctness | abstains when gold says abstain |
| clarification correctness | asks necessary missing-condition question |
| source authority correctness | uses the highest required authority source |
| unsupported claim rate | claims not supported by cited evidence |

Operational metrics:

| Metric | Meaning |
|---|---|
| latency | total response time |
| token usage | prompt + completion tokens |
| tool calls | Agent only |
| retrieval count | RAG and Agent |
| cost estimate | provider-specific later |
| run stability | answer variance across repeated runs |

## 5. Scoring Rubric

Each answer receives a score from 0 to 5.

| Score | Meaning |
|---:|---|
| 5 | correct answer mode, correct answer, correct evidence, no unsupported claims |
| 4 | correct answer and evidence, minor wording issue |
| 3 | partially correct, evidence incomplete or source authority weak |
| 2 | answer has some relevant content but misses key condition |
| 1 | mostly unsupported or wrong, but related to topic |
| 0 | wrong, unsafe, hallucinated, or refuses when corpus clearly answers |

Additional binary labels:

- `has_unsupported_claim`
- `wrong_authority`
- `missed_clarification`
- `missed_abstention`
- `retrieval_miss`
- `generation_miss`

## 6. Answer Mode Scoring

### Gold mode: `answer`

Correct system behavior:

- provide answer.
- cite evidence.
- avoid unsupported generalization.

Common failures:

- baseline gives generic answer without corpus evidence.
- RAG cites Insurance Damoa for Samsung coverage condition.
- Agent overcomplicates and abstains despite clear evidence.

### Gold mode: `clarify`

Correct system behavior:

- ask a focused clarification question.
- explain what condition is missing.

Common failures:

- assumes rider enrollment.
- assumes applicant/companion status.
- assumes trip duration.

### Gold mode: `abstain`

Correct system behavior:

- state that v1 corpus does not contain enough information.
- optionally name what source would be needed.

Common failures:

- answers from general knowledge.
- searches outside corpus.
- invents provider details.

## 7. Retrieval Diagnostics

For RAG and Agent, record retrieval diagnostics separately from answer scoring.

RAG diagnostic fields:

- `top_k`
- `retrieved_chunk_ids`
- `gold_chunk_hit`
- `gold_source_hit`
- `authority_level_of_top_result`

Agent diagnostic fields:

- `search_steps`
- `queries`
- `source_manifest_lookups`
- `evidence_compared`
- `clarification_requested`
- `abstained`
- `out_of_corpus_attempt_blocked`

## 8. Suggested Eval Slices

Report metrics by slice:

- direct lookup.
- numeric threshold.
- coverage inclusion/exclusion.
- rider dependency.
- claim procedure.
- source authority.
- Insurance Damoa comparison.
- clarification-needed.
- abstention.
- easy/medium/hard.

The headline score is less useful than slice scores. Agent should not be judged only by average accuracy if the dataset is mostly direct lookup.

## 9. Fairness Controls

### Same Gold Set

All systems receive the same questions.

### Different Allowed Context

Different systems have different capabilities by design. That difference is the experiment. Document it clearly.

### No Live Web

No evaluated system may access live web pages. The corpus is frozen.

### Same Output Format

All systems should output:

- answer mode.
- answer text.
- citations.
- confidence or abstention reason.

## 10. Evaluation Report Template

Later implementation should produce a report like:

```text
Dataset: travel-insurance-kr-samsung-damoa v1.0.0
Run date: YYYY-MM-DD

Overall
  Baseline LLM: ...
  RAG: ...
  Agent: ...

By question type
  direct_lookup: ...
  source_authority: ...
  clarification_needed: ...
  abstention: ...

Failure analysis
  unsupported claims: ...
  wrong authority: ...
  retrieval misses: ...
  generation misses: ...
  parser/evidence issues discovered: ...

Cost/latency
  avg latency: ...
  avg token use: ...
  agent tool calls: ...
```

## 11. Minimum Success Bar

The evaluation design is useful only if it shows different failure profiles:

- Baseline LLM should have high unsupported-claim or abstention behavior.
- RAG should do well on direct lookup.
- RAG should struggle when the correct answer requires multiple searches or authority comparison.
- Agent should improve on source authority, clarification, and abstention.
- Agent should pay a measurable cost/latency premium.

If all systems score similarly, the dataset is probably too easy or too generic.

