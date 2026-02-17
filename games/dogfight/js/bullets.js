// Dogfight — Bullet Pool
// Object-pooled bullets for both player and enemy fire

const MAX_BULLETS = 80;

export class BulletPool {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, isPlayer: true, active: false });
    }
  }

  reset() {
    for (const b of this.pool) b.active = false;
  }

  spawn(x, y, vx, vy, isPlayer) {
    for (const b of this.pool) {
      if (!b.active) {
        b.x = x;
        b.y = y;
        b.vx = vx;
        b.vy = vy;
        b.isPlayer = isPlayer;
        b.active = true;
        return b;
      }
    }
    return null; // pool exhausted
  }

  update(dt, screenW, screenH) {
    const margin = 30;
    for (const b of this.pool) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Deactivate if off screen
      if (b.x < -margin || b.x > screenW + margin ||
          b.y < -margin || b.y > screenH + margin) {
        b.active = false;
      }
    }
  }

  // Check if any bullet of the opposite side hits a circle
  // Returns true and deactivates the bullet on first hit
  checkHitCircle(cx, cy, radius, checkPlayerBullets) {
    for (const b of this.pool) {
      if (!b.active) continue;
      if (b.isPlayer !== checkPlayerBullets) continue;

      const dx = b.x - cx;
      const dy = b.y - cy;
      if (dx * dx + dy * dy < radius * radius) {
        b.active = false;
        return true;
      }
    }
    return false;
  }

  render(ctx) {
    // Draw player bullets
    ctx.fillStyle = '#00fff5';
    for (const b of this.pool) {
      if (!b.active || !b.isPlayer) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw enemy bullets
    ctx.fillStyle = '#ff3333';
    for (const b of this.pool) {
      if (!b.active || b.isPlayer) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
