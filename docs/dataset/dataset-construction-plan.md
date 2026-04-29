# Dataset Construction Plan

Status: Draft  
Scope: Samsung Fire & Marine Direct overseas travel insurance + Insurance Damoa comparison context  
Language: Korean-first corpus, Korean evidence required  
Implementation status: planning only. Do not build crawler, parser, RAG, Agent, vector DB, or evaluation harness from this document alone.

## 1. Purpose

This dataset exists to compare three system types fairly:

1. Baseline LLM without retrieval.
2. RAG with single-pass retrieval.
3. Agent with multi-step search, evidence comparison, clarification, and abstention.

General travel-insurance questions are not enough. Foundation models already know many generic answers. The dataset must force answers to be grounded only in a frozen set of collected documents.

Bad evaluation question:

- 해외여행보험은 병원비를 보장하나요?

Good evaluation question:

- v1 corpus 기준, 삼성화재 다이렉트 해외여행보험 상품 페이지에서 보험기간 상한은 얼마로 안내되는가?
- v1 corpus 기준, 휴대품 손해에서 단순 분실이 보장되는지 근거 문서로 답하라.
- 보험다모아 비교 화면과 삼성화재 공식 약관이 다른 뉘앙스를 줄 때 어떤 source authority를 우선해야 하는가?

## 2. Non-Goals

The following are explicitly not in scope for this planning phase:

- crawler implementation
- parser implementation
- OCR implementation
- RAG pipeline
- Agent runtime
- vector DB setup
- evaluation harness
- final QA dataset generation
- insurance purchase recommendation
- personalized premium calculation
- claims adjudication

## 3. Dataset Boundary

v1 is narrow by design.

Include:

- Samsung Fire & Marine Direct overseas travel insurance product-facing documents.
- Samsung official terms, product guide, rider, and claim documents when available.
- Insurance Damoa overseas travel insurance comparison and disclaimer pages.
- One controlled Insurance Damoa comparison snapshot, if it can be collected without real personal data.

Exclude:

- KakaoPay Insurance, Meritz Fire, DB, Hyundai, KB, and other providers.
- live quote crawling with real personal data.
- broad financial regulator corpus.
- general insurance education pages unless needed for source-authority context.

## 4. Lifecycle Overview

```text
source selection
  |
  v
document collection
  |
  v
raw immutable snapshot
  |
  v
source manifest
  |
  v
parsing
  |
  v
normalization
  |
  v
sectioning
  |
  v
chunking
  |
  v
QA candidate generation
  |
  v
human review
  |
  v
gold dataset freeze
  |
  v
versioned evaluation runs
```

The important rule: each stage must preserve traceability back to the raw source. If a gold answer cannot point back to a frozen source, section, chunk, and evidence span, it is not gold.

## 5. Directory Contract

The implementation should use this layout later. This document only defines the contract.

```text
datasets/
  travel-insurance-kr-samsung-damoa/
    v1.0.0/
      README.md
      CHANGELOG.md
      manifests/
        source-manifest.jsonl
        freeze-manifest.json
      raw/
        samsung/
          {source_id}/
            original.{html|pdf|png}
            screenshot.png
            metadata.json
        damoa/
          {source_id}/
            original.{html|pdf|png}
            screenshot.png
            metadata.json
      parsed/
        {source_id}.json
      normalized/
        {source_id}.json
      sections/
        {source_id}.jsonl
      chunks/
        {source_id}.jsonl
      qa_candidates/
        candidates.jsonl
      review/
        human-review.jsonl
        reviewer-guidelines.md
      gold/
        gold-qa.jsonl
        evidence-spans.jsonl
        scoring-rubric.md
      eval_runs/
        README.md
```

## 6. Stage Contracts

### 6.1 Source Selection

Every candidate source must be listed before collection. No ad hoc source should enter the corpus without a source inventory row.

Selection criteria:

- official source preferred.
- authority level is explicit.
- expected question types are clear.
- legal or financial risk is noted.
- dynamic pages are marked as snapshot-sensitive.

### 6.2 Document Collection

v1 collection should start manually or semi-manually. This is deliberate. The first failure mode is not "crawler too slow." The first failure mode is "we crawled the wrong thing."

Capture:

- final URL
- retrieval timestamp
- HTTP status where applicable
- raw response or downloaded file
- screenshot for human verification
- hash of raw artifact
- known collection limitations

### 6.3 Raw Snapshot Storage

Raw files are immutable. Never rewrite raw content to fix parsing. If a source must be re-collected, create a new source version or dataset patch version.

Raw snapshot rules:

- store bytes as retrieved.
- store browser screenshot for dynamic or visual pages.
- store metadata beside the raw file.
- compute SHA-256 for every raw artifact.
- never normalize inside `raw/`.

### 6.4 Source Manifest

The source manifest is the spine of the dataset. Every downstream artifact must include `source_id`.

Required manifest design is in `schema-design.md`.

### 6.5 Parsing

Parsing converts raw files into structured text. It must not decide the answer to any QA item.

Parser categories:

- HTML product page parser
- HTML claim page parser
- PDF text parser
- PDF table parser
- screenshot/OCR fallback, only when text extraction fails

Parser output must record warnings. Example: table header missing, footnote detached, OCR confidence low.

### 6.6 Normalization

Normalization cleans noise while preserving meaning.

Allowed:

- remove repeated navigation.
- remove boilerplate footer duplicates.
- normalize whitespace.
- preserve list and table structure.
- preserve Korean source text.

Not allowed:

- summarize terms.
- translate Korean into English as canonical text.
- merge clauses if the original distinction matters.
- drop exclusions or footnotes because they look repetitive.

### 6.7 Sectioning

Sectioning happens before chunking. Insurance documents depend on section boundaries.

Recommended section types:

- `product_overview`
- `coverage_summary`
- `coverage_limit`
- `exclusion`
- `rider_terms`
- `eligibility`
- `enrollment_constraint`
- `claim_process`
- `required_documents`
- `definition`
- `premium_comparison`
- `source_disclaimer`
- `legal_notice`

### 6.8 Chunking

Chunking is for retrieval. It is not the same as evidence.

Rules:

- chunk IDs are deterministic.
- chunks inherit `source_id`, `section_id`, `authority_level`, `document_type`, and `snapshot_date`.
- table chunks must include relevant row and header context.
- clauses should not be split mid-sentence or mid-condition.
- gold evidence can be narrower than a chunk.

### 6.9 QA Candidate Generation

Candidate generation is not gold generation. Candidates are proposals that humans can reject.

Target candidate categories:

- direct lookup
- numeric threshold
- coverage inclusion or exclusion
- rider dependency
- multi-source synthesis
- source authority comparison
- Insurance Damoa comparison
- clarification-needed
- abstention
- evidence conflict

### 6.10 Human Review

Human review decides whether a candidate becomes gold.

Reviewers must judge only against the frozen corpus, not personal insurance knowledge.

Minimum labels:

- `answerable`
- `requires_clarification`
- `unanswerable`
- `ambiguous`
- `evidence_span_valid`
- `source_authority_valid`
- `legal_financial_risk`
- `accepted_for_gold`
- `rejection_reason`

### 6.11 Gold Dataset Freeze

Freeze all artifacts together:

- raw artifact hashes
- source manifest
- parsed documents
- normalized documents
- sections
- chunks
- gold QA
- evidence spans
- review records
- scoring rubric

After freeze, no silent edits. Any correction becomes a patch version.

### 6.12 Evaluation

All systems use the same gold QA file. The difference is what context and tools they receive.

Baseline LLM:

- receives the question only.
- should abstain if the answer depends on unavailable corpus evidence.

RAG:

- receives one retrieval pass.
- answers using retrieved chunks only.

Agent:

- may perform multi-step search.
- may compare evidence.
- may ask clarification in supported eval cases.
- may abstain.

## 7. Engineering Review Notes

### What Already Exists

This repository already has learning notebooks and a toy `vector_db/` directory. Those can inform later implementation, but v1 dataset planning should not reuse toy policy files as corpus sources.

Existing assets:

- `notebooks/02_RAG.ipynb`
- `notebooks/05_agentic.ipynb`
- `vector_db/`

Decision:

- reuse conceptual learning only.
- do not mix demo documents with the insurance dataset.

### NOT In Scope

- crawler: deferred until source inventory is approved.
- parser: deferred until schema and source list are frozen.
- vector DB: deferred until chunk contract is stable.
- Agent: deferred until evaluation cases define allowed actions.
- provider expansion: deferred to v2.
- real user profile collection: excluded from v1.

## 8. Failure Modes To Design Against

| Failure Mode | Impact | Mitigation |
|---|---|---|
| Source page changes after collection | irreproducible evaluation | raw snapshot + hash + timestamp |
| PDF table parses incorrectly | wrong gold answers | parser warnings + human sampling |
| Marketing page contradicts terms | wrong authority judgment | explicit source authority levels |
| Question lacks rider condition | unfair answer expectation | clarification-needed label |
| Baseline answers from general knowledge | contaminated comparison | evidence-required scoring |
| RAG retrieves Damoa when terms are needed | plausible but low-authority answer | authority-aware scoring |
| Agent over-searches and finds out-of-corpus knowledge | broken closed-corpus boundary | allowed-source policy |

## 9. Completion Criteria For Planning Phase

Planning is complete when these six documents exist:

- `dataset-construction-plan.md`
- `source-inventory.md`
- `schema-design.md`
- `qa-generation-policy.md`
- `evaluation-design.md`
- `versioning-policy.md`

Implementation may begin only after:

- source inventory is reviewed.
- schema fields are accepted.
- QA policy is accepted.
- evaluation scoring policy is accepted.

