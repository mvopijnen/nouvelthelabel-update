# PR4 restore verification

Status: PASS — exact restoration; production acceptance remains BLOCKED.

## History and scope

- Current main: `35f8113759b2e7b5a33357c276ba17d46b51ec05`.
- PR4 source: `26213f783566432a25b4915c1ec900e52f8f3c1b` (merged by `db58fb22920521000a16f936105cf6b8a6c4fec9`).
- PR5 merged revert: `35f8113759b2e7b5a33357c276ba17d46b51ec05`.
- Main's tree matches pre-PR4 main `6f885d4243d368c14a74e963158337d37488f349`.
- New branch: `restore/production-readiness-round-2`, based on current main.
- All 346 original tracked files match their original PR4 Git blob hashes, including all functional files. No additional optimization, redesign, dependency change or test relaxation.
- Only these restore-verification documents are added. The per-file old/restored hashes, difference, reason and PASS/BLOCKED verdict are in `restore-verification.json`.
- Previous uncommitted acceptance extensions were preserved separately in a named Git stash and are excluded from this restore.

## Fresh local validation

| Check | Result |
| --- | --- |
| npm ci | PASS — frozen existing lockfile |
| npm run validate | PASS — structure, render graph, protected source and JS syntax |
| npm test | PASS — 34 tests, 0 failed/skipped |
| npm run test:browser | PASS — 9 browser cases |
| npm run theme-check | PASS — 0 errors, 316 warnings; no disabled rules or new exceptions |
| npm run package | PASS — 301 theme files |

Package SHA-256: `bd77483c5f09df4e804aae466fec6368cc09dab9a7612d5ad6136715891e0637`.

## Preview acceptance: mandatory, not implied by local success

The PR stays draft until actual unpublished deployment, Shopify E2E at 390/768/1280px, cart and checkout start, Judge.me, TinySEO, BF Size Charts where applicable, consent, accessibility and six comparable performance runs have been completed and reviewed. No live publication or next roadmap phase is authorized by a partial result. Checkout testing stops before customer information, payment and order creation.

The `shopify-preview` GitHub environment exists. Listing its Secrets and Variables is denied to the current GitHub integration (HTTP 403); presence is therefore unverified, not asserted missing. A credentials-skipped workflow is BLOCKED acceptance even if GitHub displays a green job.

Cloud bindings for store domain, token, theme ID and test product/collection are present; storefront password is absent (optional if the preview is accessible). The current cloud token target and network policy omit `theme-kit-access.shopifyapps.com`, which the pinned Shopify CLI needs for Theme Access authentication. Before deployment the exact theme must be returned with role `unpublished`; lack of authenticated role verification blocks deployment. No live theme is used as an E2E/performance substitute.

The original workflow and functional scripts are kept byte-for-byte. Any later trace-proven performance change needs its own before/after measurements and regression test, after this exact restore is recorded.
