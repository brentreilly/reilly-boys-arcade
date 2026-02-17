// Main game orchestration: state machine, game loop, input handling
// Ties together physics, renderer, UI, swing, camera, and course
// Touch-first for tablet play

import * as THREE from 'three';
import { CLUBS, recommendClub, SURFACES } from './clubs.js';
import { HOLES, createHoleTerrain } from './course.js';
import { PhysicsEngine, BallState } from './physics.js';
import { GolfRenderer } from './renderer.js';
import { SwingMeter, SWING_PHASE } from './swing.js';
import { CameraController, CAMERA_MODE } from './camera.js';
import { GameUI } from './ui.js';

const YARDS_TO_METERS = 0.9144;
const METERS_TO_YARDS = 1 / YARDS_TO_METERS;

const STATE = {
  START_SCREEN: 'start_screen',
  HOLE_INTRO: 'hole_intro',
  AIMING: 'aiming',
  SWINGING: 'swinging',
  BALL_FLIGHT: 'ball_flight',
  BALL_ROLLING: 'ball_rolling',
  SHOT_RESULT: 'shot_result',
  PUTTING_AIM: 'putting_aim',
  PUTTING_SWING: 'putting_swing',
  HOLE_COMPLETE: 'hole_complete',
  SCORECARD: 'scorecard',
  GAME_COMPLETE: 'game_complete',
};

class GolfGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new GolfRenderer(this.canvas);
    this.camera = new CameraController(this.renderer.camera);
    this.physics = new PhysicsEngine();
    this.swing = new SwingMeter();
    this.ui = new GameUI();
    this.ball = new BallState();

    // Game state
    this.state = STATE.START_SCREEN;
    this.currentHoleIndex = 0;
    this.currentHole = null;
    this.terrain = null;
    this.strokes = 0;
    this.scores = [];
    this.aimDirection = 0;   // degrees (0 = forward/+z)
    this.selectedClubIndex = 0;
    this.shotStartPos = null;
    this.stateTimer = 0;

    // Input (keyboard still works too)
    this.keys = {};
    this.spacePressed = false;

    this.setupInput();
    this.ui.showGameStart();

    // Start game loop
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setupInput() {
    // Keyboard input (still works on desktop)
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.spacePressed = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Club selector buttons
    document.getElementById('club-prev')?.addEventListener('click', () => this.prevClub());
    document.getElementById('club-next')?.addEventListener('click', () => this.nextClub());

    // Touch: prevent default to avoid scrolling/zooming
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // SWING button — the main touch action
    const swingBtn = document.getElementById('swing-btn');
    const triggerSwing = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.spacePressed = true;
    };
    swingBtn.addEventListener('touchstart', triggerSwing, { passive: false });
    swingBtn.addEventListener('click', triggerSwing);

    // Start screen "Play!" button
    document.getElementById('start-play-btn')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });
    document.getElementById('start-play-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });

    // Hole intro "OK!" button
    document.getElementById('message-continue-btn')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });
    document.getElementById('message-continue-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });

    // Scorecard "Next Hole" button
    document.getElementById('scorecard-next-btn')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });
    document.getElementById('scorecard-next-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });

    // Game complete "Play Again!" button
    document.getElementById('complete-play-btn')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });
    document.getElementById('complete-play-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.spacePressed = true;
    });
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;

    this.update(dt);
    this.renderer.render();
    this.spacePressed = false;

    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.stateTimer += dt;

    switch (this.state) {
      case STATE.START_SCREEN:
        if (this.spacePressed) {
          this.ui.hideGameStart();
          this.startRound();
        }
        break;

      case STATE.HOLE_INTRO:
        if (this.stateTimer > 2.5 || this.spacePressed) {
          this.ui.hideMessage();
          this.enterAiming();
        }
        break;

      case STATE.AIMING:
        this.updateAiming(dt);
        if (this.spacePressed) {
          this.startSwing();
        }
        break;

      case STATE.SWINGING:
        this.swing.update(dt);
        this.ui.showSwingMeter(this.swing.phase, this.swing.power, this.swing.accuracyPos);
        if (this.spacePressed) {
          const result = this.swing.click();
          if (result === 'done') {
            this.executeShot();
          }
        }
        break;

      case STATE.BALL_FLIGHT:
        this.physics.update(this.ball, dt,
          (x, z) => this.terrain.getElevation(x, z),
          (x, z) => this.terrain.getSurface(x, z));
        this.renderer.updateBall(this.ball.position, true, this.terrain ? this.terrain.getElevation(this.ball.position.x, this.ball.position.z) : 0);
        this.renderer.updateTrail(this.ball.trail);
        this.camera.update(dt, this.ball.position, this.ball.velocity);

        if (!this.ball.isAirborne) {
          this.state = STATE.BALL_ROLLING;
          this.stateTimer = 0;
        }
        break;

      case STATE.BALL_ROLLING:
        this.physics.update(this.ball, dt,
          (x, z) => this.terrain.getElevation(x, z),
          (x, z) => this.terrain.getSurface(x, z));
        this.renderer.updateBall(this.ball.position, true, this.terrain ? this.terrain.getElevation(this.ball.position.x, this.ball.position.z) : 0);
        this.renderer.updateTrail(this.ball.trail);
        this.camera.update(dt, this.ball.position, this.ball.velocity);

        // Check if ball rolled into the hole
        if (this.terrain.isInHole(this.ball.position.x, this.ball.position.z)) {
          this.ball.isMoving = false;
          this.ball.velocity = { x: 0, y: 0, z: 0 };
          this.holeComplete();
          break;
        }

        // Check if ball stopped
        if (!this.ball.isMoving || this.stateTimer > 15) {
          this.ball.isMoving = false;
          this.ball.velocity = { x: 0, y: 0, z: 0 };
          this.onShotComplete();
        }
        break;

      case STATE.SHOT_RESULT:
        this.camera.update(dt);
        if (this.stateTimer > 2.0) {
          this.afterShotResult();
        }
        break;

      case STATE.PUTTING_AIM:
        this.updateAiming(dt);
        if (this.spacePressed) {
          this.startPuttSwing();
        }
        break;

      case STATE.PUTTING_SWING:
        this.swing.update(dt);
        this.ui.showSwingMeter(this.swing.phase, this.swing.power, this.swing.accuracyPos);
        if (this.spacePressed) {
          const result = this.swing.click();
          if (result === 'done') {
            this.executePutt();
          }
        }
        break;

      case STATE.HOLE_COMPLETE:
        this.camera.update(dt);
        if (this.stateTimer > 2.5 || this.spacePressed) {
          this.ui.hideMessage();
          this.showScorecard();
        }
        break;

      case STATE.SCORECARD:
        if (this.spacePressed) {
          this.ui.hideScorecard();
          this.nextHole();
        }
        break;

      case STATE.GAME_COMPLETE:
        if (this.spacePressed) {
          this.ui.hideGameComplete();
          this.startRound();
        }
        break;
    }
  }

  startRound() {
    this.currentHoleIndex = 0;
    this.scores = [];
    this.loadHole(0);
  }

  loadHole(index) {
    this.currentHoleIndex = index;
    this.currentHole = HOLES[index];
    this.terrain = createHoleTerrain(this.currentHole);
    this.strokes = 0;

    // Build the 3D scene
    this.renderer.buildHoleScene(this.currentHole, this.terrain);

    // Set wind
    this.physics.setWind(this.currentHole.wind.speed * 0.447, this.currentHole.wind.direction); // mph to m/s

    // Update UI
    this.ui.updateHoleInfo(this.currentHole);
    this.ui.updateWind(this.currentHole.wind.speed, this.currentHole.wind.direction);

    // Place ball on tee
    this.ball = new BallState();
    this.ball.position.x = this.currentHole.tee.x;
    this.ball.position.z = this.currentHole.tee.z;
    this.ball.position.y = this.terrain.getElevation(this.currentHole.tee.x, this.currentHole.tee.z);
    this.ball.isMoving = false;

    // Aim toward pin
    const dx = this.currentHole.pin.x - this.currentHole.tee.x;
    const dz = this.currentHole.pin.z - this.currentHole.tee.z;
    this.aimDirection = Math.atan2(dx, dz) * 180 / Math.PI;

    // Select recommended club
    const distYards = this.currentHole.distance;
    const rec = recommendClub(distYards, 'tee');
    this.selectedClubIndex = CLUBS.indexOf(rec);

    this.renderer.updateBall(this.ball.position, true, this.terrain ? this.terrain.getElevation(this.ball.position.x, this.ball.position.z) : 0);

    // Show hole intro
    this.state = STATE.HOLE_INTRO;
    this.stateTimer = 0;
    this.camera.setOverview(this.currentHole);
    this.ui.showMessage(
      `Hole ${this.currentHole.number}`,
      `${this.currentHole.name} \u2014 Par ${this.currentHole.par}, ${this.currentHole.distance} yards`,
      0
    );
    this.ui.showClubSelector(false);
    this.ui.showSwingButton(false);
    this.ui.showTouchAim(false);
    this.ui.showAimControls(false);
    this.renderer.hideAimLine();
    this.renderer.clearTrail();
  }

  enterAiming() {
    const surface = this.terrain.getSurface(this.ball.position.x, this.ball.position.z);
    const distToPin = this.terrain.distanceToPin(this.ball.position.x, this.ball.position.z) * METERS_TO_YARDS;

    // Auto-select putter on the green
    if (surface === 'green') {
      this.selectedClubIndex = CLUBS.length - 1;
      this.state = STATE.PUTTING_AIM;
      this.camera.setGreen(this.ball.position,
        { x: this.currentHole.pin.x, y: this.ball.position.y, z: this.currentHole.pin.z });
    } else {
      const rec = recommendClub(distToPin, surface);
      this.selectedClubIndex = CLUBS.indexOf(rec);
      this.state = STATE.AIMING;
      this.camera.setAddress(this.ball.position, this.aimDirection);
    }

    this.strokes++;
    this.ui.updateShotInfo(this.strokes, distToPin, surface);
    this.ui.updateClub(CLUBS[this.selectedClubIndex]);
    this.ui.showClubSelector(true);
    this.ui.showSwingButton(true);
    this.ui.showTouchAim(true);
    this.ui.showAimControls(true);
    this.renderer.clearTrail();

    // Show aim line
    const club = CLUBS[this.selectedClubIndex];
    const aimDist = club.category === 'putter' ?
      this.terrain.distanceToPin(this.ball.position.x, this.ball.position.z) :
      club.maxDistance * YARDS_TO_METERS;
    this.renderer.updateAimLine(this.ball.position, this.aimDirection, Math.min(aimDist, 50),
      (x, z) => this.terrain.getElevation(x, z));
  }

  updateAiming(dt) {
    const aimSpeed = 40; // degrees per second

    // Keyboard aim
    if (this.keys['a'] || this.keys['arrowleft']) {
      this.aimDirection -= aimSpeed * dt;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      this.aimDirection += aimSpeed * dt;
    }

    // Touch aim buttons
    if (this.ui.aimLeftHeld) {
      this.aimDirection -= aimSpeed * dt;
    }
    if (this.ui.aimRightHeld) {
      this.aimDirection += aimSpeed * dt;
    }

    if (this.keys['q']) {
      this.prevClub();
      this.keys['q'] = false;
    }
    if (this.keys['e']) {
      this.nextClub();
      this.keys['e'] = false;
    }

    // Update camera and aim line
    const club = CLUBS[this.selectedClubIndex];
    if (this.state === STATE.PUTTING_AIM) {
      this.camera.setGreen(this.ball.position,
        { x: this.currentHole.pin.x, y: this.ball.position.y, z: this.currentHole.pin.z });
    } else {
      this.camera.setAddress(this.ball.position, this.aimDirection);
    }

    const aimDist = club.category === 'putter' ?
      this.terrain.distanceToPin(this.ball.position.x, this.ball.position.z) :
      club.maxDistance * YARDS_TO_METERS * 0.5;
    this.renderer.updateAimLine(this.ball.position, this.aimDirection, Math.min(aimDist, 40),
      (x, z) => this.terrain.getElevation(x, z));
    this.camera.update(dt);
  }

  prevClub() {
    this.selectedClubIndex = Math.max(0, this.selectedClubIndex - 1);
    this.ui.updateClub(CLUBS[this.selectedClubIndex]);
  }

  nextClub() {
    this.selectedClubIndex = Math.min(CLUBS.length - 1, this.selectedClubIndex + 1);
    this.ui.updateClub(CLUBS[this.selectedClubIndex]);
  }

  startSwing() {
    this.state = STATE.SWINGING;
    this.stateTimer = 0;
    this.swing.start(false);
    this.ui.showAimControls(false);
    this.ui.showClubSelector(false);
    this.ui.showTouchAim(false);
    this.renderer.hideAimLine();
    // Keep swing button visible during swing phases
  }

  startPuttSwing() {
    this.state = STATE.PUTTING_SWING;
    this.stateTimer = 0;
    this.swing.start(true);
    this.ui.showAimControls(false);
    this.ui.showClubSelector(false);
    this.ui.showTouchAim(false);
    this.renderer.hideAimLine();
  }

  executeShot() {
    if (this.state === STATE.BALL_FLIGHT || this.state === STATE.BALL_ROLLING) return;
    const club = CLUBS[this.selectedClubIndex];
    const power = this.swing.power;
    const accuracy = this.swing.accuracy;

    this.ui.hideSwingMeter();
    this.ui.showSwingButton(false);

    // Store start position
    this.shotStartPos = { ...this.ball.position };

    // Launch ball
    this.physics.launch(this.ball, this.ball.position, club, power, accuracy, this.aimDirection);

    // Switch to flight camera
    this.camera.setFollow(this.ball.position);

    this.state = STATE.BALL_FLIGHT;
    this.stateTimer = 0;
  }

  executePutt() {
    if (this.state === STATE.BALL_FLIGHT || this.state === STATE.BALL_ROLLING) return;
    const club = CLUBS[this.selectedClubIndex];
    const power = this.swing.power;
    const accuracy = this.swing.accuracy;

    this.ui.hideSwingMeter();
    this.ui.showSwingButton(false);

    this.shotStartPos = { ...this.ball.position };

    this.physics.launch(this.ball, this.ball.position, club, power, accuracy, this.aimDirection);

    this.state = STATE.BALL_ROLLING;
    this.stateTimer = 0;
  }

  onShotComplete() {
    const distance = this.physics.getCarryDistance(this.ball, this.shotStartPos);
    const surface = this.terrain.getSurface(this.ball.position.x, this.ball.position.z);

    // Check if ball is in the hole
    if (this.terrain.isInHole(this.ball.position.x, this.ball.position.z)) {
      this.holeComplete();
      return;
    }

    // Check water hazard
    if (this.ball.inWater) {
      this.ball.inWater = false;
      this.strokes++; // penalty stroke
      // Move ball back to shot start position
      this.ball.position.x = this.shotStartPos.x;
      this.ball.position.z = this.shotStartPos.z;
      this.ball.position.y = this.terrain.getElevation(this.shotStartPos.x, this.shotStartPos.z);
      this.ball.isMoving = false;

      this.ui.showShotResult(distance, 'Water! +1 penalty stroke');
      this.state = STATE.SHOT_RESULT;
      this.stateTimer = 0;
      this.renderer.updateBall(this.ball.position, true, this.terrain ? this.terrain.getElevation(this.ball.position.x, this.ball.position.z) : 0);
      return;
    }

    // Check OOB
    if (surface === 'oob') {
      this.strokes++; // penalty stroke
      this.ball.position.x = this.shotStartPos.x;
      this.ball.position.z = this.shotStartPos.z;
      this.ball.position.y = this.terrain.getElevation(this.shotStartPos.x, this.shotStartPos.z);
      this.ball.isMoving = false;

      this.ui.showShotResult(distance, 'Out of bounds! +1 penalty');
      this.state = STATE.SHOT_RESULT;
      this.stateTimer = 0;
      this.renderer.updateBall(this.ball.position, true, this.terrain ? this.terrain.getElevation(this.ball.position.x, this.ball.position.z) : 0);
      return;
    }

    // Normal result
    const quality = this.swing.getAccuracyLabel();
    this.ui.showShotResult(distance, quality);

    this.state = STATE.SHOT_RESULT;
    this.stateTimer = 0;
  }

  afterShotResult() {
    // Re-aim toward pin
    const dx = this.currentHole.pin.x - this.ball.position.x;
    const dz = this.currentHole.pin.z - this.ball.position.z;
    this.aimDirection = Math.atan2(dx, dz) * 180 / Math.PI;

    this.enterAiming();
  }

  holeComplete() {
    const scoreName = this.ui.getScoreName(this.strokes, this.currentHole.par);
    this.scores.push(this.strokes);

    this.renderer.updateBall(this.ball.position, false, this.terrain ? this.terrain.getElevation(this.ball.position.x, this.ball.position.z) : 0);
    this.ui.showSwingButton(false);
    this.ui.showTouchAim(false);

    this.ui.showMessage(scoreName,
      `${this.strokes} stroke${this.strokes > 1 ? 's' : ''} on a Par ${this.currentHole.par}`,
      0);

    this.state = STATE.HOLE_COMPLETE;
    this.stateTimer = 0;
  }

  showScorecard() {
    const totalStrokes = this.scores.reduce((a, b) => a + b, 0);
    this.ui.showScorecard(this.scores, totalStrokes);
    this.state = STATE.SCORECARD;
    this.stateTimer = 0;
  }

  nextHole() {
    if (this.currentHoleIndex < HOLES.length - 1) {
      this.loadHole(this.currentHoleIndex + 1);
    } else {
      // Round complete
      const totalStrokes = this.scores.reduce((a, b) => a + b, 0);
      this.ui.showGameComplete(totalStrokes, this.scores);
      this.state = STATE.GAME_COMPLETE;
      this.stateTimer = 0;
    }
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GolfGame();
});
