// Camera controller for golf game
// Modes: address (behind ball), follow (track ball flight), orbit (free look), green (putting)

import * as THREE from 'three';

export const CAMERA_MODE = {
  ADDRESS: 'address',
  FOLLOW: 'follow',
  RESULT: 'result',
  GREEN: 'green',
  OVERVIEW: 'overview',
  TRANSITION: 'transition',
};

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = CAMERA_MODE.ADDRESS;

    // Target tracking
    this.target = new THREE.Vector3();
    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Address mode params
    this.addressDistance = 6;
    this.addressHeight = 2.5;
    this.addressAngle = 0; // radians, 0 = behind ball looking forward

    // Follow mode params
    this.followDistance = 12;
    this.followHeight = 4;
    this.followLag = 0.08;

    // Green mode params
    this.greenHeight = 20;
    this.greenAngle = -0.4; // slight tilt

    // Transition
    this.transitionFrom = new THREE.Vector3();
    this.transitionTo = new THREE.Vector3();
    this.transitionLookFrom = new THREE.Vector3();
    this.transitionLookTo = new THREE.Vector3();
    this.transitionDuration = 1.5;
    this.transitionTime = 0;
    this.transitionCallback = null;

    this.aimDirection = 0; // degrees
  }

  setAddress(ballPos, aimDirDeg) {
    this.mode = CAMERA_MODE.ADDRESS;
    this.aimDirection = aimDirDeg;
    this.target.set(ballPos.x, ballPos.y, ballPos.z);

    const aimRad = aimDirDeg * Math.PI / 180;
    // Camera behind ball, opposite to aim direction
    const camX = ballPos.x - Math.sin(aimRad) * this.addressDistance;
    const camZ = ballPos.z - Math.cos(aimRad) * this.addressDistance;
    const camY = ballPos.y + this.addressHeight;

    this.currentPos.set(camX, camY, camZ);
    this.currentLookAt.set(ballPos.x, ballPos.y + 0.5, ballPos.z);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }

  setFollow(ballPos) {
    this.mode = CAMERA_MODE.FOLLOW;
    this.target.set(ballPos.x, ballPos.y, ballPos.z);
  }

  setGreen(ballPos, pinPos) {
    this.mode = CAMERA_MODE.GREEN;
    this.target.set(ballPos.x, ballPos.y, ballPos.z);

    // Camera elevated above midpoint between ball and pin
    const midX = (ballPos.x + pinPos.x) / 2;
    const midZ = (ballPos.z + pinPos.z) / 2;
    const dist = Math.sqrt((ballPos.x - pinPos.x) ** 2 + (ballPos.z - pinPos.z) ** 2);
    const height = Math.max(12, dist * 0.6);

    // Offset slightly behind ball
    const dirX = pinPos.x - ballPos.x;
    const dirZ = pinPos.z - ballPos.z;
    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

    this.currentPos.set(
      midX - (dirX / dirLen) * dist * 0.2,
      ballPos.y + height,
      midZ - (dirZ / dirLen) * dist * 0.2
    );
    this.currentLookAt.set(midX, ballPos.y, midZ);
  }

  setOverview(holeData) {
    this.mode = CAMERA_MODE.OVERVIEW;
    const midZ = holeData.distance * 0.9144 / 2;
    this.currentPos.set(-40, 60, midZ);
    this.currentLookAt.set(holeData.pin.x, 0, holeData.pin.z * 0.9144 * 0.5);
  }

  transitionTo2(targetPos, targetLookAt, duration, callback) {
    this.transitionFrom.copy(this.camera.position);
    this.transitionLookFrom.copy(this.currentLookAt);
    this.transitionTo.copy(targetPos);
    this.transitionLookTo.copy(targetLookAt);
    this.transitionDuration = duration || 1.5;
    this.transitionTime = 0;
    this.transitionCallback = callback || null;
    this.mode = CAMERA_MODE.TRANSITION;
  }

  update(dt, ballPos, ballVelocity) {
    if (this.mode === CAMERA_MODE.FOLLOW && ballPos) {
      this.target.set(ballPos.x, ballPos.y, ballPos.z);

      // Camera follows behind the ball's velocity direction
      let velDir;
      if (ballVelocity) {
        const hSpeed = Math.sqrt(ballVelocity.x ** 2 + ballVelocity.z ** 2);
        if (hSpeed > 0.5) {
          velDir = Math.atan2(-ballVelocity.x, -ballVelocity.z);
        } else {
          velDir = this.aimDirection * Math.PI / 180 + Math.PI;
        }
      } else {
        velDir = this.aimDirection * Math.PI / 180 + Math.PI;
      }

      const idealX = ballPos.x + Math.sin(velDir) * this.followDistance;
      const idealZ = ballPos.z + Math.cos(velDir) * this.followDistance;
      const idealY = ballPos.y + this.followHeight;

      // Smooth follow
      const lag = 1 - Math.pow(this.followLag, dt);
      this.currentPos.lerp(new THREE.Vector3(idealX, idealY, idealZ), lag);
      this.currentLookAt.lerp(this.target, lag * 2);

      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === CAMERA_MODE.TRANSITION) {
      this.transitionTime += dt;
      const t = Math.min(this.transitionTime / this.transitionDuration, 1);
      // Smooth ease in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      this.camera.position.lerpVectors(this.transitionFrom, this.transitionTo, ease);
      this.currentLookAt.lerpVectors(this.transitionLookFrom, this.transitionLookTo, ease);
      this.camera.lookAt(this.currentLookAt);

      if (t >= 1) {
        if (this.transitionCallback) this.transitionCallback();
        this.transitionCallback = null;
      }

    } else if (this.mode === CAMERA_MODE.GREEN) {
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === CAMERA_MODE.ADDRESS) {
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === CAMERA_MODE.OVERVIEW) {
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);
    }
  }
}
