# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Reilly Boys Arcade** (hudsonreilly.com) — a personal game arcade for the Reilly boys, optimized for their Amazon Fire HD tablet. Each game is a standalone HTML/CSS/JS app linked from a retro arcade homepage.

## Hard Constraints

- **Zero build step** — vanilla HTML/CSS/JS only, ES modules via import maps (no npm, no bundler, no transpilation)
- **Tablet-first** — large touch targets (min 48px), no hover-dependent interactions
- **Early reader** — short labels, big icons, minimal text
- **Fire HD performance** — must run well on low-end Android hardware; keep object counts low
- **No shared runtime** — each game is fully self-contained under `games/<slug>/`

## Development

No build or test commands. Open `index.html` in a browser or serve with any static file server:

```bash
npx serve .          # or python3 -m http.server
```

Games are accessed at `/games/<slug>/` (e.g., `/games/links/`, `/games/summit/`).

## Architecture

```
hudsonreilly/
├── index.html           ← Arcade homepage (game grid)
├── css/home.css         ← Homepage styles (retro pixel theme)
├── games/
│   ├── links/           ← 3D golf game (Three.js via CDN import map)
│   │   ├── index.html   ← Self-contained: inline styles + canvas + UI overlay
│   │   └── js/          ← ES modules: main.js orchestrates state machine
│   └── summit/          ← 2D monster truck hill climber (Canvas2D, no libraries)
│       ├── index.html
│       └── js/
└── docs/plans/          ← Design docs and specs
```

### Adding a New Game

1. Create `games/<slug>/index.html` with its own assets
2. Add a game card to the homepage grid in `index.html`

### Game Architecture Pattern

Both games follow the same internal pattern:
- **`main.js`** — Entry point. Game loop via `requestAnimationFrame`, state machine, input handling
- **Module-per-concern** — physics, renderer, camera, UI each in their own file
- **State machine** — explicit game states (START → PLAYING → GAME_OVER or hole-by-hole flow)
- **Styles are inline** in each game's `index.html` (not separate CSS files)
- **UI overlay** pattern: a `#ui-overlay` div layered over the canvas with `pointer-events: none`, selectively enabling pointer events on interactive children

### Links (Golf) — Three.js

3D game using Three.js 0.161.0 via CDN import map. Modules: `clubs.js`, `camera.js`, `course.js`, `physics.js`, `renderer.js`, `swing.js`, `ui.js`. State machine covers hole intro → aiming → swinging → ball flight → rolling → shot result → scorecard → game complete.

### Summit (Monster Truck) — Canvas2D

2D side-scroller. Canvas2D rendering, no external libraries. Modules: `truck.js`, `terrain.js`, `camera.js`, `fuel.js`, `particles.js`. Procedural terrain via layered sine waves.

## Visual Theme

- **Homepage:** Dark background (#0a0a0a), neon green (#39ff14) and cyan (#00fff5) accents, Press Start 2P pixel font, CRT scanline overlay
- **Games** follow the same dark/neon palette but can vary per game
- Every game has a "← ARCADE" back button (top-left, `#back-btn`)

## Design Docs

Specs and implementation plans live in `docs/plans/`. Feature plans go in `.claude/features/<slug>/plan.md`.
