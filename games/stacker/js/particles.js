// Stacker — Particles Module
// Object-pooled particle system for line clears, hard drops, and level-up effects.
// No allocations in the game loop — all particles are pre-allocated.

const MAX_PARTICLES = 80;

export class Particles {
  constructor() {
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 0, color: '#fff', size: 3,
    }));
  }

  reset() {
    for (const p of this.pool) p.active = false;
  }

  // ── Point emitter ──────────────────────────────────────────────
  // General-purpose: hard drop impact, level-up flash, etc.

  emit(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = this._next();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.3 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.color = color;
      p.size = 2 + Math.random() * 2;
      p.active = true;
    }
  }

  // ── Line emitter ───────────────────────────────────────────────
  // Spreads particles evenly across a cleared row.
  // gridX / gridWidth are in pixel coordinates (from Renderer).

  emitLine(y, gridX, gridWidth, color) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const p = this._next();
      if (!p) return;
      p.x = gridX + (i / (count - 1)) * gridWidth;
      p.y = y;
      // Random outward / upward burst
      p.vx = (Math.random() - 0.5) * 160;
      p.vy = -(40 + Math.random() * 120);
      p.life = 0.3 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.color = color;
      p.size = 2 + Math.random() * 2;
      p.active = true;
    }
  }

  // ── Update ─────────────────────────────────────────────────────

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt; // slight gravity
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  // Small filled rects with alpha fade. No shadowBlur (Fire HD perf).

  render(ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      const half = p.size * 0.5;
      ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // ── Internal: find next inactive particle ──────────────────────

  _next() {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null; // pool exhausted
  }
}
