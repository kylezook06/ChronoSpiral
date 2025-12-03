// ChronoSpiral: Radial Donkey-Kong-inspired prototype
// p5.js 1.11.x

const CANVAS_W = 960; // kept as legacy, not used for createCanvas
const CANVAS_H = 540;

let centerX, centerY;

// Base spiral parameter used by all platform curves
let spiralA = 12; // tightness of the spiral (r = a * theta)
let maxTheta = 10 * Math.PI;

let player;
let currentLevel = 0;
let currentLevelIndex = 0;

const START_THETA_FACTOR = 0.9; // start near the outer edge

// Game states
let GAME_STATE = "MAP"; // MAP | INTRO | PLAY
let introTimer = 0;
const INTRO_DURATION = 120; // frames (~2 seconds)

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
    enemyType: "boulder",
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
    name: "Final Stage — Chrono Nexus",
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
    // Wild, unstable curve for the finale
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const chaos = 50 * Math.sin(3 * theta + Math.sin(theta * 2));
      return base + chaos;
    },
  },
];

const BOSS_LEVEL_INDEX = levels.length - 1;
const BOSS_SHARD_GOAL = 60;
const DOUBLE_JUMP_SHARD_THRESHOLD = 30;

const enemies = [];
const shards = [];
let globalShardTotal = 0;

// --- Helpers for current level & platform curve ---

function currentLevelObj() {
  return levels[currentLevel % levels.length];
}

function platformR(theta) {
  return currentLevelObj().platformCurve(theta);
}

// --- Player ---

class Player {
  constructor() {
    // Start near the "outer" end of the path
    this.theta = maxTheta * START_THETA_FACTOR;
    this.prevTheta = this.theta;
    this.rVel = 0;
    this.jumpStrength = -4; // toned-down inward impulse
    this.maxOutwardSpeed = 3; // cap falling speed
    this.onGround = false;
    this.radius = 14;
    this.coyoteFrames = 0;
    this.movingDir = 0; // -1 left, 1 right, 0 idle
    this.doubleJumpReady = false;
    this.airJumpUsed = false;
    this.jumpHeld = false;
    this.downHeld = false;

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
    if (deltaTheta > 0.0001) this.movingDir = 1;
    else if (deltaTheta < -0.0001) this.movingDir = -1;
    else this.movingDir = 0;

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

    // Check for falling off the outer edge: if too far beyond the outer radius, reset
    const outerLimit = platformR(maxTheta) + 80;
    if (currentR > outerLimit) {
      resetPlayerToStart();
      return;
    }

    // Update position from polar
    this.x = centerX + currentR * Math.cos(this.theta);
    this.y = centerY + currentR * Math.sin(this.theta);
    this.r = currentR;

    // Warp trigger: close enough to center
    if (currentR < 35) {
      warpToNextLevel();
    }
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
    const outline = 3;

    const bodyColor = color(90, 180, 255); // blue coat
    const bellyColor = color(240, 245, 255);
    const skinColor = color(255, 225, 190);
    const eyeColor = color(0);
    const accentColor = color(255, 215, 120); // time-belt / gadget

    const isRunning = this.onGround && this.movingDir !== 0;
    const isAirborne = !this.onGround;

    const t = frameCount * 0.25; // animation phase

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

    // --- ALIGN FEET OUTWARD ---
    rotate(radialAngle - HALF_PI);

    // Drop dust / warp trails
    if (this.dropAnimating) {
      const progress = 1 - this.dropAnimTimer / this.dropAnimFrames;
      const alpha = 120 * (1 - progress);

      noStroke();
      fill(255, 255, 255, alpha);
      const baseY = 12;
      for (let i = -1; i <= 1; i++) {
        const px = i * 5;
        const py = baseY + 4 + progress * 6;
        ellipse(px, py, 4 + progress * 2, 4 + progress * 2);
      }

      fill(180, 240, 255, alpha);
      rectMode(CENTER);
      rect(0, baseY + 2 + progress * 4, 14, 3 + progress * 3, 2);
    }

    // Body bob when running
    if (isRunning) {
      const bob = 1.5 * Math.sin(t * 2);
      translate(0, bob);
    }

    // Slight lift when airborne
    if (isAirborne) {
      translate(0, -2);
    }

    // Extra lean in direction of motion along tangent
    if (isRunning) {
      rotate(this.movingDir * 0.18);
    }

    // LEGS (behind body)
    stroke(0);
    strokeWeight(3);
    strokeCap(ROUND);
    noFill();

    const legPhase = t * 2;
    const legAmp = isRunning ? 6 : 0;
    const legSpread = 4;

    // Left leg
    let leftSwing = legAmp * Math.sin(legPhase);
    line(-legSpread, 4, -legSpread + leftSwing, 14);
    // Right leg (opposite phase)
    let rightSwing = legAmp * Math.sin(legPhase + Math.PI);
    line(legSpread, 4, legSpread + rightSwing, 14);

    // BODY (chubby coat)
    noStroke();
    fill(bodyColor);
    rectMode(CENTER);
    rect(0, -4, 20, 22, 6);

    // Belly / chest panel
    fill(bellyColor);
    rect(0, -2, 12, 14, 4);

    // Time-belt / gadget
    fill(accentColor);
    rect(0, 4, 16, 4, 3);
    fill(0);
    ellipse(0, 4, 6, 6); // little "clock" in the center

    // ARMS
    stroke(0);
    strokeWeight(3);
    strokeCap(ROUND);
    noFill();
    const armPhase = t * 2;
    const armAmp = isRunning ? 6 : 2;

    // Left arm
    let leftArmSwing = armAmp * Math.sin(armPhase + Math.PI);
    line(-8, -8, -14 + leftArmSwing, -4);
    // Right arm
    let rightArmSwing = armAmp * Math.sin(armPhase);
    line(8, -8, 14 + rightArmSwing, -4);

    // HEAD
    noStroke();
    fill(skinColor);
    ellipse(0, -16, 16, 14); // roundish head

    // Goggles / hair band
    fill(bodyColor);
    rect(0, -16, 18, 4, 2);

    // Eyes
    fill(eyeColor);
    ellipse(-3, -16, 3, 3);
    ellipse(3, -16, 3, 3);

    // Tiny smile
    stroke(0);
    strokeWeight(1.5);
    noFill();
    arc(0, -12, 6, 4, 0, Math.PI);

    // Little top-hat brim (time traveller vibe)
    noStroke();
    fill(bodyColor);
    rect(0, -20, 14, 3, 1);
    fill(accentColor);
    rect(0, -22, 10, 6, 2);

    // Outline around main body+head to help pop
    noFill();
    stroke(0);
    strokeWeight(outline);
    rect(0, -4, 20, 22, 6);
    ellipse(0, -16, 16, 14);

    pop();
  }
}

// --- Enemy ---

class Enemy {
  constructor(theta, offset) {
    this.theta = theta;
    this.offset = offset;
    this.dir = random([1, -1]);
    this.baseSpeed = random(0.005, 0.015);
    this.speed = this.baseSpeed * this.dir;
  }

  update() {
    const level = currentLevelObj();
    const enemySpeedScale = level.difficulty?.enemySpeedScale ?? 1;
    let speedMag = this.baseSpeed * enemySpeedScale;

    if (level.enemyType === "hoplite") {
      speedMag *= 1.4;
    } else if (level.enemyType === "ikon") {
      speedMag *= 0.85;
    } else if (level.enemyType === "frKnight") {
      speedMag *= 1.05;
    } else if (level.enemyType === "itInventor") {
      speedMag *= 1.05;
    } else if (level.enemyType === "britMusketeer") {
      speedMag *= 0.9;
    } else if (level.enemyType === "usSkater") {
      speedMag *= 1.5;
    } else if (level.enemyType === "jpMech") {
      speedMag *= 1.6;
    } else if (level.enemyType === "bossChaos") {
      speedMag *= 1.8;
    }

    const thetaDelta = speedMag * this.dir;
    // Move along the curve
    this.theta = constrain(this.theta + thetaDelta, 0, maxTheta);

    let turned = false;

    if (this.theta <= 0 || this.theta >= maxTheta) {
      this.dir *= -1;
      turned = true;
    }

    const baseR = platformR(this.theta);
    const laneR = baseR + this.offset;
    let radialWiggle = 0;

    // Slight behavior variations per enemy type, kept subtle so feet stay on the ground
    if (level.enemyType === "scarab") {
      radialWiggle = 6 * Math.sin(frameCount * 0.2 + this.theta);
    } else if (level.enemyType === "lotusOrb") {
      radialWiggle = 4 * Math.sin(frameCount * 0.15 + this.theta * 0.5);
    } else if (level.enemyType === "lanternSpirit") {
      radialWiggle = 6 * Math.sin(frameCount * 0.17 + this.theta * 0.35);
      radialWiggle += 3 * Math.sin(frameCount * 0.11 + this.offset * 0.2);
    } else if (level.enemyType === "legionary") {
      if (turned) {
        radialWiggle += 4;
      }
      radialWiggle += 3 * Math.sin(frameCount * 0.3 + this.theta);
    } else if (level.enemyType === "frKnight") {
      radialWiggle = 3 * Math.sin(frameCount * 0.18 + this.theta);
    } else if (level.enemyType === "itInventor") {
      radialWiggle = 4 * Math.sin(frameCount * 0.22 + this.theta * 0.5);
    } else if (level.enemyType === "usSkater") {
      radialWiggle = 3 * Math.sin(frameCount * 0.4 + this.theta);
    } else if (level.enemyType === "jpMech") {
      radialWiggle = 4 * Math.sin(frameCount * 0.35 + this.theta * 1.2);
    } else if (level.enemyType === "bossChaos") {
      radialWiggle = 10 * Math.sin(frameCount * 0.2 + this.theta * 1.2);
      radialWiggle += 6 * Math.sin(frameCount * 0.07 + this.offset);
    } else if (level.enemyType === "ikon") {
      radialWiggle = 4 * Math.sin(frameCount * 0.12 + this.theta * 0.5);
    }

    // Keep enemies attached to the platform lane with a small wiggle allowance
    const clampBand = 10;
    const radius = constrain(laneR + radialWiggle, laneR - clampBand, laneR + clampBand);

    this.x = centerX + radius * Math.cos(this.theta);
    this.y = centerY + radius * Math.sin(this.theta);
    this.r = radius;

    // Store last applied speed for reference
    this.speed = speedMag * this.dir;
  }

  draw() {
    const level = currentLevelObj();
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
    stroke(0);
    strokeWeight(3);
    fill(tint[0], tint[1], tint[2]);

    switch (level.enemyType) {
      case "boulder":
        // Simple rolling rock
        ellipse(0, 0, 24, 24);
        // crack line
        stroke(0);
        line(-6, -4, 3, 4);
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

  // All eras are playable from the start except the boss, which still requires shards
  unlockedLevels = levels.map((_, i) => i !== BOSS_LEVEL_INDEX);
  selectedLevelIndex = 0;

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
}

function draw() {
  if (GAME_STATE === "MAP") {
    drawMapScreen();
    return;
  }

  const level = currentLevelObj();
  background(level.palette.bg);

  drawPortal(level);
  drawSpiral(level);
  drawShards();
  drawEnemies();

  if (GAME_STATE === "PLAY") {
    player.update();
  }
  player.draw();

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
    `Time Shards: ${globalShardTotal}  •  Boss unlock at ${BOSS_SHARD_GOAL}`,
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
      const lockLabel = i === BOSS_LEVEL_INDEX ? `(Need ${BOSS_SHARD_GOAL} shards)` : "(locked)";
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

function drawSpiral(level) {
  stroke(level.palette.spiral);
  strokeWeight(4);
  noFill();
  beginShape();
  for (let t = 0; t <= maxTheta; t += 0.05) {
    const r = level.platformCurve(t);
    const x = centerX + r * Math.cos(t);
    const y = centerY + r * Math.sin(t);
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

function drawEnemies() {
  enemies.forEach((e) => {
    e.update();
    e.draw();

    // Simple collision: distance-based
    if (GAME_STATE === "PLAY") {
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
        checkBossUnlock();
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
}

// --- Level / game flow ---

function warpToNextLevel() {
  const next = Math.min(currentLevel + 1, levels.length - 1);
  if (next !== currentLevel && !unlockedLevels[next]) {
    unlockedLevels[next] = true;
  }
  checkBossUnlock();
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
  resetPlayerToStart();
  generateEnemies();
  generateShards();
  introTimer = INTRO_DURATION;
  GAME_STATE = "INTRO";
}

function generateEnemies() {
  enemies.length = 0;
  const level = currentLevelObj();
  const count = level.enemyCount || 6;
  const offsets = level.enemyOffsets || [-30, -10, 10, 30];

  for (let i = 0; i < count; i++) {
    const theta = map(i, 0, count, 0.5 * Math.PI, maxTheta - Math.PI);
    const offset = random(offsets);
    enemies.push(new Enemy(theta, offset));
  }
}

function generateShards() {
  shards.length = 0;
  const level = currentLevelObj();
  const count = level.shardCount || 6;

  for (let i = 0; i < count; i++) {
    const theta = map(i + 0.5, 0, count, 0.8 * Math.PI, maxTheta - 1.5 * Math.PI);
    // Alternate inner/outer placement around the curve
    const offset = i % 2 === 0 ? -25 : 25;
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

function checkBossUnlock() {
  if (!unlockedLevels[BOSS_LEVEL_INDEX] && globalShardTotal >= BOSS_SHARD_GOAL) {
    unlockedLevels[BOSS_LEVEL_INDEX] = true;
    selectedLevelIndex = BOSS_LEVEL_INDEX;
  }
}
