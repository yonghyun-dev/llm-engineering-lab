# QA Data Set

This folder is the home for the QA dataset package.

Commit the Excel workbook and this README. Keep `_local_work/` local-only.

## Files

- `travel-insurance-kr-samsung-damoa-gold-qa-v0.1.xlsx`

## Workbook Sheets

- `gold_qa`: 100 gold QA rows.
- `evidence_spans`: supporting evidence snippets for each QA row.
- `human_review`: initial review rows generated during local dataset construction.
- `summary`: dataset counts and status.

## Local-Only Workbench

All source snapshots, parsed files, chunks, schemas, review JSONL, docs, and
generation scripts live under:

```text
data/QA data set/_local_work/
```

That directory is ignored by git. It keeps the dataset reproducible on this
machine without putting the construction machinery or intermediate files on
GitHub.
