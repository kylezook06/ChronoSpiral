# ChronoSpiral Prototype

A p5.js (1.11.x) playground for a radial time-travel platformer with outward "gravity" and time-traveling stages. Collect shards, dodge era-themed enemies, and warp inward.

## Running

1. Serve the folder (e.g., `python -m http.server 8000`).
2. Open `http://localhost:8000` in a browser.
3. Use **Left/Right** to run along the spiral and **X/Up/Space** to jump inward toward the portal. Press **Down/C/Alt** to snap-drop to the next outer loop. After earning **30 shards** you unlock a mid-air double jump (press jump again while airborne) that now latches onto inner rings with a short climb-up animation. At **15 shards** press **S/Ctrl** for a 1s invulnerability shield (15s cooldown) and at **45 shards** press **D** for a 2s time-freeze (30s cooldown). Tap **Enter** on the Era Select map to start an unlocked stage (first stage starts unlocked). The canvas fills the window, so you can resize the browser at any point.
4. Each board runs on a **3:00 timer**; if it expires you lose a life (3 lives per run), drop any shards earned on that board, and return to Era Select.
5. For playtesting, press **Ctrl + Shift + Alt + '+'** to instantly grant 60 shards and unlock the last two arenas.
6. Optional music: place your stage tracks in `assets/` using the filenames below; each level will auto-loop its track when loaded.

## Notes

- Each era defines its own platform curve (spiral → lotus waves → stepped tiers → star spikes) so the player, enemies, and collectibles hug era-specific geometry.
- Levels cycle through era themes (Neanderthal → Ancient India → Ancient Egypt → Ancient Greece → Ancient Rome → Byzantine Empire → Medieval China → Medieval France → Renaissance Italy → 17th Century Britain → Modern America → Future Japan → Chrono Core → Chrono Boss) with color palettes, enemy silhouettes, and shard counts to hint at future art/sound direction. The final two arenas intentionally spawn no shards.
- Several eras now mix multiple archetypes per stage (e.g., lotus orbs + sages/monkeys in Ancient India, scarabs + mummies/ankh wisps in Ancient Egypt, hoplites + harpies/amphorae in Ancient Greece, legionaries + standard bearers/shields in Rome, ikons + censer smoke/mosaic shards in Byzantium, lantern spirits + cranes/guards in Medieval China, knights + war horses/banner wavers in Medieval France, inventors/apprentices/ornithopters in Renaissance Italy, sailors/cannonballs on the British coast, freeway cars/drones in Modern America, and drones/hologuards in Future Japan) so lane management varies by era.
- Chrono Core (Stage 13) stays locked until you gather 60 shards; clearing it unlocks the Chrono Boss (Stage 14), an escape sprint where the inner loops are eaten by a growing core instead of the whole spiral shrinking. Thick safe platforms help you dodge recurring electric pulses, miniature Time Warden shards scour the lanes (yanking you back without costing a life), and running into the expanding core costs a life while reaching the glowing exit bubble at the far end of the spiral wins the fight.
- The player is simulated in polar coordinates (r, θ) so gravity pushes outward and the curve acts as the main platform; reaching the center warps you forward on normal stages, drifting too far outward resets you to the start (except in the core boss escape), and falling into enemies does the same. On the Chrono Boss, the expanding core is lethal, Time Warden shards knock you back to a safer loop with a brief invulnerability window, and the win condition is reaching the outer exit bubble before you run out of lives or time.
- Hazards and collectibles move or sit along the curve with slight radial offsets; touching an enemy resets your position while grabbing Time Shards increases the level shard count.
- Era enemies stay glued to their platform lanes (feet outward) so you can’t sneak under or over their path; shard pickups fuel powers: **15 shards** unlock a brief invulnerability shield and **45 shards** unlock a time-freeze burst.
- The playable hero is now a chubby, goggle-wearing time traveler with stronger run/jump animation, radial shadow, outward-facing orientation, left/right-facing flip along the spiral, and animated snap drops/climb-ups between rings; both the player and enemies run at calmer speeds for a more readable pace.
- The canvas resizes to fill the browser window and recenters the spiral so you can play at any resolution.
- A full-screen Era Select map lets you choose any unlocked era and see shard progress; each stage opens with a short intro card (era + year/location). Collecting **60 shards** globally unlocks the **Chrono Core** (Stage 13); defeating it unlocks the final **Chrono Boss** arena (Stage 14).
- The Era Select header will show `assets/ChronoSpiral-logo-480.png` (recommended 480×270) if present; otherwise it falls back to a text title.

### Optional stage music

Drop matching files into `assets/` to enable looping background music per stage:

1. `01-Caveman-Quest.wav`
2. `02-Temple-of-Hanuman.wav`
3. `03-Pharaohs-Tomb.wav`
4. `04-Minotaurs-Labyrinth.wav`
5. `05-March-of-the-Legions.wav`
6. `06-Golden-Mosaics.wav`
7. `07-Dynasty-of-Silk.wav`
8. `08-Paladins-March.wav`
9. `09-Florentine-Dawn.wav`
10. `10-The-Globe-Awakens.wav`
11. `11-City-of-Tomorrow.wav`
12. `12-Chrome-Sakura.wav`
13. `13-Temporal-Collapse.wav`
14. `14-Event-Horizon.wav`

### Optional sound effects

- `Jump-Platform-Leap.wav` (played on jumps/double-jumps)
- `Time-Glitch-Moment.wav` (played when an enemy hit forces a respawn/knockback)

## ChronoSpiral 1.0 roadmap (current pass)

1. **Content expansion**
  - Add new stages with bespoke curves/enemies: Ancient Rome (tiered colosseum arches), Byzantine Empire (dome bulges), Medieval China (crenellated wall), Medieval France (gothic arches), Renaissance Italy (layered Da Vinci waves), 17th Century Britain (rolling sea wobble), Modern America (freeway ramps), Future Japan (neon spikes), Chrono Core pulse run, and a pulling/gravity-flip Chrono Boss arena.
2. **Light systems pass**
   - Per-level difficulty scalars (gravity/run/enemy speed) to ramp intensity without rewriting core movement.
   - Optional shard gating for warps (collect all shards to advance).
3. **Polish and narrative**
   - Level intro text (year/era), subtle backdrops, and themed audio hooks per stage.
   - Additional hazard varieties (rolling shields, fireworks, halo rings) tied to later eras.
