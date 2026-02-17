// Monster truck entity — physics and rendering
// HCR2-inspired: big wheels, bouncy suspension, easy to flip if careless

const WHEEL_RADIUS = 22;
const WHEEL_BASE = 80;
const BODY_WIDTH = 65;
const BODY_HEIGHT = 22;
const BODY_LIFT = 18;           // how high body sits above wheel center
const GRAVITY = 1200;           // heavy truck — hills are real obstacles
const GAS_FORCE = 700;          // powerful — need speed to launch off hills
const BRAKE_FORCE = 700;
const MAX_SPEED = 1500;
const GROUND_FRICTION = 0.975;  // less friction = more sliding on hills
const AIR_DRAG = 0.999;
const ANGULAR_DAMPING = 0.96;   // heavy truck — sluggish rotation in air
const BOUNCE_FACTOR = 0.25;     // suspension absorbs most of the impact
const AIR_TILT_FORCE = 5.5;     // responsive air lean control
const GROUND_TILT_FORCE = 6.0;  // wheelie/stoppie torque from gas/brake

// Body color
const BODY_COLOR = '#cc2200';
const BODY_HIGHLIGHT = '#e63300';
const CAB_COLOR = '#1a1a1a';
const ACCENT_COLOR = '#ff6600';

export class Truck {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 100;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVel = 0;
    this.grounded = true;
    this.wheelSpin = 0;
    this.flipTimer = 0;
    this.isFlipped = false;
    this.suspensionCompress = 0; // 0 = relaxed, 1 = fully compressed
  }

  update(dt, input, terrain) {
    const halfBase = WHEEL_BASE / 2;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const rearWheelX = this.x - cos * halfBase;
    const frontWheelX = this.x + cos * halfBase;

    const terrainRear = terrain.heightAt(rearWheelX);
    const terrainFront = terrain.heightAt(frontWheelX);
    const terrainCenter = terrain.heightAt(this.x);
    const slopeAngle = terrain.slopeAt(this.x);

    const wheelBottomY = this.y + WHEEL_RADIUS;
    const groundLevel = (terrainRear + terrainFront) / 2; // average both wheels
    this.grounded = wheelBottomY >= groundLevel - 5;

    // Ease suspension back to relaxed
    this.suspensionCompress *= 0.9;

    if (this.grounded) {
      // Landing bounce
      if (this.vy > 80) {
        const impactForce = this.vy * BOUNCE_FACTOR;
        this.vy = -impactForce;
        this.suspensionCompress = Math.min(1, this.vy / 400);

        // Landing at an angle adds angular momentum (gentle — not a feedback loop)
        if (Math.abs(this.angle) > 0.2) {
          this.angularVel += this.angle * 0.15;
        }
      } else {
        // Snap to terrain (average of both wheel contact points)
        this.y = groundLevel - WHEEL_RADIUS;
        if (this.vy > 0) this.vy = 0;
      }

      // Body angle from terrain slope (tighter tracking — truck hugs the ground)
      const targetAngle = Math.atan2(terrainFront - terrainRear, WHEEL_BASE);
      this.angle += (targetAngle - this.angle) * 0.25;
      this.angularVel *= 0.88;

      // Gas — forward force + wheelie torque (nose up)
      if (input.gas) {
        this.vx += Math.cos(slopeAngle) * GAS_FORCE * dt;
        this.vy += Math.sin(slopeAngle) * GAS_FORCE * dt;
        this.angularVel -= GROUND_TILT_FORCE * dt;
      }

      // Brake / reverse + stoppie torque (nose down)
      if (input.brake) {
        this.vx -= Math.cos(slopeAngle) * BRAKE_FORCE * dt;
        if (this.vx < -MAX_SPEED * 0.3) this.vx = -MAX_SPEED * 0.3;
        this.angularVel += GROUND_TILT_FORCE * dt;
      }

      // Apply angular velocity on ground (enables wheelie/stoppie lean)
      this.angle += this.angularVel * dt;

      // Friction
      this.vx *= Math.pow(GROUND_FRICTION, dt * 60);

      // Stop sliding when nearly stopped
      if (!input.gas && !input.brake && Math.abs(this.vx) < 10) {
        this.vx *= 0.85;
      }

      this.flipTimer = 0;
    } else {
      // Air physics
      this.vy += GRAVITY * dt;
      this.vx *= Math.pow(AIR_DRAG, dt * 60);

      // Air tilt — gas tilts forward, brake tilts back
      if (input.gas) this.angularVel -= AIR_TILT_FORCE * dt;
      if (input.brake) this.angularVel += AIR_TILT_FORCE * dt;
      this.angularVel *= Math.pow(ANGULAR_DAMPING, dt * 60);
      this.angle += this.angularVel * dt;

      // No auto-right — flipping is now fatal on landing
    }

    // Clamp speed
    if (this.vx > MAX_SPEED) this.vx = MAX_SPEED;
    if (this.vx < -MAX_SPEED * 0.3) this.vx = -MAX_SPEED * 0.3;

    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Don't go below terrain (use per-wheel average for consistency)
    const rearGround = terrain.heightAt(this.x - Math.cos(this.angle) * halfBase);
    const frontGround = terrain.heightAt(this.x + Math.cos(this.angle) * halfBase);
    const groundY = (rearGround + frontGround) / 2 - WHEEL_RADIUS;
    if (this.y > groundY) {
      this.y = groundY;
      if (this.vy > 0) this.vy = 0;
      this.grounded = true;
    }

    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // Flip death — if grounded and tilted past ~100°, truck is on its side/roof
    if (this.grounded && Math.abs(this.angle) > Math.PI * 0.55) {
      this.isFlipped = true;
    }

    this.wheelSpin += this.vx * dt * 0.04;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const wb = WHEEL_BASE / 2;
    const hw = BODY_WIDTH / 2;
    const bodyY = -BODY_LIFT - this.suspensionCompress * 4;

    // --- Suspension shocks (draw behind body) ---
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    // Rear shock
    ctx.beginPath();
    ctx.moveTo(-wb + 5, 0);
    ctx.lineTo(-wb + 15, bodyY + BODY_HEIGHT);
    ctx.stroke();
    // Front shock
    ctx.beginPath();
    ctx.moveTo(wb - 5, 0);
    ctx.lineTo(wb - 15, bodyY + BODY_HEIGHT);
    ctx.stroke();

    // Shock springs (zigzag)
    this.drawSpring(ctx, -wb + 10, 0, -wb + 10, bodyY + BODY_HEIGHT);
    this.drawSpring(ctx, wb - 10, 0, wb - 10, bodyY + BODY_HEIGHT);

    // --- Chassis rail connecting wheels ---
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-wb, 0);
    ctx.lineTo(wb, 0);
    ctx.stroke();

    // --- Truck body ---
    // Main body (pickup bed + cab)
    ctx.fillStyle = BODY_COLOR;
    ctx.beginPath();
    ctx.roundRect(-hw, bodyY, BODY_WIDTH, BODY_HEIGHT, 4);
    ctx.fill();

    // Body highlight (top edge)
    ctx.fillStyle = BODY_HIGHLIGHT;
    ctx.fillRect(-hw + 2, bodyY, BODY_WIDTH - 4, 4);

    // Cab (raised section)
    const cabW = 28;
    const cabH = 18;
    const cabX = -5;
    ctx.fillStyle = BODY_COLOR;
    ctx.beginPath();
    ctx.roundRect(cabX, bodyY - cabH, cabW, cabH, [4, 4, 0, 0]);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#224466';
    ctx.beginPath();
    ctx.roundRect(cabX + 3, bodyY - cabH + 3, cabW - 6, cabH - 5, 2);
    ctx.fill();

    // Windshield glare
    ctx.fillStyle = 'rgba(100, 180, 255, 0.3)';
    ctx.fillRect(cabX + 5, bodyY - cabH + 4, 6, cabH - 8);

    // Accent stripe
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fillRect(-hw + 3, bodyY + BODY_HEIGHT - 6, BODY_WIDTH - 6, 3);

    // Front bumper
    ctx.fillStyle = '#888';
    ctx.fillRect(hw - 4, bodyY + 4, 6, BODY_HEIGHT - 8);

    // Headlight
    ctx.fillStyle = '#ffee88';
    ctx.beginPath();
    ctx.arc(hw + 1, bodyY + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    // Rear bumper
    ctx.fillStyle = '#888';
    ctx.fillRect(-hw - 2, bodyY + 4, 4, BODY_HEIGHT - 8);

    // Taillight
    ctx.fillStyle = '#ff2200';
    ctx.beginPath();
    ctx.arc(-hw - 1, bodyY + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    // --- Wheels (draw on top) ---
    this.drawWheel(ctx, -wb, 0);
    this.drawWheel(ctx, wb, 0);

    ctx.restore();
  }

  drawSpring(ctx, x1, y1, x2, y2) {
    const segments = 5;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    const zigzag = 4;

    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
      const offset = (i % 2 === 0) ? -zigzag : zigzag;
      ctx.lineTo(x1 + dx * i + offset, y1 + dy * i);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  drawWheel(ctx, offsetX, offsetY) {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Outer tire
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Tire tread pattern (thick outer ring)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_RADIUS - 3, 0, Math.PI * 2);
    ctx.stroke();

    // Tread lugs (bumps around the tire)
    ctx.save();
    ctx.rotate(this.wheelSpin);
    ctx.fillStyle = '#2a2a2a';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const lx = Math.cos(a) * (WHEEL_RADIUS - 1);
      const ly = Math.sin(a) * (WHEEL_RADIUS - 1);
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rim
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_RADIUS * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Rim detail
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_RADIUS * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Spokes
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * WHEEL_RADIUS * 0.4, Math.sin(a) * WHEEL_RADIUS * 0.4);
      ctx.stroke();
    }

    // Center hub
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}
