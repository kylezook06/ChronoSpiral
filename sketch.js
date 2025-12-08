// ChronoSpiral: Radial time-travel platformer prototype
// p5.js 1.11.x

const CANVAS_W = 960; // kept as legacy, not used for createCanvas
const CANVAS_H = 540;

let centerX, centerY;

// Base spiral parameter used by all platform curves
let spiralA = 12; // tightness of the spiral (r = a * theta)
const BASE_MAX_THETA = 10 * Math.PI; // standard stage length
const BOSS_MAX_THETA = 60 * Math.PI; // effectively endless spiral for the core boss
let maxTheta = BASE_MAX_THETA;
let bossCameraScale = 1; // dynamic camera scale for the core boss fight
let bossCollapseRate = 1; // how fast the Time Warden spiral is "eaten"
let mapLogo;

let player;
let currentLevel = 0;
let currentLevelIndex = 0;
const TIME_WARDEN_PULL_MAX = 220;

const MAX_LIVES = 3;
let lives = MAX_LIVES;

const START_THETA_FACTOR = 0.9; // start near the outer edge

// Game states
let GAME_STATE = "MAP"; // MAP | INTRO | PLAY | GAME_OVER
let introTimer = 0;
const INTRO_DURATION = 120; // frames (~2 seconds)
let postIntroFadeFrames = 0;

const LEVEL_TIME_LIMIT_FRAMES = 3 * 60 * 60; // 3 minutes at 60fps
let levelTimeFramesRemaining = LEVEL_TIME_LIMIT_FRAMES;
let shardsEarnedThisRun = 0;

let unlockedLevels = [];
let selectedLevelIndex = 0;

const levels = [
  {
    name: "Stage 1 — Neanderthal",
    year: "40,000 BCE",
    location: "Ancient Caves",
    palette: { bg: [12, 12, 28], spiral: [90, 200, 140], portal: [80, 180, 255] },
    musicHint: "Cavern beats, bone clacks",
    enemyTint: [220, 120, 80],
    enemyType: "neanderthal",
    enemyCount: 4,
    enemyOffsets: [-20, 20],
    shardCount: 5,
    difficulty: { gravityScale: 1, runSpeedScale: 1, enemySpeedScale: 1 },
    // Simple Archimedean spiral
    platformCurve: (theta) => spiralA * theta,
  },
  {
    name: "Stage 2 — Ancient India",
    year: "2500 BCE",
    location: "Indus Valley",
    palette: { bg: [9, 10, 24], spiral: [200, 150, 255], portal: [255, 205, 90] },
    musicHint: "Sitar-like arps, tabla blips",
    enemyTint: [255, 140, 120],
    enemyType: "lotusOrb",
    enemyCount: 6,
    enemyOffsets: [-30, -10, 10, 30],
    shardCount: 7,
    difficulty: { gravityScale: 1, runSpeedScale: 1, enemySpeedScale: 1 },
    // Lotus/mandala-esque: spiral + radial petals
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const petalAmp = 30; // strength of petals
      const petals = 3; // number of lobes
      return base + petalAmp * Math.sin(petals * theta);
    },
  },
  {
    name: "Stage 3 — Ancient Egypt",
    year: "1450 BCE",
    location: "Banks of the Nile",
    palette: { bg: [16, 10, 18], spiral: [240, 200, 120], portal: [255, 240, 180] },
    musicHint: "Desert winds, square-wave chants",
    enemyTint: [255, 170, 70],
    enemyType: "scarab",
    enemyCount: 7,
    enemyOffsets: [-40, -20, 0, 20, 40],
    shardCount: 8,
    difficulty: { gravityScale: 1, runSpeedScale: 1.05, enemySpeedScale: 1.05 },
    // Stepped pyramid: spiral snapped to tiered steps
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const stepSize = 40; // height of each "tier"
      return Math.floor(base / stepSize) * stepSize;
    },
  },
  {
    name: "Stage 4 — Ancient Greece",
    year: "450 BCE",
    location: "Aegean Coast",
    palette: { bg: [8, 12, 26], spiral: [120, 220, 255], portal: [180, 230, 255] },
    musicHint: "Lyre plucks over arps",
    enemyTint: [140, 200, 255],
    enemyType: "hoplite",
    enemyCount: 8,
    enemyOffsets: [-35, -15, 15, 35],
    shardCount: 9,
    difficulty: { gravityScale: 1.05, runSpeedScale: 1.05, enemySpeedScale: 1.1 },
    // Star / laurel-like: spiral with spikes
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const starAmp = 40;
      const spikes = 5;
      // subtract starAmp so r(0) ~ 0 and center still works
      return base + starAmp * Math.cos(spikes * theta) - starAmp;
    },
  },
  {
    name: "Stage 5 — Ancient Rome",
    year: "80 CE",
    location: "Rising Colosseum",
    palette: { bg: [20, 10, 24], spiral: [235, 210, 170], portal: [255, 235, 130] },
    musicHint: "Horn calls, marching toms",
    enemyTint: [220, 140, 90],
    enemyType: "legionary",
    enemyCount: 9,
    enemyOffsets: [-35, -15, 15, 35],
    shardCount: 10,
    difficulty: { gravityScale: 1.1, runSpeedScale: 1.08, enemySpeedScale: 1.12 },
    // Tiered colosseum ramps with arches
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const stepSize = 30;
      const tiered = Math.floor(base / stepSize) * stepSize;
      const colosseumWave = 10 * Math.sin(4 * theta);
      return tiered + colosseumWave;
    },
  },
  {
    name: "Stage 6 — Byzantine Empire",
    year: "540 CE",
    location: "Constantinople",
    palette: { bg: [10, 8, 30], spiral: [240, 210, 120], portal: [255, 255, 210] },
    musicHint: "Chanting mosaics, bronze bells",
    enemyTint: [255, 200, 120],
    enemyType: "ikon",
    enemyCount: 10,
    enemyOffsets: [-32, -12, 12, 32],
    shardCount: 12,
    difficulty: { gravityScale: 1.15, runSpeedScale: 1.12, enemySpeedScale: 1.18 },
    // Smooth repeating dome bulges along the spiral
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const domeAmp = 24;
      const domes = 6;
      const domeShape = Math.pow(Math.cos((domes * theta) / 2), 2);
      return base + domeAmp * domeShape;
    },
  },
  {
    name: "Stage 7 — Medieval China",
    year: "1100 CE",
    location: "Great Wall Peaks",
    palette: { bg: [8, 20, 26], spiral: [60, 200, 160], portal: [255, 200, 140] },
    musicHint: "Lantern lullabies, bamboo flutes",
    enemyTint: [180, 200, 255],
    enemyType: "lanternSpirit",
    enemyCount: 9,
    enemyOffsets: [-30, -10, 10, 30],
    shardCount: 11,
    difficulty: { gravityScale: 1.12, runSpeedScale: 1.1, enemySpeedScale: 1.15 },
    // Great Wall-like crenellations along the spiral
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const segmentSize = 35;
      const wallBase = Math.floor(base / segmentSize) * segmentSize;
      const crenel = 8 * Math.sign(Math.sin(theta * 6));
      return wallBase + crenel;
    },
  },
  {
    name: "Stage 8 — Medieval France",
    year: "1250 CE",
    location: "Cathedral Streets",
    palette: {
      bg: [15, 10, 22],
      spiral: [210, 190, 150],
      portal: [255, 220, 160],
    },
    musicHint: "Lute and choir over marching drums",
    enemyTint: [210, 140, 160],
    enemyType: "frKnight",
    enemyCount: 9,
    enemyOffsets: [-35, -15, 15, 35],
    shardCount: 10,
    difficulty: { gravityScale: 1.18, runSpeedScale: 1.14, enemySpeedScale: 1.2 },
    // Gothic arches along the spiral: base + absolute sine arches
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const archAmp = 18;
      const arches = 4;
      const archShape = Math.abs(Math.sin(arches * theta));
      return base + archAmp * archShape;
    },
  },
  {
    name: "Stage 9 — Renaissance Italy",
    year: "1490 CE",
    location: "Florentine Studios",
    palette: {
      bg: [18, 10, 18],
      spiral: [235, 205, 165],
      portal: [255, 235, 200],
    },
    musicHint: "Harpsichord patterns, mechanical ticks",
    enemyTint: [200, 150, 90],
    enemyType: "itInventor",
    enemyCount: 10,
    enemyOffsets: [-30, -10, 10, 30],
    shardCount: 11,
    difficulty: { gravityScale: 1.2, runSpeedScale: 1.16, enemySpeedScale: 1.25 },
    // Da Vinci curves: spiral plus layered smooth waves
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const wave1 = 16 * Math.sin(2 * theta);
      const wave2 = 10 * Math.sin(4 * theta + Math.PI / 4);
      return base + wave1 + wave2;
    },
  },
  {
    name: "Stage 10 — 17th Century Britain",
    year: "1620 CE",
    location: "Coasts of Britain",
    palette: {
      bg: [8, 12, 20],
      spiral: [190, 200, 210],
      portal: [255, 245, 190],
    },
    musicHint: "Fiddles over rolling sea drums",
    enemyTint: [170, 150, 120],
    enemyType: "britMusketeer",
    enemyCount: 10,
    enemyOffsets: [-40, -20, 0, 20, 40],
    shardCount: 12,
    difficulty: { gravityScale: 1.22, runSpeedScale: 1.18, enemySpeedScale: 1.28 },
    // Rolling waves: spiral with compound sine “sea” wobble
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const mainWave = 20 * Math.sin(1.5 * theta);
      const chop = 6 * Math.sin(5 * theta);
      return base + mainWave + chop;
    },
  },
  {
    name: "Stage 11 — Modern America",
    year: "1985 CE",
    location: "Neon Freeways",
    palette: {
      bg: [6, 10, 18],
      spiral: [160, 200, 240],
      portal: [255, 80, 80],
    },
    musicHint: "Synth bass, freeway hum, snares",
    enemyTint: [255, 170, 90],
    enemyType: "usSkater",
    enemyCount: 11,
    enemyOffsets: [-35, -15, 15, 35],
    shardCount: 13,
    difficulty: { gravityScale: 1.24, runSpeedScale: 1.2, enemySpeedScale: 1.32 },
    // Freeway cloverleaf: repeating ramp (sawtooth) pattern
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const period = Math.PI / 2;
      const local = theta % period;
      const ramp = local / period;
      const buildingAmp = 30;
      return base + buildingAmp * ramp;
    },
  },
  {
    name: "Stage 12 — Future Japan",
    year: "2188 CE",
    location: "Neo Tokyo Skyline",
    palette: {
      bg: [4, 6, 16],
      spiral: [200, 80, 255],
      portal: [120, 255, 200],
    },
    musicHint: "Fast arps, city pop ghosts, glitch kicks",
    enemyTint: [255, 120, 200],
    enemyType: "jpMech",
    enemyCount: 12,
    enemyOffsets: [-40, -20, 0, 20, 40],
    shardCount: 14,
    difficulty: { gravityScale: 1.28, runSpeedScale: 1.25, enemySpeedScale: 1.38 },
    // Neon starburst: spiral with high-frequency spikes
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const spikeAmp = 26;
      const spikes = 7;
      return base + spikeAmp * Math.sin(spikes * theta);
    },
  },
  {
    name: "Final Stage — Chrono Core",
    year: "???",
    location: "The Broken Spiral",
    palette: {
      bg: [6, 4, 12],
      spiral: [240, 120, 255],
      portal: [120, 255, 220],
    },
    musicHint: "Fractured time core, glitch choir",
    enemyTint: [255, 240, 180],
    enemyType: "bossChaos",
    enemyCount: 1,
    enemyOffsets: [0],
    shardCount: 0,
    difficulty: { gravityScale: 1.35, runSpeedScale: 1.28, enemySpeedScale: 1.5 },
    isPulseLevel: true,
    pulseIntervalFrames: 2 * 60,
    pulseSpeed: 0.13,
    // Four clearly separated safe pads so they appear around the spiral
    safeZones: [
      { thetaStart: 1.25 * Math.PI, thetaEnd: 1.55 * Math.PI },
      { thetaStart: 2.9 * Math.PI, thetaEnd: 3.2 * Math.PI },
      { thetaStart: 4.55 * Math.PI, thetaEnd: 4.85 * Math.PI },
      { thetaStart: 6.2 * Math.PI, thetaEnd: 6.5 * Math.PI },
    ],
    // Wild, unstable curve for the finale
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const chaos = 50 * Math.sin(3 * theta + Math.sin(theta * 2));
      return base + chaos;
    },
  },
  {
    name: "Chrono Boss — Time Warden",
    year: "???",
    location: "Heart of the Nexus",
    palette: {
      bg: [4, 2, 10],
      spiral: [255, 200, 120],
      portal: [120, 255, 200],
    },
    musicHint: "Unknown entity stirring...",
    enemyTint: [255, 180, 200],
    enemyType: "bossWarden",
    enemyCount: 1,
    enemyOffsets: [0],
    shardCount: 0,
    difficulty: { gravityScale: 1.2, runSpeedScale: 1.32, enemySpeedScale: 1.6 },
    isCoreBossLevel: true,
    bossDurationFrames: 60 * 60,
    bossMaxPull: TIME_WARDEN_PULL_MAX,
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const ripple = 34 * Math.sin(2.2 * theta + Math.sin(theta));
      // Keep the full path shape here; the collapse will be handled by a growing
      // core hazard instead of scaling the whole spiral down.
      return Math.max(0, base + ripple);
    },
  },
];

const levelMusicFiles = [
  "assets/01-Caveman-Quest.wav",
  "assets/02-Temple-of-Hanuman.wav",
  "assets/03-Pharaohs-Tomb.wav",
  "assets/04-Minotaurs-Labyrinth.wav",
  "assets/05-March-of-the-Legions.wav",
  "assets/06-Golden-Mosaics.wav",
  "assets/07-Dynasty-of-Silk.wav",
  "assets/08-Paladins-March.wav",
  "assets/09-Florentine-Dawn.wav",
  "assets/10-The-Globe-Awakens.wav",
  "assets/11-City-of-Tomorrow.wav",
  "assets/12-Chrome-Sakura.wav",
  "assets/13-Temporal-Collapse.wav",
  "assets/14-Event-Horizon.wav",
];

const sfxFiles = {
  hit: "assets/Time-Glitch-Moment.wav",
  jump: "assets/Jump-Platform-Leap.wav",
  warp: "assets/Time-Warp.wav",
};

const CHRONO_CORE_INDEX = levels.length - 2; // Final Stage — Chrono Core
const BOSS_LEVEL_INDEX = levels.length - 1; // Time Warden
const BOSS_SHARD_GOAL = 60;
const DOUBLE_JUMP_SHARD_THRESHOLD = 30;
const INVULN_SHARD_THRESHOLD = 15;
const FREEZE_SHARD_THRESHOLD = 45;
const INVULN_DURATION = 60; // frames
const FREEZE_DURATION = 120; // frames
const INVULN_COOLDOWN_FRAMES = 15 * 60; // 15 seconds at 60fps
const FREEZE_COOLDOWN_FRAMES = 30 * 60; // 30 seconds at 60fps
const EXTRA_LIFE_SHARD_STEP = 60;

let invulnUnlocked = false;
let freezeUnlocked = false;
let doubleJumpUnlocked = false;
let extraLivesAwarded = 0;
let unlockMessage = "";
let unlockMessageTimer = 0;

const enemies = [];
const shards = [];
let globalShardTotal = 0;
let invulnFrames = 0;
let freezeFrames = 0;
let invulnCooldown = 0;
let freezeCooldown = 0;
let pulseActive = false;
let pulseHeadTheta = 0;
let pulseCooldown = 0;
let bossPullOffset = 0;
let bossDurationTotal = LEVEL_TIME_LIMIT_FRAMES;
let currentMusic = null;
const musicCache = [];
const musicLoadState = [];
let musicMuted = false;
const sfxCache = {};

// --- Helpers for current level & platform curve ---

function currentLevelObj() {
  return levels[currentLevel % levels.length];
}

function updateMaxThetaForCurrentLevel() {
  const level = currentLevelObj();
  if (level?.isCoreBossLevel) {
    maxTheta = BOSS_MAX_THETA;
  } else {
    maxTheta = BASE_MAX_THETA;
  }
}

function updateBossCamera(level) {
  if (!level?.isCoreBossLevel) {
    bossCameraScale = 1;
    return;
  }

  const targetScreenR = Math.min(width, height) * 0.35;
  const playerWorldR = player ? player.getR() : spiralA * 2 * Math.PI;
  const minWorldR = 80;
  const clampedWorldR = Math.max(playerWorldR, minWorldR);
  const desiredScale = targetScreenR / clampedWorldR;
  const clampedScale = constrain(desiredScale, 0.2, 1);

  bossCameraScale = lerp(bossCameraScale, clampedScale, 0.12);
}

// Map polar world coordinates to screen coordinates, allowing us to visually
// "zoom" the Chaos Core boss stage without altering physics. For the boss, the
// scale follows the player's distance so the core stays dominant while gameplay
// still uses full world-space distances.
function worldToScreen(theta, r) {
  const level = currentLevelObj();

  const scale = level?.isCoreBossLevel ? bossCameraScale : 1;
  const drawR = r * scale;

  return {
    x: centerX + drawR * Math.cos(theta),
    y: centerY + drawR * Math.sin(theta),
  };
}

// Growing core radius for the Time Warden fight
function getBossCoreRadius() {
  const base = 40; // initial hazard size
  const extra = 200; // growth over the fight

  const level = currentLevelObj();
  if (!level || !level.isCoreBossLevel) return base;

  const t = bossPullOffset; // 0 → 1 as the timer drains
  return base + extra * t;
}

// Helper: the outer escape portal for the core boss fight
function getBossExit() {
  // Place the exit bubble near the far end of the visible path but keep it reachable.
  const theta = Math.max(maxTheta - Math.PI * 0.75, 2 * Math.PI);
  let r = platformR(theta);

  const level = currentLevelObj();
  if (level && level.isCoreBossLevel) {
    const coreR = getBossCoreRadius();
    if (r < coreR + 100) {
      r = coreR + 100;
    }
  }

  return { theta, r };
}

// Safe-ish respawn point when tagged by boss hazards
function getBossRespawn() {
  let theta = 3 * Math.PI; // a few loops out
  theta = constrain(theta, 0, maxTheta);

  let r = platformR(theta);
  const coreR = getBossCoreRadius();
  if (r < coreR + 80) {
    r = coreR + 80;
  }

  return { theta, r };
}

function platformR(theta) {
  return currentLevelObj().platformCurve(theta);
}

function stopCurrentMusic() {
  if (currentMusic) {
    currentMusic.stop();
    currentMusic = null;
  }
}

function playLevelMusic(idx) {
  if (musicMuted) return;
  if (typeof loadSound !== "function") return;

  const file = levelMusicFiles[idx];
  stopCurrentMusic();
  if (!file) return;

  const cached = musicCache[idx];
  if (cached) {
    cached.setLoop(true);
    cached.setVolume(0.65);
    if (!cached.isPlaying()) {
      cached.play();
    }
    currentMusic = cached;
    return;
  }

  if (musicLoadState[idx] === "loading") return;
  musicLoadState[idx] = "loading";

  musicCache[idx] = loadSound(
    file,
    (snd) => {
      musicCache[idx] = snd;
      musicLoadState[idx] = "ready";
      snd.setLoop(true);
      snd.setVolume(0.65);
      currentMusic = snd;
      snd.play();
    },
    () => {
      musicCache[idx] = null;
      musicLoadState[idx] = "error";
    }
  );
}

function playSfx(key) {
  if (typeof loadSound !== "function") return;
  const file = sfxFiles[key];
  if (!file) return;

  const cached = sfxCache[key];

  // If a previous load errored, don't keep retrying every frame.
  if (cached === "error") return;

  // While a sound is loading, skip until the async load finishes.
  if (cached === "loading") return;

  if (cached && typeof cached.play === "function") {
    cached.stop();
    cached.setVolume(0.8);
    cached.play();
    return;
  }

  // Kick off an async load and mark as loading to avoid undefined cache usage.
  sfxCache[key] = "loading";
  loadSound(
    file,
    (snd) => {
      sfxCache[key] = snd;
      snd.setVolume(0.8);
      snd.play();
    },
    () => {
      sfxCache[key] = "error";
    }
  );
}

// Find the closest inner spiral ring along the same radial direction.
// Returns {theta, r} or null when nothing suitable is found.
function findInnerRing(theta, currentR) {
  const baseAngle = ((theta % TWO_PI) + TWO_PI) % TWO_PI;

  let best = null;
  let bestDiff = Infinity;
  const maxJumpGap = 80; // maximum inward snap distance

  for (let t = baseAngle; t <= maxTheta; t += TWO_PI) {
    const ringR = platformR(t);
    if (ringR < currentR) {
      const diff = currentR - ringR;
      if (diff < maxJumpGap && diff < bestDiff) {
        bestDiff = diff;
        best = { theta: t, r: ringR };
      }
    }
  }

  return best;
}

// --- Player ---

class Player {
  constructor() {
    const level = currentLevelObj();
    // Start near the center for the core boss, otherwise partway out
    this.theta = level?.isCoreBossLevel ? 2 * Math.PI : maxTheta * START_THETA_FACTOR;
    this.prevTheta = this.theta;
    this.rVel = 0;
    this.jumpStrength = -4; // toned-down inward impulse
    this.maxOutwardSpeed = 3; // cap falling speed
    this.onGround = false;
    this.radius = 14;
    this.coyoteFrames = 0;
    this.movingDir = 0; // -1 left, 1 right, 0 idle
    this.facingDir = 1; // remembered facing when idle
    this.doubleJumpReady = false;
    this.airJumpUsed = false;
    this.jumpHeld = false;
    this.downHeld = false;
    this.seekingInnerRing = false;

    // Climb animation state
    this.climbAnimating = false;
    this.climbFromR = 0;
    this.climbToR = 0;
    this.climbFromTheta = 0;
    this.climbToTheta = 0;
    this.climbFrames = 14;
    this.climbTimer = 0;

    // Drop animation state
    this.dropAnimating = false;
    this.dropFromR = 0;
    this.dropToR = 0;
    this.dropFromTheta = 0;
    this.dropToTheta = 0;
    this.dropAnimFrames = 16;
    this.dropAnimTimer = 0;

    // Time-warp animation when reaching the core
    this.warpAnimating = false;
    this.warpTimer = 0;
    this.warpDuration = 180; // 3 seconds at 60fps
    this.warpStartR = 0;

    const initialR = platformR(this.theta);
    this.r = initialR;
    const startPos = worldToScreen(this.theta, initialR);
    this.x = startPos.x;
    this.y = startPos.y;
  }

  update() {
    const level = currentLevelObj();
    const gravity = 0.22 * (level.difficulty?.gravityScale ?? 1); // radial outward acceleration
    const runSpeed = 0.035 * (level.difficulty?.runSpeedScale ?? 1); // scaled per-level pace

    // If we're in a time-warp animation, override normal physics
    if (this.warpAnimating) {
      this.updateWarpAnimation();
      return;
    }

    // Handle climb tween before normal physics
    if (this.climbAnimating) {
      const jumpKeyDown =
        keyIsDown(88) || keyIsDown(UP_ARROW) || keyIsDown(32); // X, Up, or Space
      const downKeyDown =
        keyIsDown(DOWN_ARROW) || keyIsDown(67) || keyIsDown(18) || keyIsDown(90); // Down, C, Alt, Z

      this.jumpHeld = jumpKeyDown;
      this.downHeld = downKeyDown;

      this.climbTimer--;
      let t = 1 - this.climbTimer / this.climbFrames;
      t = constrain(t, 0, 1);
      const eased = t * t * (3 - 2 * t);

      const theta = this.climbToTheta;
      const r = lerp(this.climbFromR, this.climbToR, eased);

      this.theta = theta;
      this.r = r;
      this.onGround = false;
      this.rVel = 0;
      this.coyoteFrames = 0;

      const climbPos = worldToScreen(theta, r);
      this.x = climbPos.x;
      this.y = climbPos.y;

      if (this.climbTimer <= 0) {
        this.climbAnimating = false;
        const targetR = platformR(theta);
        this.r = targetR;
        const targetPos = worldToScreen(theta, targetR);
        this.x = targetPos.x;
        this.y = targetPos.y;
        this.onGround = true;
        this.coyoteFrames = 6;
        this.airJumpUsed = false;
      }

      return;
    }

    // Handle animated drop tween before normal physics
    if (this.dropAnimating) {
      const jumpKeyDown =
        keyIsDown(88) || keyIsDown(UP_ARROW) || keyIsDown(32); // X, Up, or Space
      const downKeyDown =
        keyIsDown(DOWN_ARROW) || keyIsDown(67) || keyIsDown(18) || keyIsDown(90); // Down, C, Alt, Z

      this.jumpHeld = jumpKeyDown;
      this.downHeld = downKeyDown;

      this.dropAnimTimer--;
      let t = 1 - this.dropAnimTimer / this.dropAnimFrames;
      t = constrain(t, 0, 1);
      const eased = t * t * (3 - 2 * t); // smoothstep

      const theta = this.dropToTheta;
      const r = lerp(this.dropFromR, this.dropToR, eased);

      this.theta = theta;
      this.r = r;
      this.onGround = false;
      this.rVel = 0;
      this.coyoteFrames = 0;

      const dropPos = worldToScreen(theta, r);
      this.x = dropPos.x;
      this.y = dropPos.y;

      if (this.dropAnimTimer <= 0) {
        this.dropAnimating = false;

        const targetR = platformR(theta);
        this.r = targetR;
        const targetPos = worldToScreen(theta, targetR);
        this.x = targetPos.x;
        this.y = targetPos.y;

        this.onGround = true;
        this.coyoteFrames = 6;
        this.airJumpUsed = false;
      }

      return; // skip normal physics while tweening
    }

    // Track previous theta for movement direction
    this.prevTheta = this.theta;
    this.seekingInnerRing = false;

    // Angular movement: LEFT/RIGHT run along the curve
    let desiredTheta = this.theta;
    if (keyIsDown(LEFT_ARROW)) {
      desiredTheta -= runSpeed;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      desiredTheta += runSpeed;
    }

    // Clamp desired theta within spiral limits
    desiredTheta = constrain(desiredTheta, 0, maxTheta);

    // Block stepping into vertical walls when grounded
    const currentRForWalls = this.getR();
    const band = 18;
    const desiredR = platformR(desiredTheta);
    const steepWall = this.onGround && Math.abs(desiredR - currentRForWalls) > band;
    if (!steepWall) {
      this.theta = desiredTheta;
    }

    // Determine movement direction for animation
    const deltaTheta = this.theta - this.prevTheta;
    if (deltaTheta > 0.0001) {
      this.movingDir = 1;
      this.facingDir = 1;
    } else if (deltaTheta < -0.0001) {
      this.movingDir = -1;
      this.facingDir = -1;
    } else {
      this.movingDir = 0;
    }

    // Apply radial gravity (outward)
    this.rVel += gravity;

    // Integrate radius toward/away from the platform curve
    let targetR = platformR(this.theta);
    let currentR = this.getR();

    // Simple "ground band" around curve
    const projectedR = currentR + this.rVel;
    const withinBand = projectedR >= targetR - band && projectedR <= targetR + band;
    const crossesInnerPlatform = this.rVel < 0 && currentR > targetR && projectedR <= targetR;
    const crossesOuterPlatform = this.rVel > 0 && currentR < targetR && projectedR >= targetR;

    // Snap when landing outward within the band, or when a jump crosses the platform plane
    const shouldSnap =
      (withinBand && this.rVel >= 0) ||
      crossesInnerPlatform ||
      crossesOuterPlatform;

    if (shouldSnap) {
      currentR = targetR;
      this.rVel = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
      currentR = projectedR;
    }

    // On the Time Warden stage, once grounded, always stay welded to the
    // shrinking path so the collapse can't jiggle the traveler off-lane.
    if (currentLevelObj().isCoreBossLevel && this.onGround) {
      currentR = targetR;
      this.rVel = 0;
    }

    // Coyote time: brief grace period after leaving a platform
    if (this.onGround) {
      this.coyoteFrames = 6;
      this.doubleJumpReady = globalShardTotal >= DOUBLE_JUMP_SHARD_THRESHOLD;
      this.airJumpUsed = false;
    } else if (this.coyoteFrames > 0) {
      this.coyoteFrames--;
    }

    // Jump / drop controls
    const jumpKeyDown =
      keyIsDown(88) || keyIsDown(UP_ARROW) || keyIsDown(32); // X, Up, or Space
    const downKeyDown =
      keyIsDown(DOWN_ARROW) || keyIsDown(67) || keyIsDown(18) || keyIsDown(90); // Down, C, Alt, or Z

    const jumpPressed = jumpKeyDown && !this.jumpHeld;
    const downPressed = downKeyDown && !this.downHeld;

    if (this.coyoteFrames > 0 && jumpPressed) {
      playSfx("jump");
      this.rVel = this.jumpStrength;
      this.onGround = false;
      this.coyoteFrames = 0;
      this.airJumpUsed = false;
      currentR += this.rVel;
    } else if (!this.onGround && this.doubleJumpReady && !this.airJumpUsed && jumpPressed) {
      // Air jump only after earning enough shards
      const innerRing = findInnerRing(this.theta, currentR);
      if (innerRing) {
        playSfx("jump");
        this.airJumpUsed = true;
        this.startClimbToInnerRing(innerRing.theta, innerRing.r);
        this.jumpHeld = jumpKeyDown;
        this.downHeld = downKeyDown;
        return;
      }
      playSfx("jump");
      this.rVel = this.jumpStrength * 1.6;
      this.airJumpUsed = true;
      currentR += this.rVel;
    }

    if (downPressed && this.onGround) {
      // Attempt to snap to the next visible outer loop; if none exists, do nothing.
      if (this.snapToOuterSpiral()) {
        this.jumpHeld = jumpKeyDown;
        this.downHeld = downKeyDown;
        return;
      }
    }

    this.jumpHeld = jumpKeyDown;
    this.downHeld = downKeyDown;

    // Cap outward speed so drops don't rocket off the curve
    if (this.rVel > this.maxOutwardSpeed) {
      this.rVel = this.maxOutwardSpeed;
    }

    // On the core boss stage, clamp to the boundary so the spiral feels endless;
    // on other stages, falling past the edge resets the player.
    const stage = currentLevelObj();
    const outerLimit = platformR(maxTheta) + 80;
    if (currentR > outerLimit) {
      if (stage.isCoreBossLevel) {
        currentR = outerLimit;
        this.rVel = 0;
      } else {
        resetPlayerToStart();
        return;
      }
    }

    // Update position from polar with camera mapping for the boss stage
    const pos = worldToScreen(this.theta, currentR);
    this.x = pos.x;
    this.y = pos.y;
    this.r = currentR;

    // Stage-specific win/lose triggers
    const currentStage = currentLevelObj();
    if (currentStage.isCoreBossLevel) {
      const bossExit = getBossExit();
      const nearExit =
        this.theta >= bossExit.theta - 0.3 && Math.abs(currentR - bossExit.r) <= 40;
      if (nearExit) {
        handleBossVictory();
        return;
      }

      const coreR = getBossCoreRadius();
      if (currentR < coreR) {
        loseLife();
        return;
      }
    } else if (currentR < 35) {
      // For stages 1–13 (everything except the Time Warden), play a time-warp
      // animation instead of immediately warping.
      if (!this.warpAnimating) {
        this.startWarpAnimation();
      }
      return;
    }
  }

  startWarpAnimation() {
    if (this.warpAnimating) return;
    this.warpAnimating = true;
    this.warpTimer = this.warpDuration;
    this.warpStartR = this.getR();
    this.rVel = 0;
    this.onGround = false;
    this.coyoteFrames = 0;
    playSfx("warp");
  }

  updateWarpAnimation() {
    if (!this.warpAnimating) return;

    this.warpTimer--;
    const t = constrain(1 - this.warpTimer / this.warpDuration, 0, 1);

    // Spin quickly and spiral inward to the core
    this.theta += 0.45;
    const r = lerp(this.warpStartR, 10, t);
    this.r = r;

    const pos = worldToScreen(this.theta, r);
    this.x = pos.x;
    this.y = pos.y;

    if (this.warpTimer <= 0) {
      this.warpAnimating = false;
      warpToNextLevel();
    }
  }

  startClimbToInnerRing(targetTheta, targetR) {
    this.climbAnimating = true;
    this.climbFromR = this.getR();
    this.climbToR = targetR;
    this.climbFromTheta = this.theta;
    this.climbToTheta = targetTheta;
    this.climbTimer = this.climbFrames;

    this.onGround = false;
    this.rVel = 0;
    this.coyoteFrames = 0;
    this.seekingInnerRing = false;
  }

  snapToOuterSpiral() {
    const baseAngle = ((this.theta % TWO_PI) + TWO_PI) % TWO_PI;
    const currentR = this.getR();
    const level = currentLevelObj();

    let bestTheta = null;
    let bestR = null;

    const isBoss = level && level.isCoreBossLevel;

    const maxLoops = isBoss ? 30 : 6; // how many rings to scan (covers full boss path)
    const minGap = isBoss ? 8 : 25; // ignore micro drops
    const maxGap = isBoss ? 260 : 80; // allow big jumps on boss

    for (let k = 1; k <= maxLoops; k++) {
      const candidateTheta = baseAngle + TWO_PI * k;
      if (!isBoss && candidateTheta > maxTheta) break;

      const ringR = platformR(candidateTheta);
      if (ringR > currentR) {
        const diff = ringR - currentR;
        if (diff >= minGap && diff <= maxGap) {
          bestTheta = candidateTheta;
          bestR = ringR;
          break;
        }
      }
    }

    if (bestTheta == null) {
      return false;
    }

    this.dropAnimating = true;
    this.dropFromR = currentR;
    this.dropToR = bestR;
    this.dropFromTheta = this.theta;
    this.dropToTheta = bestTheta;
    this.dropAnimTimer = this.dropAnimFrames;

    this.onGround = false;
    this.rVel = 0;
    this.coyoteFrames = 0;
    this.airJumpUsed = false;

    // On the Time Warden stage, every intentional drop accelerates the collapse.
    if (currentLevelObj().isCoreBossLevel) {
      bossCollapseRate *= 2;
      bossCollapseRate = min(bossCollapseRate, 16);
    }

    return true;
  }

  getR() {
    return typeof this.r === "number" ? this.r : platformR(this.theta);
  }

  draw() {
    // Angle from center to player (radial outward direction)
    const radialAngle = Math.atan2(this.y - centerY, this.x - centerX);

    push();
    translate(this.x, this.y);

    // --- SHADOW (world space, before rotating character) ---
    const shadowDist = 10;
    const sx = Math.cos(radialAngle) * shadowDist;
    const sy = Math.sin(radialAngle) * shadowDist;
    noStroke();
    fill(0, 60);
    ellipse(sx, sy, 20, 6);

    // Feet point outward
    rotate(radialAngle - HALF_PI);

    // Flip sprite so he faces the last movement direction along the tangent
    if (this.facingDir < 0) {
      scale(-1, 1);
    }

    // Anchor the character so local (0,0) is at his feet on the platform
    const FOOT_ANCHOR = 26;
    translate(0, -FOOT_ANCHOR);

    // Small lift when airborne
    if (!this.onGround) {
      translate(0, -2);
    }

    // Climb pose: crouch then pop up during inner-ring hop
    if (this.climbAnimating) {
      const climbPhase = 1 - this.climbTimer / this.climbFrames;
      const crouch = climbPhase < 0.5
        ? map(climbPhase, 0, 0.5, 1.0, 0.7)
        : map(climbPhase, 0.5, 1, 0.7, 1.0);
      const climbOffset = climbPhase < 0.5
        ? map(climbPhase, 0, 0.5, 8, -4)
        : map(climbPhase, 0.5, 1, -4, 0);
      translate(0, climbOffset);
      scale(1, crouch);
    }

    // Drop dust / warp trails
    if (this.dropAnimating) {
      const progress = 1 - this.dropAnimTimer / this.dropAnimFrames; // 0→1
      const alpha = 120 * (1 - progress); // fade out

      noStroke();
      fill(255, 255, 255, alpha);

      const baseY = 12; // around where the feet are
      for (let i = -1; i <= 1; i++) {
        const px = i * 5;
        const py = baseY + 4 + progress * 6;
        ellipse(px, py, 4 + progress * 2, 4 + progress * 2);
      }

      // Optional warp streak directly under feet
      fill(180, 240, 255, alpha);
      rectMode(CENTER);
      rect(0, baseY + 2 + progress * 4, 14, 3 + progress * 3, 2);
    }

    // --- chubby bearded runner ---
    let runCycle = 0;
    if (this.movingDir !== 0 && this.onGround) {
      runCycle = (frameCount * 0.35) % TWO_PI;
    }
    const legSwing = Math.sin(runCycle) * 5;
    const armSwing = Math.sin(runCycle + Math.PI) * 6;
    const bob = this.onGround ? Math.sin(runCycle * 2) * 1.5 : 0;

    translate(0, bob);

    const headH = 18;
    const headW = 16;
    const bodyW = 18;
    const bodyH = 16;
    const legLen = 12;

    // Legs (yellow boots)
    stroke(0);
    strokeWeight(3);
    line(-4, 10, -4 + legSwing * 0.4, 10 + legLen);
    line(4, 10, 4 - legSwing * 0.4, 10 + legLen);

    noStroke();
    fill(250, 220, 80);
    ellipse(-4 + legSwing * 0.4, 10 + legLen + 2, 8, 5);
    ellipse(4 - legSwing * 0.4, 10 + legLen + 2, 8, 5);

    // Body (blue shirt)
    rectMode(CENTER);
    fill(80, 180, 255);
    rect(0, 4, bodyW, bodyH, 6);

    // Arms
    push();
    translate(-bodyW * 0.4, 2);
    rotate(radians(armSwing * 1.5));
    fill(80, 180, 255);
    rect(0, 0, 10, 6, 3);
    fill(240, 210, 180);
    ellipse(7, 0, 6, 6);
    pop();

    push();
    translate(bodyW * 0.4, 2);
    rotate(radians(-armSwing * 1.5));
    fill(80, 180, 255);
    rect(0, 0, 10, 6, 3);
    fill(240, 210, 180);
    ellipse(7, 0, 6, 6);
    pop();

    // Head with beard and hair tufts
    push();
    translate(0, -8);
    fill(20, 20, 30);
    ellipse(0, -4, headW + 6, headH + 4);

    fill(240, 210, 180);
    ellipse(0, -4, headW, headH);

    fill(20, 20, 30);
    arc(0, -2, headW, headH, 0, Math.PI, CHORD);

    const eyeOffset = 4;
    const dirBias = this.facingDir * 1.5;
    fill(0);
    ellipse(-eyeOffset + dirBias, -6, 3, 3);
    ellipse(eyeOffset + dirBias, -6, 3, 3);

    stroke(0);
    strokeWeight(2);
    line(-6, -8, -3, -7);
    line(3, -7, 6, -8);

    stroke(20, 20, 30);
    strokeWeight(3);
    line(-3, -14, -3, -18);
    line(3, -14, 3, -18);
    pop();

    // Invulnerability glow
    if (invulnFrames > 0) {
      noFill();
      stroke(120, 255, 220, 200);
      strokeWeight(3);
      ellipse(0, -4, 32, 32);
    }

    pop();
  }
}

// --- Enemy ---

class Enemy {
  constructor(theta, offset, subtype = null) {
    this.theta = theta;
    this.offset = offset;
    this.subtype = subtype;
    this.dir = random([1, -1]);
    this.baseSpeed = random(0.005, 0.015);
    this.speed = this.baseSpeed * this.dir;
    this.prevTheta = this.theta;
    this.movingDir = 0;
    this.facingDir = 1;
    this.rollAngle = random(TWO_PI);
    this.radius = 13;
    this.pauseTimer = 0;
    this.homeTheta = theta;
    this.thetaRange = random(Math.PI * 0.6, Math.PI * 1.2);
    this.isPhasedOut = false;
    this.phaseTimer = Math.floor(random(40, 100));
    this.isBuffed = false;
    this.hitboxBoost = 0;
  }

  update(bearerThetas = []) {
    const level = currentLevelObj();
    const type = this.subtype || level.enemyType;
    const enemySpeedScale = level.difficulty?.enemySpeedScale ?? 1;
    let speedMag = this.baseSpeed * enemySpeedScale;
    this.isBuffed = false;
    this.hitboxBoost = 0;

    if (type === "hoplite") {
      speedMag *= 1.4;
    } else if (type === "ikon") {
      speedMag *= 0.85;
    } else if (type === "frKnight") {
      speedMag *= 1.05;
    } else if (type === "itInventor") {
      speedMag *= 1.05;
    } else if (type === "britMusketeer") {
      speedMag *= 0.9;
    } else if (type === "usSkater") {
      speedMag *= 1.5;
    } else if (type === "jpMech") {
      speedMag *= 1.6;
    } else if (type === "brahminSage") {
      speedMag *= 0.7;
    } else if (type === "monkeyThief") {
      speedMag *= 1.05;
    } else if (type === "mummyWalker") {
      speedMag *= 0.7;
    } else if (type === "ankhWisp") {
      speedMag *= 1.6;
    } else if (type === "itApprentice") {
      speedMag *= 0.85;
    } else if (type === "flyingContraption") {
      speedMag *= 0.95;
    } else if (type === "deckSailor") {
      speedMag *= 1.05;
    } else if (type === "cannonball") {
      speedMag *= 2.0;
    } else if (type === "freewayCar") {
      speedMag *= 1.6;
    } else if (type === "neonDrone") {
      speedMag *= 0.95;
    } else if (type === "jpDrone") {
      speedMag *= 1.45;
    } else if (type === "jpHoloGuard") {
      speedMag *= 0.8;
    } else if (type === "bossChaos") {
      speedMag *= 1.8;
    } else if (type === "bossWarden") {
      speedMag *= 1.7;
    } else if (type === "bossMini") {
      speedMag *= 1.9;
    } else if (type === "harpy") {
      speedMag *= 1.15;
    } else if (type === "rollingAmphora") {
      speedMag *= 0.6;
    } else if (type === "standardBearer") {
      speedMag *= 0.95;
    } else if (type === "rollingShield") {
      speedMag *= 0.85;
    } else if (type === "paperCrane") {
      speedMag *= 1.0;
    } else if (type === "palaceGuard") {
      speedMag *= 0.8;
    } else if (type === "censerSmoke") {
      speedMag *= 0.9;
    } else if (type === "mosaicShard") {
      speedMag *= 1.1;
    } else if (type === "warHorse") {
      speedMag *= 1.35;
    } else if (type === "bannerWaver") {
      speedMag *= 0.85;
    }

    this.prevTheta = this.theta;

    // Buff from nearby standard bearers
    if (type !== "standardBearer" && bearerThetas.length > 0) {
      const nearBanner = bearerThetas.some((t) => {
        const angleGap = Math.abs(((this.theta % TWO_PI) + TWO_PI - (t % TWO_PI))) % TWO_PI;
        const wrappedGap = Math.min(angleGap, TWO_PI - angleGap);
        return wrappedGap < 0.6;
      });
      if (nearBanner) {
        speedMag *= 1.12;
        this.isBuffed = true;
        this.hitboxBoost = 2;
      }
    }

    // Idle/chant pauses for select enemies
    if (this.pauseTimer > 0) {
      this.pauseTimer--;
      speedMag = 0;
    } else {
      if (type === "brahminSage" && random() < 0.01) {
        this.pauseTimer = Math.floor(random(30, 60));
      }
      if (type === "mummyWalker" && random() < 0.005) {
        this.pauseTimer = Math.floor(random(12, 24));
      }
    }

    const thetaDelta = speedMag * this.dir;
    // Move along the curve
    this.theta = constrain(this.theta + thetaDelta, 0, maxTheta);

    let turned = false;

    if (this.theta <= 0 || this.theta >= maxTheta) {
      this.dir *= -1;
      turned = true;
    }

    if (type === "mummyWalker" && turned) {
      this.pauseTimer = Math.max(this.pauseTimer, Math.floor(random(10, 20)));
    }

    if (type === "rollingShield") {
      const range = Math.PI * 0.6;
      const minTheta = this.homeTheta - range * 0.5;
      const maxThetaLocal = this.homeTheta + range * 0.5;
      if (this.theta > maxThetaLocal) {
        this.theta = maxThetaLocal;
        this.dir = -1;
      } else if (this.theta < minTheta) {
        this.theta = minTheta;
        this.dir = 1;
      }
    }

    const deltaThetaSigned = this.theta - this.prevTheta;
    if (deltaThetaSigned > 0.0001) {
      this.movingDir = 1;
      this.facingDir = 1;
    } else if (deltaThetaSigned < -0.0001) {
      this.movingDir = -1;
      this.facingDir = -1;
    } else {
      this.movingDir = 0;
    }

    // Home-band oscillation for localized walkers
    if (type === "itApprentice") {
      if (this.theta > this.homeTheta + this.thetaRange) {
        this.dir = -1;
        this.theta = this.homeTheta + this.thetaRange;
      } else if (this.theta < this.homeTheta - this.thetaRange) {
        this.dir = 1;
        this.theta = this.homeTheta - this.thetaRange;
      }
    }

    if (type === "deckSailor" && (turned || random() < 0.01)) {
      this.offset = constrain(this.offset + random([-8, 8]), -18, 18);
    }

    if (type === "monkeyThief") {
      const angleGap = Math.abs(((player.theta % TWO_PI) + TWO_PI - (this.theta % TWO_PI))) % TWO_PI;
      const wrappedGap = Math.min(angleGap, TWO_PI - angleGap);
      if (wrappedGap < 0.8) {
        speedMag *= 1.6;
      }
    }

    if (type === "freewayCar") {
      speedMag *= 1 + Math.abs(this.offset) * 0.02;
    }

    if (type === "harpy") {
      const angleGap = Math.abs(((player.theta % TWO_PI) + TWO_PI - (this.theta % TWO_PI))) % TWO_PI;
      const wrappedGap = Math.min(angleGap, TWO_PI - angleGap);
      if (wrappedGap < 0.7) {
        speedMag *= 1.35;
      }
    }

    if (type === "paperCrane" && (turned || random() < 0.015)) {
      this.offset = constrain(this.offset + random([-6, 6]), -18, 18);
    }

    if (type === "palaceGuard") {
      const patrolRange = Math.PI * 0.35;
      if (this.theta > this.homeTheta + patrolRange * 0.5) {
        this.theta = this.homeTheta + patrolRange * 0.5;
        this.dir = -1;
        this.pauseTimer = Math.max(this.pauseTimer, 10);
      } else if (this.theta < this.homeTheta - patrolRange * 0.5) {
        this.theta = this.homeTheta - patrolRange * 0.5;
        this.dir = 1;
        this.pauseTimer = Math.max(this.pauseTimer, 10);
      }
    }

    if (type === "warHorse") {
      const angleGap = Math.abs(((player.theta % TWO_PI) + TWO_PI - (this.theta % TWO_PI))) % TWO_PI;
      const wrappedGap = Math.min(angleGap, TWO_PI - angleGap);
      const radialGap = Math.abs(player.getR() - platformR(this.theta));
      if (wrappedGap < 0.6 && radialGap < 30) {
        speedMag *= 1.7;
      }
    }

    if (type === "jpDrone" && random() < 0.01) {
      this.dir *= -1;
    }

    if (type === "jpHoloGuard") {
      this.phaseTimer--;
      if (this.phaseTimer <= 0) {
        this.isPhasedOut = !this.isPhasedOut;
        this.phaseTimer = Math.floor(random(60, 120));
      }
    }

    const baseR = platformR(this.theta);
    let offsetLimit = 6;
    if (
      [
        "ankhWisp",
        "flyingContraption",
        "deckSailor",
        "cannonball",
        "freewayCar",
        "neonDrone",
        "jpDrone",
        "jpHoloGuard",
        "paperCrane",
        "harpy",
      ].includes(type)
    ) {
      offsetLimit = 20;
    } else if (
      ["brahminSage", "monkeyThief", "itApprentice", "palaceGuard", "standardBearer", "rollingShield"].includes(type)
    ) {
      offsetLimit = 14;
    }
    const laneR = baseR + constrain(this.offset, -offsetLimit, offsetLimit);
    const rollingTypes = ["boulder", "rollingAmphora", "rollingShield", "cannonball"];
    const groundOffset = rollingTypes.includes(type) ? this.radius * 0.35 : 0;
    let radialWiggle = 0;

    // Slight behavior variations per enemy type, kept subtle so feet stay on the ground
    if (type === "scarab") {
      radialWiggle = 6 * Math.sin(frameCount * 0.2 + this.theta);
    } else if (type === "lotusOrb") {
      radialWiggle = 4 * Math.sin(frameCount * 0.15 + this.theta * 0.5);
    } else if (type === "lanternSpirit") {
      radialWiggle = 6 * Math.sin(frameCount * 0.17 + this.theta * 0.35);
      radialWiggle += 3 * Math.sin(frameCount * 0.11 + this.offset * 0.2);
    } else if (type === "brahminSage") {
      radialWiggle = 3 * Math.sin(frameCount * 0.12 + this.theta * 0.4);
    } else if (type === "monkeyThief") {
      radialWiggle = 8 * Math.sin(frameCount * 0.25 + this.theta * 0.7);
    } else if (type === "legionary") {
      if (turned) {
        radialWiggle += 4;
      }
      radialWiggle += 3 * Math.sin(frameCount * 0.3 + this.theta);
    } else if (type === "frKnight") {
      radialWiggle = 3 * Math.sin(frameCount * 0.18 + this.theta);
    } else if (type === "itInventor") {
      radialWiggle = 4 * Math.sin(frameCount * 0.22 + this.theta * 0.5);
    } else if (type === "itApprentice") {
      radialWiggle = 2 * Math.sin(frameCount * 0.2 + this.theta * 0.4);
    } else if (type === "flyingContraption") {
      radialWiggle = 8 * Math.sin(frameCount * 0.09 + this.theta * 0.4);
    } else if (type === "deckSailor") {
      radialWiggle = 3 * Math.sin(frameCount * 0.18 + this.theta * 0.6);
    } else if (type === "cannonball") {
      radialWiggle = 0;
    } else if (type === "usSkater") {
      radialWiggle = 3 * Math.sin(frameCount * 0.4 + this.theta);
    } else if (type === "freewayCar") {
      radialWiggle = 0;
    } else if (type === "neonDrone") {
      radialWiggle = 5 * Math.sin(frameCount * 0.22 + this.theta * 0.3);
    } else if (type === "jpMech") {
      radialWiggle = 4 * Math.sin(frameCount * 0.35 + this.theta * 1.2);
    } else if (type === "jpDrone") {
      const triPhase = (frameCount * 0.25 + this.theta) % TWO_PI;
      const tri = triPhase < Math.PI ? triPhase / Math.PI : 2 - triPhase / Math.PI;
      radialWiggle = 8 * (tri - 0.5);
    } else if (type === "jpHoloGuard") {
      radialWiggle = 4 * Math.sin(frameCount * 0.13 + this.theta * 0.6);
    } else if (type === "bossChaos") {
      radialWiggle = 10 * Math.sin(frameCount * 0.2 + this.theta * 1.2);
      radialWiggle += 6 * Math.sin(frameCount * 0.07 + this.offset);
    } else if (type === "bossWarden") {
      radialWiggle = 8 * Math.sin(frameCount * 0.16 + this.theta * 1.3);
      radialWiggle += 5 * Math.sin(frameCount * 0.11 + this.offset * 0.6);
    } else if (type === "bossMini") {
      radialWiggle = 6 * Math.sin(frameCount * 0.2 + this.theta * 1.5);
      radialWiggle += 4 * Math.sin(frameCount * 0.12 + this.offset * 0.8);
    } else if (type === "mummyWalker") {
      radialWiggle = 2 * Math.sign(Math.sin(frameCount * 0.5 + this.theta));
    } else if (type === "ankhWisp") {
      radialWiggle = 3 * Math.sin(frameCount * 0.4 + this.theta * 0.9);
    } else if (type === "ikon") {
      radialWiggle = 4 * Math.sin(frameCount * 0.12 + this.theta * 0.5);
    } else if (type === "harpy") {
      radialWiggle = 10 * Math.sin(frameCount * 0.18 + this.theta * 0.7);
    } else if (type === "rollingAmphora") {
      radialWiggle = 0;
    } else if (type === "standardBearer") {
      radialWiggle = 2 * Math.sin(frameCount * 0.14 + this.theta * 0.4);
    } else if (type === "rollingShield") {
      radialWiggle = 1 * Math.sin(frameCount * 0.22 + this.theta * 0.6);
    } else if (type === "paperCrane") {
      radialWiggle = 6 * Math.sin(frameCount * 0.2 + this.theta * 0.5);
    } else if (type === "palaceGuard") {
      radialWiggle = 2 * Math.sin(frameCount * 0.16 + this.theta * 0.4);
    } else if (type === "censerSmoke") {
      radialWiggle = 6 * Math.sin(frameCount * 0.18 + this.theta * 0.6);
    } else if (type === "mosaicShard") {
      radialWiggle = 9 * Math.sin(frameCount * 0.26 + this.theta * 0.9);
    } else if (type === "warHorse") {
      radialWiggle = 3 * Math.sin(frameCount * 0.2 + this.theta * 0.5);
    } else if (type === "bannerWaver") {
      radialWiggle = 4 * Math.sin(frameCount * 0.18 + this.theta * 0.45);
      this.hitboxBoost = Math.max(this.hitboxBoost, 4);
    }

    // Keep enemies attached to the platform lane with a small wiggle allowance
    const clampBand = 10;
    const radiusBase = laneR + groundOffset;
    const radius = constrain(radiusBase + radialWiggle, radiusBase - clampBand, radiusBase + clampBand);

    if (type === "mosaicShard" && random() < 0.05) {
      this.theta = constrain(this.theta + random([-0.05, 0.05]), 0, maxTheta);
    }

    // Track roll based on distance traveled along the curve
    const pathDistance = Math.abs(deltaThetaSigned) * baseR;
    const spinDir = deltaThetaSigned >= 0 ? 1 : -1;
    this.rollAngle = (this.rollAngle + spinDir * (pathDistance / Math.max(this.radius, 1))) % TWO_PI;

    const pos = worldToScreen(this.theta, radius);
    this.x = pos.x;
    this.y = pos.y;
    this.r = radius;

    // Store last applied speed for reference
    this.speed = speedMag * this.dir;
  }

  draw() {
    const level = currentLevelObj();
    const type = this.subtype || level.enemyType;
    const tint = level.enemyTint;
    const radialAngle = Math.atan2(this.y - centerY, this.x - centerX);

    push();
    translate(this.x, this.y);

    // Radial shadow cast outward from center
    const shadowDist = 8;
    const sx = Math.cos(radialAngle) * shadowDist;
    const sy = Math.sin(radialAngle) * shadowDist;
    noStroke();
    fill(0, 60);
    ellipse(sx, sy, 16, 5);

    // Orient so local +Y points outward from the center (feet away from center)
    rotate(radialAngle - HALF_PI);

    const needsFacing = ![
      "boulder",
      "lotusOrb",
      "lanternSpirit",
      "ikon",
      "bossChaos",
      "ankhWisp",
      "cannonball",
      "neonDrone",
      "rollingAmphora",
      "rollingShield",
      "censerSmoke",
      "mosaicShard",
    ].includes(type);
    if (needsFacing && this.facingDir < 0) {
      scale(-1, 1);
    }
    stroke(0);
    strokeWeight(3);
    fill(tint[0], tint[1], tint[2]);

    switch (type) {
      case "boulder":
        // Angry rolling boulder
        push();
        rotate(this.rollAngle);

        noStroke();
        fill(205, 120, 70);
        ellipse(0, 0, this.radius * 2, this.radius * 2);

        stroke(80, 40, 25);
        strokeWeight(3);
        noFill();
        ellipse(0, 0, this.radius * 2, this.radius * 2);

        // Plank/rock lines for roll readability
        stroke(60, 30, 15);
        line(-this.radius * 0.8, 0, this.radius * 0.8, 0);
        line(0, -this.radius * 0.8, 0, this.radius * 0.8);

        noStroke();
        fill(170, 90, 55);
        ellipse(-5, -4, 2, 2);
        ellipse(3, -6, 2, 2);
        ellipse(4, 2, 2, 2);

        fill(0);
        ellipse(-4, -3, 3, 3);
        ellipse(4, -3, 3, 3);
        stroke(0);
        strokeWeight(2);
        line(-7, -6, -2, -4);
        line(2, -4, 7, -6);
        noFill();
        arc(0, 2, 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        pop();
        break;
      case "rollingAmphora":
        // Tall vase rolling along its side
        push();
        rotate(this.rollAngle);
        noStroke();
        fill(190, 140, 90);
        ellipse(0, 0, this.radius * 1.2, this.radius * 2.2);
        fill(120, 80, 50);
        ellipse(0, -this.radius * 0.5, this.radius * 0.5, this.radius * 0.5);
        ellipse(0, this.radius * 0.5, this.radius * 0.8, this.radius * 0.5);
        stroke(80, 50, 30);
        strokeWeight(3);
        noFill();
        ellipse(0, 0, this.radius * 1.2, this.radius * 2.2);
        pop();
        break;
      case "neanderthal":
        // Club-wielding caveman that faces along the path
        translate(0, -12);

        // Legs
        stroke(0);
        strokeWeight(3);
        strokeCap(ROUND);
        line(-3, 10, -3, 16);
        line(3, 10, 3, 16);

        // Fur tunic
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        rectMode(CENTER);
        rect(0, 6, 18, 14, 4);

        // Head
        fill(230, 200, 170);
        ellipse(0, -2, 14, 16);

        // Brow and single eye toward facing direction
        stroke(0);
        strokeWeight(2);
        line(-6, -6, 2, -7);
        noStroke();
        fill(0);
        ellipse(2, -4, 3, 3);

        // Beard/jawline
        fill(60, 40, 30);
        arc(0, 0, 14, 12, 0, Math.PI, CHORD);

        // Stone club behind him
        push();
        translate(-8, 2);
        rotate(-0.6);
        fill(100, 80, 60);
        rect(0, 0, 14, 4, 2);
        fill(80, 60, 40);
        ellipse(7, 0, 6, 8);
        pop();
        break;
      case "lotusOrb":
        // Glowing orb / mandala spirit
        ellipse(0, 0, 20, 20);
        noFill();
        ellipse(0, 0, 28, 28);
        break;
      case "lanternSpirit":
        // Hanging paper lantern
        stroke(0);
        strokeWeight(2);
        line(0, -14, 0, -20);
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        ellipse(0, -4, 18, 22);
        fill(255, 240, 210);
        rectMode(CENTER);
        rect(0, -4, 18, 4, 2);
        break;
      case "paperCrane":
        // Origami bird glider
        translate(0, -6);
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        triangle(-10, 4, 0, -6, 10, 4);
        triangle(-6, 6, 0, 0, -2, 8);
        triangle(6, 6, 0, 0, 2, 8);
        break;
      case "palaceGuard":
        // Stationed guard pacing a short arc
        translate(0, -10);
        stroke(0);
        strokeWeight(3);
        line(-2, 10, -2, 16);
        line(2, 10, 2, 16);
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        rectMode(CENTER);
        rect(0, 4, 14, 16, 3);
        fill(230, 210, 180);
        ellipse(0, -6, 12, 10);
        stroke(0);
        strokeWeight(2);
        line(6, -2, 12, 6); // spear
        break;
      case "brahminSage":
        translate(0, -12);
        // Robe
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 6, 16, 18, 4);
        // Head and beard
        fill(240, 210, 180);
        ellipse(0, -4, 14, 14);
        fill(120, 80, 50);
        arc(0, -2, 12, 10, 0, Math.PI, CHORD);
        // Staff
        stroke(120, 80, 50);
        strokeWeight(3);
        line(-8, -2, -8, 12);
        noStroke();
        // Halo
        noFill();
        stroke(255, 230, 160);
        strokeWeight(2);
        ellipse(0, -10, 16, 8);
        break;
      case "monkeyThief":
        translate(0, -10);
        // Body
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 2, 12, 12, 3);
        // Head
        fill(200, 160, 120);
        ellipse(0, -6, 12, 10);
        fill(0);
        ellipse(-3, -7, 2, 2);
        ellipse(3, -7, 2, 2);
        // Tail
        noFill();
        stroke(60, 40, 30);
        strokeWeight(3);
        bezier(6, 6, 12, 6, 12, -6, 6, -6);
        break;
      case "scarab":
        // Beetle-ish silhouette
        ellipse(0, -2, 18, 14); // body
        rect(0, -9, 10, 6, 2); // head
        line(-10, 4, -4, 0);
        line(10, 4, 4, 0);
        break;
      case "mummyWalker":
        translate(0, -12);
        // Legs
        stroke(0);
        strokeWeight(3);
        strokeCap(ROUND);
        line(-3, 10, -3, 16);
        line(3, 10, 3, 16);
        // Wrapped body
        noStroke();
        fill(240, 225, 200);
        rectMode(CENTER);
        rect(0, 4, 16, 18, 4);
        stroke(200, 180, 150);
        strokeWeight(2);
        line(-8, 0, 8, -2);
        line(-8, 6, 8, 4);
        // Head
        noStroke();
        fill(240, 225, 200);
        ellipse(0, -8, 14, 12);
        fill(0);
        ellipse(2, -8, 3, 3);
        break;
      case "ankhWisp":
        // Floating ankh glyph
        noFill();
        stroke(tint[0], tint[1], tint[2]);
        strokeWeight(3);
        ellipse(0, -6, 10, 10);
        line(0, -1, 0, 10);
        line(-6, 5, 6, 5);
        noStroke();
        fill(tint[0], tint[1], tint[2], 160);
        ellipse(0, 12, 10, 6);
        break;
      case "legionary":
        // Shield-forward legionary silhouette
        rectMode(CENTER);
        rect(0, 0, 14, 20, 3); // shield
        fill(0);
        ellipse(0, 0, 4, 4); // boss
        fill(tint[0], tint[1], tint[2]);
        rect(0, -16, 12, 6, 2); // helmet
        fill(255, 0, 0);
        rect(0, -20, 6, 6, 2); // plume
        break;
      case "standardBearer":
        // Legionary carrying a standard
        translate(0, -4);
        stroke(0);
        strokeWeight(2);
        line(-8, -18, -8, 10); // pole
        fill(255, 220, 120);
        rect(-4, -12, 12, 10, 2); // banner
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        rect(0, 6, 16, 18, 4); // body
        fill(0);
        rect(0, -6, 12, 6, 2); // helm
        break;
      case "rollingShield":
        // Round scutum rolling between bounds
        push();
        rotate(this.rollAngle);
        fill(tint[0], tint[1], tint[2]);
        ellipse(0, 0, this.radius * 2, this.radius * 2);
        stroke(0);
        strokeWeight(2);
        line(-this.radius * 0.7, 0, this.radius * 0.7, 0);
        line(0, -this.radius * 0.7, 0, this.radius * 0.7);
        pop();
        break;
      case "frKnight":
        // Medieval knight with cross shield and plume
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 2, 16, 20, 4); // shield/body
        stroke(0);
        strokeWeight(2);
        line(-5, 2, 5, 2);
        line(0, -3, 0, 7);
        noStroke();
        fill(0);
        rect(0, -10, 14, 8, 2); // helmet
        fill(255, 0, 0);
        rect(0, -15, 6, 5, 1); // plume
        break;
      case "warHorse":
        // Charging horse + rider silhouette
        translate(0, -8);
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        ellipse(-6, 10, 16, 10); // hind legs mass
        ellipse(6, 10, 16, 10);
        rect(0, 2, 20, 10, 3); // body
        triangle(-10, 0, -14, -8, -6, -2); // tail
        rect(4, -10, 12, 12, 3); // head
        fill(0);
        ellipse(6, -12, 3, 3);
        break;
      case "bannerWaver":
        // Slow walker with outward flag
        translate(0, -10);
        stroke(0);
        strokeWeight(2);
        line(-6, -6, -16, -2); // flag pole
        noStroke();
        fill(255, 220, 160);
        quad(-16, -8, -4, -6, -8, 2, -18, 0);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 4, 14, 16, 3);
        fill(230, 210, 180);
        ellipse(0, -6, 12, 10);
        break;
      case "itInventor":
        // Da Vinci tinkerer with gear gadget
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 2, 16, 18, 4); // cloak
        fill(240, 220, 190);
        ellipse(0, -10, 14, 12); // head
        fill(120, 80, 50);
        arc(0, -6, 10, 8, 0, Math.PI); // beard
        noFill();
        stroke(0);
        strokeWeight(2);
        ellipse(8, 2, 8, 8); // gear
        line(8, -2, 8, 6);
        line(4, 2, 12, 2);
        break;
      case "itApprentice":
        translate(0, -10);
        rectMode(CENTER);
        // Body
        fill(tint[0], tint[1], tint[2]);
        rect(0, 4, 12, 14, 3);
        // Head
        fill(230, 210, 180);
        ellipse(0, -4, 12, 10);
        // Scroll
        fill(240, 220, 190);
        rect(6, 6, 8, 4, 2);
        break;
      case "flyingContraption": {
        // Simple glider/ornithopter silhouette
        const wingFlap = Math.sin(frameCount * 0.15) * 8;
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 0, 18, 6, 2); // body
        push();
        rotate(radians(wingFlap));
        rect(-2, 0, 24, 4, 2);
        pop();
        push();
        rotate(radians(-wingFlap));
        rect(2, 0, 24, 4, 2);
        pop();
        break;
      }
      case "britMusketeer":
        // Musketeer silhouette with tall hat and sash
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 4, 16, 20, 4); // coat
        fill(230, 210, 180);
        ellipse(0, -6, 12, 10); // head
        fill(0);
        rect(0, -12, 16, 4); // brim
        rect(0, -16, 10, 6); // crown
        stroke(0);
        strokeWeight(2);
        line(-8, 0, 8, 8); // sash
        break;
      case "deckSailor":
        translate(0, -12);
        // Body
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 4, 14, 18, 4);
        // Head
        fill(230, 210, 180);
        ellipse(0, -6, 12, 10);
        // Rope across shoulder
        stroke(120, 90, 60);
        strokeWeight(3);
        line(-8, -2, 8, 10);
        break;
      case "cannonball":
        // Rolling cannon shot
        push();
        rotate(this.rollAngle);
        noStroke();
        fill(60, 60, 70);
        ellipse(0, 0, this.radius * 1.8, this.radius * 1.8);
        stroke(20);
        strokeWeight(3);
        line(-this.radius * 0.6, 0, this.radius * 0.6, 0);
        noStroke();
        fill(255, 180, 80);
        ellipse(0, 0, 4, 4); // fuse stub
        pop();
        break;
      case "usSkater":
        // Skater with board
        rectMode(CENTER);
        fill(0);
        rect(0, 8, 20, 4, 2); // board
        fill(255);
        ellipse(-8, 10, 4, 4);
        ellipse(8, 10, 4, 4);
        fill(tint[0], tint[1], tint[2]);
        rect(0, -2, 14, 16, 4); // body
        fill(230, 210, 190);
        ellipse(0, -10, 12, 10); // head
        fill(0);
        arc(0, -11, 14, 8, Math.PI, 0); // cap
        break;
      case "freewayCar":
        translate(0, -8);
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 6, 26, 10, 3);
        rect(0, 0, 18, 8, 2);
        fill(255, 240, 200);
        ellipse(-8, 8, 3, 3);
        ellipse(8, 8, 3, 3);
        break;
      case "neonDrone": {
        // Hovering neon drone
        const bob = Math.sin(frameCount * 0.2) * 2;
        translate(0, bob - 4);
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 0, 14, 14, 3);
        fill(120, 240, 255);
        rect(0, 6, 12, 4, 2);
        break;
      }
      case "jpMech":
        // Compact mech/robot head
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 0, 18, 16, 3);
        fill(0);
        rect(-4, -2, 3, 3);
        rect(4, -2, 3, 3);
        fill(0, 255, 200);
        rect(0, 4, 10, 4, 1); // mouth panel
        fill(tint[0], tint[1], tint[2]);
        rect(-10, -2, 3, 6, 1);
        rect(10, -2, 3, 6, 1);
        break;
      case "jpDrone":
        // Compact zig-zag drone
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 0, 14, 12, 3);
        fill(0);
        rect(-3, -2, 3, 3);
        rect(3, -2, 3, 3);
        fill(120, 255, 220);
        rect(0, 4, 10, 4, 2);
        break;
      case "jpHoloGuard": {
        // Tall holographic guardian
        const alpha = this.isPhasedOut ? 90 : 200;
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2], alpha);
        rect(0, 0, 16, 26, 5);
        noFill();
        stroke(120, 255, 220, alpha);
        strokeWeight(2);
        rect(0, 0, 18, 28, 6);
        break;
      }
      case "bossChaos": {
        // Fractured time core shard
        rectMode(CENTER);
        const spin = frameCount * 0.08;
        rotate(spin);
        fill(tint[0], tint[1], tint[2]);
        rect(0, 0, 28, 10, 2);
        rotate(-2 * spin);
        rect(0, 0, 10, 28, 2);
        noFill();
        stroke(255);
        ellipse(0, 0, 34, 34);
        break;
      }
      case "bossWarden":
        // Time Warden mask
        rectMode(CENTER);
        fill(tint[0], tint[1], tint[2]);
        rect(0, -4, 26, 20, 6);
        fill(0);
        rect(-6, -6, 5, 5, 1);
        rect(6, -6, 5, 5, 1);
        fill(120, 255, 220);
        rect(0, 4, 16, 6, 2);
        noFill();
        stroke(120, 255, 220);
        strokeWeight(2);
        ellipse(0, -4, 30, 24);
        break;
      case "bossMini":
        // Smaller warden shard that zips along the path
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        ellipse(0, 0, 18, 18);
        fill(0);
        ellipse(-3, -2, 3, 3);
        ellipse(3, -2, 3, 3);
        stroke(0);
        strokeWeight(2);
        noFill();
        arc(0, 4, 10, 6, 0, Math.PI);
        break;
      case "harpy":
        // Winged swooper
        translate(0, -8);
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        triangle(-12, 0, 0, -10, 12, 0); // wings
        ellipse(0, 4, 10, 12); // body
        fill(0);
        ellipse(3, 2, 3, 3);
        stroke(0);
        strokeWeight(2);
        line(0, 10, -4, 14);
        line(0, 10, 4, 14);
        break;
      case "hoplite":
        // Ghostly hoplite helm shape
        rectMode(CENTER);
        rect(0, -6, 16, 18, 4); // helm
        fill(0);
        rect(-4, -8, 3, 3); // eye slit
        rect(4, -8, 3, 3);
        break;
      case "ikon":
        // Icon tile with cross
        rectMode(CENTER);
        rect(0, 0, 20, 20, 3);
        stroke(0);
        strokeWeight(2);
        line(-6, 0, 6, 0);
        line(0, -6, 0, 6);
        break;
      case "censerSmoke":
        // Hanging censer with trailing smoke
        translate(0, -6);
        stroke(0);
        strokeWeight(2);
        line(0, -12, 0, -18);
        noStroke();
        fill(tint[0], tint[1], tint[2]);
        ellipse(0, 0, 12, 10);
        fill(255, 240, 210, 150);
        ellipse(-4, 10, 10, 6);
        ellipse(2, 14, 8, 5);
        break;
      case "mosaicShard": {
        // Cluster of spinning tesserae
        const spin = frameCount * 0.08;
        push();
        rotate(spin);
        for (let i = 0; i < 3; i++) {
          const ang = (TWO_PI / 3) * i;
          push();
          rotate(ang);
          fill(tint[0], tint[1], tint[2]);
          quad(-4, -2, 4, -2, 6, 2, -6, 2);
          pop();
        }
        pop();
        break;
      }
      default:
        // Fallback generic baddie
        rectMode(CENTER);
        rect(0, -6, 16, 16, 3);
        rect(0, -16, 12, 6, 2);
    }

    pop();
  }
}

// --- Time Shard (collectable) ---

class TimeShard {
  constructor(theta, offset) {
    this.theta = theta;
    this.offset = offset;
    this.collected = false;
    this.updatePosition();
  }

  updatePosition() {
    const baseR = platformR(this.theta);
    const radius = baseR + this.offset;
    this.r = radius;
    const pos = worldToScreen(this.theta, radius);
    this.x = pos.x;
    this.y = pos.y;
  }

  update() {
    if (this.collected) return;
    this.updatePosition();
  }

  draw() {
    if (this.collected) return;

    push();
    translate(this.x, this.y);
    const pulse = 2 * Math.sin(frameCount * 0.25);
    stroke(0);
    strokeWeight(2);
    fill(200, 240, 255);
    rotate(frameCount * 0.04);

    const size = 10 + pulse;
    beginShape();
    vertex(0, -size);
    vertex(size, 0);
    vertex(0, size);
    vertex(-size, 0);
    endShape(CLOSE);

    pop();
  }
}

// --- p5 setup & draw ---

function setup() {
  createCanvas(windowWidth, windowHeight); // FULL-SCREEN CANVAS
  centerX = width / 2;
  centerY = height / 2;

  // Title logo for the era select screen
  mapLogo = loadImage("assets/ChronoSpiral-logo-480.png", () => {}, () => {
    mapLogo = null;
  });

  resetRunProgress();
  textFont("Courier New");
  GAME_STATE = "MAP";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
}

function keyPressed() {
  const ctrlDown = keyIsDown(CONTROL);
  const shiftDown = keyIsDown(SHIFT);
  const altDown = keyIsDown(ALT);

  // Temporary playtest unlock: Ctrl + Shift + Alt + '+'. Grants 60 shards and opens final arenas.
  if ((key === "+" || key === "=") && ctrlDown && shiftDown && altDown) {
    grantPlaytestUnlock();
    return;
  }

  if (GAME_STATE === "MAP") {
    if (keyCode === LEFT_ARROW) {
      selectedLevelIndex = (selectedLevelIndex - 1 + levels.length) % levels.length;
    } else if (keyCode === RIGHT_ARROW) {
      selectedLevelIndex = (selectedLevelIndex + 1) % levels.length;
    } else if ((keyCode === ENTER || keyCode === RETURN) && unlockedLevels[selectedLevelIndex]) {
      startLevel(selectedLevelIndex);
    }
  } else if (GAME_STATE === "GAME_OVER") {
    if (keyCode === ENTER || keyCode === RETURN) {
      resetRunProgress();
      GAME_STATE = "MAP";
    }
  } else if (keyCode === ESCAPE) {
    GAME_STATE = "MAP";
  }

  if (GAME_STATE === "PLAY") {
    // Invulnerability: S or Ctrl
    if (
      (key === "s" || key === "S" || keyCode === CONTROL) &&
      globalShardTotal >= INVULN_SHARD_THRESHOLD &&
      invulnCooldown <= 0 &&
      invulnFrames <= 0
    ) {
      const bonus = Math.floor(globalShardTotal / 15) * 60; // +1s per 15 shards
      invulnFrames = INVULN_DURATION + bonus;
      invulnCooldown = INVULN_COOLDOWN_FRAMES;
    }

    // Time freeze: D
    if (
      (key === "d" || key === "D") &&
      globalShardTotal >= FREEZE_SHARD_THRESHOLD &&
      freezeCooldown <= 0 &&
      freezeFrames <= 0
    ) {
      freezeFrames = FREEZE_DURATION;
      freezeCooldown = FREEZE_COOLDOWN_FRAMES;
    }
  }
}

function draw() {
  if (GAME_STATE === "MAP") {
    stopCurrentMusic();
    drawMapScreen();
    return;
  }

  if (GAME_STATE === "GAME_OVER") {
    stopCurrentMusic();
    drawGameOverScreen();
    return;
  }

  if (GAME_STATE === "INTRO") {
    // Keep level music playing during interstitials
    drawIntroOverlay(currentLevelObj());
    return;
  }

  if (invulnFrames > 0) invulnFrames--;
  if (freezeFrames > 0) freezeFrames--;
  if (invulnCooldown > 0) invulnCooldown--;
  if (freezeCooldown > 0) freezeCooldown--;

  const level = currentLevelObj();
  background(level.palette.bg);

  updateBossCamera(level);

  if (level.isCoreBossLevel) {
    updateBossPull(level);
  }

  drawPortal(level);
  drawSpiral(level);
  if (level.isPulseLevel) {
    drawPulseSafePads(level);
  }
  updateAndDrawPulse(level);
  drawShards();
  drawEnemies();

  if (GAME_STATE === "PLAY") {
    // While the player is in the time-warp animation or fading in from the
    // intro, don't drain the timer.
    if (!player.warpAnimating && postIntroFadeFrames <= 0) {
      levelTimeFramesRemaining--;
      if (levelTimeFramesRemaining <= 0) {
        handleLevelTimeout();
        return;
      }
    }
    player.update();
  }
  player.draw();
  drawUnlockBanner();

  if (freezeFrames > 0) {
    noStroke();
    fill(100, 180, 255, 60);
    rect(0, 0, width, height);
  }

  if (postIntroFadeFrames > 0) {
    const fadeAlpha = map(postIntroFadeFrames, 24, 0, 255, 0, true);
    noStroke();
    fill(0, fadeAlpha);
    rect(0, 0, width, height);
    postIntroFadeFrames = Math.max(0, postIntroFadeFrames - 1);
  }

  drawHUD(level);
}

function drawMapScreen() {
  background(8, 8, 20);
  fill(255);
  textAlign(CENTER, TOP);

  // --- HEADER / LOGO ---
  let headerBottom = 40;
  if (mapLogo) {
    push();
    imageMode(CENTER);
    const maxW = width * 0.65;
    const maxH = height * 0.24;
    const scale = Math.min(maxW / mapLogo.width, maxH / mapLogo.height, 1);
    const w = mapLogo.width * scale;
    const h = mapLogo.height * scale;
    image(mapLogo, width / 2, 60 + h / 2, w, h);
    headerBottom = 60 + h;
    pop();
  } else {
    textSize(32);
    text("CHRONO SPIRAL", width / 2, 40);
    headerBottom = 40 + 32;
  }

  textSize(18);
  text("Era Select", width / 2, headerBottom + 10);
  textSize(14);
  text("LEFT/RIGHT: choose • ENTER: travel • ESC: exit level", width / 2, headerBottom + 30);
  text(
    `Time Shards: ${globalShardTotal}  •  Chaos Core unlock at ${BOSS_SHARD_GOAL}`,
    width / 2,
    headerBottom + 50
  );

  const topTextY = headerBottom + 50;
  const firstRowY = topTextY + 40;
  const rowSpacing = 110;
  const secondRowY = firstRowY + rowSpacing;
  const thirdRowY = secondRowY + rowSpacing;

  const cols = 6;
  const leftMargin = 80;
  const rightMargin = 80;
  const availableWidth = Math.max(width - leftMargin - rightMargin, 200);
  const spacingX = cols > 1 ? availableWidth / (cols - 1) : 0;

  for (let i = 0; i < levels.length; i++) {
    let x;
    let y;

    if (i < 6) {
      const col = i;
      x = leftMargin + col * spacingX;
      y = firstRowY;
    } else if (i < 12) {
      const col = i - 6;
      x = leftMargin + col * spacingX;
      y = secondRowY;
    } else {
      const bottomIndex = i - 12;
      const bottomSpacing = 160;
      y = thirdRowY;
      x = width / 2 + (bottomIndex === 0 ? -bottomSpacing / 2 : bottomSpacing / 2);
    }

    const isUnlocked = unlockedLevels[i];
    const isSelected = i === selectedLevelIndex;

    stroke(255);
    strokeWeight(isSelected ? 4 : 2);
    fill(isUnlocked ? 220 : 80);
    ellipse(x, y, isSelected ? 30 : 22);

    noStroke();
    fill(230);
    textAlign(CENTER, TOP);
    textSize(12);
    const labelBottom = drawWrappedLabel(levels[i].name, x, y + 18, 160, 14);

    if (!isUnlocked) {
      let lockLabel = "(locked)";
      if (i === CHRONO_CORE_INDEX) {
        lockLabel = `(Need ${BOSS_SHARD_GOAL} shards)`;
      } else if (i === BOSS_LEVEL_INDEX) {
        lockLabel = "(Defeat Chaos Core)";
      }
      text(lockLabel, x, labelBottom + 2);
    }
  }
}

function drawGameOverScreen() {
  background(0, 0, 0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("GAME OVER", width / 2, height / 2 - 10);
  textSize(16);
  text("Press ENTER to restart", width / 2, height / 2 + 18);
}

function drawWrappedLabel(str, x, startY, maxWidth, lineHeight) {
  const words = str.split(" ");
  let line = "";
  let y = startY;
  for (let i = 0; i < words.length; i++) {
    const testLine = line.length > 0 ? `${line} ${words[i]}` : words[i];
    if (textWidth(testLine) <= maxWidth) {
      line = testLine;
    } else {
      text(line, x, y);
      line = words[i];
      y += lineHeight;
    }
  }
  if (line.length > 0) {
    text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawIntroOverlay(level) {
  background(0);
  introTimer--;
  const t = constrain(1 - introTimer / INTRO_DURATION, 0, 1);

  const fadeFrames = 20;
  const vignetteAlpha = introTimer > fadeFrames ? 1 : introTimer / fadeFrames;

  // Vignette canvas
  push();
  translate(width / 2, height / 2 + 40);
  drawingContext.globalAlpha = vignetteAlpha;
  drawLevelVignette(currentLevel, t);
  pop();

  // Labels
  push();
  drawingContext.globalAlpha = vignetteAlpha;
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text(level.name, width / 2, height / 2 - 120);
  textSize(16);
  text(`YEAR: ${level.year} – ${level.location}`, width / 2, height / 2 - 90);
  pop();

  if (introTimer <= 0 || keyIsDown(32)) {
    GAME_STATE = "PLAY";
    postIntroFadeFrames = 24;
  }
}

function drawLevelVignette(levelIndex, t) {
  switch (levelIndex) {
    case 0:
      drawStage1Vignette(t);
      break;
    case 1:
      drawStage2Vignette(t);
      break;
    case 2:
      drawStage3Vignette(t);
      break;
    case 3:
      drawStage4Vignette(t);
      break;
    case 4:
      drawStage5Vignette(t);
      break;
    case 5:
      drawStage6Vignette(t);
      break;
    case 6:
      drawStage7Vignette(t);
      break;
    default:
      drawSimpleVignette(t);
      break;
  }
}

function drawSimpleVignette(t) {
  push();
  const scaleAmt = lerp(0.6, 1.1, t);

  // Spiral disc
  push();
  scale(scaleAmt);
  noStroke();
  fill(40, 220, 255, 40);
  ellipse(0, 0, 140, 140);
  stroke(40, 220, 255);
  strokeWeight(4);
  noFill();
  for (let r = 20; r <= 60; r += 10) {
    ellipse(0, 0, r * 2, r * 2);
  }
  pop();

  // Tiny player silhouette running right
  drawIntroPlayer(-50 + t * 60, 30, 0.9, 0, true);
  pop();
}

function drawStage1Vignette(t) {
  t = constrain(t, 0, 1);

  // Shard glow behind the guards
  push();
  const shardPulse = 30 + 10 * Math.sin(frameCount * 0.12);
  noStroke();
  fill(100, 255, 255, 180);
  ellipse(0, -40, shardPulse, shardPulse * 1.2);
  fill(0, 40);
  ellipse(0, -40, shardPulse * 0.5, shardPulse * 0.6);
  pop();

  drawIntroNeanderthal(-50, 25, 1.5, -1);
  drawIntroNeanderthal(50, 25, 1.5, 1);

  if (t < 0.33) {
    // Spin in from the left
    const p = t / 0.33;
    const x = lerp(-width * 0.45, -80, p);
    const spin = p * TWO_PI * 3;
    drawIntroPlayer(x, 40, 1.4, spin, false);
  } else if (t < 0.66) {
    // Stunned + boulder throw
    const p = (t - 0.33) / 0.33;
    drawIntroPlayer(-80, 40, 1.4, 0, false);

    const bx = lerp(40, -40, p);
    const by = 20 - Math.sin(p * Math.PI) * 60;
    drawIntroBoulder(bx, by, 1.3);
  } else {
    // Run off right as the boulder lands
    const p = (t - 0.66) / 0.34;
    const x = lerp(-80, width * 0.45, p);
    drawIntroPlayer(x, 40, 1.4, 0, true);

    drawIntroBoulder(-40, 20, 1.3);
  }
}

function drawStage2Vignette(t) {
  t = constrain(t, 0, 1);

  // Soft temple backdrop
  push();
  noStroke();
  fill(40, 20, 80, 140);
  rectMode(CENTER);
  rect(0, 10, 220, 80, 12);
  fill(90, 50, 150, 170);
  rect(0, -10, 140, 40, 8);
  pop();

  // Meditation platform
  push();
  noStroke();
  fill(40, 120, 80, 180);
  ellipse(0, 50, 220, 40);
  pop();

  // Glowing shard behind the sages
  push();
  const pulse = 18 + 6 * Math.sin(frameCount * 0.15);
  noStroke();
  fill(120, 255, 220, 200);
  ellipse(0, 0, pulse * 1.3, pulse);
  pop();

  drawIntroSage(-70, 20, 1.3);
  drawIntroSage(70, 20, 1.3);

  if (t < 0.33) {
    // Hero spins in between sages
    const p = t / 0.33;
    const x = lerp(-width * 0.45, -40, p);
    const spin = p * TWO_PI * 4;
    drawIntroPlayer(x, 40, 1.3, spin, false);
  } else if (t < 0.66) {
    // Sages cast lotus orbs
    const p = (t - 0.33) / 0.33;
    drawIntroPlayer(-40, 40, 1.3, 0, false);

    const orbX1 = lerp(-70, -20, p);
    const orbX2 = lerp(70, 0, p);
    drawIntroLotusOrb(orbX1, 10, 1.1);
    drawIntroLotusOrb(orbX2, 0, 1.1);
  } else {
    // Monkeys + orbs chase him off
    const p = (t - 0.66) / 0.34;
    const heroX = lerp(-40, width * 0.45, p);
    drawIntroPlayer(heroX, 40, 1.3, 0, true);

    const monkeyOffset = 40;
    drawIntroMonkey(-40 - monkeyOffset * p, 42, 1.1, 1);
    drawIntroMonkey(-10 - monkeyOffset * p, 38, 1.1, 1);

    drawIntroLotusOrb(-20 - 60 * p, 10, 1.0);
    drawIntroLotusOrb(10 - 40 * p, 0, 1.0);
  }
}

function drawStage3Vignette(t) {
  t = constrain(t, 0, 1);

  // Desert floor
  push();
  noStroke();
  fill(170, 130, 80, 190);
  ellipse(0, 60, 260, 60);
  pop();

  // Pyramids
  push();
  noStroke();
  fill(190, 150, 90, 180);
  triangle(-120, 30, -40, -30, 40, 30);
  triangle(20, 30, 90, -10, 160, 30);
  pop();

  // Sarcophagus center stage
  const lidPhase = t < 0.4 ? 0 : t < 0.7 ? (t - 0.4) / 0.3 : 1;
  const lidOffset = lerp(0, -40, lidPhase);
  drawIntroSarcophagus(0, 20, 1.4, lidOffset);

  if (t < 0.33) {
    // Hero flying in
    const p = t / 0.33;
    const x = lerp(-width * 0.45, -60, p);
    const y = lerp(10, -10, p);
    const spin = p * TWO_PI * 3;
    drawIntroPlayer(x, y, 1.3, spin, true);
  } else if (t < 0.66) {
    // Impact + first mummy
    drawIntroPlayer(-60, -6, 1.2, 0, true);

    push();
    noStroke();
    fill(250, 240, 210, 170);
    ellipse(-10, 30, 40, 20);
    pop();

    drawIntroMummy(20, 22, 1.1, -1);
    drawIntroScarab(-10, 36, 1.0);
  } else {
    // Chase!
    const p = (t - 0.66) / 0.34;
    const heroX = lerp(-40, width * 0.45, p);
    drawIntroPlayer(heroX, 30, 1.3, 0, true);

    drawIntroMummy(-10 + 80 * p, 28, 1.1, 1);
    drawIntroMummy(-40 + 60 * p, 24, 1.0, 1);

    drawIntroScarab(-30 + 120 * p, 40, 1.0);
    drawIntroScarab(-60 + 100 * p, 44, 0.9);
  }
}

function drawIntroPlayer(x, y, scaleAmt, spinAngle = 0, runRight = false) {
  push();
  translate(x, y);
  rotate(spinAngle);
  scale(scaleAmt);

  // Body
  noStroke();
  fill(40, 140, 255);
  rectMode(CENTER);
  rect(0, -18, 24, 26, 6);

  // Head
  fill(245, 220, 190);
  ellipse(0, -36, 18, 20);

  // Beard
  fill(60, 40, 20);
  arc(0, -32, 14, 12, 0, Math.PI);

  // Eyes
  fill(0);
  ellipse(-4, -37, 2.5, 2.5);
  ellipse(4, -37, 2.5, 2.5);

  // Arms
  stroke(245, 220, 190);
  strokeWeight(3);
  const armOffset = runRight ? 4 : 0;
  line(-10, -22, -16 - armOffset, -18);
  line(10, -22, 16 + armOffset, -18);

  // Legs + feet
  stroke(0, 0, 0, 180);
  strokeWeight(3);
  line(-6, -6, -8 - armOffset, 4);
  line(6, -6, 8 + armOffset, 4);

  noStroke();
  fill(255, 230, 80);
  rect(-8 - armOffset, 6, 8, 4, 2);
  rect(8 + armOffset, 6, 8, 4, 2);

  pop();
}

function drawIntroSage(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  // Cushion
  noStroke();
  fill(60, 150, 110);
  ellipse(0, 10, 40, 14);

  // Robe
  fill(215, 160, 110);
  rectMode(CENTER);
  rect(0, -2, 20, 26, 6);

  // Head
  fill(240, 210, 180);
  ellipse(0, -18, 16, 18);

  // Beard & hair
  fill(120, 80, 50);
  arc(0, -14, 14, 12, 0, Math.PI);
  arc(0, -20, 18, 10, Math.PI, 0);

  // Closed eyes
  stroke(0);
  strokeWeight(2);
  line(-4, -18, -1, -17);
  line(1, -17, 4, -18);

  // Halo
  noFill();
  stroke(255, 230, 160);
  strokeWeight(2);
  ellipse(0, -24, 18, 10);

  pop();
}

function drawIntroLotusOrb(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  const pulse = 3 * Math.sin(frameCount * 0.25);
  noStroke();
  fill(200, 160, 255, 210);
  ellipse(0, 0, 20 + pulse, 20 + pulse);

  fill(255, 230, 255);
  beginShape();
  for (let i = 0; i < 6; i++) {
    const a = (TWO_PI / 6) * i;
    vertex(Math.cos(a) * 8, Math.sin(a) * 8);
  }
  endShape(CLOSE);

  pop();
}

function drawIntroMonkey(x, y, scaleAmt, facing = 1) {
  push();
  translate(x, y);
  scale(scaleAmt * facing, scaleAmt);

  // Tail
  noFill();
  stroke(60, 40, 30);
  strokeWeight(3);
  bezier(10, -4, 18, -8, 18, 6, 10, 8);

  // Body
  noStroke();
  fill(170, 110, 70);
  ellipse(0, -4, 18, 16);

  // Head
  fill(210, 160, 120);
  ellipse(0, -14, 14, 12);

  // Face
  fill(240, 200, 150);
  ellipse(0, -12, 10, 8);

  // Eyes / mouth
  fill(0);
  ellipse(-3, -13, 2, 2);
  ellipse(3, -13, 2, 2);
  noFill();
  stroke(0);
  strokeWeight(1.5);
  arc(0, -10, 6, 3, 0, Math.PI);

  pop();
}

function drawIntroSarcophagus(x, y, scaleAmt, lidOffset) {
  push();
  translate(x, y);
  scale(scaleAmt);

  // Base
  rectMode(CENTER);
  noStroke();
  fill(180, 140, 90);
  rect(0, 10, 70, 26, 10);

  // Face panel
  fill(220, 190, 130);
  rect(0, 2, 40, 24, 8);

  // Lid (slides)
  push();
  translate(lidOffset, -18);
  rotate(radians(-6));
  fill(150, 110, 70);
  rect(0, 0, 60, 16, 8);
  pop();

  pop();
}

function drawIntroMummy(x, y, scaleAmt, facing = 1) {
  push();
  translate(x, y);
  scale(scaleAmt * facing, scaleAmt);

  // Legs
  stroke(0);
  strokeWeight(2);
  line(-4, 10, -4, 16);
  line(4, 10, 4, 16);

  // Body
  rectMode(CENTER);
  noStroke();
  fill(240, 225, 200);
  rect(0, 2, 22, 24, 6);
  stroke(200, 180, 150);
  strokeWeight(2);
  line(-10, -2, 10, -4);
  line(-10, 4, 10, 2);

  // Head
  noStroke();
  fill(240, 225, 200);
  ellipse(0, -12, 16, 14);
  fill(0);
  ellipse(-3, -12, 3, 3);
  ellipse(3, -12, 3, 3);

  pop();
}

function drawIntroScarab(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  noStroke();
  fill(40, 160, 130);
  ellipse(0, 0, 16, 12);
  fill(30, 120, 100);
  ellipse(0, -5, 10, 8);

  stroke(0);
  strokeWeight(2);
  line(-8, 4, -4, 0);
  line(8, 4, 4, 0);

  pop();
}

function drawStage4Vignette(t) {
  t = constrain(t, 0, 1);

  // Courtyard + columns
  push();
  noStroke();
  fill(160, 145, 110, 220);
  ellipse(0, 60, 240, 60);
  pop();

  push();
  stroke(230, 220, 200);
  strokeWeight(6);
  line(-110, 10, -110, -40);
  line(0, 10, 0, -40);
  line(110, 10, 110, -40);
  strokeWeight(3);
  line(-120, -40, 120, -40);
  pop();

  push();
  noFill();
  stroke(120, 210, 255, 200);
  strokeWeight(3);
  for (let r = 10; r <= 36; r += 6) {
    ellipse(0, -40, r * 2, r * 2);
  }
  pop();

  drawIntroHoplite(-60, 26, 1.3, 1);
  drawIntroHoplite(60, 26, 1.3, -1);

  if (t < 0.33) {
    const p = t / 0.33;
    const x = lerp(-width * 0.45, -20, p);
    const spin = p * TWO_PI * 4;
    drawIntroPlayer(x, 40, 1.3, spin, false);
  } else if (t < 0.66) {
    const p = (t - 0.33) / 0.33;
    drawIntroPlayer(-20, 40, 1.3, 0, false);

    const tilt = radians(10 + 10 * p);
    drawIntroHoplite(-60, 26, 1.3, 1, tilt);
    drawIntroHoplite(60, 26, 1.3, -1, -tilt);

    drawIntroAmphora(-5, 52, 1.0, Math.sin(frameCount * 0.25) * 0.15);
  } else {
    const p = (t - 0.66) / 0.34;
    const heroX = lerp(-20, width * 0.45, p);
    drawIntroPlayer(heroX, 40, 1.3, 0, true);

    const chaserX1 = lerp(-60, heroX - 40, p);
    const chaserX2 = lerp(60, heroX - 10, p);
    drawIntroHoplite(chaserX1, 26, 1.3, 1);
    drawIntroHoplite(chaserX2, 26, 1.3, 1);

    const amphoraX = lerp(-5, heroX - 60, p);
    drawIntroAmphora(amphoraX, 52, 1.0, 0);
  }
}

function drawIntroHoplite(x, y, scaleAmt, facing = 1, spearTilt = 0) {
  push();
  translate(x, y);
  scale(scaleAmt * facing, scaleAmt);

  // Shield
  noStroke();
  fill(230, 210, 170);
  ellipse(-6, -4, 22, 22);
  fill(180, 130, 80);
  ellipse(-6, -4, 10, 10);

  // Body
  fill(210, 160, 100);
  rectMode(CENTER);
  rect(4, -10, 18, 26, 6);

  // Helmet / crest
  fill(210, 200, 180);
  ellipse(4, -24, 16, 14);
  fill(200, 60, 60);
  rect(4, -32, 4, 10, 2);

  // Eye slit
  stroke(60, 40, 30);
  strokeWeight(2);
  line(0, -24, 8, -24);

  // Spear
  push();
  translate(10, -16);
  rotate(spearTilt);
  stroke(200, 200, 190);
  strokeWeight(3);
  line(0, 0, 24, -16);
  triangle(24, -16, 24, -10, 30, -13);
  pop();

  pop();
}

function drawIntroAmphora(x, y, scaleAmt, wobble = 0) {
  push();
  translate(x, y);
  scale(scaleAmt);
  rotate(wobble);

  noStroke();
  fill(190, 140, 90);
  ellipse(0, 0, 18, 24);
  rect(0, -8, 10, 12, 4);
  rect(0, 6, 8, 8, 4);

  stroke(120, 80, 50);
  strokeWeight(2);
  noFill();
  arc(-6, -4, 6, 10, HALF_PI, HALF_PI + Math.PI / 1.3);
  arc(6, -4, 6, 10, -HALF_PI - Math.PI / 1.3, -HALF_PI);

  pop();
}

function drawStage5Vignette(t) {
  t = constrain(t, 0, 1);

  // Roman road
  push();
  noStroke();
  fill(120, 100, 80, 220);
  rectMode(CENTER);
  rect(0, 60, 260, 40, 10);
  pop();

  // Colosseum silhouette
  push();
  noStroke();
  fill(160, 130, 90, 180);
  arc(0, 0, 220, 120, PI, TWO_PI);
  fill(8, 8, 20);
  for (let x = -80; x <= 80; x += 30) {
    rect(x, 10, 16, 30);
  }
  pop();

  drawIntroLegionary(-40, 26, 1.3, 1);
  drawIntroLegionary(20, 26, 1.3, 1);

  if (t < 0.33) {
    const p = t / 0.33;
    const x = 0;
    const y = lerp(-40, 30, p);
    const spin = p * TWO_PI * 3;
    drawIntroPlayer(x, y, 1.3, spin, false);
  } else if (t < 0.66) {
    const p = (t - 0.33) / 0.33;
    drawIntroPlayer(0, 30, 1.3, 0, false);

    const upTilt = radians(20 * p);
    drawIntroLegionary(-40, 26, 1.3, 1, upTilt);
    drawIntroLegionary(20, 26, 1.3, 1, -upTilt);

    const sx = lerp(100, 40, p);
    drawIntroRoundShield(sx, 52, 1.0);
  } else {
    const p = (t - 0.66) / 0.34;
    const heroX = lerp(0, -width * 0.45, p);
    drawIntroPlayer(heroX, 30, 1.3, 0, false);

    const chaserX1 = lerp(-40, heroX + 30, p);
    const chaserX2 = lerp(20, heroX + 60, p);
    drawIntroLegionary(chaserX1, 26, 1.3, -1);
    drawIntroLegionary(chaserX2, 26, 1.3, -1);

    const sx = lerp(40, heroX + 80, p);
    drawIntroRoundShield(sx, 52, 1.0);
  }
}

function drawIntroLegionary(x, y, scaleAmt, facing = 1, shieldTilt = 0) {
  push();
  translate(x, y);
  scale(scaleAmt * facing, scaleAmt);

  // Body & armor
  noStroke();
  fill(190, 60, 60);
  rectMode(CENTER);
  rect(0, -8, 20, 26, 6);

  // Helmet
  fill(210, 200, 180);
  ellipse(0, -24, 16, 14);
  fill(200, 80, 50);
  rect(0, -32, 6, 10, 2);

  // Shield
  push();
  translate(-8, -4);
  rotate(shieldTilt);
  fill(210, 190, 150);
  rect(0, 0, 14, 26, 4);
  fill(160, 80, 60);
  rect(0, 0, 6, 16, 3);
  pop();

  // Spear
  stroke(200, 200, 190);
  strokeWeight(3);
  line(10, -16, 24, -26);
  line(24, -26, 30, -36);

  pop();
}

function drawIntroRoundShield(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);
  rotate(frameCount * 0.2);

  noStroke();
  fill(210, 190, 150);
  ellipse(0, 0, 22, 22);
  fill(160, 80, 60);
  ellipse(0, 0, 12, 12);
  fill(230, 220, 200);
  ellipse(0, 0, 6, 6);

  pop();
}

function drawStage6Vignette(t) {
  t = constrain(t, 0, 1);

  // Golden apse / dome interior
  push();
  noStroke();
  fill(30, 20, 60, 220);
  arc(0, -10, 260, 150, Math.PI, 0);
  fill(120, 90, 40, 220);
  arc(0, -16, 220, 120, Math.PI, 0);
  pop();

  // Central mosaic glow
  push();
  const pulse = 10 + 4 * Math.sin(frameCount * 0.12);
  noStroke();
  fill(255, 220, 150, 210);
  ellipse(0, -24, 80 + pulse, 80 + pulse);
  pop();

  // Flanking icons and censer
  drawIntroIkonPanel(-80, 10, 1.25);
  drawIntroIkonPanel(80, 10, 1.25);
  drawIntroCenser(0, 40, 1.2);

  if (t < 0.33) {
    const p = t / 0.33;
    const x = lerp(-width * 0.45, -30, p);
    const spin = p * TWO_PI * 3;
    drawIntroPlayer(x, 52, 1.2, spin, false);
  } else if (t < 0.66) {
    const p = (t - 0.33) / 0.33;
    drawIntroPlayer(-30, 52, 1.2, 0, false);

    const ringRadius = 32;
    const baseAng = frameCount * 0.05;
    for (let i = 0; i < 3; i++) {
      const a = baseAng + (TWO_PI / 3) * i;
      const sx = -30 + Math.cos(a) * ringRadius;
      const sy = 20 + Math.sin(a) * ringRadius;
      drawIntroMosaicShard(sx, sy, 1.0);
    }

    drawIntroCenser(0, 40, 1.2 + 0.1 * p);
  } else {
    const p = (t - 0.66) / 0.34;
    const heroX = lerp(-30, width * 0.45, p);
    drawIntroPlayer(heroX, 52, 1.2, 0, true);

    const trailX = heroX - 40;
    drawIntroMosaicShard(trailX, 28, 1.0);
    drawIntroMosaicShard(trailX - 24, 40, 0.9);

    drawIntroIkonPanel(-80, 10, 1.25, true);
    drawIntroIkonPanel(80, 10, 1.25, true);
  }
}

function drawIntroIkonPanel(x, y, scaleAmt, eyesGlow = false) {
  push();
  translate(x, y);
  scale(scaleAmt);

  rectMode(CENTER);
  noStroke();
  fill(240, 210, 150);
  rect(0, 0, 34, 46, 6);
  fill(200, 160, 100);
  rect(0, 0, 26, 32, 4);

  stroke(80, 50, 30);
  strokeWeight(3);
  line(0, -10, 0, 10);
  line(-8, 0, 8, 0);

  if (eyesGlow) {
    noStroke();
    const blink = 180 + 50 * Math.sin(frameCount * 0.2);
    fill(255, 240, 190, blink);
    ellipse(-5, -4, 3, 3);
    ellipse(5, -4, 3, 3);
  }

  pop();
}

function drawIntroCenser(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  const swingDeg = Math.sin(frameCount * 0.1) * 8;
  push();
  translate(0, -26);
  rotate(radians(swingDeg));
  stroke(230, 220, 200);
  strokeWeight(2);
  line(0, 0, 0, 16);
  pop();

  noStroke();
  fill(200, 160, 100);
  ellipse(0, -5, 18, 12);
  rectMode(CENTER);
  rect(0, -9, 10, 6, 3);

  fill(255, 240, 210, 160);
  ellipse(-4, 6, 12, 6);
  ellipse(3, 10, 10, 5);

  pop();
}

function drawIntroMosaicShard(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  const spin = frameCount * 0.12;
  rotate(spin);
  noStroke();
  fill(255, 220, 150);
  quad(-6, -2, 6, -2, 4, 3, -4, 4);

  pop();
}

function drawStage7Vignette(t) {
  t = constrain(t, 0, 1);

  // Distant mountains / sky
  push();
  noStroke();
  fill(6, 30, 40, 220);
  rectMode(CENTER);
  rect(0, 10, 260, 90, 12);
  fill(8, 50, 60, 210);
  beginShape();
  vertex(-130, 20);
  vertex(-90, 0);
  vertex(-40, 18);
  vertex(10, -4);
  vertex(60, 16);
  vertex(110, -2);
  vertex(130, 16);
  vertex(130, 50);
  vertex(-130, 50);
  endShape(CLOSE);
  pop();

  // Great Wall segment
  push();
  noStroke();
  fill(50, 90, 90, 230);
  beginShape();
  vertex(-130, 46);
  vertex(-90, 32);
  vertex(-40, 40);
  vertex(10, 30);
  vertex(60, 38);
  vertex(110, 30);
  vertex(130, 36);
  vertex(130, 66);
  vertex(-130, 66);
  endShape(CLOSE);
  pop();

  // Watchtowers
  push();
  rectMode(CENTER);
  noStroke();
  fill(80, 120, 130, 240);
  rect(-80, 30, 20, 20, 3);
  rect(0, 26, 20, 20, 3);
  rect(80, 30, 20, 20, 3);
  pop();

  drawIntroLantern(-40, 6, 1.1);
  drawIntroLantern(40, 2, 1.1);

  if (t < 0.33) {
    const p = t / 0.33;
    const x = lerp(-width * 0.45, -60, p);
    const spin = p * TWO_PI * 3;
    drawIntroPlayer(x, 56, 1.2, spin, false);

    const cx = lerp(90, 10, p);
    drawIntroCrane(cx, 16, 1.0, -1);
  } else if (t < 0.66) {
    const p = (t - 0.33) / 0.33;

    drawIntroPlayer(-60, 56, 1.2, 0, false);

    drawIntroCrane(-20, 20 + 4 * Math.sin(frameCount * 0.15), 1.0, 1);
    drawIntroCrane(30, 10 + 3 * Math.sin(frameCount * 0.2), 0.9, 1);

    drawIntroLantern(-40, 6, 1.1 + 0.05 * p, true);
    drawIntroLantern(40, 2, 1.1 + 0.05 * p, true);
  } else {
    const p = (t - 0.66) / 0.34;
    const heroX = lerp(-60, width * 0.45, p);
    drawIntroPlayer(heroX, 56, 1.2, 0, true);

    const guardX = lerp(-10, heroX - 32, p);
    drawIntroWallGuard(guardX, 44, 1.1);

    drawIntroCrane(heroX - 60, 18, 1.0, 1);
    drawIntroCrane(heroX - 90, 10, 0.9, 1);
  }
}

function drawIntroLantern(x, y, scaleAmt, bright = false) {
  push();
  translate(x, y);
  scale(scaleAmt);

  const bob = Math.sin(frameCount * 0.18) * 2;
  translate(0, bob);

  stroke(230, 220, 200);
  strokeWeight(2);
  line(0, -18, 0, -26);

  noStroke();
  const baseAlpha = bright ? 230 : 190;
  fill(240, 180, 120, baseAlpha);
  ellipse(0, -6, 20, 26);
  fill(255, 230, 190, baseAlpha + 20);
  rectMode(CENTER);
  rect(0, -6, 14, 6, 3);

  fill(200, 120, 90, baseAlpha);
  rect(0, 4, 6, 6, 2);

  pop();
}

function drawIntroCrane(x, y, scaleAmt, facing = 1) {
  push();
  translate(x, y);
  scale(scaleAmt * facing, scaleAmt);

  const flap = Math.sin(frameCount * 0.2) * 6;

  noStroke();
  fill(225, 240, 255);
  push();
  rotate(radians(flap));
  triangle(-14, 4, 0, -8, 14, 4);
  pop();
  ellipse(0, 4, 10, 8);
  triangle(0, 0, 6, -4, 10, -2);

  pop();
}

function drawIntroWallGuard(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  rectMode(CENTER);
  noStroke();
  fill(120, 160, 190);
  rect(0, -4, 16, 20, 3);

  fill(230, 210, 180);
  ellipse(0, -18, 12, 10);

  fill(60, 80, 110);
  rect(0, -20, 14, 6, 2);

  stroke(80, 60, 40);
  strokeWeight(2.5);
  line(6, -10, 14, 4);
  line(14, 4, 18, -2);

  pop();
}

function drawIntroNeanderthal(x, y, scaleAmt, facing = 1) {
  push();
  translate(x, y);
  scale(scaleAmt * facing, scaleAmt);

  // Body
  noStroke();
  fill(145, 90, 50);
  rectMode(CENTER);
  rect(0, -18, 26, 30, 6);

  // Head
  fill(210, 170, 130);
  ellipse(0, -38, 20, 22);

  // Hair / brow ridge
  fill(80, 50, 30);
  arc(0, -40, 22, 16, Math.PI, 0);

  // Eyes + frown
  fill(0);
  ellipse(-5, -39, 3, 3);
  ellipse(5, -39, 3, 3);
  noFill();
  stroke(0);
  strokeWeight(2);
  arc(0, -33, 10, 6, Math.PI, 0);

  // Arms
  stroke(210, 170, 130);
  strokeWeight(3);
  line(-10, -24, -16, -16);
  line(10, -24, 16, -16);

  pop();
}

function drawIntroBoulder(x, y, scaleAmt) {
  push();
  translate(x, y);
  scale(scaleAmt);

  noStroke();
  fill(140, 100, 70);
  ellipse(0, 0, 26, 24);

  stroke(70, 40, 20);
  strokeWeight(2);
  noFill();
  ellipse(0, 0, 26, 24);
  line(-8, -3, 6, -1);
  line(-5, 3, 5, 4);

  pop();
}

// --- Drawing helpers ---

function isInSafeZone(level, theta) {
  if (!level.safeZones) return false;
  for (const zone of level.safeZones) {
    if (theta >= zone.thetaStart && theta <= zone.thetaEnd) {
      return true;
    }
  }
  return false;
}

function drawSpiral(level) {
  const thetaLimit = level?.isCoreBossLevel ? BOSS_MAX_THETA : maxTheta;
  const coreR = level?.isCoreBossLevel ? getBossCoreRadius() : 0;
  const thetaStart = level?.isCoreBossLevel ? Math.max(0, coreR / spiralA - Math.PI) : 0;
  noFill();
  beginShape();
  for (let t = thetaStart; t <= thetaLimit; t += 0.05) {
    let r = level.platformCurve(t);

    // Skip segments that have already been eaten by the growing core
    if (level.isCoreBossLevel && r < coreR) {
      continue;
    }

    if (level.isCoreBossLevel) {
      const total = bossDurationTotal || level.bossDurationFrames || LEVEL_TIME_LIMIT_FRAMES;
      const progress = 1 - levelTimeFramesRemaining / total;
      const swirl = 12 * progress * Math.sin(t * 2 + frameCount * 0.08);
      r = Math.max(coreR, r - swirl);
    }

    const pos = worldToScreen(t, r);
    const x = pos.x;
    const y = pos.y;

    if (level.isPulseLevel && isInSafeZone(level, t)) {
      strokeWeight(12);
      stroke(
        Math.min(level.palette.spiral[0] + 40, 255),
        Math.min(level.palette.spiral[1] + 40, 255),
        Math.min(level.palette.spiral[2] + 40, 255)
      );
    } else {
      strokeWeight(4);
      stroke(level.palette.spiral);
    }
    vertex(x, y);
  }
  endShape();
}

function drawPulseSafePads(level) {
  if (!level.isPulseLevel || !level.safeZones) return;

  const padColor = level.palette.portal;
  const thetaStep = 0.25;

  noStroke();
  for (const zone of level.safeZones) {
    for (let t = zone.thetaStart; t <= zone.thetaEnd; t += thetaStep) {
      const r = level.platformCurve(t);
      const pos = worldToScreen(t, r);

      fill(padColor[0], padColor[1], padColor[2], 210);
      ellipse(pos.x, pos.y, 34, 18);

      fill(0, 70);
      ellipse(pos.x, pos.y + 6, 26, 10);
    }
  }
}

function drawPortal(level) {
  noStroke();

  if (level.isCoreBossLevel) {
    // Growing core in the center
    const coreR = getBossCoreRadius();
    const pulse = 6 * Math.sin(frameCount * 0.08);

    fill(level.palette.portal[0], level.palette.portal[1], level.palette.portal[2], 220);
    ellipse(centerX, centerY, coreR * 2 + pulse, coreR * 2 + pulse);

    fill(255, 255, 255, 160);
    ellipse(centerX, centerY, coreR * 1.1 + pulse * 0.5, coreR * 1.1 + pulse * 0.5);

    // Outer exit portal
    const bossExit = getBossExit();
    const pos = worldToScreen(bossExit.theta, bossExit.r);
    const exitPulse = 12 * Math.sin(frameCount * 0.07) + 20;

    noStroke();
    fill(level.palette.portal[0], level.palette.portal[1], level.palette.portal[2], 120);
    ellipse(pos.x, pos.y, 46 + exitPulse, 46 + exitPulse);

    noFill();
    stroke(level.palette.portal[0], level.palette.portal[1], level.palette.portal[2], 230);
    strokeWeight(4);
    ellipse(pos.x, pos.y, 34 + exitPulse, 34 + exitPulse);
    strokeWeight(2);
    ellipse(pos.x, pos.y, 18 + exitPulse * 0.6, 18 + exitPulse * 0.6);
  } else {
    // Standard portal
    fill(level.palette.portal[0], level.palette.portal[1], level.palette.portal[2], 200);
    const pulse = 8 * Math.sin(frameCount * 0.05) + 24;
    ellipse(centerX, centerY, 32 + pulse, 32 + pulse);
    fill(255, 255, 255, 180);
    ellipse(centerX, centerY, 16 + pulse * 0.3, 16 + pulse * 0.3);
  }
}

function updateAndDrawPulse(level) {
  if (!level.isPulseLevel) return;
  if (GAME_STATE !== "PLAY") return;

  const thetaLimit = level?.isCoreBossLevel ? BOSS_MAX_THETA : maxTheta;

  if (!pulseActive) {
    if (pulseCooldown > 0) {
      pulseCooldown--;
    } else {
      pulseActive = true;
      pulseHeadTheta = 0;
    }
  } else {
    pulseHeadTheta += level.pulseSpeed;
    if (pulseHeadTheta >= thetaLimit) {
      pulseActive = false;
      pulseCooldown = level.pulseIntervalFrames;
    }
  }

  if (pulseActive) {
    stroke(80, 230, 255);
    strokeWeight(6);
    noFill();
    beginShape();
    for (let t = 0; t <= pulseHeadTheta; t += 0.05) {
      const r = level.platformCurve(t);
      const pos = worldToScreen(t, r);
      const x = pos.x;
      const y = pos.y;
      vertex(x, y);
    }
    endShape();

    noStroke();
    fill(120, 250, 255, 120);
    ellipse(centerX, centerY, 50, 50);
  }

  if (pulseActive && GAME_STATE === "PLAY" && invulnFrames <= 0) {
    const angleHit = player.theta <= pulseHeadTheta + 0.1;
    const dr = Math.abs(player.r - platformR(player.theta));
    if (angleHit && dr <= 20 && !isInSafeZone(level, player.theta)) {
      resetPlayerToStart();
    }
  }
}

function updateBossPull(level) {
  if (!level.isCoreBossLevel) {
    bossPullOffset = 0;
    return;
  }

  const total = bossDurationTotal || level.bossDurationFrames || LEVEL_TIME_LIMIT_FRAMES;
  const baseProgress = 1 - levelTimeFramesRemaining / total; // 0 → 1 over time

  // Each drop multiplies bossCollapseRate, accelerating the collapse.
  const effective = constrain(baseProgress * bossCollapseRate, 0, 1);

  // Slight easing so it still feels organic
  const eased = effective * effective;

  bossPullOffset = constrain(eased, 0, 1);
}

function drawEnemies() {
  const level = currentLevelObj();
  const bearerThetas = enemies
    .filter((en) => (en.subtype || level.enemyType) === "standardBearer")
    .map((en) => en.theta);

  enemies.forEach((e) => {
    if (freezeFrames <= 0) {
      e.update(bearerThetas);
    }
    e.draw();

    // Simple collision: distance-based
    if (GAME_STATE === "PLAY" && invulnFrames <= 0 && !player.warpAnimating) {
      const d = dist(player.x, player.y, e.x, e.y);
      const sameLevel = Math.abs(player.r - e.r) <= 18; // require roughly same platform level
      const hitRadius = player.radius + 12 + (e.hitboxBoost || 0);
      if (sameLevel && d < hitRadius) {
        const type = e.subtype || currentLevelObj().enemyType;
        if (currentLevelObj().isCoreBossLevel) {
          // Boss hits yank the traveler outward without costing a life.
          playSfx("hit");

          const respawn = getBossRespawn();
          player.theta = respawn.theta;
          player.r = respawn.r;
          const pos = worldToScreen(player.theta, player.r);
          player.x = pos.x;
          player.y = pos.y;
          player.rVel = 0;
          player.onGround = false;
          player.coyoteFrames = 6;

          // Brief invulnerability so back-to-back hits don't chain-punish immediately.
          invulnFrames = 60;
          return;
        }
        playSfx("hit");
        resetPlayerToStart();
      }
    }
  });
}

function drawShards() {
  shards.forEach((s) => {
    s.update();
    s.draw();

    if (GAME_STATE === "PLAY" && !s.collected) {
      const d = dist(player.x, player.y, s.x, s.y);
      if (d < player.radius + 10) {
        s.collected = true;
        globalShardTotal++;
        shardsEarnedThisRun++;
        checkChronoCoreUnlock();
        handleShardMilestones();
      }
    }
  });
}

function drawHUD(level) {
  noStroke();
  fill(230);
  textSize(14);
  textAlign(LEFT, TOP);
  text(level.name, 14, 12);
  text(`Theme hint: ${level.musicHint}`, 14, 30);
  text(`Year: ${level.year} — ${level.location}`, 14, 48);
  text("Arrow keys: run • X/Up/Space: jump", 14, 66);
  text("Down/C/Alt: drop • Air double-jump after 30 shards", 14, 82);

  // Warp progress bar
  const outerR = level.platformCurve(maxTheta);
  const progress = map(player.getR(), outerR, 0, 0, width * 0.45, true);
  const barY = height - 24;

  fill(60, 110, 150);
  rect(14, barY, width * 0.45, 10, 4);
  fill(120, 240, 180);
  rect(14, barY, progress, 10, 4);

  fill(230);
  textAlign(LEFT, CENTER);
  text("Warp Progress", 14, barY - 14);

  // Shard HUD
  const levelShardTotal = shards.length;
  textAlign(LEFT, TOP);
  text(`Time Shards: ${countCollectedInCurrentLevel()} / ${levelShardTotal}`, 14, 100);

  const invReady = globalShardTotal >= INVULN_SHARD_THRESHOLD;
  const freezeReady = globalShardTotal >= FREEZE_SHARD_THRESHOLD;

  let invStatus = `Invuln: locked (need ${INVULN_SHARD_THRESHOLD})`;
  if (invReady) {
    if (invulnFrames > 0) {
      invStatus = `Invuln: active (${Math.ceil(invulnFrames / 60)}s)`;
    } else if (invulnCooldown > 0) {
      invStatus = `Invuln: cooldown (${Math.ceil(invulnCooldown / 60)}s)`;
    } else {
      invStatus = "Invuln: ready (S/Ctrl)";
    }
  }

  let freezeStatus = `Freeze: locked (need ${FREEZE_SHARD_THRESHOLD})`;
  if (freezeReady) {
    if (freezeFrames > 0) {
      freezeStatus = `Freeze: active (${Math.ceil(freezeFrames / 60)}s)`;
    } else if (freezeCooldown > 0) {
      freezeStatus = `Freeze: cooldown (${Math.ceil(freezeCooldown / 60)}s)`;
    } else {
      freezeStatus = "Freeze: ready (D)";
    }
  }

  text(invStatus, 14, 116);
  text(freezeStatus, 14, 132);

  // Countdown timer (mm:ss)
  const secondsLeft = Math.max(0, Math.floor(levelTimeFramesRemaining / 60));
  const mm = nf(Math.floor(secondsLeft / 60), 2);
  const ss = nf(secondsLeft % 60, 2);
  textAlign(RIGHT, TOP);
  text(`Time: ${mm}:${ss}`, width - 16, 12);
  text(`Lives: ${lives}`, width - 16, 28);
}

function drawUnlockBanner() {
  if (unlockMessageTimer <= 0 || !unlockMessage) return;
  const alpha = map(unlockMessageTimer, 0, 120, 0, 220, true);
  textAlign(CENTER, CENTER);
  textSize(32);
  stroke(0, alpha);
  strokeWeight(4);
  fill(255, 240, 150, alpha);
  text(unlockMessage, width / 2, height * 0.22);
  unlockMessageTimer--;
  if (unlockMessageTimer <= 0) {
    unlockMessage = "";
  }
}

// --- Level / game flow ---

function warpToNextLevel() {
  const level = currentLevelObj();
  if (level.isPulseLevel && currentLevel === CHRONO_CORE_INDEX) {
    unlockedLevels[BOSS_LEVEL_INDEX] = true;
    selectedLevelIndex = BOSS_LEVEL_INDEX;
    startLevel(BOSS_LEVEL_INDEX);
    return;
  }

  const next = Math.min(currentLevel + 1, levels.length - 1);
  if (next === CHRONO_CORE_INDEX && globalShardTotal < BOSS_SHARD_GOAL) {
    checkChronoCoreUnlock();
    GAME_STATE = "MAP";
    return;
  }
  if (next !== currentLevel && !unlockedLevels[next]) {
    unlockedLevels[next] = true;
  }
  checkChronoCoreUnlock();
  selectedLevelIndex = unlockedLevels[next] ? next : selectedLevelIndex;
  GAME_STATE = "MAP";
}

function resetPlayerToStart() {
  player = new Player();
}

function startLevel(idx) {
  currentLevelIndex = idx;
  currentLevel = idx;
  selectedLevelIndex = idx;
  updateMaxThetaForCurrentLevel();
  postIntroFadeFrames = 0;
  resetPlayerToStart();
  generateEnemies();
  generateShards();
  bossPullOffset = 0;
  const level = levels[idx];
  bossDurationTotal = level.isCoreBossLevel
    ? level.bossDurationFrames || LEVEL_TIME_LIMIT_FRAMES
    : LEVEL_TIME_LIMIT_FRAMES;
  levelTimeFramesRemaining = bossDurationTotal;
  if (level.isCoreBossLevel) {
    bossCollapseRate = 1;
  }
  shardsEarnedThisRun = 0;
  if (level.isPulseLevel) {
    pulseActive = false;
    pulseHeadTheta = 0;
    pulseCooldown = 60; // first pulse quickly
    level.pulseIntervalFrames = level.pulseIntervalFrames || 10 * 60; // tighten repeat cadence
  }
  playLevelMusic(idx);
  introTimer = INTRO_DURATION;
  GAME_STATE = "INTRO";
}

function loseLife() {
  globalShardTotal = Math.max(0, globalShardTotal - shardsEarnedThisRun);
  shardsEarnedThisRun = 0;
  bossCollapseRate = 1;
  lives = Math.max(0, lives - 1);

  if (lives <= 0) {
    GAME_STATE = "GAME_OVER";
    return;
  }

  bossPullOffset = 0;
  GAME_STATE = "MAP";
  resetPlayerToStart();
  generateEnemies();
  generateShards();
  levelTimeFramesRemaining = LEVEL_TIME_LIMIT_FRAMES;
}

function handleLevelTimeout() {
  loseLife();
}

function handleBossVictory() {
  bossPullOffset = 0;
  bossCollapseRate = 1;
  shardsEarnedThisRun = 0;
  GAME_STATE = "MAP";
}

function generateEnemies() {
  enemies.length = 0;
  const level = currentLevelObj();
  const count = level.enemyCount || 6;
  const offsets = level.enemyOffsets || [-30, -10, 10, 30];
  const stageIndex = currentLevel;

  // Core boss: spawn the main Warden plus a fleet of smaller sentinels
  if (level.isCoreBossLevel) {
    // Primary boss
    enemies.push(new Enemy(2 * Math.PI, 0, "bossWarden"));

    const miniCount = 10;
    for (let i = 0; i < miniCount; i++) {
      const theta = map(i, 0, miniCount, 1.5 * Math.PI, maxTheta - Math.PI * 1.5);
      enemies.push(new Enemy(theta, 0, "bossMini"));
    }
    return;
  }

  // Stage 1 mixes Neanderthals with boulders
  if (stageIndex === 0) {
    const neanderCount = Math.min(2, count);

    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const offset = random(offsets);
      const subtype = i < neanderCount ? "neanderthal" : "boulder";
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 2 — Ancient India: lotus orbs + sages + monkeys
  if (stageIndex === 1) {
    const sageCount = Math.max(1, Math.floor(count * 0.25));
    const monkeyCount = Math.max(1, Math.floor(count * 0.25));
    const lotusCount = Math.max(0, count - sageCount - monkeyCount);
    const typeSlots = [
      ...Array(lotusCount).fill("lotusOrb"),
      ...Array(sageCount).fill("brahminSage"),
      ...Array(monkeyCount).fill("monkeyThief"),
    ];

    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "brahminSage") offset = random([-14, -8, 0, 8, 14]);
      if (subtype === "monkeyThief") offset = random([-16, -10, 10, 16]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 3 — Ancient Egypt: scarabs + mummies + ankhs
  if (stageIndex === 2) {
    const mummyCount = Math.max(1, Math.floor(count * 0.3));
    const wispCount = Math.max(1, Math.floor(count * 0.2));
    const scarabCount = Math.max(0, count - mummyCount - wispCount);
    const typeSlots = [
      ...Array(scarabCount).fill("scarab"),
      ...Array(mummyCount).fill("mummyWalker"),
      ...Array(wispCount).fill("ankhWisp"),
    ];

    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      let offset = random(offsets);
      const subtype = typeSlots[i % typeSlots.length];
      if (subtype === "ankhWisp") offset = random([10, 14, 18]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 4 — Ancient Greece: hoplites + harpies + rolling amphorae
  if (stageIndex === 3) {
    const harpyCount = Math.max(1, Math.floor(count * 0.3));
    const amphoraCount = Math.max(1, Math.floor(count * 0.2));
    const hopliteCount = Math.max(0, count - harpyCount - amphoraCount);
    const typeSlots = [
      ...Array(hopliteCount).fill("hoplite"),
      ...Array(harpyCount).fill("harpy"),
      ...Array(amphoraCount).fill("rollingAmphora"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "rollingAmphora") offset = random([-10, -6, 6, 10]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 5 — Ancient Rome: legionaries + standard bearers + rolling shields
  if (stageIndex === 4) {
    const bearerCount = Math.max(1, Math.floor(count * 0.25));
    const shieldCount = Math.max(1, Math.floor(count * 0.25));
    const legionCount = Math.max(0, count - bearerCount - shieldCount);
    const typeSlots = [
      ...Array(legionCount).fill("legionary"),
      ...Array(bearerCount).fill("standardBearer"),
      ...Array(shieldCount).fill("rollingShield"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "rollingShield") offset = random([10, 14, 18]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 6 — Byzantine Empire: ikons + censer smoke + mosaic shards
  if (stageIndex === 5) {
    const censerCount = Math.max(1, Math.floor(count * 0.25));
    const shardCount = Math.max(1, Math.floor(count * 0.25));
    const ikonCount = Math.max(0, count - censerCount - shardCount);
    const typeSlots = [
      ...Array(ikonCount).fill("ikon"),
      ...Array(censerCount).fill("censerSmoke"),
      ...Array(shardCount).fill("mosaicShard"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "mosaicShard") offset = random([-12, -6, 6, 12]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 7 — Medieval China: lantern spirits + cranes + palace guards
  if (stageIndex === 6) {
    const craneCount = Math.max(1, Math.floor(count * 0.3));
    const guardCount = Math.max(1, Math.floor(count * 0.25));
    const lanternCount = Math.max(0, count - craneCount - guardCount);
    const typeSlots = [
      ...Array(lanternCount).fill("lanternSpirit"),
      ...Array(craneCount).fill("paperCrane"),
      ...Array(guardCount).fill("palaceGuard"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "paperCrane") offset = random([-18, -12, 12, 18]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 8 — Medieval France: knights + war horses + banner wavers
  if (stageIndex === 7) {
    const horseCount = Math.max(1, Math.floor(count * 0.3));
    const bannerCount = Math.max(1, Math.floor(count * 0.25));
    const knightCount = Math.max(0, count - horseCount - bannerCount);
    const typeSlots = [
      ...Array(knightCount).fill("frKnight"),
      ...Array(horseCount).fill("warHorse"),
      ...Array(bannerCount).fill("bannerWaver"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "warHorse") offset = random([-18, -10, 10, 18]);
      if (subtype === "bannerWaver") offset = random([-14, -8, 8, 14]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 9 — Renaissance Italy: inventors + apprentices + flying contraptions
  if (stageIndex === 8) {
    const apprenticeCount = Math.max(1, Math.floor(count * 0.3));
    const flierCount = Math.max(1, Math.floor(count * 0.25));
    const inventorCount = Math.max(0, count - apprenticeCount - flierCount);
    const typeSlots = [
      ...Array(inventorCount).fill("itInventor"),
      ...Array(apprenticeCount).fill("itApprentice"),
      ...Array(flierCount).fill("flyingContraption"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "flyingContraption") offset = random([-18, -10, 10, 18]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 10 — Britain: musketeers + sailors + cannonballs
  if (stageIndex === 9) {
    const sailorCount = Math.max(1, Math.floor(count * 0.3));
    const cannonCount = Math.max(1, Math.floor(count * 0.2));
    const musketeerCount = Math.max(0, count - sailorCount - cannonCount);
    const typeSlots = [
      ...Array(musketeerCount).fill("britMusketeer"),
      ...Array(sailorCount).fill("deckSailor"),
      ...Array(cannonCount).fill("cannonball"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "cannonball") offset = random([16, 18, 20]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 11 — Modern America: skaters + cars + neon drones
  if (stageIndex === 10) {
    const carCount = Math.max(1, Math.floor(count * 0.3));
    const droneCount = Math.max(1, Math.floor(count * 0.2));
    const skaterCount = Math.max(0, count - carCount - droneCount);
    const typeSlots = [
      ...Array(skaterCount).fill("usSkater"),
      ...Array(carCount).fill("freewayCar"),
      ...Array(droneCount).fill("neonDrone"),
    ];
    const carOffsets = [-24, -14, 14, 24, 30];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "freewayCar") offset = random(carOffsets);
      if (subtype === "neonDrone") offset = random([-14, -8, 8, 14]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  // Stage 12 — Future Japan: mechs + drones + hologuards
  if (stageIndex === 11) {
    const droneCount = Math.max(1, Math.floor(count * 0.3));
    const holoCount = Math.max(1, Math.floor(count * 0.2));
    const mechCount = Math.max(0, count - droneCount - holoCount);
    const typeSlots = [
      ...Array(mechCount).fill("jpMech"),
      ...Array(droneCount).fill("jpDrone"),
      ...Array(holoCount).fill("jpHoloGuard"),
    ];
    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const subtype = typeSlots[i % typeSlots.length];
      let offset = random(offsets);
      if (subtype === "jpDrone") offset = random([-18, -12, 12, 18]);
      if (subtype === "jpHoloGuard") offset = random([-10, 0, 10]);
      enemies.push(new Enemy(theta, offset, subtype));
    }
    return;
  }

  for (let i = 0; i < count; i++) {
    const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
    const offset = random(offsets);
    enemies.push(new Enemy(theta, offset));
  }
}

function generateShards() {
  shards.length = 0;
  const level = currentLevelObj();
  const count = typeof level.shardCount === "number" ? level.shardCount : 6;

  // Levels with shardCount === 0 intentionally have none (e.g., Chaos Core, Boss)
  if (count <= 0) return;

  for (let i = 0; i < count; i++) {
    const theta = map(i + 0.5, 0, count, 0.8 * Math.PI, maxTheta - 1.5 * Math.PI);
    // Keep shards close to the walkable band so they're reachable
    const offset = i % 2 === 0 ? -16 : 16;
    shards.push(new TimeShard(theta, offset));
  }
}

function countCollectedInCurrentLevel() {
  let c = 0;
  shards.forEach((s) => {
    if (s.collected) c++;
  });
  return c;
}

function checkChronoCoreUnlock() {
  if (!unlockedLevels[CHRONO_CORE_INDEX] && globalShardTotal >= BOSS_SHARD_GOAL) {
    unlockedLevels[CHRONO_CORE_INDEX] = true;
  }
}

function showUnlockMessage(text) {
  unlockMessage = text;
  unlockMessageTimer = 120;
}

function handleShardMilestones() {
  if (!invulnUnlocked && globalShardTotal >= INVULN_SHARD_THRESHOLD) {
    invulnUnlocked = true;
    showUnlockMessage("Invulnerability Unlocked!");
  }

  if (!freezeUnlocked && globalShardTotal >= FREEZE_SHARD_THRESHOLD) {
    freezeUnlocked = true;
    showUnlockMessage("Time Freeze Unlocked!");
  }

  if (!doubleJumpUnlocked && globalShardTotal >= DOUBLE_JUMP_SHARD_THRESHOLD) {
    doubleJumpUnlocked = true;
    showUnlockMessage("Double Jump Unlocked!");
  }

  const lifeMilestone = Math.floor(globalShardTotal / EXTRA_LIFE_SHARD_STEP);
  if (lifeMilestone > extraLivesAwarded) {
    const gained = lifeMilestone - extraLivesAwarded;
    lives += gained;
    extraLivesAwarded = lifeMilestone;
    showUnlockMessage(gained > 1 ? `Extra Lives +${gained}!` : "Extra Life!" );
  }
}

function grantPlaytestUnlock() {
  globalShardTotal = Math.max(globalShardTotal, BOSS_SHARD_GOAL);
  checkChronoCoreUnlock();
  unlockedLevels[BOSS_LEVEL_INDEX] = true;
  selectedLevelIndex = Math.max(selectedLevelIndex, CHRONO_CORE_INDEX);
  handleShardMilestones();
}

function resetRunProgress() {
  // Reset overall progression, lives, and stage state back to the map.
  stopCurrentMusic();
  globalShardTotal = 0;
  lives = MAX_LIVES;
  extraLivesAwarded = 0;
  shardsEarnedThisRun = 0;
  invulnFrames = 0;
  freezeFrames = 0;
  invulnCooldown = 0;
  freezeCooldown = 0;
  pulseActive = false;
  pulseHeadTheta = 0;
  pulseCooldown = 0;
  bossPullOffset = 0;
  bossCollapseRate = 1;
  invulnUnlocked = false;
  freezeUnlocked = false;
  doubleJumpUnlocked = false;
  unlockMessage = "";
  unlockMessageTimer = 0;

  // All eras are playable from the start except the Chaos Core and final boss
  unlockedLevels = levels.map((_, i) => i < CHRONO_CORE_INDEX);
  selectedLevelIndex = 0;
  currentLevel = 0;
  currentLevelIndex = 0;

  updateMaxThetaForCurrentLevel();
  resetPlayerToStart();
  generateEnemies();
  generateShards();
  bossDurationTotal = LEVEL_TIME_LIMIT_FRAMES;
  levelTimeFramesRemaining = LEVEL_TIME_LIMIT_FRAMES;
}
