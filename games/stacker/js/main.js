// Stacker — Neon Block Puzzle
// Main game class: loop, state machine, input handling, canvas management
// Pattern follows games/summit/js/main.js exactly

import { Board, PIECES } from './board.js';
import { Renderer } from './renderer.js';
import { Particles } from './particles.js';

// --- Game states ---
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
    this.prevLevel = 1;

    // Visual polish state
    this.clearingLines = false;
    this.lineClearTimer = 0;
    this.lineClearDuration = 0.2; // 200ms flash
    this.clearFlashYs = [];       // Y pixel positions of cleared rows

    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    this.flashText = null; // { text, timer, duration }

    this.gameOverFade = 0; // 0→1 fade-in on game over

    // 4. Cache DOM refs (avoid getElementById in loop)
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

  // --- Canvas sizing (EXACT Summit pattern) ---
  setupCanvas() {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.renderer.resize(this.width, this.height);
    };
    resize();
    window.addEventListener('resize', resize);
  }

  // --- Touch + pointer input ---
  setupInput() {
    this.activePointers = new Map(); // pointerId → action ('left'|'rotate'|'right')
    this.repeatTimer = 0;
    this.repeatDelay = 0.15;    // 150ms initial delay before auto-repeat
    this.repeatInterval = 0.08; // 80ms between repeats
    this.repeating = false;
    this.swipeStartY = null;

    const zones = document.getElementById('touch-controls');

    zones.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const zone = e.target.closest('.touch-zone');
      if (!zone || this.state !== STATE.PLAYING) return;
      const action = zone.dataset.action;
      this.activePointers.set(e.pointerId, action);

      // Immediate action on press
      if (action === 'left') this.board.moveLeft();
      else if (action === 'right') this.board.moveRight();
      else if (action === 'rotate') this.board.rotate();

      // Start repeat timer for left/right
      if (action !== 'rotate') {
        this.repeating = false;
        this.repeatTimer = 0;
      }
    });

    const pointerUp = (e) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size === 0) {
        this.repeating = false;
        this.repeatTimer = 0;
      }
    };
    zones.addEventListener('pointerup', pointerUp);
    zones.addEventListener('pointercancel', pointerUp);
    zones.addEventListener('pointerleave', pointerUp);

    // Silk browser fallback: touchend/touchcancel may fire when pointerleave does not
    zones.addEventListener('touchend', () => {
      this.activePointers.clear();
      this.repeating = false;
      this.repeatTimer = 0;
    });
    zones.addEventListener('touchcancel', () => {
      this.activePointers.clear();
      this.repeating = false;
      this.repeatTimer = 0;
    });

    // Hard drop: swipe down on canvas (only in the grid area, not touch zones)
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.clientY > this.height - 100) return; // ignore touch zone area
      this.swipeStartY = e.clientY;
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.swipeStartY !== null && this.state === STATE.PLAYING) {
        if (e.clientY - this.swipeStartY > 30) {
          this.doHardDrop();
          this.swipeStartY = null;
        }
      }
    });
    this.canvas.addEventListener('pointerup', () => { this.swipeStartY = null; });

    // Keyboard fallback for dev
    window.addEventListener('keydown', (e) => {
      if (this.state !== STATE.PLAYING) return;
      switch (e.key) {
        case 'ArrowLeft': this.board.moveLeft(); break;
        case 'ArrowRight': this.board.moveRight(); break;
        case 'ArrowUp': this.board.rotate(); break;
        case 'ArrowDown': this.board.softDrop(); break;
        case ' ': this.doHardDrop(); break;
      }
    });

    // Silk browser fix: prevent default on touchstart except overlays
    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('#start-screen, #gameover-screen, #pause-screen, #back-btn')) return;
      e.preventDefault();
    }, { passive: false });
  }

  // --- UI wiring ---
  setupUI() {
    document.getElementById('play-btn').addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    document.getElementById('pause-btn').addEventListener('click', () => this.pause());
    document.getElementById('resume-btn').addEventListener('click', () => this.resume());
    document.getElementById('quit-btn').addEventListener('click', () => this.quitToStart());
  }

  // --- State transitions ---
  startGame() {
    this.board.reset();
    this.particles.reset();
    this.dropTimer = 0;
    this.state = STATE.PLAYING;
    this.prevLevel = 1;
    this.clearingLines = false;
    this.lineClearTimer = 0;
    this.clearFlashYs = [];
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.flashText = null;
    this.gameOverFade = 0;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('touch-controls').classList.remove('hidden');
  }

  gameOver() {
    this.state = STATE.GAME_OVER;

    // Update high score
    const best = parseInt(localStorage.getItem('stacker-best') || '0', 10);
    const newBest = this.board.score > best;
    if (newBest) localStorage.setItem('stacker-best', String(this.board.score));

    // Populate game over screen
    this.finalScoreEl.textContent = this.board.score;
    this.bestScoreEl.textContent = newBest ? this.board.score : best;

    // Show/hide new record indicator
    const newRecordEl = document.getElementById('gameover-new-record');
    if (newRecordEl) newRecordEl.classList.toggle('hidden', !newBest);

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
    document.getElementById('gameover-screen').classList.remove('hidden');
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    document.getElementById('pause-screen').classList.remove('hidden');
  }

  resume() {
    this.state = STATE.PLAYING;
    this.lastTime = performance.now(); // prevent dt spike
    document.getElementById('pause-screen').classList.add('hidden');
  }

  quitToStart() {
    this.state = STATE.START;
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
  }

  // --- Main loop (EXACT Summit pattern + visual polish) ---
  loop(time) {
    requestAnimationFrame((t) => this.loop(t)); // schedule at TOP, not bottom

    // Delta time (capped at 50ms to avoid physics explosions)
    const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.05);
    this.lastTime = time;

    if (this.state === STATE.PLAYING) {
      this.update(dt);
    }

    // Game over fade
    if (this.state === STATE.GAME_OVER) {
      this.gameOverFade = Math.min(this.gameOverFade + dt * 2, 1); // fade in over 0.5s
    }

    // Flash text timer (runs in all states so it finishes after game over)
    if (this.flashText) {
      this.flashText.timer += dt;
      if (this.flashText.timer >= this.flashText.duration) this.flashText = null;
    }

    // Shake timer
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    // Particles animate regardless of state (visual polish)
    this.particles.update(dt);

    // Screen shake: save + translate before rendering
    const shaking = this.shakeTimer > 0;
    if (shaking) {
      const ox = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const oy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.ctx.save();
      this.ctx.translate(ox, oy);
    }

    // Render always
    this.renderer.render(this.board);

    // Line clear flash overlay
    if (this.clearingLines && this.clearFlashYs.length > 0) {
      const progress = this.lineClearTimer / this.lineClearDuration;
      this.renderer.renderLineClearFlash(this.clearFlashYs, progress);
    }

    // Game over dark overlay
    if (this.gameOverFade > 0) {
      this.renderer.renderGameOverFade(this.gameOverFade);
    }

    // Flash text (STACKER!, LEVEL X)
    if (this.flashText) {
      const progress = this.flashText.timer / this.flashText.duration;
      this.renderer.renderFlashText(this.flashText.text, progress);
    }

    this.particles.render(this.ctx);

    if (shaking) {
      this.ctx.restore();
    }
  }

  // --- Game logic ---
  update(dt) {
    // Line clear animation: pause gravity until flash finishes
    if (this.clearingLines) {
      this.lineClearTimer += dt;
      if (this.lineClearTimer >= this.lineClearDuration) {
        this.clearingLines = false;
        this.clearFlashYs = [];
        this.board.lastClearedRows = [];
      }
      return; // skip gravity + input during line clear flash
    }

    // Auto-repeat for held left/right
    const heldAction = this.getHeldDirection();
    if (heldAction) {
      this.repeatTimer += dt;
      if (!this.repeating && this.repeatTimer >= this.repeatDelay) {
        this.repeating = true;
        this.repeatTimer = 0;
        if (heldAction === 'left') this.board.moveLeft();
        else this.board.moveRight();
      } else if (this.repeating && this.repeatTimer >= this.repeatInterval) {
        this.repeatTimer = 0;
        if (heldAction === 'left') this.board.moveLeft();
        else this.board.moveRight();
      }
    }

    // Gravity
    const dropInterval = Math.pow(0.85, this.board.level - 1); // ~15% faster per level
    this.dropTimer += dt;
    if (this.dropTimer >= dropInterval) {
      this.dropTimer = 0;
      const alive = this.board.tick();
      if (!alive) {
        this.gameOver();
        return;
      }
    }

    // Check for line clears — trigger animation + particles
    if (this.board.lastClearedRows && this.board.lastClearedRows.length > 0) {
      const cleared = this.board.lastClearedRows;

      // Store Y pixel positions BEFORE we clear them (rows already removed from grid,
      // but lastClearedRows holds original indices — use them for Y calculation)
      this.clearFlashYs = cleared.map(
        row => this.renderer.gridY + row * this.renderer.cellSize
      );

      // Enter line clear animation state
      this.clearingLines = true;
      this.lineClearTimer = 0;

      // Emit particles for each cleared row
      for (const y of this.clearFlashYs) {
        this.particles.emitLine(y, this.renderer.gridX, this.renderer.cellSize * this.board.cols, '#fff');
      }

      // Screen shake — stronger for 4-line clear
      this.shakeIntensity = cleared.length === 4 ? 4 : 2;
      this.shakeTimer = cleared.length === 4 ? 0.25 : 0.12;

      // STACKER! flash on 4-line clear
      if (cleared.length === 4) {
        this.flashText = { text: 'STACKER!', timer: 0, duration: 1.0 };
      }

      // Level up detection
      if (this.board.level > this.prevLevel) {
        this.prevLevel = this.board.level;
        // Only show LEVEL text if not already showing STACKER!
        if (!this.flashText || this.flashText.text !== 'STACKER!') {
          this.flashText = { text: `LEVEL ${this.board.level}`, timer: 0, duration: 0.8 };
        }
      }
    }

    // Level up detection (also check on non-clear ticks, e.g. score from other sources)
    if (this.board.level > this.prevLevel) {
      this.prevLevel = this.board.level;
      if (!this.flashText) {
        this.flashText = { text: `LEVEL ${this.board.level}`, timer: 0, duration: 0.8 };
      }
    }

    // Update HUD
    this.scoreEl.textContent = this.board.score;
    this.linesEl.textContent = this.board.lines;
    this.levelEl.textContent = this.board.level;
  }

  // --- Hard drop with particle effect ---
  doHardDrop() {
    if (!this.board.activePiece) return;
    const piece = this.board.activePiece;
    const pieceDef = PIECES[piece.type];
    const matrix = pieceDef.rotations[piece.rotation];
    const ghostRow = this.board.ghostY;

    const dist = this.board.hardDrop();

    // Emit particles at the landing position if the piece actually dropped
    if (dist > 0) {
      // Find the bottom-most filled cells of the piece for particle emission
      for (let c = 0; c < matrix[0].length; c++) {
        for (let r = matrix.length - 1; r >= 0; r--) {
          if (matrix[r][c]) {
            const px = this.renderer.gridX + (piece.col + c) * this.renderer.cellSize + this.renderer.cellSize * 0.5;
            const py = this.renderer.gridY + (ghostRow + r) * this.renderer.cellSize + this.renderer.cellSize;
            this.particles.emit(px, py, pieceDef.color, 3);
            break; // only bottom cell per column
          }
        }
      }
    }
  }

  getHeldDirection() {
    for (const action of this.activePointers.values()) {
      if (action === 'left' || action === 'right') return action;
    }
    return null;
  }
}

// Boot
new Game();
