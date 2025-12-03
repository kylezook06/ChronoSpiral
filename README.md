# ChronoSpiral Prototype

A p5.js (1.11.x) playground for a radial, Donkey-Kong-inspired platformer with outward "gravity" and time-traveling stages. Collect shards, dodge era-themed enemies, and warp inward.

## Running

1. Serve the folder (e.g., `python -m http.server 8000`).
2. Open `http://localhost:8000` in a browser.
3. Use **Left/Right** to run along the spiral and **X/Up/Space** to jump inward toward the portal. Press **Down/C/Alt** to snap-drop to the next outer loop. After earning **30 shards** you unlock a mid-air double jump (press jump again while airborne) that now latches onto inner rings when your feet reach them. At **15 shards** press **S/Ctrl** for a 1s invulnerability shield (60s cooldown) and at **45 shards** press **D** for a 2s time-freeze (60s cooldown). Tap **Enter** on the Era Select map to start an unlocked stage (first stage starts unlocked). The canvas fills the window, so you can resize the browser at any point.

## Notes

- Each era defines its own platform curve (spiral → lotus waves → stepped tiers → star spikes) so the player, enemies, and collectibles hug era-specific geometry.
- Levels cycle through era themes (Neanderthal → Ancient India → Ancient Egypt → Ancient Greece → Ancient Rome → Medieval China → Byzantine Empire → Medieval France → Renaissance Italy → 17th Century Britain → Modern America → Future Japan → Chrono Nexus) with color palettes, enemy silhouettes, and shard counts to hint at future art/sound direction.
- The player is simulated in polar coordinates (r, θ) so gravity pushes outward and the curve acts as the main platform; reaching the center warps you forward, drifting too far outward resets you to the start, and falling into enemies does the same.
- Hazards and collectibles move or sit along the curve with slight radial offsets; touching an enemy resets your position while grabbing Time Shards increases the level shard count.
- Era enemies stay glued to their platform lanes (feet outward) so you can’t sneak under or over their path; shard pickups fuel powers: **15 shards** unlock a brief invulnerability shield and **45 shards** unlock a time-freeze burst.
- The playable hero is now a chubby, goggle-wearing time traveler with stronger run/jump animation, radial shadow, and outward-facing orientation; both the player and enemies run at calmer speeds for a more readable pace.
- The canvas resizes to fill the browser window and recenters the spiral so you can play at any resolution.
- A full-screen Era Select map lets you choose any unlocked era and see shard progress; each stage opens with a short intro card (era + year/location), and collecting **60 shards** globally unlocks the final Chrono Nexus node non-linearly. Mid-air double jump unlocks at 30 shards.

## ChronoSpiral 1.0 roadmap (current pass)

1. **Content expansion**
   - Add new stages with bespoke curves/enemies: Ancient Rome (tiered colosseum arches), Medieval China (crenellated wall), Byzantine Empire (dome bulges), Medieval France (gothic arches), Renaissance Italy (layered Da Vinci waves), 17th Century Britain (rolling sea wobble), Modern America (freeway ramps), Future Japan (neon spikes).
2. **Light systems pass**
   - Per-level difficulty scalars (gravity/run/enemy speed) to ramp intensity without rewriting core movement.
   - Optional shard gating for warps (collect all shards to advance).
3. **Polish and narrative**
   - Level intro text (year/era), subtle backdrops, and themed audio hooks per stage.
   - Additional hazard varieties (rolling shields, fireworks, halo rings) tied to later eras.
