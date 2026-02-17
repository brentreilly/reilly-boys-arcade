// Dogfight — Player Jet
// Movement, rotation, shooting, lives, invincibility, engine trail

import { playerSprite } from './sprites.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.angle = 0;         // radians, 0 = pointing right
    this.speed = 280;       // pixels/sec
    this.size = 20;         // half-width of jet shape
    this.hitRadius = 12;    // smaller than visual (forgiveness)

    this.lives = 3;
    this.maxLives = 3;
    this.invincible = false;
    this.invTimer = 0;
    this.invDuration = 2.0; // seconds of invincibility after hit
    this.blinkRate = 0.1;   // blink interval during invincibility

    // Shooting
    this.fireRate = 0.15;   // seconds between shots
    this.fireTimer = 0;

    // Trail
    this.trail = [];
    this.trailMax = 5;
  }

  reset(screenW, screenH) {
    this.x = screenW * 0.3;
    this.y = screenH * 0.5;
    this.angle = 0;
    this.lives = 3;
    this.invincible = false;
    this.invTimer = 0;
    this.fireTimer = 0;
    this.trail = [];
  }

  update(dt, dir, screenW, screenH) {
    // Move
    if (dir.x !== 0 || dir.y !== 0) {
      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;

      // Rotate toward movement direction
      const targetAngle = Math.atan2(dir.y, dir.x);
      this.angle = lerpAngle(this.angle, targetAngle, 8 * dt);
    }

    // Clamp to screen (with padding)
    const pad = this.size;
    this.x = Math.max(pad, Math.min(screenW - pad, this.x));
    this.y = Math.max(pad, Math.min(screenH - pad, this.y));

    // Invincibility timer
    if (this.invincible) {
      this.invTimer -= dt;
      if (this.invTimer <= 0) {
        this.invincible = false;
      }
    }

    // Fire cooldown
    if (this.fireTimer > 0) this.fireTimer -= dt;

    // Trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.trailMax) this.trail.pop();
  }

  tryShoot(bullets) {
    if (this.fireTimer > 0) return;
    this.fireTimer = this.fireRate;

    const bulletSpeed = 500;
    bullets.spawn(
      this.x + Math.cos(this.angle) * this.size,
      this.y + Math.sin(this.angle) * this.size,
      Math.cos(this.angle) * bulletSpeed,
      Math.sin(this.angle) * bulletSpeed,
      true // isPlayer
    );
  }

  takeDamage() {
    this.lives--;
    this.invincible = true;
    this.invTimer = this.invDuration;
  }

  gainLife() {
    if (this.lives < this.maxLives) this.lives++;
  }

  render(ctx) {
    // Skip rendering on blink frames during invincibility
    if (this.invincible) {
      const blinkOn = Math.floor(this.invTimer / this.blinkRate) % 2 === 0;
      if (!blinkOn) return;
    }

    // Engine trail (fading green circles)
    for (let i = 1; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = 0.4 * (1 - i / this.trail.length);
      const r = 4 * (1 - i / this.trail.length);
      ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jet body (pixel art sprite)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Neon glow (pre-rendered, drawn at reduced alpha)
    ctx.globalAlpha = 0.6;
    ctx.drawImage(
      playerSprite.glow,
      -playerSprite.w / 2 - playerSprite.glowPad,
      -playerSprite.h / 2 - playerSprite.glowPad
    );

    // Crisp sprite
    ctx.globalAlpha = 1;
    ctx.drawImage(playerSprite.canvas, -playerSprite.w / 2, -playerSprite.h / 2);

    ctx.restore();
  }
}

// Smoothly interpolate between two angles
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * Math.min(t, 1);
}
