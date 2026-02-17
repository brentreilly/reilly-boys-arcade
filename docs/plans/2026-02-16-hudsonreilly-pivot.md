# Hudson Reilly Website Pivot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the project from a standalone golf game into hudsonreilly.com — a retro arcade homepage with a game collection, starting with Links golf.

**Architecture:** Static files, zero build step. Homepage at `/index.html` links to self-contained game pages under `/games/<slug>/`. Each game is fully independent with its own HTML, CSS, and JS.

**Tech Stack:** Vanilla HTML/CSS/JS, ES modules via CDN import maps, Three.js for golf game, Google Fonts (Press Start 2P).

---

### Task 1: Create directory structure and move golf game files

**Files:**
- Create: `games/links/` directory
- Move: `index.html` → `games/links/index.html`
- Move: `js/*` → `games/links/js/*`

**Step 1: Create the games/links directory**

```bash
mkdir -p games/links
```

**Step 2: Move existing files into games/links**

```bash
git mv index.html games/links/index.html
git mv js games/links/js
```

**Step 3: Verify the move**

```bash
ls games/links/
ls games/links/js/
```

Expected: `index.html` and all 8 JS files in their new locations.

**Step 4: Commit**

```bash
git add -A
git commit -m "Move golf game to games/links/ subdirectory"
```

---

### Task 2: Update golf game for new location

**Files:**
- Modify: `games/links/index.html`

**Step 1: Update the `<title>` tag**

Change:
```html
<title>Links - Golf Simulator</title>
```
To:
```html
<title>Links — Hudson's Arcade</title>
```

**Step 2: Add "Back to Arcade" button**

Add this CSS inside the existing `<style>` block (after the `#game-start` styles, before `</style>`):

```css
/* ---- Back to Arcade ---- */
#back-btn {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 200;
  background: rgba(0,0,0,0.6);
  border: 2px solid rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  font-family: inherit;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  text-decoration: none;
  display: inline-block;
}

#back-btn:active {
  background: rgba(255,255,255,0.2);
}
```

Add this HTML right after `<body>`, before `<canvas>`:

```html
<a id="back-btn" href="/">← ARCADE</a>
```

**Step 3: Verify the golf game still loads correctly**

Open `games/links/index.html` in a browser. Confirm:
- Game loads and renders
- "← ARCADE" button visible top-left
- Button links to `/`

**Step 4: Commit**

```bash
git add games/links/index.html
git commit -m "Add back-to-arcade button and update title in Links"
```

---

### Task 3: Create homepage HTML

**Files:**
- Create: `index.html`

**Step 1: Create the homepage**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>Hudson's Arcade</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/home.css">
</head>
<body>
  <header>
    <h1 class="title">HUDSON'S<br>ARCADE</h1>
  </header>

  <main class="game-grid">
    <a href="/games/links/" class="game-card">
      <div class="game-icon">⛳</div>
      <div class="game-name">LINKS</div>
      <div class="game-tag">9-Hole Golf</div>
    </a>

    <div class="game-card coming-soon">
      <div class="game-icon">?</div>
      <div class="game-name">COMING SOON</div>
      <div class="game-tag">New game!</div>
    </div>
  </main>

  <footer>
    <p class="footer-text">Made with love for Hudson</p>
  </footer>
</body>
</html>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "Add homepage HTML shell"
```

---

### Task 4: Create homepage CSS (retro arcade theme)

**Files:**
- Create: `css/home.css`

**Step 1: Create the css directory and stylesheet**

```bash
mkdir -p css
```

Write `css/home.css` with the full retro arcade theme:

```css
/* ============================================
   Hudson's Arcade — Retro Theme
   ============================================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #0a0a0a;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}

/* ---- Header ---- */
header {
  text-align: center;
  padding: 48px 16px 24px;
}

.title {
  font-size: 28px;
  line-height: 1.5;
  color: #39ff14;
  text-shadow:
    0 0 10px #39ff14,
    0 0 30px #39ff14,
    0 0 60px rgba(57, 255, 20, 0.3);
  letter-spacing: 4px;
  animation: flicker 4s infinite alternate;
}

@keyframes flicker {
  0%, 95%, 100% { opacity: 1; }
  96% { opacity: 0.8; }
  97% { opacity: 1; }
  98% { opacity: 0.7; }
  99% { opacity: 1; }
}

/* ---- Game Grid ---- */
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  padding: 24px;
  max-width: 700px;
  width: 100%;
  flex: 1;
}

/* ---- Game Card ---- */
.game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 16px;
  min-height: 220px;
  background: #111;
  border: 3px solid #333;
  border-radius: 4px;
  text-decoration: none;
  color: #fff;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
  /* Pixel-art style: sharp corners, thick border */
  image-rendering: pixelated;
}

.game-card:active {
  transform: scale(0.96);
}

.game-card:hover,
.game-card:focus {
  border-color: #00fff5;
  box-shadow:
    0 0 12px rgba(0, 255, 245, 0.4),
    0 0 30px rgba(0, 255, 245, 0.15),
    inset 0 0 20px rgba(0, 255, 245, 0.05);
}

.game-icon {
  font-size: 64px;
  line-height: 1;
}

.game-name {
  font-size: 16px;
  letter-spacing: 2px;
  color: #00fff5;
  text-shadow: 0 0 8px rgba(0, 255, 245, 0.5);
}

.game-tag {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

/* ---- Coming Soon ---- */
.coming-soon {
  border-color: #222;
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.coming-soon .game-icon {
  color: #555;
}

.coming-soon .game-name {
  color: #555;
  text-shadow: none;
}

/* ---- Footer ---- */
footer {
  padding: 24px;
  text-align: center;
}

.footer-text {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 2px;
}

/* ---- Scanline overlay (subtle CRT effect) ---- */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

**Step 2: Verify in browser**

Open `index.html` in a browser. Confirm:
- "HUDSON'S ARCADE" header with neon green glow
- Links golf card with ⛳ emoji, tappable, links to `/games/links/`
- Coming Soon card grayed out
- CRT scanline overlay visible
- Retro pixel font loaded

**Step 3: Commit**

```bash
git add css/home.css
git commit -m "Add retro arcade homepage styles"
```

---

### Task 5: Final verification and cleanup

**Step 1: Full navigation test**

1. Open `/index.html` — homepage loads with retro theme
2. Tap "Links" card — navigates to `/games/links/`
3. Golf game loads and is playable
4. Tap "← ARCADE" button — returns to homepage

**Step 2: Remove any stale files at root**

Verify no orphaned `js/` or old `index.html` remain at root after the `git mv` in Task 1.

```bash
ls -la  # should show: css/, docs/, games/, index.html (new), .git/
```

**Step 3: Final commit if any cleanup needed**

```bash
git status
# Only commit if there are changes
```
