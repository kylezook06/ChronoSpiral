# ChronoSpiral Prototype

A p5.js (1.11.x) playground for a radial, Donkey-Kong-inspired platformer with outward "gravity" and time-traveling stages.

## Running

1. Serve the folder (e.g., `python -m http.server 8000`).
2. Open `http://localhost:8000` in a browser.
3. Use **Left/Right** to run along the spiral and **X/Up/Space** to jump inward toward the portal.

## Notes

- Each era defines its own platform curve (spiral → lotus waves → stepped tiers → star spikes) so the player and enemies hug era-specific geometry.
- Levels cycle through early-era themes (Neanderthal → Ancient India → Ancient Egypt → Ancient Greece) with color palettes and enemy tints to hint at future art/sound direction.
- The player is simulated in polar coordinates (r, θ) so gravity pushes outward and the curve acts as the main platform; reaching the center warps you forward.
- Hazards move along the curve with slight radial offsets; touching one resets your position.
