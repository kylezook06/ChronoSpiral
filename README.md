# ChronoSpiral Prototype

A p5.js (1.11.x) playground for a radial, Donkey-Kong-inspired platformer with outward "gravity" and time-traveling stages.

## Running

1. Serve the folder (e.g., `python -m http.server 8000`).
2. Open `http://localhost:8000` in a browser.
3. Use **Left/Right** to run along the spiral and **X/Up** to jump inward toward the portal.

## Notes

- Levels cycle through early-era themes (Neanderthal → Ancient India → Ancient Egypt → Ancient Greece) with color palettes and enemy tints to hint at future art/sound direction.
- The player is simulated in polar coordinates (r, θ) so gravity pushes outward and the spiral acts as the main platform.
- Hazards currently move along the spiral with slight radial offsets; touching one resets your position.
- Reaching the center triggers a warp to the next stage.
