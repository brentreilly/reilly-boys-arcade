// Lightweight particle system for visual effects.
// Kept under 30 simultaneous particles for Fire HD performance.

const MAX_PARTICLES = 30;

class Particle {
  constructor() { this.alive = false; }

  spawn(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.alive = true;
  }
}

export class ParticleSystem {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push(new Particle());
    }
  }

  reset() {
    for (const p of this.pool) p.alive = false;
  }

  _getParticle() {
    for (const p of this.pool) {
      if (!p.alive) return p;
    }
    // Recycle oldest (first in pool)
    return this.pool[0];
  }

  // Tire trail behind a kart
  addTireTrail(x, y, angle, color) {
    const p = this._getParticle();
    // Spawn behind the kart with slight spread
    const spread = (Math.random() - 0.5) * 8;
    const bx = x - Math.cos(angle) * 18 + Math.sin(angle) * spread;
    const by = y - Math.sin(angle) * 18 - Math.cos(angle) * spread;
    p.spawn(bx, by, 0, 0, color, 3 + Math.random() * 2, 0.4);
  }

  // Speed lines when hitting a boost pad
  addBoostEffect(x, y, angle) {
    for (let i = 0; i < 3; i++) {
      const p = this._getParticle();
      const spread = (Math.random() - 0.5) * 20;
      const speed = 80 + Math.random() * 60;
      p.spawn(
        x - Math.cos(angle) * 20 + Math.sin(angle) * spread,
        y - Math.sin(angle) * 20 - Math.cos(angle) * spread,
        -Math.cos(angle) * speed,
        -Math.sin(angle) * speed,
        '#00fff5',
        2 + Math.random() * 3,
        0.3 + Math.random() * 0.2,
      );
    }
  }

  // Burst when overtaking an opponent
  addOvertakeEffect(x, y) {
    for (let i = 0; i < 5; i++) {
      const p = this._getParticle();
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      p.spawn(
        x, y,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        i % 2 === 0 ? '#39ff14' : '#ffe600',
        3 + Math.random() * 3,
        0.5 + Math.random() * 0.3,
      );
    }
  }

  // Win confetti
  addWinConfetti(x, y) {
    const colors = ['#39ff14', '#00fff5', '#ff00ff', '#ffe600', '#fff'];
    for (let i = 0; i < 12; i++) {
      const p = this._getParticle();
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      p.spawn(
        x, y,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        colors[i % colors.length],
        4 + Math.random() * 4,
        1.0 + Math.random() * 0.5,
      );
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    }
  }

  render(ctx) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      const size = p.size * (0.5 + alpha * 0.5);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
