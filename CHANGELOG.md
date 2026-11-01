# Changelog

## [0.1.0-alpha.9] — 2026-11-01

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
