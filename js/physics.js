// Golf ball flight physics engine
// Simulates aerodynamic drag, Magnus effect (spin), gravity, and wind
// Uses Bearman & Harvey empirical coefficients for dimpled golf ball

import { SURFACES } from './clubs.js';

const GRAVITY = 9.81;          // m/s^2
const AIR_DENSITY = 1.225;     // kg/m^3 at sea level
const BALL_MASS = 0.04593;     // kg (1.62 oz)
const BALL_RADIUS = 0.02135;   // m (1.68 inches diameter)
const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;
const RPM_TO_RADS = (2 * Math.PI) / 60;
const YARDS_TO_METERS = 0.9144;
const METERS_TO_YARDS = 1 / YARDS_TO_METERS;

export class BallState {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.spin = { x: 0, y: 0, z: 0 };   // rad/s (x=backspin, y=sidespin, z=riflespin)
    this.isAirborne = true;
    this.isMoving = true;
    this.trail = [];
    this.bounceCount = 0;
  }
}

export class PhysicsEngine {
  constructor() {
    this.dt = 1 / 240;          // physics timestep (240 Hz for accuracy)
    this.wind = { x: 0, y: 0, z: 0 };  // wind vector in m/s
    this.accumulator = 0;
    this.trailInterval = 0;
  }

  setWind(speed, directionDeg) {
    const rad = directionDeg * Math.PI / 180;
    this.wind.x = speed * Math.sin(rad);
    this.wind.z = speed * Math.cos(rad);
    this.wind.y = 0;
  }

  // Launch ball from a position with given club parameters and swing result
  launch(ball, position, club, power, accuracy, aimDirection) {
    ball.position.x = position.x;
    ball.position.y = position.y;
    ball.position.z = position.z;
    ball.trail = [{ ...position }];
    ball.bounceCount = 0;
    ball.isMoving = true;

    const isPutter = club.category === 'putter';

    if (isPutter) {
      // Putting: ball rolls along ground
      const puttSpeed = power * 8;  // max ~8 m/s for a long putt
      const aimRad = aimDirection * Math.PI / 180;
      const accuracyOffset = (accuracy - 0.5) * 10; // degrees off-line

      const totalAngle = aimRad + (accuracyOffset * Math.PI / 180);
      ball.velocity.x = puttSpeed * Math.sin(totalAngle);
      ball.velocity.y = 0;
      ball.velocity.z = puttSpeed * Math.cos(totalAngle);
      ball.spin.x = -club.backspin * RPM_TO_RADS * 0.3;
      ball.spin.y = 0;
      ball.spin.z = 0;
      ball.isAirborne = false;
    } else {
      // Full shot
      const speed = club.ballSpeed * power;
      const launchRad = club.launchAngle * Math.PI / 180;
      const aimRad = aimDirection * Math.PI / 180;

      // Accuracy affects sidespin and direction offset
      const accuracyOffset = (accuracy - 0.5) * 15; // degrees off-line (-7.5 to +7.5)
      const totalAim = aimRad + (accuracyOffset * Math.PI / 180);

      ball.velocity.x = speed * Math.cos(launchRad) * Math.sin(totalAim);
      ball.velocity.y = speed * Math.sin(launchRad);
      ball.velocity.z = speed * Math.cos(launchRad) * Math.cos(totalAim);

      // Spin: backspin around -x axis (right-hand rule: top moves backward = -x angular velocity)
      // This creates upward Magnus lift via ω × v
      ball.spin.x = -club.backspin * RPM_TO_RADS * power;
      ball.spin.y = accuracyOffset * 50 * RPM_TO_RADS; // sidespin from mis-hit
      ball.spin.z = 0;
      ball.isAirborne = true;
    }
  }

  // Main update: advances physics by deltaTime seconds
  update(ball, deltaTime, getElevation, getSurface) {
    if (!ball.isMoving) return;

    this.accumulator += deltaTime;
    this.trailInterval += deltaTime;

    while (this.accumulator >= this.dt) {
      this.step(ball, getElevation, getSurface);
      this.accumulator -= this.dt;
    }

    // Record trail points periodically
    if (this.trailInterval > 0.02) {
      ball.trail.push({ ...ball.position });
      if (ball.trail.length > 500) ball.trail.shift();
      this.trailInterval = 0;
    }
  }

  step(ball, getElevation, getSurface) {
    if (!ball.isMoving) return;

    const dt = this.dt;
    const pos = ball.position;
    const vel = ball.velocity;
    const spin = ball.spin;

    if (ball.isAirborne) {
      this.stepAirborne(ball, dt, getElevation, getSurface);
    } else {
      this.stepGround(ball, dt, getElevation, getSurface);
    }
  }

  stepAirborne(ball, dt, getElevation, getSurface) {
    const pos = ball.position;
    const vel = ball.velocity;
    const spin = ball.spin;

    // Relative velocity (accounting for wind)
    const relVel = {
      x: vel.x - this.wind.x,
      y: vel.y - this.wind.y,
      z: vel.z - this.wind.z,
    };
    const speed = Math.sqrt(relVel.x ** 2 + relVel.y ** 2 + relVel.z ** 2);
    if (speed < 0.001) {
      ball.isAirborne = false;
      ball.isMoving = false;
      return;
    }

    // Spin magnitude
    const spinMag = Math.sqrt(spin.x ** 2 + spin.y ** 2 + spin.z ** 2);
    const spinRatio = (spinMag * BALL_RADIUS) / speed;

    // Drag coefficient (Bearman & Harvey for dimpled ball)
    const Cd = 0.171 + 0.62 * spinRatio;

    // Lift coefficient from spin
    const Cl = Math.min(-3.25 * spinRatio * spinRatio + 1.99 * spinRatio, 0.4);

    // Drag force: opposes relative velocity
    const dragMag = 0.5 * AIR_DENSITY * Cd * BALL_AREA * speed * speed;
    const drag = {
      x: -dragMag * relVel.x / speed / BALL_MASS,
      y: -dragMag * relVel.y / speed / BALL_MASS,
      z: -dragMag * relVel.z / speed / BALL_MASS,
    };

    // Magnus force: spin × velocity direction
    // F_magnus = Cl * 0.5 * rho * A * v^2 * (spin_hat × vel_hat)
    const magnusMag = 0.5 * AIR_DENSITY * Cl * BALL_AREA * speed * speed;
    let magnus = { x: 0, y: 0, z: 0 };
    if (spinMag > 0.1) {
      // Cross product: spin × velocity
      const cross = {
        x: spin.y * relVel.z - spin.z * relVel.y,
        y: spin.z * relVel.x - spin.x * relVel.z,
        z: spin.x * relVel.y - spin.y * relVel.x,
      };
      const crossMag = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2);
      if (crossMag > 0.001) {
        magnus.x = magnusMag * cross.x / crossMag / BALL_MASS;
        magnus.y = magnusMag * cross.y / crossMag / BALL_MASS;
        magnus.z = magnusMag * cross.z / crossMag / BALL_MASS;
      }
    }

    // Total acceleration
    const ax = drag.x + magnus.x;
    const ay = -GRAVITY + drag.y + magnus.y;
    const az = drag.z + magnus.z;

    // Integrate velocity
    vel.x += ax * dt;
    vel.y += ay * dt;
    vel.z += az * dt;

    // Integrate position
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;

    // Spin decay (air resistance on spin)
    const spinDecay = Math.exp(-0.3 * dt);
    spin.x *= spinDecay;
    spin.y *= spinDecay;
    spin.z *= spinDecay;

    // Check ground collision
    const groundY = getElevation(pos.x, pos.z);
    if (pos.y <= groundY) {
      pos.y = groundY;
      this.handleBounce(ball, getElevation, getSurface);
    }
  }

  stepGround(ball, dt, getElevation, getSurface) {
    const pos = ball.position;
    const vel = ball.velocity;
    const spin = ball.spin;

    const speed = Math.sqrt(vel.x ** 2 + vel.z ** 2);
    if (speed < 0.02) {
      vel.x = 0;
      vel.y = 0;
      vel.z = 0;
      ball.isMoving = false;
      return;
    }

    const surface = getSurface(pos.x, pos.z);
    const surfaceProps = SURFACES[surface] || SURFACES.rough;

    // Terrain slope (numerical gradient)
    const dx = 0.1;
    const slopeX = (getElevation(pos.x + dx, pos.z) - getElevation(pos.x - dx, pos.z)) / (2 * dx);
    const slopeZ = (getElevation(pos.x, pos.z + dx) - getElevation(pos.x, pos.z - dx)) / (2 * dx);

    // Gravity component along slope
    const gravX = -GRAVITY * slopeX;
    const gravZ = -GRAVITY * slopeZ;

    // Rolling friction
    const friction = surfaceProps.friction * GRAVITY;
    const frictionX = speed > 0.01 ? -friction * vel.x / speed : 0;
    const frictionZ = speed > 0.01 ? -friction * vel.z / speed : 0;

    // Backspin effect on initial roll (checking/spinning back)
    let spinEffect = { x: 0, z: 0 };
    if (Math.abs(spin.x) > 10 && ball.bounceCount <= 2) {
      const spinForce = spin.x * 0.001;
      const velDir = Math.atan2(vel.x, vel.z);
      spinEffect.x = -spinForce * Math.sin(velDir);
      spinEffect.z = -spinForce * Math.cos(velDir);
    }

    // Integrate
    vel.x += (gravX + frictionX + spinEffect.x) * dt;
    vel.z += (gravZ + frictionZ + spinEffect.z) * dt;

    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    pos.y = getElevation(pos.x, pos.z);
    vel.y = 0;

    // Spin decay on ground (faster than air)
    const spinDecay = Math.exp(-5.0 * dt);
    spin.x *= spinDecay;
    spin.y *= spinDecay;
    spin.z *= spinDecay;
  }

  handleBounce(ball, getElevation, getSurface) {
    const pos = ball.position;
    const vel = ball.velocity;
    const spin = ball.spin;

    const surface = getSurface(pos.x, pos.z);
    const surfaceProps = SURFACES[surface] || SURFACES.rough;

    // Water hazard - ball stops
    if (surface === 'water') {
      vel.x = 0; vel.y = 0; vel.z = 0;
      ball.isMoving = false;
      ball.inWater = true;
      return;
    }

    ball.bounceCount++;

    const COR = surfaceProps.bounce;
    const speedBefore = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

    // Reflect vertical velocity with energy loss
    vel.y = -vel.y * COR;

    // Horizontal velocity reduced by friction on bounce
    const horizontalDamping = 0.85;
    vel.x *= horizontalDamping;
    vel.z *= horizontalDamping;

    // Spin affects bounce direction (gear effect)
    vel.x += spin.y * 0.0003;
    vel.z -= spin.x * 0.0002;

    // Reduce spin on bounce
    spin.x *= surfaceProps.spinRetention;
    spin.y *= surfaceProps.spinRetention;
    spin.z *= surfaceProps.spinRetention;

    // If bounce is very small, transition to rolling
    if (Math.abs(vel.y) < 0.5 || ball.bounceCount > 5) {
      vel.y = 0;
      ball.isAirborne = false;
    }
  }

  // Get total distance traveled from trail (in yards)
  getCarryDistance(ball, startPos) {
    const dx = ball.position.x - startPos.x;
    const dz = ball.position.z - startPos.z;
    return Math.sqrt(dx * dx + dz * dz) * METERS_TO_YARDS;
  }
}
