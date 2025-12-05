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

let player;
let currentLevel = 0;
let currentLevelIndex = 0;

const START_THETA_FACTOR = 0.9; // start near the outer edge

// Game states
let GAME_STATE = "MAP"; // MAP | INTRO | PLAY
let introTimer = 0;
const INTRO_DURATION = 120; // frames (~2 seconds)

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
    name: "Stage 6 — Medieval China",
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
    name: "Stage 7 — Byzantine Empire",
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
    pulseIntervalFrames: 20 * 60,
    pulseSpeed: 0.08,
    safeZones: [
      { thetaStart: 2.0 * Math.PI, thetaEnd: 2.3 * Math.PI },
      { thetaStart: 4.0 * Math.PI, thetaEnd: 4.3 * Math.PI },
      { thetaStart: 6.0 * Math.PI, thetaEnd: 6.35 * Math.PI },
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
    difficulty: { gravityScale: -1.2, runSpeedScale: 1.32, enemySpeedScale: 1.6 },
    isCoreBossLevel: true,
    bossDurationFrames: 60 * 60,
    bossMaxPull: 220,
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const ripple = 34 * Math.sin(2.2 * theta + Math.sin(theta));
      return Math.max(0, base + ripple - bossPullOffset);
    },
  },
];

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

function platformR(theta) {
  return currentLevelObj().platformCurve(theta);
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

    const initialR = platformR(this.theta);
    this.r = initialR;
    this.x = centerX + initialR * Math.cos(this.theta);
    this.y = centerY + initialR * Math.sin(this.theta);
  }

  update() {
    const level = currentLevelObj();
    const gravity = 0.22 * (level.difficulty?.gravityScale ?? 1); // radial outward acceleration
    const runSpeed = 0.035 * (level.difficulty?.runSpeedScale ?? 1); // scaled per-level pace

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

      this.x = centerX + r * Math.cos(theta);
      this.y = centerY + r * Math.sin(theta);

      if (this.climbTimer <= 0) {
        this.climbAnimating = false;
        const targetR = platformR(theta);
        this.r = targetR;
        this.x = centerX + targetR * Math.cos(theta);
        this.y = centerY + targetR * Math.sin(theta);
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

      this.x = centerX + r * Math.cos(theta);
      this.y = centerY + r * Math.sin(theta);

      if (this.dropAnimTimer <= 0) {
        this.dropAnimating = false;

        const targetR = platformR(theta);
        this.r = targetR;
        this.x = centerX + targetR * Math.cos(theta);
        this.y = centerY + targetR * Math.sin(theta);

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
      this.rVel = this.jumpStrength;
      this.onGround = false;
      this.coyoteFrames = 0;
      this.airJumpUsed = false;
      currentR += this.rVel;
    } else if (!this.onGround && this.doubleJumpReady && !this.airJumpUsed && jumpPressed) {
      // Air jump only after earning enough shards
      const innerRing = findInnerRing(this.theta, currentR);
      if (innerRing) {
        this.airJumpUsed = true;
        this.startClimbToInnerRing(innerRing.theta, innerRing.r);
        this.jumpHeld = jumpKeyDown;
        this.downHeld = downKeyDown;
        return;
      }
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

    // Update position from polar
    this.x = centerX + currentR * Math.cos(this.theta);
    this.y = centerY + currentR * Math.sin(this.theta);
    this.r = currentR;

    // Warp trigger: close enough to center
    const currentStage = currentLevelObj();
    if (currentR < 35 && !currentStage.isCoreBossLevel) {
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
    // Find the next outer loop of the spiral at the same angular position.
    const baseTheta = this.theta % TWO_PI;
    const currentR = this.getR();

    let bestTheta = null;
    let bestR = null;

    for (let k = 1; k <= 4; k++) {
      const candidateTheta = baseTheta + TWO_PI * k;
      if (candidateTheta > maxTheta) break;

      const candidateR = platformR(candidateTheta);
      if (candidateR > currentR + 25) {
        bestTheta = candidateTheta;
        bestR = candidateR;
        break;
      }
    }

    if (bestTheta === null) return false;

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
  }

  update() {
    const level = currentLevelObj();
    const type = this.subtype || level.enemyType;
    const enemySpeedScale = level.difficulty?.enemySpeedScale ?? 1;
    let speedMag = this.baseSpeed * enemySpeedScale;

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
    } else if (type === "bossChaos") {
      speedMag *= 1.8;
    } else if (type === "bossWarden") {
      speedMag *= 1.7;
    }

    this.prevTheta = this.theta;

    const thetaDelta = speedMag * this.dir;
    // Move along the curve
    this.theta = constrain(this.theta + thetaDelta, 0, maxTheta);

    let turned = false;

    if (this.theta <= 0 || this.theta >= maxTheta) {
      this.dir *= -1;
      turned = true;
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

    const baseR = platformR(this.theta);
    const laneR = baseR + constrain(this.offset, -6, 6);
    const groundOffset = type === "boulder" ? this.radius * 0.35 : 0;
    let radialWiggle = 0;

    // Slight behavior variations per enemy type, kept subtle so feet stay on the ground
    if (type === "scarab") {
      radialWiggle = 6 * Math.sin(frameCount * 0.2 + this.theta);
    } else if (type === "lotusOrb") {
      radialWiggle = 4 * Math.sin(frameCount * 0.15 + this.theta * 0.5);
    } else if (type === "lanternSpirit") {
      radialWiggle = 6 * Math.sin(frameCount * 0.17 + this.theta * 0.35);
      radialWiggle += 3 * Math.sin(frameCount * 0.11 + this.offset * 0.2);
    } else if (type === "legionary") {
      if (turned) {
        radialWiggle += 4;
      }
      radialWiggle += 3 * Math.sin(frameCount * 0.3 + this.theta);
    } else if (type === "frKnight") {
      radialWiggle = 3 * Math.sin(frameCount * 0.18 + this.theta);
    } else if (type === "itInventor") {
      radialWiggle = 4 * Math.sin(frameCount * 0.22 + this.theta * 0.5);
    } else if (type === "usSkater") {
      radialWiggle = 3 * Math.sin(frameCount * 0.4 + this.theta);
    } else if (type === "jpMech") {
      radialWiggle = 4 * Math.sin(frameCount * 0.35 + this.theta * 1.2);
    } else if (type === "bossChaos") {
      radialWiggle = 10 * Math.sin(frameCount * 0.2 + this.theta * 1.2);
      radialWiggle += 6 * Math.sin(frameCount * 0.07 + this.offset);
    } else if (type === "bossWarden") {
      radialWiggle = 8 * Math.sin(frameCount * 0.16 + this.theta * 1.3);
      radialWiggle += 5 * Math.sin(frameCount * 0.11 + this.offset * 0.6);
    } else if (type === "ikon") {
      radialWiggle = 4 * Math.sin(frameCount * 0.12 + this.theta * 0.5);
    }

    // Keep enemies attached to the platform lane with a small wiggle allowance
    const clampBand = 10;
    const radiusBase = laneR + groundOffset;
    const radius = constrain(radiusBase + radialWiggle, radiusBase - clampBand, radiusBase + clampBand);

    // Track roll based on distance traveled along the curve
    const pathDistance = Math.abs(deltaThetaSigned) * baseR;
    const spinDir = deltaThetaSigned >= 0 ? 1 : -1;
    this.rollAngle = (this.rollAngle + spinDir * (pathDistance / Math.max(this.radius, 1))) % TWO_PI;

    this.x = centerX + radius * Math.cos(this.theta);
    this.y = centerY + radius * Math.sin(this.theta);
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

    const needsFacing = !["boulder", "lotusOrb", "lanternSpirit", "ikon", "bossChaos"].includes(type);
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
      case "scarab":
        // Beetle-ish silhouette
        ellipse(0, -2, 18, 14); // body
        rect(0, -9, 10, 6, 2); // head
        line(-10, 4, -4, 0);
        line(10, 4, 4, 0);
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
    this.x = centerX + radius * Math.cos(this.theta);
    this.y = centerY + radius * Math.sin(this.theta);
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

  // All eras are playable from the start except the Chaos Core and final boss
  unlockedLevels = levels.map((_, i) => i < CHRONO_CORE_INDEX);
  selectedLevelIndex = 0;

  updateMaxThetaForCurrentLevel();
  player = new Player();
  generateEnemies();
  generateShards();
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
      invulnFrames = INVULN_DURATION;
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
    drawMapScreen();
    return;
  }

  if (invulnFrames > 0) invulnFrames--;
  if (freezeFrames > 0) freezeFrames--;
  if (invulnCooldown > 0) invulnCooldown--;
  if (freezeCooldown > 0) freezeCooldown--;

  const level = currentLevelObj();
  background(level.palette.bg);

  if (level.isCoreBossLevel) {
    updateBossPull(level);
  }

  drawPortal(level);
  drawSpiral(level);
  updateAndDrawPulse(level);
  drawShards();
  drawEnemies();

  if (GAME_STATE === "PLAY") {
    levelTimeFramesRemaining--;
    if (level.isCoreBossLevel) {
      if (levelTimeFramesRemaining <= 0) {
        handleBossVictory();
        return;
      }
    } else if (levelTimeFramesRemaining <= 0) {
      handleLevelTimeout();
      return;
    }
    player.update();
  }
  player.draw();

  if (freezeFrames > 0) {
    noStroke();
    fill(100, 180, 255, 60);
    rect(0, 0, width, height);
  }

  drawHUD(level);

  if (GAME_STATE === "INTRO") {
    drawIntroOverlay(level);
  }
}

function drawMapScreen() {
  background(8, 8, 20);
  fill(255);
  textAlign(CENTER, TOP);
  textSize(24);
  text("CHRONOSPIRAL: ERA SELECT", width / 2, 40);
  textSize(14);
  text("LEFT/RIGHT: choose • ENTER: travel • ESC: exit level", width / 2, 70);
  text(
    `Time Shards: ${globalShardTotal}  •  Chaos Core unlock at ${BOSS_SHARD_GOAL}`,
    width / 2,
    90
  );

  const rows = 2;
  const cols = Math.ceil(levels.length / rows);
  const leftMargin = 80;
  const rightMargin = 80;
  const availableWidth = Math.max(width - leftMargin - rightMargin, 200);
  const spacingX = cols > 1 ? availableWidth / (cols - 1) : 0;
  const rowY = [height * 0.42, height * 0.65];

  for (let i = 0; i < levels.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    if (row >= rows) break;

    const x = leftMargin + col * spacingX;
    const y = rowY[row];

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
  introTimer--;
  const alpha = map(introTimer, INTRO_DURATION, 0, 220, 0, true);

  fill(0, alpha);
  noStroke();
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text(level.name, width / 2, height / 2 - 20);
  textSize(16);
  text(`YEAR: ${level.year} – ${level.location}`, width / 2, height / 2 + 10);

  if (introTimer <= 0 || keyIsDown(32)) {
    GAME_STATE = "PLAY";
  }
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
  noFill();
  beginShape();
  for (let t = 0; t <= thetaLimit; t += 0.05) {
    const r = level.platformCurve(t);
    const x = centerX + r * Math.cos(t);
    const y = centerY + r * Math.sin(t);

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

function drawPortal(level) {
  noStroke();
  fill(level.palette.portal[0], level.palette.portal[1], level.palette.portal[2], 200);
  const pulse = 8 * Math.sin(frameCount * 0.05) + 24;
  ellipse(centerX, centerY, 32 + pulse, 32 + pulse);
  fill(255, 255, 255, 180);
  ellipse(centerX, centerY, 16 + pulse * 0.3, 16 + pulse * 0.3);
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
      const x = centerX + r * Math.cos(t);
      const y = centerY + r * Math.sin(t);
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
  const progress = 1 - levelTimeFramesRemaining / total;
  const maxPull = level.bossMaxPull || 200;
  bossPullOffset = constrain(maxPull * progress, 0, maxPull);
}

function drawEnemies() {
  enemies.forEach((e) => {
    if (freezeFrames <= 0) {
      e.update();
    }
    e.draw();

    // Simple collision: distance-based
    if (GAME_STATE === "PLAY" && invulnFrames <= 0) {
      const d = dist(player.x, player.y, e.x, e.y);
      const sameLevel = Math.abs(player.r - e.r) <= 18; // require roughly same platform level
      if (sameLevel && d < player.radius + 12) {
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
  resetPlayerToStart();
  generateEnemies();
  generateShards();
  bossPullOffset = 0;
  const level = levels[idx];
  bossDurationTotal = level.isCoreBossLevel
    ? level.bossDurationFrames || LEVEL_TIME_LIMIT_FRAMES
    : LEVEL_TIME_LIMIT_FRAMES;
  levelTimeFramesRemaining = bossDurationTotal;
  shardsEarnedThisRun = 0;
  if (level.isPulseLevel) {
    pulseActive = false;
    pulseHeadTheta = 0;
    pulseCooldown = 60; // first pulse quickly
    level.pulseIntervalFrames = level.pulseIntervalFrames || 10 * 60; // tighten repeat cadence
  }
  introTimer = INTRO_DURATION;
  GAME_STATE = "INTRO";
}

function handleLevelTimeout() {
  globalShardTotal = Math.max(0, globalShardTotal - shardsEarnedThisRun);
  shardsEarnedThisRun = 0;
  GAME_STATE = "MAP";
}

function handleBossVictory() {
  bossPullOffset = 0;
  shardsEarnedThisRun = 0;
  GAME_STATE = "MAP";
}

function generateEnemies() {
  enemies.length = 0;
  const level = currentLevelObj();
  const count = level.enemyCount || 6;
  const offsets = level.enemyOffsets || [-30, -10, 10, 30];

  // Stage 1 mixes Neanderthals with boulders; other stages use their default type
  if (currentLevel === 0) {
    const neanderCount = Math.min(2, count);

    for (let i = 0; i < count; i++) {
      const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
      const offset = random(offsets);
      const subtype = i < neanderCount ? "neanderthal" : "boulder";
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

function grantPlaytestUnlock() {
  globalShardTotal = Math.max(globalShardTotal, BOSS_SHARD_GOAL);
  checkChronoCoreUnlock();
  unlockedLevels[BOSS_LEVEL_INDEX] = true;
  selectedLevelIndex = Math.max(selectedLevelIndex, CHRONO_CORE_INDEX);
}
