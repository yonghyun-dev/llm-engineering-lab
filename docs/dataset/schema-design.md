# Schema Design

Status: Draft  
Purpose: define the data contracts that implementation must satisfy later.  
Scope: schema planning only. No JSON Schema files are created in this phase.

## 1. Design Principles

1. Every object has a deterministic ID.
2. Every downstream object traces back to `source_id`.
3. Raw artifacts are immutable.
4. Parsed and normalized text must preserve source locators.
5. Gold QA must cite evidence spans, not just chunks.
6. Source authority is data, not prompt text.

## 2. ID Strategy

Recommended IDs:

```text
source_id  = {provider}-{document_family}-{short_slug}
section_id = {source_id}#sec-{zero_padded_index}
chunk_id   = {section_id}#chunk-{zero_padded_index}
qa_id      = travel-insurance-kr-samsung-damoa-v1-{zero_padded_index}
span_id    = {qa_id}#span-{zero_padded_index}
review_id  = {qa_id}#review-{reviewer_id}
```

IDs should be stable inside a frozen dataset version. If sectioning or chunking changes after freeze, create a new dataset version.

## 3. Data Flow Diagram

```text
RawSource
  |
  v
ParsedDocument
  |
  v
NormalizedDocument
  |
  v
Section --------------+
  |                   |
  v                   |
Chunk                 |
  |                   |
  +---- EvidenceSpan -+
             |
             v
           GoldQA
             |
             v
      EvaluationResult
```

## 4. Raw Source Metadata

File target later:

- `raw/{provider}/{source_id}/metadata.json`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `source_id` | string | Yes | stable source ID |
| `provider` | enum | Yes | `samsung`, `damoa`, etc. |
| `product_name` | string | Yes | Korean product name if available |
| `document_type` | enum | Yes | see section 12 |
| `title` | string | Yes | captured page or PDF title |
| `url` | string | Yes | final URL or locator |
| `retrieved_at` | datetime | Yes | UTC ISO 8601 |
| `snapshot_date` | date | Yes | dataset-local date |
| `http_status` | integer/null | No | for web collection |
| `content_type` | string/null | No | response MIME type |
| `raw_filename` | string | Yes | local file name |
| `raw_sha256` | string | Yes | hash of raw file bytes |
| `screenshot_filename` | string/null | No | required for dynamic HTML |
| `screenshot_sha256` | string/null | No | hash of screenshot |
| `collection_method` | enum | Yes | `manual`, `browser_capture`, `download`, `api_export` |
| `collector` | string | Yes | person/tool that collected |
| `known_limitations` | array[string] | Yes | empty array allowed |

## 5. Source Manifest Row

File target later:

- `manifests/source-manifest.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `source_id` | string | Yes | joins all artifacts |
| `provider` | enum | Yes | `samsung`, `damoa`, `fss`, etc. |
| `source_name` | string | Yes | human-readable name |
| `product_name` | string/null | Yes | null for service-level pages |
| `document_type` | enum | Yes | terms, product page, claim page |
| `authority_level` | integer | Yes | 1 highest, 6 lowest |
| `url` | string | Yes | final URL |
| `retrieved_at` | datetime | Yes | UTC |
| `effective_date` | date/null | Yes | null if unknown |
| `valid_until` | date/null | Yes | null if unknown |
| `language` | enum | Yes | `ko`, `en`, `mixed` |
| `mime_type` | string | Yes | e.g. `text/html`, `application/pdf` |
| `raw_sha256` | string | Yes | raw file hash |
| `parser_name` | string/null | Yes | null before parsing |
| `parser_version` | string/null | Yes | null before parsing |
| `parse_status` | enum | Yes | `not_started`, `parsed`, `partial`, `failed` |
| `parse_warnings` | array[string] | Yes | table issues, OCR issues |
| `section_count` | integer/null | Yes | null before sectioning |
| `included_in_gold` | boolean | Yes | only true after review |
| `license_or_usage_note` | string | Yes | internal research, public URL, etc. |
| `expected_question_types` | array[enum] | Yes | direct, comparison, abstention, etc. |

## 6. Parsed Document

File target later:

- `parsed/{source_id}.json`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `source_id` | string | Yes | source reference |
| `parser_name` | string | Yes | parser identifier |
| `parser_version` | string | Yes | semantic version |
| `parsed_at` | datetime | Yes | UTC |
| `raw_sha256` | string | Yes | input artifact hash |
| `content_blocks` | array[object] | Yes | ordered blocks |
| `tables` | array[object] | Yes | extracted tables, if any |
| `links` | array[object] | No | outbound links |
| `warnings` | array[string] | Yes | parse issues |

`content_blocks` fields:

- `block_id`
- `block_type`: `heading`, `paragraph`, `list_item`, `table`, `footnote`, `image_alt`, `legal_notice`
- `text`
- `source_locator`: CSS selector, PDF page, OCR region, or equivalent
- `page_number`
- `order_index`

## 7. Normalized Document

File target later:

- `normalized/{source_id}.json`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `source_id` | string | Yes | source reference |
| `normalizer_version` | string | Yes | semantic version |
| `input_parser_version` | string | Yes | parsed source version |
| `normalized_at` | datetime | Yes | UTC |
| `blocks` | array[object] | Yes | cleaned blocks |
| `removed_blocks` | array[object] | Yes | nav/footer removed with reason |
| `warnings` | array[string] | Yes | normalization risks |

Normalization must never summarize legal text.

## 8. Section

File target later:

- `sections/{source_id}.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `section_id` | string | Yes | deterministic |
| `source_id` | string | Yes | source reference |
| `section_type` | enum | Yes | see section type list |
| `heading` | string/null | Yes | original heading if available |
| `text` | string | Yes | normalized Korean source text |
| `block_ids` | array[string] | Yes | source blocks |
| `start_locator` | string | Yes | source locator |
| `end_locator` | string | Yes | source locator |
| `authority_level` | integer | Yes | inherited |
| `contains_table` | boolean | Yes | table-aware chunking |
| `warnings` | array[string] | Yes | ambiguity notes |

## 9. Chunk

File target later:

- `chunks/{source_id}.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `chunk_id` | string | Yes | deterministic |
| `section_id` | string | Yes | parent section |
| `source_id` | string | Yes | source reference |
| `chunk_index` | integer | Yes | section-local index |
| `text` | string | Yes | retrieval text |
| `token_count_estimate` | integer | Yes | tokenizer-specific estimate later |
| `metadata` | object | Yes | provider, authority, type, dates |
| `source_locators` | array[string] | Yes | original positions |
| `table_context` | object/null | Yes | header/row context |
| `warnings` | array[string] | Yes | split or table risks |

## 10. QA Candidate

File target later:

- `qa_candidates/candidates.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `candidate_id` | string | Yes | temporary ID |
| `question` | string | Yes | Korean preferred |
| `question_type` | enum | Yes | direct, numeric, abstention, etc. |
| `expected_answer_mode` | enum | Yes | `answer`, `clarify`, `abstain` |
| `candidate_answer` | string/null | Yes | draft answer |
| `source_ids` | array[string] | Yes | proposed sources |
| `evidence_span_candidates` | array[object] | Yes | proposed spans |
| `requires_source_authority` | boolean | Yes | true for conflicts |
| `legal_financial_risk` | enum | Yes | `low`, `medium`, `high` |
| `generation_method` | enum | Yes | `manual`, `llm_assisted`, `template` |
| `status` | enum | Yes | `pending_review`, `rejected`, `accepted` |

## 11. Human Review

File target later:

- `review/human-review.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `review_id` | string | Yes | deterministic |
| `candidate_id` | string | Yes | reviewed candidate |
| `reviewer_id` | string | Yes | pseudonymous reviewer |
| `reviewed_at` | datetime | Yes | UTC |
| `answerable` | boolean | Yes | answer exists in corpus |
| `requires_clarification` | boolean | Yes | missing user condition |
| `should_abstain` | boolean | Yes | not answerable from corpus |
| `evidence_span_valid` | boolean | Yes | span supports answer |
| `source_authority_valid` | boolean | Yes | highest necessary source used |
| `accepted_for_gold` | boolean | Yes | final inclusion |
| `rejection_reason` | string/null | Yes | required when rejected |
| `reviewer_notes` | string | No | free text |

## 12. Gold QA

File target later:

- `gold/gold-qa.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `qa_id` | string | Yes | stable gold ID |
| `dataset_version` | string | Yes | e.g. `1.0.0` |
| `question` | string | Yes | final question |
| `answer` | string/null | Yes | null for pure abstention |
| `answer_mode` | enum | Yes | `answer`, `clarify`, `abstain` |
| `clarification_prompt` | string/null | Yes | if answer mode is clarify |
| `question_type` | enum | Yes | category |
| `difficulty` | enum | Yes | `easy`, `medium`, `hard` |
| `source_ids` | array[string] | Yes | required evidence sources |
| `evidence_span_ids` | array[string] | Yes | supporting spans |
| `authority_requirement` | string | Yes | source order rule |
| `scoring_notes` | string | Yes | what to reward/penalize |

## 13. Evidence Span

File target later:

- `gold/evidence-spans.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `span_id` | string | Yes | stable evidence span |
| `qa_id` | string | Yes | linked gold question |
| `source_id` | string | Yes | source reference |
| `section_id` | string | Yes | parent section |
| `chunk_id` | string/null | Yes | null only if span crosses chunks |
| `start_locator` | string | Yes | source position |
| `end_locator` | string | Yes | source position |
| `evidence_text` | string | Yes | Korean source text |
| `supports` | enum | Yes | `answer`, `abstention`, `clarification`, `authority` |

## 14. Evaluation Result

File target later:

- `eval_runs/{run_id}/results.jsonl`

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `run_id` | string | Yes | evaluation run |
| `qa_id` | string | Yes | gold question |
| `system_type` | enum | Yes | `baseline_llm`, `rag_single_pass`, `agent` |
| `model_name` | string | Yes | evaluated model |
| `answer_text` | string | Yes | system answer |
| `citations` | array[object] | Yes | cited chunks/spans |
| `retrieved_chunk_ids` | array[string] | No | RAG/Agent |
| `tool_steps` | array[object] | No | Agent only |
| `latency_ms` | integer | Yes | measured later |
| `cost_estimate` | number/null | Yes | if available |
| `score_answer_correctness` | number | Yes | rubric score |
| `score_evidence_correctness` | number | Yes | rubric score |
| `score_abstention` | number | Yes | rubric score |
| `unsupported_claims` | array[string] | Yes | hallucination tracking |
| `judge_notes` | string | No | reviewer or judge notes |

## 15. Enums

### `document_type`

- `official_terms`
- `product_guide`
- `rider_terms`
- `product_page`
- `claim_page`
- `faq`
- `notice`
- `comparison_intro`
- `comparison_result`
- `comparison_disclaimer`
- `consumer_guide`

### `question_type`

- `direct_lookup`
- `numeric_threshold`
- `coverage_inclusion`
- `coverage_exclusion`
- `rider_dependency`
- `multi_source_synthesis`
- `source_authority`
- `premium_comparison`
- `clarification_needed`
- `abstention`
- `evidence_conflict`

### `section_type`

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

## 16. Schema Acceptance Criteria

Before implementation, confirm:

- all gold QA rows can join to evidence spans.
- all evidence spans can join to source, section, and optionally chunk.
- all chunks inherit authority metadata.
- all parsed/normalized artifacts record parser version.
- all raw files have hashes.
- all review decisions are reproducible from stored fields.

