// Dogfight — Particle System
// Lightweight pooled explosions — 8 particles per explosion, 300ms lifetime

const MAX_PARTICLES = 64;

export class ParticleSystem {
  constructor() {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '', active: false });
    }
  }

  reset() {
    for (const p of this.particles) p.active = false;
  }

  explode(x, y, color) {
    const count = 8;
    const speed = 120;
    const life = 0.3;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = speed * (0.6 + Math.random() * 0.8);

      // Find inactive particle
      for (const p of this.particles) {
        if (!p.active) {
          p.x = x;
          p.y = y;
          p.vx = Math.cos(angle) * spd;
          p.vy = Math.sin(angle) * spd;
          p.life = life;
          p.maxLife = life;
          p.color = color;
          p.active = true;
          break;
        }
      }
    }
  }

  update(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95; // friction
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      const radius = 3 * alpha + 1;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
