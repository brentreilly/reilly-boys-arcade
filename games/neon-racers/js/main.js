// Neon Racers — main game loop, state machine, input, rendering orchestration.

import { TrackSystem } from './track.js';
import { Kart, AIController } from './kart.js';
import { Camera } from './camera.js';
import { HUD, TOTAL_LAPS } from './hud.js';
import { ParticleSystem } from './particles.js';

// ── State Machine ──────────────────────────────────────────────────────────
const STATE = {
  TRACK_SELECT: 'track_select',
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  PAUSED: 'paused',
  RACE_FINISH: 'race_finish',
  RESULTS: 'results',
};

// ── Constants ──────────────────────────────────────────────────────────────
const BOOST_DURATION = 1.5;
const AI_COLORS = ['#00fff5', '#ff00ff', '#ffe600'];
const PLAYER_COLOR = '#39ff14';
const GRID_SPACING = 100;
const FINISH_DELAY = 1.5; // seconds after player finishes before showing results

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.camera = new Camera();
    this.hud = new HUD();
    this.particles = new ParticleSystem();

    this.track = null;
    this.currentTrackIdx = 0;
    this.playerKart = new Kart(PLAYER_COLOR, true);
    this.aiKarts = AI_COLORS.map(c => new Kart(c));
    this.aiControllers = AI_COLORS.map(() => new AIController(0.85));
    this.allKarts = [this.playerKart, ...this.aiKarts];

    this.state = STATE.TRACK_SELECT;
    this.lastTime = 0;
    this.raceTimer = 0;
    this.finishTimer = 0;

    // Input
    this.input = { steerLeft: false, steerRight: false };
    this.activePointers = new Map();

    // Trail spawn timer
    this.trailTimer = 0;

    this.setupCanvas();
    this.setupInput();
    this.setupUI();

    // Show track select
    this.hud.showTrackSelect((idx) => this.startRace(idx));

    // Boot loop
    requestAnimationFrame((t) => this.loop(t));
  }

  // ── Canvas Setup ─────────────────────────────────────────────────────────
  setupCanvas() {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  // ── Input ────────────────────────────────────────────────────────────────
  setupInput() {
    const steerZones = document.getElementById('steer-zones');

    const getZone = (x) => {
      return x < window.innerWidth / 2 ? 'left' : 'right';
    };

    const updateInput = () => {
      this.input.steerLeft = false;
      this.input.steerRight = false;
      for (const [, zone] of this.activePointers) {
        if (zone === 'left') this.input.steerLeft = true;
        if (zone === 'right') this.input.steerRight = true;
      }
    };

    steerZones.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.activePointers.set(e.pointerId, getZone(e.clientX));
      updateInput();
    });

    steerZones.addEventListener('pointermove', (e) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, getZone(e.clientX));
        updateInput();
      }
    });

    const pointerUp = (e) => {
      this.activePointers.delete(e.pointerId);
      updateInput();
    };
    steerZones.addEventListener('pointerup', pointerUp);
    steerZones.addEventListener('pointercancel', pointerUp);
    steerZones.addEventListener('pointerleave', pointerUp);

    // Keyboard fallback (dev/testing)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.input.steerLeft = true;
      if (e.key === 'ArrowRight' || e.key === 'd') this.input.steerRight = true;
      if (e.key === 'Escape' || e.key === 'p') this.togglePause();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.input.steerLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd') this.input.steerRight = false;
    });
  }

  setupUI() {
    // Pause button
    document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('pause-resume-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('pause-quit-btn').addEventListener('click', () => this.goToMenu());
  }

  // ── State Transitions ────────────────────────────────────────────────────
  startRace(trackIdx) {
    this.currentTrackIdx = trackIdx;
    this.track = new TrackSystem(trackIdx);
    this.particles.reset();
    this.raceTimer = 0;
    this.finishTimer = 0;

    // Set AI speed factors
    for (const ctrl of this.aiControllers) {
      ctrl.speedFactor = this.track.aiSpeed;
      ctrl.reset();
    }

    // Position karts at start line
    const startPositions = this.track.getStartPositions(4);
    // Player starts last (4th)
    this.playerKart.reset(startPositions[3].x, startPositions[3].y, startPositions[3].angle);
    for (let i = 0; i < 3; i++) {
      this.aiKarts[i].reset(startPositions[i].x, startPositions[i].y, startPositions[i].angle);
    }

    // Initialize camera
    this.camera.reset(this.playerKart.x, this.playerKart.y, this.playerKart.angle);

    this.state = STATE.COUNTDOWN;
    this.hud.showCountdown(() => {
      this.state = STATE.RACING;
    });
  }

  togglePause() {
    if (this.state === STATE.RACING) {
      this.state = STATE.PAUSED;
      this.hud.showPause();
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.RACING;
      this.hud.hidePause();
    }
  }

  goToMenu() {
    this.state = STATE.TRACK_SELECT;
    this.hud.hidePause();
    this.hud.showTrackSelect((idx) => this.startRace(idx));
  }

  // ── Game Loop ────────────────────────────────────────────────────────────
  loop(time) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.05);
    this.lastTime = time;

    if (this.state === STATE.RACING) {
      this.update(dt);
    } else if (this.state === STATE.RACE_FINISH) {
      this.updateFinish(dt);
    }

    // Always render when we have a track
    if (this.track) {
      this.render();
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────
  update(dt) {
    this.raceTimer += dt;

    // Update player kart
    this.playerKart.update(dt, this.input.steerLeft, this.input.steerRight, this.track);

    // Update AI karts
    for (let i = 0; i < this.aiKarts.length; i++) {
      this.aiControllers[i].update(dt, this.aiKarts[i], this.track);
    }

    // Camera follows player
    this.camera.update(dt, this.playerKart);

    // Particles
    this.particles.update(dt);

    // Tire trails (throttled)
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.05;
      if (this.playerKart.speed > 50) {
        this.particles.addTireTrail(this.playerKart.x, this.playerKart.y, this.playerKart.angle, PLAYER_COLOR);
      }
    }

    // Boost effects
    if (this.playerKart.boostTimer > 0 && this.playerKart.boostTimer > BOOST_DURATION - 0.1) {
      this.particles.addBoostEffect(this.playerKart.x, this.playerKart.y, this.playerKart.angle);
    }

    // Position tracking
    this.updatePositions();

    // Lap tracking
    const playerLap = this.playerKart.lap + 1;
    this.hud.updateLap(playerLap, TOTAL_LAPS);

    // Mark any finished karts
    for (const kart of this.allKarts) {
      if (kart.lap >= TOTAL_LAPS && !kart.finished) {
        kart.finished = true;
        kart.finishTime = this.raceTimer;
      }
    }

    // If player finished, enter finish state
    if (this.playerKart.finished) {
      this.state = STATE.RACE_FINISH;
      this.finishTimer = 0;
    }
  }

  updateFinish(dt) {
    this.finishTimer += dt;
    this.raceTimer += dt;

    // Keep AI running to finish
    for (let i = 0; i < this.aiKarts.length; i++) {
      if (!this.aiKarts[i].finished) {
        this.aiControllers[i].update(dt, this.aiKarts[i], this.track);
        if (this.aiKarts[i].lap >= TOTAL_LAPS) {
          this.aiKarts[i].finished = true;
          this.aiKarts[i].finishTime = this.raceTimer;
        }
      }
    }

    this.camera.update(dt, this.playerKart);
    this.particles.update(dt);

    // Show results after delay
    if (this.finishTimer >= FINISH_DELAY) {
      const position = this.getPlayerPosition();

      // Win confetti
      if (position === 1) {
        this.particles.addWinConfetti(this.playerKart.x, this.playerKart.y);
      }

      this.state = STATE.RESULTS;
      this.hud.showResults(
        position,
        this.currentTrackIdx,
        () => this.startRace(this.currentTrackIdx),       // replay
        () => {                                             // next track
          const next = Math.min(this.currentTrackIdx + 1, this.hud.unlockedCount - 1);
          this.startRace(next);
        },
        () => this.goToMenu(),                             // menu
      );
    }
  }

  updatePositions() {
    // Sort all karts by total progress (descending)
    const sorted = [...this.allKarts].sort((a, b) => b.totalProgress - a.totalProgress);
    const playerPos = sorted.indexOf(this.playerKart) + 1;

    // Check for overtake
    const prevPos = this.hud.lastPosition;
    if (playerPos < prevPos && prevPos > 0) {
      this.particles.addOvertakeEffect(this.playerKart.x, this.playerKart.y);
    }

    this.hud.updatePosition(playerPos);
  }

  getPlayerPosition() {
    // Final position based on finish time
    const sorted = [...this.allKarts]
      .filter(k => k.finished)
      .sort((a, b) => a.finishTime - b.finishTime);
    const pos = sorted.indexOf(this.playerKart) + 1;
    // If player hasn't finished yet somehow, they're last
    return pos > 0 ? pos : 4;
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    // Apply camera transform
    this.camera.applyTransform(ctx, w, h);

    // Grid background
    this.renderGrid(ctx);

    // Track
    this.track.render(ctx);

    // Karts (draw player last so they're on top)
    for (const kart of this.aiKarts) {
      kart.render(ctx);
    }
    this.playerKart.render(ctx);

    // Particles (world-space)
    this.particles.render(ctx);

    ctx.restore();

    // Steer zone indicators (screen-space)
    this.renderSteerIndicators(ctx, w, h);
  }

  renderGrid(ctx) {
    const cx = this.camera.x;
    const cy = this.camera.y;
    const viewRadius = 900;

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;

    const startX = Math.floor((cx - viewRadius) / GRID_SPACING) * GRID_SPACING;
    const endX = cx + viewRadius;
    const startY = Math.floor((cy - viewRadius) / GRID_SPACING) * GRID_SPACING;
    const endY = cy + viewRadius;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += GRID_SPACING) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  renderSteerIndicators(ctx, w, h) {
    // Subtle indicators when steering
    if (this.input.steerLeft) {
      ctx.fillStyle = 'rgba(57, 255, 20, 0.06)';
      ctx.fillRect(0, 0, w / 2, h);
      ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
      ctx.font = '32px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◀', 60, h / 2);
    }
    if (this.input.steerRight) {
      ctx.fillStyle = 'rgba(57, 255, 20, 0.06)';
      ctx.fillRect(w / 2, 0, w / 2, h);
      ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
      ctx.font = '32px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▶', w - 60, h / 2);
    }
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────
new Game();
