# Hudson Reilly Website Pivot — Design

## Summary

Pivot the project from a standalone golf game to **hudsonreilly.com**, a personal game arcade for Hudson (age 6-7) optimized for his Amazon Fire HD tablet. The golf game "Links" becomes the first game in a growing collection.

## Constraints

- **Zero build step** — vanilla HTML/CSS/JS, ES modules via import maps
- **Tablet-first** — large touch targets (min 48px), no hover-dependent interactions
- **Early reader** — short labels, big icons, minimal text
- **Fire HD tablet** — must perform well on low-end Android hardware

## File Structure

```
hudsonreilly/
├── index.html                    ← Homepage (game arcade grid)
├── css/
│   └── home.css                  ← Homepage styles (retro/pixel theme)
├── games/
│   └── links/
│       ├── index.html            ← Golf game (existing, moved here)
│       └── js/
│           ├── main.js
│           ├── clubs.js
│           ├── camera.js
│           ├── course.js
│           ├── physics.js
│           ├── renderer.js
│           ├── swing.js
│           └── ui.js
```

Each future game gets its own folder under `games/`.

## Homepage Design

**Theme:** Retro arcade — dark background, neon accents, pixel font.

- **Header:** "HUDSON'S ARCADE" in Press Start 2P (Google Fonts)
- **Game grid:** Responsive CSS grid of large tap-friendly cards (~200px+ tall)
- **Card contents:** Game icon/emoji, game name, short tagline
- **Card styling:** Retro pixel-art borders, subtle CRT-glow/neon shadow effects
- **Color palette:** Background #0a0a0a, accents in neon green (#39ff14), cyan (#00fff5), magenta (#ff00ff)
- **Coming Soon cards:** Grayed out with "?" icon, not tappable

## Golf Game Changes

Minimal changes when moving to `games/links/`:
- Script import paths stay relative (`js/main.js`) — no changes needed
- Add a small "Back to Arcade" button in the top-left corner of the game UI
- Update `<title>` to include site context

## Future Extensibility

- Adding a new game = creating `games/<slug>/index.html` + its assets
- Adding a card to the homepage grid
- No shared runtime between games — each is fully self-contained
