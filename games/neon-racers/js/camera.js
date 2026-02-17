// Camera: follows player kart, rotates so player always faces "up" on screen.

const LERP_POS = 6;    // position follow speed
const LERP_ROT = 5;    // rotation follow speed
const ZOOM = 0.9;      // world-to-screen scale

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.rotation = 0;    // current visual rotation
    this.targetRotation = 0;
    this.zoom = ZOOM;
  }

  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.rotation = -angle - Math.PI / 2;
    this.targetRotation = this.rotation;
  }

  update(dt, playerKart) {
    // Smooth follow position
    const lerpP = 1 - Math.exp(-LERP_POS * dt);
    this.x += (playerKart.x - this.x) * lerpP;
    this.y += (playerKart.y - this.y) * lerpP;

    // Target rotation: make player heading point "up" on screen
    this.targetRotation = -playerKart.angle - Math.PI / 2;

    // Smooth rotation (handle wrapping)
    let diff = this.targetRotation - this.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const lerpR = 1 - Math.exp(-LERP_ROT * dt);
    this.rotation += diff * lerpR;
  }

  // Apply camera transform to canvas context
  applyTransform(ctx, screenW, screenH) {
    ctx.translate(screenW / 2, screenH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.rotate(this.rotation);
    ctx.translate(-this.x, -this.y);
  }

  // Check if a world point is roughly visible (for culling)
  isVisible(x, y, margin = 200) {
    // Simple distance check from camera center
    const dx = x - this.x;
    const dy = y - this.y;
    const viewRadius = 800 / this.zoom + margin;
    return dx * dx + dy * dy < viewRadius * viewRadius;
  }
}
