// Dogfight — Scrolling Starfield
// Two parallax layers of stars drifting left for speed illusion

export class Starfield {
  constructor() {
    this.layers = [
      { stars: [], speed: 15, count: 20, maxRadius: 1.2, maxAlpha: 0.3 },
      { stars: [], speed: 35, count: 15, maxRadius: 1.8, maxAlpha: 0.5 },
    ];
  }

  regenerate(w, h) {
    for (const layer of this.layers) {
      layer.stars = [];
      for (let i = 0; i < layer.count; i++) {
        layer.stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * layer.maxRadius + 0.5,
          a: Math.random() * layer.maxAlpha + 0.1,
        });
      }
      layer.w = w;
      layer.h = h;
    }
  }

  update(dt) {
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.x -= layer.speed * dt;
        if (s.x < -5) {
          s.x = (layer.w || 800) + 5;
          s.y = Math.random() * (layer.h || 600);
        }
      }
    }
  }

  render(ctx) {
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
