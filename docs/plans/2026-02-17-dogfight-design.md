# Dogfight — Fighter Jet Battle

> Fly your neon jet and blast waves of enemies out of the sky.

## One-Line Pitch

A 2D top-down arcade shooter where Hudson drags to fly and taps to fire, battling waves of enemy jets with a boss every 5 waves.

## Core Mechanic

**Two-thumb control:**
- **Right thumb — Virtual joystick (drag):** Controls jet movement in all 8 directions across the full screen. ~120px radius touch zone, forgiving dead zone so small movements don't jerk the jet.
- **Left thumb — Fire button (tap/hold):** Big 80px+ button. Tap for single shots, hold for rapid fire. Bullets fire in the direction the jet is facing.

The jet has **free movement** — Hudson can fly anywhere on screen.

## Controls Layout

```
+-------------------------------------------+
|  [SCORE: 47]            [WAVE 3]  [⏸]    |
|                                            |
|        ✈ enemies fly in from edges         |
|              💥  💥                         |
|          ✈ HUDSON'S JET                    |
|         (free movement)                    |
|                                            |
|   🔴                            ◯          |
|  [FIRE]                      [JOYSTICK]   |
|  (80px)                      (120px rad)  |
+-------------------------------------------+
```

- **Score** — top-left, neon green, Press Start 2P font
- **Wave counter** — top-center, flashes on new wave
- **Pause** — top-right, small ⏸ icon
- **Lives** — shown as mini jet icons below the score (max 3)
- **Fire button** — bottom-left, left thumb
- **Joystick** — bottom-right, right thumb

## Progression / Fun Loop

**Primary: Wave progression + score chasing (both)**

- Enemies arrive in waves. Each wave has more/faster enemies.
- Score increments by 1 per enemy destroyed. Simple. No point values to learn.
- **Wave announcement** — "WAVE 5" flashes big center screen for 1 second at the start of each wave.
- **Boss every 5 waves** — bigger enemy, more HP, fires spread shots. Defeating a boss feels like an event.
- **High score saved** to localStorage and shown on the start screen.
- After game over: "WAVE 12 — SCORE 83 — NEW HIGH SCORE!" with one-tap restart.

## Entity List (4 types)

| Entity | Visual | Behavior |
|--------|--------|----------|
| **Hudson's Jet** | Cyan (#00fff5) jet silhouette with green (#39ff14) engine trail | Player-controlled. Fires cyan bullets forward. 3 lives. Brief invincibility flash on hit. |
| **Basic Enemy** | Small magenta (#ff00ff) jet | Flies in from screen edges. Straight-line or gentle sine-wave path. Does not fire. Dies in 1 hit. |
| **Shooter Enemy** | Magenta jet with red (#ff3333) cockpit glow | Same movement as basic but fires slow red bullets toward Hudson. Dies in 1 hit. Introduced at Wave 3. |
| **Boss** | 2x size magenta jet, pulsing white glow | Appears every 5 waves. 5 HP (takes 5 hits). Fires 3-bullet spread. Moves in slow figure-8 pattern. |

## Difficulty Approach

- **Wave 1-2:** 3-4 basic enemies only. Slow speed. No shooting. Hudson learns to fly and fire.
- **Wave 3-4:** Introduce shooter enemies (1 per wave mixed with basics). Still slow.
- **Wave 5:** First boss. Slow, predictable. A celebration, not a wall.
- **Wave 6+:** Gradually increase enemy count (+1 per wave), speed (+5% per wave), and shooter ratio.
- **Boss waves (10, 15, 20...):** Boss HP increases by +1 each time. Spread shot gets slightly wider.

### Forgiveness

- **3 lives** shown as mini jet icons. Lose one on hit, 2-second invincibility after.
- **Gain 1 life every 5 waves** (capped at 3). Hudson always has hope.
- **Generous hitboxes:** Enemy hitbox is ~20% larger than sprite. Hudson's hitbox is ~20% smaller than sprite.
- **Enemy bullets are slow and bright** — easy to see and dodge.
- **ONE TAP restart** after game over. No menus, no confirmation.
- **No penalty for missing shots.** Unlimited ammo, rapid fire. Let him spray.

## Visual Style

- **Background:** Dark sky (#0a0a0a) with scrolling star field (small white dots drifting left, parallax layers for depth feel)
- **Hudson's jet:** Cyan (#00fff5) silhouette, green (#39ff14) engine trail (3-4 fading circles behind the jet)
- **Enemy jets:** Magenta (#ff00ff) silhouettes, orange (#ff8800) trails
- **Bullets:** Cyan dots (player), red dots (enemy), ~6px diameter
- **Explosions:** Quick 4-frame burst — 8 neon particles that expand and fade over 300ms. Keep particle count low for Fire HD.
- **UI text:** Press Start 2P pixel font, neon green (#39ff14)
- **Wave announcement:** Large "WAVE X" text, white with cyan glow, fades after 1 second
- **Boss entrance:** Screen flashes briefly, "WARNING" text appears for 0.5s before boss flies in
- **Joystick visual:** Subtle dark gray circle (#222) with lighter gray knob (#555). Unobtrusive.
- **Fire button:** Red circle with subtle glow. Brightens on press.
- **Back button:** "← ARCADE" top-left (hidden during gameplay, shown on start/game-over screens)

## Tech Notes

- **Canvas2D** — no 3D needed, and Canvas2D performs well on Fire HD
- **No external libraries** — vanilla JS, ES modules
- **Target: 60fps on Fire HD**, degrade gracefully (skip trail particles first if needed)
- **Simultaneous object budget:** ~30 max (1 player + ~15 enemies + ~10 bullets + ~4 explosion particles visible at once)
- **Sprite rendering:** Simple geometric shapes (triangles for jets, circles for bullets/trails). No image assets needed.
- **Touch handling:** Use `touchstart`/`touchmove`/`touchend` with `e.preventDefault()` to avoid browser gestures. Support multi-touch (both thumbs simultaneously).
- **Game loop:** `requestAnimationFrame` with delta-time for consistent speed across frame rates
- **State machine:** START → PLAYING → WAVE_INTRO → PLAYING → BOSS_INTRO → BOSS → WAVE_CLEAR → GAME_OVER
- **localStorage:** Save high score only

## Module Structure

```
games/dogfight/
├── index.html          ← Self-contained: inline styles + canvas + UI overlay
└── js/
    ├── main.js         ← Entry point, game loop, state machine
    ├── player.js       ← Hudson's jet, movement, shooting, lives
    ├── enemies.js      ← Enemy spawning, movement patterns, boss logic
    ├── bullets.js      ← Bullet pool for both player and enemy bullets
    ├── particles.js    ← Explosion effects (lightweight)
    ├── controls.js     ← Virtual joystick + fire button touch handling
    ├── starfield.js    ← Scrolling background stars
    └── ui.js           ← Score, wave counter, lives display, wave announcements
```

## Session Length

- A run from Wave 1 to Game Over should take **2-5 minutes** depending on skill.
- Wave pacing: ~15 seconds per early wave, ~25 seconds per later wave.
- Boss fights: ~15-20 seconds each.
