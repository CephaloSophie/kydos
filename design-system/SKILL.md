---
name: contree-design
description: Use this skill to generate well-branded interfaces and assets for Contrée (competitive Belote Contrée platform), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping across two surfaces — web (React + CSS custom properties) and mobile (HTML/TypeScript vanilla), both dark-theme only.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

Key entry points:
- `readme.md` — product context, content + visual foundations, iconography, manifest.
- `DESIGN_SYSTEM.md` — philosophy, dynamic team-color wiring, naming, checklists, what's forbidden.
- `design-tokens.css` + `styles.css` — link `styles.css` to get all tokens (web `:root` + mobile `[data-surface="mobile"]`).
- `components-web.md` / `components-mobile.md` — per-component / per-screen specs.
- `components/**` — React primitives (Button, PlayingCard, TableFelt, ScoreBoard, TeamBadge, BidBadge, LogConsole, ControlBar, …).
- `ui_kits/web` and `ui_kits/mobile` — full clickable screen recreations to copy from.

Two surfaces, intentionally separate: web = React + CSS custom properties, desktop-first; mobile = vanilla HTML/TS, thumb-first, tab bar. Do NOT share a responsive layout between them.

Non-negotiables: dark theme only (`#0f1115`); team colors are always derived from the name via `teamColor(name)` → HSL (never hard-coded); no game logic inside UI components; motion is fast (150–250ms web / 200–300ms mobile), ease-out, never blocking.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create static HTML files for the user to view (load `styles.css`, mount React + `_ds_bundle.js` for component cards as shown in any `components/**/*.card.html`). If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without other guidance, ask what they want to build or design, ask a few questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
