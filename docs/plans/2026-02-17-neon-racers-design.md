# Neon Racers — Design Doc

**One-line pitch:** Top-down kart racer where Hudson fights from last place to 1st across 5 neon-lit tracks.

**Inspiration:** Mario Kart — specifically the thrill of overtaking opponents.

## Core Mechanic

**Thumb-zone steering.** Hold the left side of the screen to steer left, hold the right side to steer right. Release to drive straight. The kart auto-accelerates — no gas button needed.

- **One gesture type:** hold-to-steer
- **Instant feedback:** kart turns immediately, tire-trail particles show direction
- **Visible result:** kart visibly rotates and moves, opponents react

## Controls Layout

```
+-------------------------------------------+
|  [🏆 4th]  LAP 1/3           [⏸ PAUSE]   |
|                                            |
|              ┌───────────┐                 |
|              │  TOP-DOWN │                 |
|  ┌────────┐  │   TRACK   │  ┌────────┐    |
|  │ STEER  │  │   VIEW    │  │ STEER  │    |
|  │  LEFT  │  │           │  │ RIGHT  │    |
|  │ (hold) │  └───────────┘  │ (hold) │    |
|  └────────┘                  └────────┘    |
+-------------------------------------------+
```

- Left ~40% of screen = steer left zone (invisible, full-height)
- Right ~40% of screen = steer right zone (invisible, full-height)
- Center = track view (no touch interaction needed)
- Top-left: position indicator (🏆 1st/2nd/3rd/4th)
- Top-center: lap counter (LAP 1/3)
- Top-right: pause button (48px+)
- Bottom-left: ← ARCADE back button

## Progression / Fun Loop

**Track unlocks.** Finish in the top 3 to unlock the next track. 5 tracks total.

| Track | Name | Description | Unlock |
|---|---|---|---|
| 1 | Neon Oval | Wide simple oval. Tutorial track. | Default |
| 2 | Pixel Circuit | Figure-8 with a crossover section | Finish top 3 on Track 1 |
| 3 | Cyber Loop | Tighter turns with a hairpin bend | Finish top 3 on Track 2 |
| 4 | Laser Lane | Narrow track with boost-pad shortcuts | Finish top 3 on Track 3 |
| 5 | Warp Ring | Complex layout with multiple tight sections | Finish top 3 on Track 4 |

- 3 laps per race
- 4 racers total (Hudson + 3 AI)
- Hudson always starts in 4th (last) — the fun is climbing to 1st
- Track select screen shows locked tracks with a "?" silhouette
- Unlock progress saved to localStorage

## Entity List (4 types)

| Entity | Description | Visual |
|---|---|---|
| **Player kart** | Hudson's kart. Thumb-zone steering, auto-accelerate. | Bright neon green (#39ff14) kart shape with glow |
| **AI karts** (×3) | Follow track path with slight variation. Speed increases per track. | Cyan (#00fff5), magenta (#ff00ff), yellow (#ffe600) |
| **Boost pads** | Neon strips on the track. Drive over = 1.5s speed burst. | Pulsing white/cyan glow strip across track |
| **Track/walls** | The course boundary. Collision = slow down + bounce. | Neon-bordered lanes on dark background |

## Difficulty & Forgiveness

- **No death or elimination.** Wall hits slow you down momentarily + visual bump. That's it.
- **Generous track width.** Track 1 is very wide. Narrows slightly in later tracks.
- **Forgiving wall bounce.** Kart bounces off walls gently, doesn't spin out.
- **AI doesn't block.** AI racers follow their path; they don't swerve to cut you off.
- **Boost pads help catch up.** Strategic placement after hard turns rewards good lines.
- **Slow difficulty ramp:**
  - Track 1: AI speed ~85% of player max. Very easy.
  - Track 2: AI speed ~88%. Easy.
  - Track 3: AI speed ~91%. Medium.
  - Track 4: AI speed ~94%. Medium-hard.
  - Track 5: AI speed ~97%. Challenging but beatable.
- **1-tap restart.** Race over → results screen → tap "RACE AGAIN" or "NEXT TRACK".
- **Passing celebration.** Every overtake triggers a position flash + speed burst visual.

## Visual Style

- **Background:** Dark (#0a0a0a) with subtle grid pattern
- **Track surface:** Dark gray (#1a1a1a) with neon-colored borders
- **Track borders:** Neon green (#39ff14) outer wall, cyan (#00fff5) inner wall
- **Karts:** Simple top-down kart shapes (rounded rectangle body + wheels), each with colored glow
- **Boost pads:** Pulsing white/cyan chevrons on track surface
- **HUD:** Press Start 2P font, neon green text, minimal
- **Overtake effect:** Position indicator bounces + flashes, brief speed-line burst
- **Finish line:** Checkered neon strip
- **Win celebration:** "1ST PLACE!" in large neon text + particle burst (keep particles under 30)
- **Track unlock:** New track reveals with a neon "glow-in" animation
- **Track select:** Grid of track thumbnails, locked ones show neon "?" outline

## Race Flow (State Machine)

```
TRACK_SELECT → COUNTDOWN → RACING → LAP_COMPLETE → RACING → ... → RACE_FINISH → RESULTS
                  │                                                       │
                  └── 3-2-1-GO! ──┘                                      ├── Top 3? → UNLOCK_NEXT
                                                                          └── 4th? → TRY AGAIN
```

1. **TRACK_SELECT** — Pick an unlocked track. Locked tracks show as "?".
2. **COUNTDOWN** — 3… 2… 1… GO! (karts line up at start)
3. **RACING** — Main gameplay loop. Steering, boosting, passing.
4. **LAP_COMPLETE** — Brief "LAP 2/3" flash overlay, racing continues.
5. **RACE_FINISH** — Cross finish line on lap 3. Camera follows until all finish.
6. **RESULTS** — Show finishing positions. If top 3 and next track locked → unlock animation.

## AI Behavior

- AI karts follow a predefined path (series of waypoints along the track center)
- Slight random offset from center path (±15% of track width) for variety
- AI doesn't perfectly hit boost pads (~50% chance of hitting each one)
- AI speed is constant per track (no rubber-banding)
- AI karts avoid each other with simple separation logic
- No AI items or attacks — pure racing

## Tech Notes

- **Rendering:** Canvas2D (no libraries needed)
- **Performance target:** 60fps on Fire HD, degrade gracefully to 30fps
- **Track data:** Each track defined as an array of path points (center line + width)
- **Physics:** Simple 2D — position, velocity, rotation. No rigid body needed.
- **Collision:** Track boundary = distance from center line > half track width → bounce + slow
- **Camera:** Follows player kart, rotates so kart always faces "up" on screen
- **Save data:** localStorage for track unlock progress
- **CDN dependencies:** None — pure Canvas2D
- **Module structure:**
  - `main.js` — Game loop, state machine, input handling
  - `track.js` — Track data, rendering, collision detection
  - `kart.js` — Kart physics, rendering (player + AI)
  - `camera.js` — Camera follow + rotation
  - `hud.js` — Position indicator, lap counter, countdown, results
  - `particles.js` — Boost effects, overtake celebration, win confetti
