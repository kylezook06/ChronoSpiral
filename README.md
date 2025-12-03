# ChronoSpiral Prototype

A p5.js (1.11.x) playground for a radial, Donkey-Kong-inspired platformer with outward "gravity" and time-traveling stages. Collect shards, dodge era-themed enemies, and warp inward.

## Running

1. Serve the folder (e.g., `python -m http.server 8000`).
2. Open `http://localhost:8000` in a browser.
3. Use **Left/Right** to run along the spiral and **X/Up/Space** to jump inward toward the portal.

## Notes

- Each era defines its own platform curve (spiral → lotus waves → stepped tiers → star spikes) so the player, enemies, and collectibles hug era-specific geometry.
- Levels cycle through early-era themes (Neanderthal → Ancient India → Ancient Egypt → Ancient Greece) with color palettes, enemy silhouettes, and shard counts to hint at future art/sound direction.
- The player is simulated in polar coordinates (r, θ) so gravity pushes outward and the curve acts as the main platform; reaching the center warps you forward, drifting too far outward resets you to the start, and falling into enemies does the same.
- Hazards and collectibles move or sit along the curve with slight radial offsets; touching an enemy resets your position while grabbing Time Shards increases the level shard count.
- The playable hero is now a chubby, goggle-wearing time traveler with simple leg/arm swing animation; both the player and enemies run at calmer speeds for a more readable pace.
