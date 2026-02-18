// Stacker — Renderer Module
// Pure drawing code. Reads board state, draws to canvas. No state mutation.

import { PIECES } from './board.js';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.cellSize = 0;
    this.gridX = 0;
    this.gridY = 0;
    this.screenWidth = 0;
    this.screenHeight = 0;
  }

  // ── Resize ─────────────────────────────────────────────────────
  // Calculate cell size to fit 10×20 grid centered on screen.
  // Leaves space for HUD (top 60px) and touch controls (bottom 100px).

  resize(screenWidth, screenHeight) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    const playHeight = screenHeight - 60 - 100;
    const playWidth = screenWidth;
    this.cellSize = Math.floor(Math.min(playWidth / 10, playHeight / 20));
    this.gridX = Math.floor((screenWidth - this.cellSize * 10) / 2);
    this.gridY = 60 + Math.floor((playHeight - this.cellSize * 20) / 2);
  }

  // ── Main Render ────────────────────────────────────────────────
  // Call order:
  //   1. Clear screen
  //   2. Grid background
  //   3. Grid lines (faint)
  //   4. Locked cells (dimmer)
  //   5. Ghost piece (outline, very faint)
  //   6. Active piece (full brightness + glow)
  //   7. Grid border (neon outline)
  //   8. Next piece preview (HUD area)

  render(board) {
    const ctx = this.ctx;
    const w = this.screenWidth;
    const h = this.screenHeight;
    const cols = board.cols;
    const rows = board.rows;
    const cs = this.cellSize;
    const gx = this.gridX;
    const gy = this.gridY;

    // 1. Clear entire canvas with dark background
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // 2. Grid background — slightly lighter
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(gx, gy, cs * cols, cs * rows);

    // 3. Faint grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical lines
    for (let c = 0; c <= cols; c++) {
      const x = gx + c * cs;
      ctx.moveTo(x + 0.5, gy);
      ctx.lineTo(x + 0.5, gy + rows * cs);
    }
    // Horizontal lines
    for (let r = 0; r <= rows; r++) {
      const y = gy + r * cs;
      ctx.moveTo(gx, y + 0.5);
      ctx.lineTo(gx + cols * cs, y + 0.5);
    }
    ctx.stroke();

    // 4. Locked cells from board.grid (dimmer)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = board.grid[r][c];
        if (color) {
          this.drawCell(c, r, color, 0.8);
        }
      }
    }

    // 5. Ghost piece (outline only, very faint)
    const active = board.activePiece;
    if (active) {
      const ghostRow = board.ghostY;
      const piece = PIECES[active.type];
      const matrix = piece.rotations[active.rotation];

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (!matrix[r][c]) continue;
          const gridCol = active.col + c;
          const gridRow = ghostRow + r;
          if (gridRow < 0 || gridRow >= rows) continue;
          this.drawGhostCell(gridCol, gridRow, piece.color);
        }
      }

      // 6. Active piece (full brightness + glow)
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (!matrix[r][c]) continue;
          const gridCol = active.col + c;
          const gridRow = active.row + r;
          if (gridRow < 0 || gridRow >= rows) continue;
          this.drawCell(gridCol, gridRow, piece.color, 1, true);
        }
      }
    }

    // 7. Grid border — thin neon outline
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx - 1, gy - 1, cs * cols + 2, cs * rows + 2);
    ctx.globalAlpha = 1;

    // 8. Next piece preview — drawn on main canvas in HUD area (top-right)
    const nextPiece = board.nextPiece;
    if (nextPiece) {
      this.drawNextPiecePreview(ctx, nextPiece, 12);
    }
  }

  // ── Draw Single Cell ───────────────────────────────────────────
  // Filled rect + subtle neon glow via layered fillRect.
  // If `glow` is true, draw a slightly larger rect behind for active piece glow.
  // Uses globalAlpha for ghost/dim effects — NOT shadowBlur (Fire HD perf).

  drawCell(col, row, color, alpha = 1, glow = false) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = this.gridX + col * cs;
    const y = this.gridY + row * cs;
    const inset = 1; // 1px inset for cell gap effect

    // Glow layer — slightly larger rect behind at low alpha
    if (glow) {
      ctx.globalAlpha = 0.3 * alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x - 2, y - 2, cs + 4, cs + 4);
    }

    // Main cell fill
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + inset, y + inset, cs - inset * 2, cs - inset * 2);

    // Inner highlight — lighter overlay on top half for depth
    ctx.globalAlpha = 0.15 * alpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + inset, y + inset, cs - inset * 2, (cs - inset * 2) * 0.5);

    ctx.globalAlpha = 1;
  }

  // ── Draw Ghost Cell ────────────────────────────────────────────
  // Outline only at low alpha for the ghost piece.

  drawGhostCell(col, row, color) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = this.gridX + col * cs;
    const y = this.gridY + row * cs;
    const inset = 1;

    // Very faint fill
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    ctx.fillRect(x + inset, y + inset, cs - inset * 2, cs - inset * 2);

    // Outline
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, cs - inset * 2 - 1, cs - inset * 2 - 1);

    ctx.globalAlpha = 1;
  }

  // ── Line Clear Flash ──────────────────────────────────────────
  // Draw white overlay on cleared row Y positions, pulsing then fading out.
  // yPositions: array of pixel Y coords; progress: 0→1 over animation duration.

  renderLineClearFlash(yPositions, progress) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cols = 10;
    // Pulse: bright at start, fade out
    const alpha = 0.7 * (1 - progress);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    for (const y of yPositions) {
      ctx.fillRect(this.gridX, y, cs * cols, cs);
    }
    ctx.globalAlpha = 1;
  }

  // ── Flash Text (STACKER!, LEVEL X) ──────────────────────────
  // Large centered text that fades out. progress: 0→1.

  renderFlashText(text, progress) {
    const ctx = this.ctx;
    const alpha = 1 - progress;
    // Slight scale-up effect: start at 1x, end at 1.1x
    const scale = 1 + progress * 0.1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#39ff14';
    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(this.screenWidth / 2, this.screenHeight / 2);
    ctx.scale(scale, scale);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ── Game Over Fade ──────────────────────────────────────────
  // Dark overlay over the grid area that fades in.

  renderGameOverFade(fade) {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.gridX, this.gridY, this.cellSize * 10, this.cellSize * 20);
    ctx.globalAlpha = 1;
  }

  // ── Next Piece Preview ─────────────────────────────────────────
  // Draws the next piece on the main canvas in the HUD area (top-right).
  // The piece is drawn centered within a small preview box.

  drawNextPiecePreview(ctx, piece, size) {
    const matrix = piece.rotations[0];
    const color = piece.color;

    // Calculate bounding box of filled cells in the matrix
    let minR = matrix.length, maxR = 0;
    let minC = matrix[0].length, maxC = 0;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }

    const pieceW = maxC - minC + 1;
    const pieceH = maxR - minR + 1;

    // Preview area position — top-right of screen, to the left of the HUD's
    // next-preview canvas element. We draw at a fixed position.
    const previewBoxSize = 64;
    const previewX = this.screenWidth - 140;
    const previewY = 6;

    // Center the piece within the preview box
    const offsetX = previewX + Math.floor((previewBoxSize - pieceW * size) / 2);
    const offsetY = previewY + Math.floor((previewBoxSize - pieceH * size) / 2);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!matrix[r][c]) continue;
        const x = offsetX + (c - minC) * size;
        const y = offsetY + (r - minR) * size;

        // Glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        ctx.fillRect(x - 1, y - 1, size + 2, size + 2);

        // Cell fill
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

        // Inner highlight
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 1, size - 2, (size - 2) * 0.5);
      }
    }

    ctx.globalAlpha = 1;
  }
}
