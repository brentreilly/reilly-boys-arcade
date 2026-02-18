// Stacker — Board Logic Module
// Pure game logic: grid state, pieces, rotation, collision, line clearing, scoring
// No DOM access, no rendering — just data and logic

// ── Piece Definitions ──────────────────────────────────────────────
// Each piece has a color and an array of rotation states.
// Each rotation state is a 2D array [row][col] where 1 = filled, 0 = empty.
// Standard Tetris rotation (clockwise): 0 → 1 → 2 → 3 → 0

export const PIECES = {
  I: {
    color: '#00fff5',
    rotations: [
      [[0,0,0,0],
       [1,1,1,1],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,0,1,0],
       [0,0,1,0],
       [0,0,1,0],
       [0,0,1,0]],
      [[0,0,0,0],
       [0,0,0,0],
       [1,1,1,1],
       [0,0,0,0]],
      [[0,1,0,0],
       [0,1,0,0],
       [0,1,0,0],
       [0,1,0,0]],
    ],
  },
  O: {
    color: '#ffe600',
    rotations: [
      [[1,1],
       [1,1]],
    ],
  },
  T: {
    color: '#bf00ff',
    rotations: [
      [[0,1,0],
       [1,1,1],
       [0,0,0]],
      [[0,1,0],
       [0,1,1],
       [0,1,0]],
      [[0,0,0],
       [1,1,1],
       [0,1,0]],
      [[0,1,0],
       [1,1,0],
       [0,1,0]],
    ],
  },
  S: {
    color: '#39ff14',
    rotations: [
      [[0,1,1],
       [1,1,0],
       [0,0,0]],
      [[0,1,0],
       [0,1,1],
       [0,0,1]],
      [[0,0,0],
       [0,1,1],
       [1,1,0]],
      [[1,0,0],
       [1,1,0],
       [0,1,0]],
    ],
  },
  Z: {
    color: '#ff073a',
    rotations: [
      [[1,1,0],
       [0,1,1],
       [0,0,0]],
      [[0,0,1],
       [0,1,1],
       [0,1,0]],
      [[0,0,0],
       [1,1,0],
       [0,1,1]],
      [[0,1,0],
       [1,1,0],
       [1,0,0]],
    ],
  },
  L: {
    color: '#ff6600',
    rotations: [
      [[0,0,1],
       [1,1,1],
       [0,0,0]],
      [[0,1,0],
       [0,1,0],
       [0,1,1]],
      [[0,0,0],
       [1,1,1],
       [1,0,0]],
      [[1,1,0],
       [0,1,0],
       [0,1,0]],
    ],
  },
  J: {
    color: '#0080ff',
    rotations: [
      [[1,0,0],
       [1,1,1],
       [0,0,0]],
      [[0,1,1],
       [0,1,0],
       [0,1,0]],
      [[0,0,0],
       [1,1,1],
       [0,0,1]],
      [[0,1,0],
       [0,1,0],
       [1,1,0]],
    ],
  },
};

const PIECE_TYPES = Object.keys(PIECES); // ['I','O','T','S','Z','L','J']

// ── Scoring Table ──────────────────────────────────────────────────
const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };

// ── Board Class ────────────────────────────────────────────────────

export class Board {
  constructor(cols = 10, rows = 20) {
    this.cols = cols;
    this.rows = rows;

    // State — initialized by reset()
    this.grid = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.current = null;   // { type, rotation, col, row }
    this.nextType = null;  // key like 'T'
    this.bag = [];
    this.gameOver = false;
    this.lastClearedRows = [];
  }

  // ── Reset ──────────────────────────────────────────────────────

  reset() {
    // Build empty grid: grid[row][col] = null
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid.push(new Array(this.cols).fill(null));
    }

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.lastClearedRows = [];
    this.bag = [];

    // Fill bag and pick the next piece, then spawn
    this.nextType = this._drawFromBag();
    this.spawnPiece();
  }

  // ── 7-Bag Randomizer ──────────────────────────────────────────

  _drawFromBag() {
    if (this.bag.length === 0) {
      this.bag = PIECE_TYPES.slice(); // copy all 7
      this._shuffle(this.bag);
    }
    return this.bag.pop();
  }

  _shuffle(arr) {
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  // ── Piece Spawning ────────────────────────────────────────────

  spawnPiece() {
    const type = this.nextType;
    this.nextType = this._drawFromBag();

    const piece = PIECES[type];
    const matrix = piece.rotations[0];
    const pieceWidth = matrix[0].length;

    // Center horizontally
    const col = Math.floor((this.cols - pieceWidth) / 2);
    const row = 0;

    this.current = { type, rotation: 0, col, row };

    // Check game over — new piece immediately collides
    if (this.collides(type, 0, col, row)) {
      this.gameOver = true;
      this.current = null;
      return false;
    }

    return true;
  }

  // ── Movement ──────────────────────────────────────────────────

  moveLeft() {
    if (!this.current) return false;
    const { type, rotation, col, row } = this.current;
    if (!this.collides(type, rotation, col - 1, row)) {
      this.current.col -= 1;
      return true;
    }
    return false;
  }

  moveRight() {
    if (!this.current) return false;
    const { type, rotation, col, row } = this.current;
    if (!this.collides(type, rotation, col + 1, row)) {
      this.current.col += 1;
      return true;
    }
    return false;
  }

  // ── Rotation with Wall Kicks ──────────────────────────────────

  rotate() {
    if (!this.current) return false;
    const { type, rotation, col, row } = this.current;
    const piece = PIECES[type];
    const nextRotation = (rotation + 1) % piece.rotations.length;

    // Wall kicks: try no shift, then ±1, then ±2 for the I-piece
    const kicks = [0, -1, 1];
    if (type === 'I') kicks.push(-2, 2);

    for (const kick of kicks) {
      if (!this.collides(type, nextRotation, col + kick, row)) {
        this.current.rotation = nextRotation;
        this.current.col += kick;
        return true;
      }
    }

    return false; // rotation failed
  }

  // ── Soft Drop ─────────────────────────────────────────────────

  softDrop() {
    if (!this.current) return false;
    const { type, rotation, col, row } = this.current;
    if (!this.collides(type, rotation, col, row + 1)) {
      this.current.row += 1;
      return true;
    }
    return false;
  }

  // ── Hard Drop ─────────────────────────────────────────────────

  hardDrop() {
    if (!this.current) return 0;
    const ghostRow = this.getGhostRow();
    const distance = ghostRow - this.current.row;
    this.current.row = ghostRow;
    this.lock();
    this.spawnPiece(); // spawn next piece (may set gameOver)
    return distance;
  }

  // ── Collision Detection ───────────────────────────────────────

  collides(type, rotation, col, row) {
    const matrix = PIECES[type].rotations[rotation];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;

        const gridCol = col + c;
        const gridRow = row + r;

        // Out of bounds (left, right, bottom)
        if (gridCol < 0 || gridCol >= this.cols || gridRow >= this.rows) {
          return true;
        }

        // Above the top is OK (piece can start partially off-screen)
        if (gridRow < 0) continue;

        // Cell occupied
        if (this.grid[gridRow][gridCol] !== null) {
          return true;
        }
      }
    }
    return false;
  }

  // ── Lock Piece ────────────────────────────────────────────────

  lock() {
    if (!this.current) return;
    const { type, rotation, col, row } = this.current;
    const piece = PIECES[type];
    const matrix = piece.rotations[rotation];

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const gridRow = row + r;
        const gridCol = col + c;
        if (gridRow >= 0 && gridRow < this.rows && gridCol >= 0 && gridCol < this.cols) {
          this.grid[gridRow][gridCol] = piece.color;
        }
      }
    }

    this.current = null;
    this.clearLines();
  }

  // ── Line Clearing ─────────────────────────────────────────────

  clearLines() {
    this.lastClearedRows = [];

    // Scan from bottom to top for full rows
    for (let r = this.rows - 1; r >= 0; r--) {
      const full = this.grid[r].every(cell => cell !== null);
      if (full) {
        this.lastClearedRows.push(r);
      }
    }

    if (this.lastClearedRows.length === 0) return;

    // Remove cleared rows (sorted descending, so remove from bottom up)
    // lastClearedRows is already bottom-to-top from the scan
    for (const row of this.lastClearedRows) {
      this.grid.splice(row, 1);
    }

    // Add empty rows at the top to replace cleared ones
    for (let i = 0; i < this.lastClearedRows.length; i++) {
      this.grid.unshift(new Array(this.cols).fill(null));
    }

    this.addScore(this.lastClearedRows.length);
  }

  // ── Ghost Piece ───────────────────────────────────────────────

  getGhostRow() {
    if (!this.current) return 0;
    const { type, rotation, col, row } = this.current;
    let ghostRow = row;
    while (!this.collides(type, rotation, col, ghostRow + 1)) {
      ghostRow++;
    }
    return ghostRow;
  }

  // ── Gravity Tick ──────────────────────────────────────────────

  tick() {
    if (!this.current || this.gameOver) return false;

    if (this.softDrop()) {
      // Piece moved down successfully
      return true;
    }

    // Can't move down — lock piece
    this.lock();

    // Spawn next piece; returns false if game over
    if (!this.spawnPiece()) {
      return false;
    }

    return true;
  }

  // ── Scoring ───────────────────────────────────────────────────

  addScore(linesCleared) {
    if (linesCleared <= 0 || linesCleared > 4) return;

    this.score += LINE_SCORES[linesCleared] * this.level;
    this.lines += linesCleared;
    this.level = Math.floor(this.lines / 10) + 1;
  }

  // ── Public Accessors (for renderer / main) ────────────────────

  get activePiece() { return this.current; }
  get ghostY() { return this.getGhostRow(); }
  get nextPiece() { return this.nextType ? { type: this.nextType, ...PIECES[this.nextType] } : null; }
}
