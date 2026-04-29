# Dataset Versioning Policy

Status: Draft  
Purpose: define how dataset versions are named, frozen, corrected, and extended.

## 1. Dataset Name

Recommended dataset family name:

```text
travel-insurance-kr-samsung-damoa
```

Meaning:

- `travel-insurance`: domain.
- `kr`: Korean corpus.
- `samsung-damoa`: Samsung Fire & Marine Direct as target provider, Insurance Damoa as auxiliary comparison source.

## 2. Semantic Versioning

Use semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:

- `1.0.0`: first gold freeze.
- `1.0.1`: typo fix, evidence span locator correction, metadata correction.
- `1.1.0`: new QA items added using the same frozen source set.
- `2.0.0`: new provider family added, such as KakaoPay Insurance or Meritz Fire.

## 3. Version Change Rules

### Patch Version

Use patch version for corrections that should not change dataset meaning.

Allowed:

- typo in question wording.
- evidence span locator correction.
- source metadata typo.
- reviewer note correction.
- scoring note clarification.

Not allowed:

- adding new source.
- changing sectioning/chunking.
- changing answer mode.
- changing gold answer meaning.

### Minor Version

Use minor version when adding compatible content.

Allowed:

- add QA items from existing frozen sources.
- add reviewer labels.
- add evaluation metadata fields with backward compatibility.
- add scoring slices.

Not allowed:

- adding a new provider.
- replacing source snapshots.
- changing authority order.

### Major Version

Use major version for changes that make scores not directly comparable.

Triggers:

- add KakaoPay, Meritz, or other providers.
- replace source snapshots with newer live pages.
- change source authority hierarchy.
- change chunking strategy after gold freeze.
- change QA answer mode policy.
- change evaluation allowed actions.

## 4. Freeze Manifest

Every frozen version needs:

- dataset name.
- version.
- freeze timestamp.
- snapshot date.
- source manifest hash.
- raw artifact hashes.
- parsed artifact hashes.
- normalized artifact hashes.
- section artifact hashes.
- chunk artifact hashes.
- gold QA hash.
- evidence spans hash.
- review record hash.
- scoring rubric hash.
- known limitations.

Example fields:

```text
dataset_name
version
freeze_id
frozen_at
snapshot_date
created_by
source_manifest_sha256
artifact_hashes
gold_count
source_count
question_type_counts
answer_mode_counts
known_limitations
```

## 5. Changelog Policy

Each dataset version must update:

- `CHANGELOG.md`
- `manifests/freeze-manifest.json`

Changelog entry format:

```text
## v1.0.1 - YYYY-MM-DD

Type: patch

Changed:
- Corrected evidence locator for qa_id ...

Why:
- The previous locator pointed to the right chunk but wrong section offset.

Impact:
- No answer meaning changed.
- Previous evaluation scores remain comparable.
```

## 6. Immutability Rules

After freeze:

- do not edit raw files.
- do not overwrite gold QA.
- do not silently regenerate chunks.
- do not re-run parser into the same version path.
- do not mutate review records.

Corrections create a new version path.

Bad:

```text
datasets/.../v1.0.0/gold/gold-qa.jsonl  # edited after freeze
```

Good:

```text
datasets/.../v1.0.1/gold/gold-qa.jsonl  # corrected patch version
```

## 7. Comparability Rules

Scores are comparable when:

- same major version.
- same gold QA IDs.
- same answer mode policy.
- same source snapshots.
- same evaluation allowed actions.

Scores are not directly comparable when:

- provider set changes.
- source snapshots change.
- gold questions are replaced.
- chunking changes and retrieval is part of evaluation.
- Agent allowed actions change.

## 8. Source Snapshot Refresh Policy

Refreshing live sources creates a new major version unless the refresh is only to recover missing bytes from the same documented snapshot.

Reason: insurance pages and product terms can change. A newer Samsung page is not the same corpus.

## 9. Deprecation Policy

Old versions should remain readable.

Allowed deprecation reasons:

- source licensing issue.
- discovered unsafe personal data.
- severe gold answer defect.
- impossible-to-reproduce raw snapshot.

Deprecated versions should include:

- deprecation date.
- reason.
- replacement version.
- whether previous eval reports should be considered invalid.

## 10. Release Checklist

Before releasing a dataset version:

- source inventory approved.
- source manifest complete.
- raw hashes computed.
- parser warnings reviewed.
- QA balance report generated.
- reviewer agreement checked.
- gold QA frozen.
- evidence spans frozen.
- scoring rubric frozen.
- changelog updated.
- freeze manifest generated.

