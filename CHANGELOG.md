# Changelog

## [0.1.0] — 2026-11-03

### Stable

- First non-alpha release: tool names and the CLI surface are covered by a
  compatibility promise (breaking changes require a minor bump).
- Ships a quickstart sample, a one-line prompt, a permission block and real captures.

## [0.1.0] — 2026-11-01

### Packaging

- Package Standard v1: shipped `samples/quickstart/` (synthetic invoice/PO/GRN CSV + invoice XML + real-output gold `expected/result.json` + runner), `dsh.demo` metadata, README-zh eight blocks (including the demo prompt and permission lines), `docs/assets/quickstart.png` rendered from a real run, and a `PS1-QS01` acceptance row. `npm pack --dry-run` contains `samples/quickstart/*`; `node --test test/*.test.mjs` 26/26.
- The three most common errors now read `<what happened>（E_XXX）｜下一步：<action>`; `TROUBLESHOOTING.md` lists the three cases with symptom/cause/action.

### Security / Fixes

- Path-traversal guard, content-hashed invoice ids, header validation for PO/GRN, idempotent import.


### Added

- `ap.duplicate_check`: duplicate invoice-line detection (same supplier, PO line, quantity and amount) before matching; supplier names are compared case- and space-insensitively. Verified by `node --test test/*.test.mjs` (11/11).

## [Unreleased]

### Added

- `ap.tolerance_match`: three-way match with a configurable policy — price, quantity and amount tolerances in basis points, explicit `matched`/`exception` reasons, and header-only GRN treated as "no receipt". Read-only; it does not overwrite stored matches. Verified by `node --test test/*.test.mjs` (8/8); fixtures are our own public/synthetic rows.

## [0.1.0-alpha.7] — 2026-11-01

### Changed

- Documentation: five-language fixture/acceptance links now resolve on npm; added specific related-checker/tool links.
- Marketplace metadata: taxonomy category, archetype, domains and status; docs page now shows the same.
- Added a real terminal hero (and GIF for the active docs set) plus `TROUBLESHOOTING.md`.

All notable changes to `dsh-ap-three-way` are documented here. The format follows Keep a Changelog; this project uses alpha versions.

## [0.1.0-alpha.6] — 2026-11-01

### Added

- Five-language READMEs: English, 简体中文, Español, Português, हिन्दी.
- Local workflow SVG at `docs/assets/dsh-ap-three-way-flow.svg`.
- Family cross-links (domain index, checker family, `dsh-kit`), compatibility, permissions, and related-work sections.
- Standard repository files: `SECURITY.md`, `PRIVACY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, and `icon.svg`.

### Changed

- README aligned with the PerryLink DSH checker/plugin family style; package remains public/synthetic, alpha, not GA.

## [Earlier]

Earlier alpha builds are available from npm and GitHub Releases; this file starts at the family-standard documentation wave.
