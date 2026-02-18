# STACKER — Neon Block Stacking Puzzle

**One-line pitch:** Classic block-stacking puzzle with neon flair — rotate and drop tetrominoes to clear lines and chase your high score.

**Part of the Puzzle Roadmap:**

| Order | Game | Genre |
|-------|------|-------|
| **1st** | **STACKER** | Spatial / reflex (Tetris-style) |
| 2nd | CHAIN | Color matching / chain reactions |
| 3rd | WRECKER | Physics demolition (Angry Birds-style) |
| 4th | CIRCUIT | Neon maze runner |

---

## Core Mechanic

Standard Tetris rules. Seven tetromino shapes (I, O, T, S, Z, L, J) fall into a 10-wide, 20-tall grid. Rotate and position pieces to fill complete rows. Completed rows clear with a neon flash.

**Beginner-friendly assists:**
- **Ghost piece** — faint outline at the bottom showing where the piece will land
- **Next piece preview** — always visible in the HUD
- **Very slow start** — 1 cell per second at level 1

**Speed progression:** Every 10 lines cleared, drop speed increases ~15%. Max practical speed around level 15 (~4 cells/sec).

## Controls Layout

```
+-------------------------------------------+
|  [SCORE: 1,200]   [LVL 3]   [NEXT: ▣]   |
|  [LINES: 24]                    [⏸]      |
|                                            |
|         ┌──────────────────┐              |
|         │                  │              |
|         │    10 × 20       │              |
|         │    PLAY GRID     │              |
|         │                  │              |
|         │    👻 ghost      │              |
|         └──────────────────┘              |
|                                            |
|  [◀ LEFT]    [🔄 ROTATE]    [RIGHT ▶]    |
|  (hold)       (tap)          (hold)        |
+-------------------------------------------+
```

**Three touch zones at the bottom (~33% each):**
- **Left zone** — Hold to slide piece left. Auto-repeat: instant first move, 150ms delay, then 80ms repeat.
- **Center zone** — Tap to rotate clockwise. Each tap = one rotation, no hold behavior.
- **Right zone** — Hold to slide piece right. Same auto-repeat as left.

**Hard drop:** Swipe down anywhere on the grid area to instantly drop the piece to the ghost position.

## Scoring

| Lines Cleared | Points | Bonus |
|--------------|--------|-------|
| 1 line | 100 | — |
| 2 lines | 300 | — |
| 3 lines | 500 | — |
| 4 lines (STACKER!) | 800 | Screen flash + "STACKER!" text |

Points multiplied by current level (Level 1 = ×1, Level 2 = ×2, etc.).

**High score:** Stored in `localStorage`. Shown on game-over screen with comparison. New high score gets a celebratory animation.

## Game Over

Triggers when a new piece can't spawn (stack reached the top). No harsh failure messaging — score recap, high score comparison, big "PLAY AGAIN" button. One-tap restart.

## Visual Design

**Block colors (neon palette):**

| Piece | Neon Color |
|-------|------------|
| I (bar) | Cyan `#00fff5` |
| O (square) | Yellow `#ffe600` |
| T | Purple `#bf00ff` |
| S | Green `#39ff14` |
| Z | Red `#ff073a` |
| L | Orange `#ff6600` |
| J | Blue `#0080ff` |

**Block style:** Neon glow (box-shadow / gradient). Grid background near-black (`#0a0a0a`) with faint grid lines (`#1a1a1a`). Locked pieces dim slightly vs. the active falling piece.

**Animations:**
- **Line clear:** Row flashes white → blocks dissolve with particles → rows above slide down smoothly
- **Hard drop:** Brief trail + subtle screen shake
- **4-line clear ("STACKER!"):** Big text flash + stronger shake + neon border pulse
- **Level up:** Grid border pulse + "LEVEL X" text fade
- **Game over:** Blocks gray out bottom-to-top, then score screen slides in

**HUD:** Press Start 2P font, neon green, matching arcade homepage. Score + lines top-left, next piece + pause top-right, level center-top.

## Technical

- **Tech:** Canvas2D, no external libraries
- **Architecture:** Same pattern as other games — `main.js` entry with state machine, module-per-concern (grid, pieces, renderer, input, ui)
- **Performance:** 10×20 grid = 200 cells max. Trivial on Fire HD.
- **State machine:** START → PLAYING → PAUSED → LINE_CLEAR → GAME_OVER
- **No audio** in v1 — can add later

## Standard Arcade Elements

- Dark background, neon accents
- "← ARCADE" back button (top-left, `#back-btn`)
- Inline styles in `games/stacker/index.html`
- Game card added to homepage grid with 🧱 emoji
