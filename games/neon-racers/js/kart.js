// Kart physics, rendering, and AI controller

// ── Physics constants ──────────────────────────────────────────────────────
const MAX_SPEED = 320;
const ACCELERATION = 180;
const TURN_RATE_LOW = 3.8;       // rad/s at low speed
const TURN_RATE_HIGH = 2.0;      // rad/s at max speed
const FORWARD_DRAG = 2.0;        // forward deceleration when above max speed (units/s²)
const LATERAL_FRICTION = 8.0;    // lateral velocity decay rate (higher = more grip, less drift)
const TURN_SPEED_COST = 20;      // forward speed lost per second while steering
const WALL_BOUNCE_SLOW = 0.45;   // velocity multiplier on wall hit
const WALL_PUSH = 12;            // push-back force from wall
const BOOST_MULTIPLIER = 1.55;
const BOOST_DURATION = 1.5;      // seconds

// ── Kart dimensions ────────────────────────────────────────────────────────
const KART_LENGTH = 38;
const KART_WIDTH = 20;

// ── F1 body outline path (reused for fill, stroke, and hit flash) ──────────
function f1BodyPath(ctx) {
  ctx.moveTo(19, 0);               // nose tip
  ctx.lineTo(15, -3);              // nose widens
  ctx.lineTo(8, -5.5);             // front body
  ctx.lineTo(-4, -7);              // sidepod (widest)
  ctx.lineTo(-14, -6.5);           // narrows toward rear
  ctx.lineTo(-17, -5);             // rear corner
  ctx.lineTo(-17, 5);              // across rear
  ctx.lineTo(-14, 6.5);
  ctx.lineTo(-4, 7);               // sidepod
  ctx.lineTo(8, 5.5);              // front body
  ctx.lineTo(15, 3);               // nose narrows
  ctx.closePath();
}

export class Kart {
  constructor(color, isPlayer = false) {
    this.color = color;
    this.isPlayer = isPlayer;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;              // derived from vx/vy each frame (read-only)
    this.maxSpeed = MAX_SPEED;
    this.boostTimer = 0;
    this.trackIndex = 0;       // nearest track sample index (for progress)
    this.lap = 0;
    this.finished = false;
    this.finishTime = 0;
    this.lastProgress = 0;
    this.totalProgress = 0;    // lap + fractional progress (for position ranking)
    this.wallHitTimer = 0;
  }

  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.boostTimer = 0;
    this.trackIndex = 0;
    this.lap = 0;
    this.finished = false;
    this.finishTime = 0;
    this.lastProgress = 0;
    this.totalProgress = 0;
    this.wallHitTimer = 0;
  }

  update(dt, steerLeft, steerRight, track) {
    if (this.finished) return;

    // Steering — turn rate decreases at higher speeds
    const speedRatio = this.speed / this.maxSpeed;
    const turnRate = TURN_RATE_LOW + (TURN_RATE_HIGH - TURN_RATE_LOW) * speedRatio;
    if (steerLeft) this.angle -= turnRate * dt;
    if (steerRight) this.angle += turnRate * dt;

    // Decompose velocity into forward/lateral relative to heading
    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    let forwardSpeed = this.vx * cosA + this.vy * sinA;
    let lateralSpeed = -this.vx * sinA + this.vy * cosA;

    // Accelerate forward (auto-accelerate, capped at max)
    const currentMax = this.boostTimer > 0 ? this.maxSpeed * BOOST_MULTIPLIER : this.maxSpeed;
    if (forwardSpeed < currentMax) {
      forwardSpeed += ACCELERATION * dt;
      if (forwardSpeed > currentMax) forwardSpeed = currentMax;
    } else {
      forwardSpeed -= FORWARD_DRAG * 3 * dt; // bleed off boost overspeed
    }

    // Turn speed penalty — turning costs forward momentum
    if (steerLeft || steerRight) {
      forwardSpeed = Math.max(0, forwardSpeed - TURN_SPEED_COST * dt);
    }

    // Lateral friction — kills sideways velocity, creating grip
    lateralSpeed *= Math.exp(-LATERAL_FRICTION * dt);

    // Recompose velocity from forward/lateral
    this.vx = cosA * forwardSpeed + (-sinA) * lateralSpeed;
    this.vy = sinA * forwardSpeed + cosA * lateralSpeed;

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Derived speed for other systems
    this.speed = Math.hypot(this.vx, this.vy);

    // Track collision
    const info = track.getTrackInfo(this.x, this.y, this.trackIndex);
    this.trackIndex = info.index;

    if (!info.onTrack) {
      // Push back toward track center
      const pushX = info.sample.x - this.x;
      const pushY = info.sample.y - this.y;
      const pushLen = Math.hypot(pushX, pushY) || 1;
      this.x += (pushX / pushLen) * WALL_PUSH;
      this.y += (pushY / pushLen) * WALL_PUSH;
      this.vx *= WALL_BOUNCE_SLOW;
      this.vy *= WALL_BOUNCE_SLOW;
      this.speed = Math.hypot(this.vx, this.vy);
      this.wallHitTimer = 0.15;
    }

    // Boost pad check
    if (track.isOnBoostPad(info.index)) {
      this.boostTimer = BOOST_DURATION;
    }
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
    }

    // Wall hit timer
    if (this.wallHitTimer > 0) this.wallHitTimer -= dt;

    // Lap detection
    this._updateLap(info.progress);
  }

  _updateLap(progress) {
    // Detect crossing start line (progress wraps from ~1.0 to ~0.0)
    if (this.lastProgress > 0.85 && progress < 0.15) {
      this.lap++;
    }
    // Guard against backwards crossing
    if (this.lastProgress < 0.15 && progress > 0.85) {
      this.lap = Math.max(0, this.lap - 1);
    }
    this.lastProgress = progress;
    this.totalProgress = this.lap + progress;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // ── Tires (behind body) ──────────────────────────────────────────────
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a1a';
    // Front tires (narrow)
    ctx.fillRect(10, -13, 6, 5);
    ctx.fillRect(10, 8, 6, 5);
    // Rear tires (wider)
    ctx.fillRect(-16, -14, 8, 6);
    ctx.fillRect(-16, 8, 8, 6);

    // Tire tread marks (lighter gray horizontal lines)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const o = i * 2;
      // Front
      ctx.moveTo(11 + o, -13); ctx.lineTo(11 + o, -8);
      ctx.moveTo(11 + o, 8);   ctx.lineTo(11 + o, 13);
      // Rear
      ctx.moveTo(-15 + o * 1.2, -14); ctx.lineTo(-15 + o * 1.2, -8);
      ctx.moveTo(-15 + o * 1.2, 8);   ctx.lineTo(-15 + o * 1.2, 14);
    }
    ctx.stroke();

    // ── Suspension arms ──────────────────────────────────────────────────
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, -6);  ctx.lineTo(13, -13);   // front left
    ctx.moveTo(10, 6);   ctx.lineTo(13, 13);    // front right
    ctx.moveTo(-10, -6); ctx.lineTo(-12, -14);  // rear left
    ctx.moveTo(-10, 6);  ctx.lineTo(-12, 14);   // rear right
    ctx.stroke();

    // ── Body ─────────────────────────────────────────────────────────────
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.boostTimer > 0 ? 18 : 10;

    ctx.beginPath();
    f1BodyPath(ctx);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Body outline (dark edge for definition)
    ctx.beginPath();
    f1BodyPath(ctx);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // ── White accent stripe ──────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(17, -1.5);
    ctx.lineTo(8, -2);
    ctx.lineTo(-15, -1.5);
    ctx.lineTo(-15, 1.5);
    ctx.lineTo(8, 2);
    ctx.lineTo(17, 1.5);
    ctx.closePath();
    ctx.fill();

    // ── Cockpit ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (car color)
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(-1, 0, 2.3, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-0.3, 0, 1.2, -0.8, 0.8);
    ctx.closePath();
    ctx.fill();

    // ── Front wing ───────────────────────────────────────────────────────
    ctx.fillStyle = '#ccc';
    ctx.fillRect(16, -11.5, 2.5, 23);
    // Endplates (yellow like the reference)
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(16, -12.5, 2.5, 2);
    ctx.fillRect(16, 10.5, 2.5, 2);

    // ── Rear wing ────────────────────────────────────────────────────────
    ctx.fillStyle = '#ccc';
    ctx.fillRect(-19.5, -11.5, 2.5, 23);
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(-19.5, -12.5, 2.5, 2);
    ctx.fillRect(-19.5, 10.5, 2.5, 2);

    // ── Wall hit flash ───────────────────────────────────────────────────
    if (this.wallHitTimer > 0) {
      ctx.globalAlpha = this.wallHitTimer * 3;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      f1BodyPath(ctx);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

// ── AI Controller ──────────────────────────────────────────────────────────
export class AIController {
  constructor(speedFactor) {
    this.speedFactor = speedFactor;
    this.lookAhead = 12;            // samples ahead to target
    this.randomOffset = 0;
    this.offsetTimer = 0;
    this.offsetDirection = 0;
  }

  reset() {
    this.randomOffset = 0;
    this.offsetTimer = 0;
    this.offsetDirection = 0;
  }

  update(dt, kart, track) {
    // Set AI max speed based on track difficulty
    kart.maxSpeed = MAX_SPEED * this.speedFactor;

    // Random lateral wandering for variety
    this.offsetTimer -= dt;
    if (this.offsetTimer <= 0) {
      this.offsetTimer = 1 + Math.random() * 2;
      this.offsetDirection = (Math.random() - 0.5) * track.trackWidth * 0.25;
    }
    this.randomOffset += (this.offsetDirection - this.randomOffset) * dt * 2;

    // Find target point ahead on track
    const samples = track.samples;
    const n = samples.length;
    const targetIdx = (kart.trackIndex + this.lookAhead) % n;
    const target = samples[targetIdx];

    // Apply random offset perpendicular to track
    const targetX = target.x + target.nx * this.randomOffset;
    const targetY = target.y + target.ny * this.randomOffset;

    // Calculate desired angle to target
    const dx = targetX - kart.x;
    const dy = targetY - kart.y;
    const desiredAngle = Math.atan2(dy, dx);

    // Determine steering
    let angleDiff = desiredAngle - kart.angle;
    // Normalize to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steerLeft = angleDiff < -0.05;
    const steerRight = angleDiff > 0.05;

    kart.update(dt, steerLeft, steerRight, track);
  }
}
