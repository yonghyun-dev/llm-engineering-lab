# Source Inventory

Status: Draft  
Purpose: define candidate sources before any crawler or parser exists.  
Rule: a source not listed here should not enter v1.

## 1. Source Authority Levels

Authority levels decide which source wins when documents disagree.

| Level | Authority | Examples |
|---:|---|---|
| 1 | official insurance terms | 약관 PDF, special terms, rider terms |
| 2 | official product explanation | 상품설명서, 약관 요약서 |
| 3 | official claim procedure | 삼성화재 보험금 청구 안내 |
| 4 | official product page or FAQ | 삼성화재 다이렉트 상품 페이지, FAQ |
| 5 | official comparison platform | 보험다모아 comparison and disclaimers |
| 6 | third-party guide | travel blogs, media, guides |

v1 should include levels 1-5. Level 6 is excluded unless needed only for discovery notes, not gold evidence.

## 2. Candidate Source Table

`source_id` values are proposed stable IDs. They may change during implementation only before the first gold freeze.

| source_id | Provider | Source | URL / locator | Type | Authority | v1 | Why Needed | Question Types Enabled | Risk |
|---|---|---|---|---|---:|---|---|---|---|
| `samsung-product-overseas-main` | Samsung | Samsung Direct overseas travel insurance product page | `https://mdirect.samsungfire.com/m/fp/overseas.html` | HTML product page | 4 | Yes | user-facing summary, max period, family/companion notes, high-level coverages | direct lookup, enrollment constraints, contamination-resistant details | marketing summary, not final terms |
| `samsung-terms-overseas-current` | Samsung | Overseas travel insurance terms | exact PDF URL to verify | PDF terms | 1 | Yes | authoritative coverage, exclusions, definitions | exclusion, rider dependency, exact legal wording | PDF discovery/versioning required |
| `samsung-product-guide-overseas-current` | Samsung | Product guide / 상품설명서 | exact PDF URL to verify | PDF product guide | 2 | Yes | consumer-facing but more formal than landing page | coverage limits, warnings, explanation questions | PDF table parsing |
| `samsung-rider-flight-delay-index` | Samsung | Flight delay index-type rider terms | exact PDF or section locator to verify | rider terms | 1 | Yes | flight-delay answer depends on rider conditions | numeric threshold, rider dependency, claim eligibility | may be embedded in full terms |
| `samsung-rider-baggage-damage` | Samsung | Baggage / personal effects damage rider terms | exact PDF or section locator to verify | rider terms | 1 | Yes | loss vs theft vs damage is high-value eval area | coverage inclusion/exclusion | easy to confuse with claim page |
| `samsung-claim-baggage` | Samsung | Overseas travel insurance baggage claim page | `https://direct.samsungfire.com/claim/PP040301_001.html` | HTML claim page | 3 | Yes | claim channel, procedure, 3-year claim note, contact methods | procedure, required action, deadline | procedure page, not coverage authority |
| `samsung-claim-flight-delay` | Samsung | Overseas travel insurance flight delay claim page | `https://www.samsungfiredirect.net/claim/PP040303_001.html` | HTML claim page | 3 | Yes | OCR/ticket flow, minor claimant note, 3-year claim note | procedure, special claim path, minor edge case | may not state coverage eligibility |
| `samsung-claim-overseas-medical` | Samsung | Overseas medical expense claim page | URL to verify | HTML claim page | 3 | Yes | medical expense claims are core travel insurance use | claim procedure, required documents | URL discovery required |
| `samsung-faq-overseas-travel` | Samsung | Overseas travel insurance FAQ | URL/search locator to verify | HTML FAQ | 4 | Maybe | common user phrasing and edge cases | realistic user questions, clarification cases | may be sparse or hard to isolate |
| `samsung-notice-product-change` | Samsung | Product or terms change notice | URL/search locator to verify | notice | 4 | Maybe | future-proof version drift | snapshot-date questions | may not exist or may be too broad |
| `damoa-trip-intro` | Insurance Damoa | Travel insurance intro page | `https://e-insmarket.or.kr/tripIns/tripInsIntro.knia` | HTML intro | 5 | Yes | defines comparison service context | Damoa role, comparison limits | desktop/mobile variants differ |
| `damoa-trip-list-default` | Insurance Damoa | Overseas travel insurance comparison list, default conditions | `https://www.e-insmarket.or.kr/m/tripIns/tripInsList.knia?prdtSmlClsCd=H001` | HTML comparison page | 5 | Yes | standard comparison table and disclaimers | comparison, table lookup, source authority | dynamic content, stale prices |
| `damoa-trip-list-profile-32f` | Insurance Damoa | Controlled comparison snapshot, age 32 female | `https://www.e-insmarket.or.kr/m/tripIns/tripInsList.knia?action=search&age=32&enterType=O&ordering=ASC&prdtSmlClsCd=H001&rgtMgntCd=&sex=F` | HTML comparison result | 5 | Maybe | repeatable profile-based comparison | premium comparison, standard-condition caveats | synthetic profile must be documented |
| `damoa-trip-disclaimer` | Insurance Damoa | Comparison caveats and confirmation notes | same page or extracted section | HTML section | 5 | Yes | prevents treating Damoa as final authority | source authority, abstention, final confirmation | may be embedded in comparison page |
| `damoa-org-about` | Insurance Damoa | Insurance Damoa service identity/about | URL to verify | HTML about | 5 | Maybe | explains operator and comparison nature | source credibility questions | not needed for product coverage |
| `fss-travel-insurance-guide` | Financial regulator or public consumer guide | Overseas travel insurance consumer guide | URL to verify | PDF/HTML guide | 6 | No for v1 | useful glossary but not product-specific | v2 terminology support | contamination with general knowledge |
| `kakaopay-overseas-travel` | KakaoPay Insurance | KakaoPay overseas travel insurance product pages | URL to verify | provider docs | 4 | No | v2 provider extension | multi-provider comparison | out of v1 scope |
| `meritz-overseas-travel` | Meritz Fire | Meritz overseas travel insurance docs | URL to verify | provider docs | 4 | No | v2 provider extension | multi-provider comparison | out of v1 scope |

## 3. v1 Required Minimum

v1 cannot freeze unless the following source groups are present:

1. Samsung product page.
2. Samsung official terms or equivalent authoritative terms document.
3. Samsung product guide or equivalent explanation document.
4. Samsung claim procedure pages for at least baggage and flight delay.
5. Insurance Damoa comparison intro or list page.
6. Insurance Damoa caveat/disclaimer text.

If source group 2 is missing, do not create gold coverage/exclusion questions. Without terms, the dataset becomes marketing-page QA. Not good enough.

## 4. Collection Notes

Known source facts from the planning review:

- Samsung product page currently states overseas medical expenses, baggage damage excluding loss, liability, and 2-hour-plus flight delay are described as special-contract coverages.
- Samsung product page currently states the insurance period is up to 3 months.
- Samsung product page currently states family/companion enrollment is possible, but non-applicant family/companion members cannot enroll in death coverage through the internet family/companion flow.
- Samsung baggage claim page currently states app claim flow and a 3-year claim period from accident date.
- Samsung flight-delay claim page currently states ticket/OCR/payment flow, extra family-relation certificate for minor child claims, and a 3-year claim period.
- Insurance Damoa comparison pages state comparison results are standard or sample conditions and can differ from actual premiums or final product conditions.

These notes are not gold answers. They are discovery notes. Gold answers must be regenerated from frozen source snapshots.

## 5. Source Acceptance Checklist

Before a source becomes `included_in_gold = true`, verify:

- raw artifact saved.
- screenshot saved for HTML/dynamic pages.
- SHA-256 hash computed.
- retrieval timestamp recorded.
- document type assigned.
- authority level assigned.
- parser strategy assigned.
- known limitations recorded.
- license or usage note recorded.
- at least one expected QA category assigned.

## 6. Deferred Sources

Deferred to v2:

- KakaoPay Insurance.
- Meritz Fire.
- other provider product pages.
- regulator consumer guides as gold evidence.
- third-party blogs and media.

Rationale: v1 tests the lifecycle. Provider breadth can come after the lifecycle proves it can preserve evidence and source authority.

