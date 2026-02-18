# STACKER Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tetris-style neon block stacking puzzle game at `games/stacker/`, following existing arcade architecture patterns exactly.

**Architecture:** Canvas2D with module-per-concern (board, renderer, particles, main). State machine: START → PLAYING → PAUSED → GAME_OVER. Three-zone touch controls (left/rotate/right) via Pointer Events on `#ui-overlay` children. Grid-based board logic with standard Tetris rotation, collision, and line clearing.

**Tech Stack:** Vanilla HTML/CSS/JS, Canvas2D, ES modules (no libraries, no build step)

**Design doc:** `docs/plans/2026-02-17-stacker-design.md`

---

## Reference Files

Read these before starting any task:

| File | Pattern |
|---|---|
| `games/summit/index.html` | HTML structure, inline CSS, UI overlay, modal screens |
| `games/summit/js/main.js` | Game class, canvas setup, state machine, input, game loop |
| `games/dogfight/js/controls.js` | Silk browser `preventDefault` fix, multi-touch pattern |
| `games/dogfight/js/ui.js` | Extracted UI class pattern |
| `games/dogfight/js/bullets.js` | Object pool pattern for particles |

---

## Task 1: Scaffold HTML Shell

**Files:**
- Create: `games/stacker/index.html`

**Step 1: Create the directory**

```bash
mkdir -p games/stacker/js
```

**Step 2: Create `index.html`**

Follow the exact structure from `games/summit/index.html`. Include:

1. **Head:** viewport meta (no scale, no user-select), mobile web app meta, Press Start 2P font, inline `<style>` block
2. **Body elements in order:**
   - `#back-btn` — `← ARCADE` link to `/`, `position:fixed; z-index:200`
   - `#game-canvas` — `display:block; width:100vw; height:100vh`
   - `#ui-overlay` — `position:fixed; pointer-events:none; z-index:10` containing:
     - `#hud` (hidden) — score, lines, level, next piece preview, pause button
     - `#touch-controls` (hidden) — three equal zones: LEFT, ROTATE, RIGHT
   - `#start-screen` — visible by default, fullscreen modal, `z-index:100`, game title + PLAY button
   - `#gameover-screen` (hidden) — score, best score, PLAY AGAIN button
   - `#pause-screen` (hidden) — RESUME + QUIT buttons
   - `<script type="module" src="js/main.js"></script>`

**Inline CSS must include:**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  overflow: hidden; background: #0a0a0a; color: #fff;
  font-family: 'Press Start 2P', monospace;
  user-select: none; -webkit-user-select: none;
  touch-action: none; -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
#game-canvas { display: block; width: 100vw; height: 100vh; }
#ui-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 10;
}
#ui-overlay button, #ui-overlay .touch-zone { pointer-events: auto; }
.hidden { display: none !important; }
#back-btn {
  position: fixed; top: 10px; left: 10px; z-index: 200;
  color: #39ff14; font-family: 'Press Start 2P', monospace;
  font-size: 14px; text-decoration: none;
}
```

**Touch control zones layout:**

```css
#touch-controls {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 100px;
  display: flex;
}
.touch-zone {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-family: 'Press Start 2P', monospace; font-size: 12px;
  color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.1);
}
.touch-zone:active { background: rgba(255,255,255,0.05); }
```

**HUD layout:**

```css
#hud {
  position: absolute; top: 0; left: 0; width: 100%;
  padding: 10px 15px; display: flex; justify-content: space-between; align-items: flex-start;
  font-size: 10px; color: #39ff14;
}
```

**Step 3: Create a minimal `js/main.js` stub**

```js
// Stacker — Neon Block Puzzle
// main.js: entry point, game loop, state machine

console.log('Stacker loaded');
```

**Step 4: Verify**

Serve the project root (`npx serve .` or `python3 -m http.server`) and navigate to `/games/stacker/`. Confirm:
- Dark background, "← ARCADE" link works
- Start screen is visible with PLAY button
- Canvas fills the viewport
- Console shows "Stacker loaded"

**Step 5: Commit**

```bash
git add games/stacker/
git commit -m "feat(stacker): scaffold HTML shell with UI overlay and touch zones"
```

---

## Task 2: Board Logic Module

**Files:**
- Create: `games/stacker/js/board.js`

This is the core game logic — grid state, piece definitions, rotation, collision detection, line clearing, scoring. No rendering, no DOM access.

**Step 1: Define piece data**

Seven tetrominoes, each as an array of rotation states. Each rotation state is a 2D array (matrix of 0/1). Standard SRS rotation system.

```js
// Piece types and their rotation matrices
// Each piece has 4 rotations, stored as 2D arrays
// Convention: [row][col], 1 = filled, 0 = empty
export const PIECES = {
  I: { color: '#00fff5', /* 4 rotations */ },
  O: { color: '#ffe600', /* 1 rotation (square) */ },
  T: { color: '#bf00ff', /* 4 rotations */ },
  S: { color: '#39ff14', /* 4 rotations */ },
  Z: { color: '#ff073a', /* 4 rotations */ },
  L: { color: '#ff6600', /* 4 rotations */ },
  J: { color: '#0080ff', /* 4 rotations */ },
};
```

**Step 2: Implement the Board class**

```js
export class Board {
  constructor(cols = 10, rows = 20) { ... }

  reset() { /* clear grid, reset score/lines/level, spawn first piece */ }

  // Piece management
  spawnPiece() { /* pick from bag, set position to top-center, check game over */ }
  moveLeft() { /* try move, return success */ }
  moveRight() { /* try move, return success */ }
  rotate() { /* try clockwise rotation with wall kicks, return success */ }
  softDrop() { /* move down 1, return success */ }
  hardDrop() { /* drop to ghost position, lock immediately, return distance */ }

  // Internal
  collides(piece, rotation, col, row) { /* check grid bounds + occupied cells */ }
  lock() { /* write piece cells to grid, trigger line clear check */ }
  clearLines() { /* find full rows, remove them, shift down, update score */ }
  getGhostRow() { /* find lowest valid row for current piece */ }

  // Gravity tick (called from main.js update)
  tick() { /* move piece down 1; if can't, lock it */ }

  // Scoring
  addScore(linesCleared) { /* 1=100, 2=300, 3=500, 4=800, × level */ }

  // State queries (for renderer)
  get grid() { ... }
  get activePiece() { ... }
  get ghostRow() { ... }
  get nextPiece() { ... }
}
```

**Key implementation details:**

- **Grid:** 2D array `this.grid[row][col]`, each cell is `null` (empty) or a color string
- **7-bag randomizer:** Shuffle all 7 piece types, deal them out, reshuffle when empty. Prevents drought/flood of any piece type.
- **Wall kicks:** When rotation collides, try shifting 1 left, 1 right, then fail. Simple 3-test kick — SRS full kick table is overkill for a kid's game.
- **Ghost piece:** `getGhostRow()` loops from current row downward until `collides()` returns true, then backs up 1.
- **Line clear:** After locking, scan all rows. Full rows are removed, rows above shift down. Return count of cleared lines.
- **Scoring:** `addScore()` updates `this.score`, `this.lines`, recalculates `this.level = Math.floor(this.lines / 10) + 1`.
- **Game over:** `spawnPiece()` returns false if the new piece immediately collides.

**Step 3: Verify**

Import in `main.js`, create a board, call `reset()`, log the grid dimensions and first piece. Check console.

```js
import { Board } from './board.js';
const board = new Board();
board.reset();
console.log('Grid:', board.cols, 'x', board.rows, 'First piece:', board.activePiece);
```

**Step 4: Commit**

```bash
git add games/stacker/js/board.js
git commit -m "feat(stacker): board logic — grid, pieces, rotation, collision, line clearing, scoring"
```

---

## Task 3: Renderer Module

**Files:**
- Create: `games/stacker/js/renderer.js`

Pure drawing code. Reads board state, draws to canvas. No state mutation.

**Step 1: Implement the Renderer class**

```js
export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    // Pre-compute layout values (updated on resize)
    this.cellSize = 0;
    this.gridX = 0;
    this.gridY = 0;
  }

  resize(screenWidth, screenHeight) {
    // Calculate cell size to fit 10×20 grid centered on screen
    // Leave space for HUD (top 60px) and touch controls (bottom 100px)
    const playHeight = screenHeight - 60 - 100;
    const playWidth = screenWidth;
    this.cellSize = Math.floor(Math.min(playWidth / 10, playHeight / 20));
    this.gridX = Math.floor((screenWidth - this.cellSize * 10) / 2);
    this.gridY = 60 + Math.floor((playHeight - this.cellSize * 20) / 2);
  }

  render(board) {
    const ctx = this.ctx;
    // 1. Clear (dark background)
    // 2. Draw grid background + faint grid lines
    // 3. Draw locked cells (dimmer glow)
    // 4. Draw ghost piece (outline only, very faint)
    // 5. Draw active piece (full brightness + glow)
    // 6. Draw grid border (subtle neon outline)
  }

  drawCell(col, row, color, alpha = 1) {
    // Single cell: filled rect + subtle inner gradient + neon glow
    // Use globalAlpha for ghost/dim effects, NOT shadowBlur (perf)
  }

  drawNextPiecePreview(piece, x, y) {
    // Small preview of the next piece in the HUD area
  }
}
```

**Key implementation details:**

- **No `shadowBlur`** — use `globalAlpha` and layered `fillRect` for glow effect (Fire HD performance)
- **Grid centering:** Calculate `gridX/gridY` in `resize()` so the 10×20 grid is centered between HUD and touch controls
- **Ghost piece:** Draw with `globalAlpha = 0.2`, outline only (no fill)
- **Locked cells:** Draw with `globalAlpha = 0.8` to make the active piece pop
- **Cell glow:** Draw a slightly larger rect behind each cell at low alpha for a soft neon glow effect

**Step 2: Verify**

Wire into `main.js`: create renderer, call `resize()` with screen dimensions, call `render(board)` in a `requestAnimationFrame`. Should see:
- Centered dark grid with faint lines
- A piece at the top of the grid
- Ghost piece outline at the bottom

**Step 3: Commit**

```bash
git add games/stacker/js/renderer.js
git commit -m "feat(stacker): renderer — grid, blocks, ghost piece, next preview"
```

---

## Task 4: Particles Module

**Files:**
- Create: `games/stacker/js/particles.js`

Object-pool particle system for line clear effects, hard drop trails, and level-up flashes.

**Step 1: Implement the Particles class**

```js
const MAX_PARTICLES = 80;

export class Particles {
  constructor() {
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 0, color: '#fff', size: 3,
    }));
  }

  reset() { this.pool.forEach(p => p.active = false); }

  emit(x, y, color, count = 10) {
    // Find inactive particles, activate them with random velocity
  }

  emitLine(y, gridX, gridWidth, color) {
    // Emit particles across a full row (for line clear effect)
  }

  update(dt) {
    // Move particles, reduce life, deactivate dead ones
  }

  render(ctx) {
    // Draw active particles as small glowing rects
  }
}
```

**Key implementation details:**

- **Pre-allocated pool** of 80 particles — no `new` in the game loop (following Dogfight's `bullets.js` pattern)
- **`emitLine()`** spreads particles evenly across a cleared row for the line-clear effect
- **`emit()`** for point-source effects (hard drop impact, level up)
- No `shadowBlur` — use small filled rects with `globalAlpha` fade

**Step 2: Verify**

Trigger `emitLine()` on a test row, confirm particles appear and fade.

**Step 3: Commit**

```bash
git add games/stacker/js/particles.js
git commit -m "feat(stacker): particle system with object pool for line clear effects"
```

---

## Task 5: Main Game Class — Loop, State Machine, Input

**Files:**
- Modify: `games/stacker/js/main.js` (replace stub with full implementation)

This is the orchestrator. Follow `games/summit/js/main.js` structure exactly.

**Step 1: Implement the Game class**

```js
import { Board } from './board.js';
import { Renderer } from './renderer.js';
import { Particles } from './particles.js';

const STATE = Object.freeze({
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
});

class Game {
  constructor() {
    // 1. Canvas + context
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 2. Sub-systems
    this.board = new Board();
    this.renderer = new Renderer(this.ctx);
    this.particles = new Particles();

    // 3. State
    this.state = STATE.START;
    this.dropTimer = 0;
    this.lastTime = 0;

    // 4. Cache DOM refs
    this.scoreEl = document.getElementById('score-value');
    this.linesEl = document.getElementById('lines-value');
    this.levelEl = document.getElementById('level-value');
    this.finalScoreEl = document.getElementById('final-score');
    this.bestScoreEl = document.getElementById('best-score');

    // 5. Setup
    this.setupCanvas();
    this.setupInput();
    this.setupUI();

    // 6. Start loop
    requestAnimationFrame((t) => this.loop(t));
  }
}

new Game();
```

**Step 2: Implement `setupCanvas()`**

Exact Summit pattern: resize handler, DPR capped at 2, `setTransform`, store `this.width`/`this.height` as CSS pixels. Call `this.renderer.resize()` in the handler.

**Step 3: Implement `setupInput()`**

Pointer Events on the three touch zones:

```js
setupInput() {
  this.input = { left: false, right: false, rotate: false };
  this.activePointers = new Map();

  // Auto-repeat state for left/right
  this.repeatTimer = 0;
  this.repeatDelay = 0.15; // 150ms initial delay
  this.repeatInterval = 0.08; // 80ms repeat
  this.repeating = false;

  const zones = document.getElementById('touch-controls');
  zones.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const zone = e.target.closest('.touch-zone');
    if (!zone) return;
    const action = zone.dataset.action; // 'left', 'rotate', 'right'
    this.activePointers.set(e.pointerId, action);
    this.handleAction(action);
    if (action !== 'rotate') {
      this.repeating = false;
      this.repeatTimer = 0;
    }
  });
  // pointerup, pointercancel, pointerleave → delete from map

  // Hard drop: swipe down on canvas
  // Detect as pointerdown + pointermove with dy > 30px

  // Keyboard fallback
  window.addEventListener('keydown', (e) => {
    if (this.state !== STATE.PLAYING) return;
    switch (e.key) {
      case 'ArrowLeft': this.board.moveLeft(); break;
      case 'ArrowRight': this.board.moveRight(); break;
      case 'ArrowUp': this.board.rotate(); break;
      case 'ArrowDown': this.board.softDrop(); break;
      case ' ': this.board.hardDrop(); break;
    }
  });

  // Silk browser fix: prevent default on touchstart except for overlays
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('#start-screen, #gameover-screen, #pause-screen, #back-btn')) return;
    e.preventDefault();
  }, { passive: false });
}
```

**Step 4: Implement auto-repeat in `update(dt)`**

```js
// In update(dt):
const heldAction = this.getHeldAction(); // 'left' or 'right' from activePointers
if (heldAction) {
  this.repeatTimer += dt;
  if (!this.repeating && this.repeatTimer >= this.repeatDelay) {
    this.repeating = true;
    this.repeatTimer = 0;
    this.board[heldAction === 'left' ? 'moveLeft' : 'moveRight']();
  } else if (this.repeating && this.repeatTimer >= this.repeatInterval) {
    this.repeatTimer = 0;
    this.board[heldAction === 'left' ? 'moveLeft' : 'moveRight']();
  }
}
```

**Step 5: Implement gravity and drop timer**

```js
// In update(dt):
const dropInterval = Math.pow(0.85, this.board.level - 1); // ~15% faster per level
this.dropTimer += dt;
if (this.dropTimer >= dropInterval) {
  this.dropTimer = 0;
  const alive = this.board.tick(); // returns false if game over
  if (!alive) this.gameOver();
}
```

**Step 6: Implement state transitions**

Follow Summit pattern exactly:
- `startGame()` → reset board, particles, timers; hide start screen, show HUD + controls
- `gameOver()` → save high score to `localStorage('stacker-best')`, show gameover screen
- `pause()` / `resume()` → toggle pause screen, reset `lastTime` on resume

**Step 7: Implement `setupUI()`**

Wire button click handlers:
- Start screen PLAY button → `startGame()`
- Game over PLAY AGAIN button → `startGame()`
- Pause button → `pause()`
- Pause screen RESUME → `resume()`
- Pause screen QUIT → show start screen

**Step 8: Implement HUD updates**

In `update()`, write score/lines/level to cached DOM elements:
```js
this.scoreEl.textContent = this.board.score;
this.linesEl.textContent = this.board.lines;
this.levelEl.textContent = this.board.level;
```

**Step 9: Implement game loop**

```js
loop(time) {
  requestAnimationFrame((t) => this.loop(t));
  const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.05);
  this.lastTime = time;

  if (this.state === STATE.PLAYING) {
    this.update(dt);
  }

  this.particles.update(dt); // particles animate even during pause for visual polish
  this.renderer.render(this.board);
  this.particles.render(this.ctx);
}
```

**Step 10: Implement line clear callback**

When `board.clearLines()` clears rows, emit particles:
```js
// In board.js, clearLines() returns array of cleared row indices
// In main.js update(), after board.tick():
const cleared = this.board.lastClearedRows;
if (cleared.length > 0) {
  cleared.forEach(row => {
    const y = this.renderer.gridY + row * this.renderer.cellSize;
    this.particles.emitLine(y, this.renderer.gridX, this.renderer.cellSize * 10, '#fff');
  });
  // Flash text for 4-line clear
  if (cleared.length === 4) this.showStackerFlash();
}
```

**Step 11: Verify**

Full gameplay test:
- Start screen → tap PLAY → game starts
- Pieces fall, touch zones work (left/right/rotate)
- Lines clear with particles
- Score, lines, level update in HUD
- Game over when stack reaches top → score screen
- Play Again restarts
- Pause/resume works
- ← ARCADE navigates home
- Keyboard controls work for dev testing

**Step 12: Commit**

```bash
git add games/stacker/js/main.js
git commit -m "feat(stacker): main game class — loop, state machine, input, gravity"
```

---

## Task 6: Visual Polish & Juice

**Files:**
- Modify: `games/stacker/js/renderer.js`
- Modify: `games/stacker/js/main.js`
- Modify: `games/stacker/index.html`

**Step 1: Line clear animation**

Add a brief flash state. When lines are cleared:
1. Flash the cleared rows white for ~150ms
2. Dissolve with particles
3. Slide rows above down smoothly (lerp over ~200ms)

Implement as a `lineClearAnim` timer in `main.js` — during the animation, don't tick gravity.

**Step 2: Hard drop trail effect**

When hard drop is triggered, draw a brief vertical trail (2-3 frames) from the piece's start position to its landing position. Simple: store the drop start/end in main.js, render a fading rect strip.

**Step 3: Screen shake**

Subtle shake on line clear (2px, 100ms), stronger on 4-line clear (4px, 200ms). Implement as a `shakeTimer` + `shakeIntensity` in main.js, apply as a `ctx.translate()` offset at the start of render.

**Step 4: "STACKER!" flash text**

On 4-line clear, show "STACKER!" in large Press Start 2P text, centered, fading out over ~1s. Draw directly on canvas (not a DOM element) so it layers nicely.

**Step 5: Level up indicator**

Brief "LEVEL X" text fade + grid border pulse when level increases. Track `prevLevel` to detect transitions.

**Step 6: Game over animation**

When game over triggers, gray out blocks from bottom to top (animate row by row over ~1s), then slide in the score screen.

**Step 7: Verify**

Test each effect:
- Clear 1 line → flash + particles + mild shake
- Clear 4 lines → STACKER! text + strong shake + particles
- Hard drop → trail effect
- Level up → text flash
- Game over → gray-out cascade

**Step 8: Commit**

```bash
git add games/stacker/
git commit -m "feat(stacker): visual polish — line clear anim, screen shake, STACKER flash, game over cascade"
```

---

## Task 7: Homepage Integration

**Files:**
- Modify: `index.html` (add game card)
- Modify: `index.html` `<meta>` description (add "block puzzle" to game list)

**Step 1: Add game card to homepage grid**

Add after the Neon Racers card:

```html
<a href="/games/stacker/" class="game-card">
  <div class="game-icon">🧱</div>
  <div class="game-name">STACKER</div>
  <div class="game-tag">Block Puzzle</div>
</a>
```

**Step 2: Update OG description**

Update the `<meta name="description">` and `<meta property="og:description">` to include "block puzzle":

```html
<meta name="description" content="A retro arcade packed with games for the Reilly boys. Golf, monster trucks, jet battles, kart racing, and block puzzles.">
```

**Step 3: Verify**

- Homepage shows 5 game cards in a 2-column grid (3 in first row via wrapping, or 2+2+1)
- STACKER card links to `/games/stacker/`
- Game loads and plays

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat(stacker): add game card to arcade homepage"
```

---

## Task 8: Fire HD Testing & Cleanup

**Files:**
- Possibly modify: `games/stacker/index.html` (CSS tweaks)
- Possibly modify: `games/stacker/js/renderer.js` (perf tweaks)
- Possibly modify: `games/stacker/js/main.js` (input tweaks)

**Step 1: Test on Fire HD / mobile browser**

Serve the site and test on a Fire HD tablet (or Chrome DevTools mobile emulation at 600×1024):
- Touch zones responsive and large enough
- No scrolling or zooming on touch
- Grid is fully visible between HUD and controls
- Particles don't cause frame drops
- Ghost piece is visible but not distracting

**Step 2: Fix any issues found**

Common Fire HD issues from other games:
- Silk browser needs the global `touchstart preventDefault` fix (already included in Task 5)
- Touch zone heights may need increase from 100px → 120px
- Font sizes may need adjustment
- Particle count may need reduction if frame rate drops

**Step 3: Final commit**

```bash
git add games/stacker/
git commit -m "fix(stacker): Fire HD touch and performance adjustments"
```

---

## Summary

| Task | What | Key Files |
|------|------|-----------|
| 1 | HTML scaffold | `games/stacker/index.html`, stub `main.js` |
| 2 | Board logic | `games/stacker/js/board.js` |
| 3 | Renderer | `games/stacker/js/renderer.js` |
| 4 | Particles | `games/stacker/js/particles.js` |
| 5 | Main game class | `games/stacker/js/main.js` |
| 6 | Visual polish | renderer, main, index.html |
| 7 | Homepage integration | root `index.html` |
| 8 | Fire HD testing | tweaks as needed |
