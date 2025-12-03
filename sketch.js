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

const START_THETA_FACTOR = 0.9; // start near the outer edge

const levels = [
  {
    name: "Stage 1 — Neanderthal",
    palette: { bg: [12, 12, 28], spiral: [90, 200, 140], portal: [80, 180, 255] },
    musicHint: "Cavern beats, bone clacks",
    enemyTint: [220, 120, 80],
    enemyType: "boulder",
    enemyCount: 4,
    enemyOffsets: [-20, 20],
    shardCount: 5,
    // Simple Archimedean spiral
    platformCurve: (theta) => spiralA * theta,
  },
  {
    name: "Stage 2 — Ancient India",
    palette: { bg: [9, 10, 24], spiral: [200, 150, 255], portal: [255, 205, 90] },
    musicHint: "Sitar-like arps, tabla blips",
    enemyTint: [255, 140, 120],
    enemyType: "lotusOrb",
    enemyCount: 6,
    enemyOffsets: [-30, -10, 10, 30],
    shardCount: 7,
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
    palette: { bg: [16, 10, 18], spiral: [240, 200, 120], portal: [255, 240, 180] },
    musicHint: "Desert winds, square-wave chants",
    enemyTint: [255, 170, 70],
    enemyType: "scarab",
    enemyCount: 7,
    enemyOffsets: [-40, -20, 0, 20, 40],
    shardCount: 8,
    // Stepped pyramid: spiral snapped to tiered steps
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const stepSize = 40; // height of each "tier"
      return Math.floor(base / stepSize) * stepSize;
    },
  },
  {
    name: "Stage 4 — Ancient Greece",
    palette: { bg: [8, 12, 26], spiral: [120, 220, 255], portal: [180, 230, 255] },
    musicHint: "Lyre plucks over arps",
    enemyTint: [140, 200, 255],
    enemyType: "hoplite",
    enemyCount: 8,
    enemyOffsets: [-35, -15, 15, 35],
    shardCount: 9,
    // Star / laurel-like: spiral with spikes
    platformCurve: (theta) => {
      const base = spiralA * theta;
      const starAmp = 40;
      const spikes = 5;
      // subtract starAmp so r(0) ~ 0 and center still works
      return base + starAmp * Math.cos(spikes * theta) - starAmp;
    },
  },
];

const enemies = [];
const shards = [];
let totalShardsCollected = 0;

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
    this.jumpStrength = -6; // inward impulse
    this.onGround = false;
    this.radius = 14;
    this.coyoteFrames = 0;
    this.movingDir = 0; // -1 left, 1 right, 0 idle

    const initialR = platformR(this.theta);
    this.r = initialR;
    this.x = centerX + initialR * Math.cos(this.theta);
    this.y = centerY + initialR * Math.sin(this.theta);
  }

  update() {
    const gravity = 0.18; // radial outward acceleration
    const runSpeed = 0.035; // slowed down for a less frantic pace

    // Track previous theta for movement direction
    this.prevTheta = this.theta;

    // Angular movement: LEFT/RIGHT run along the curve
    if (keyIsDown(LEFT_ARROW)) {
      this.theta -= runSpeed;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      this.theta += runSpeed;
    }

    // Clamp theta within spiral limits
    this.theta = constrain(this.theta, 0, maxTheta);

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
    const band = 18; // tolerance around the curve
    if (currentR >= targetR - band && currentR <= targetR + band && this.rVel >= 0) {
      currentR = targetR;
      this.rVel = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
      currentR += this.rVel;
    }

    // Coyote time: brief grace period after leaving a platform
    if (this.onGround) {
      this.coyoteFrames = 6;
    } else if (this.coyoteFrames > 0) {
      this.coyoteFrames--;
    }

    // Jump inward toward center
    const jumpKeyDown =
      keyIsDown(88) || keyIsDown(UP_ARROW) || keyIsDown(32); // X, Up, or Space

    if (this.coyoteFrames > 0 && jumpKeyDown) {
      this.rVel = this.jumpStrength;
      this.onGround = false;
      this.coyoteFrames = 0;
      currentR += this.rVel;
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
    // Move along the curve
    this.theta = constrain(this.theta + this.speed, 0, maxTheta);

    let baseR = platformR(this.theta);
    let radius = baseR + this.offset;

    // Slight behavior variations per enemy type
    if (level.enemyType === "scarab") {
      // scarabs wiggle slightly radial
      radius += 8 * Math.sin(frameCount * 0.2 + this.theta);
    } else if (level.enemyType === "lotusOrb") {
      // orbs float in and out gently
      radius += 6 * Math.sin(frameCount * 0.15 + this.theta * 0.5);
    } else if (level.enemyType === "hoplite") {
      // hoplite phantoms move a bit faster
      this.speed = this.baseSpeed * 1.4 * this.dir;
    } else {
      this.speed = this.baseSpeed * this.dir;
    }

    this.x = centerX + radius * Math.cos(this.theta);
    this.y = centerY + radius * Math.sin(this.theta);
    this.r = radius;

    // Bounce when hitting range ends
    if (this.theta <= 0 || this.theta >= maxTheta) {
      this.dir *= -1;
      this.speed *= -1;
    }
  }

  draw() {
    const level = currentLevelObj();
    const tint = level.enemyTint;

    push();
    translate(this.x, this.y);
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
      case "scarab":
        // Beetle-ish silhouette
        ellipse(0, -2, 18, 14); // body
        rect(0, -9, 10, 6, 2); // head
        line(-10, 4, -4, 0);
        line(10, 4, 4, 0);
        break;
      case "hoplite":
        // Ghostly hoplite helm shape
        rectMode(CENTER);
        rect(0, -6, 16, 18, 4); // helm
        fill(0);
        rect(-4, -8, 3, 3); // eye slit
        rect(4, -8, 3, 3);
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
  player = new Player();
  generateEnemies();
  generateShards();
  textFont("Courier New");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
}

function draw() {
  const level = currentLevelObj();
  background(level.palette.bg);

  drawPortal(level);
  drawSpiral(level);
  drawShards();
  drawEnemies();

  player.update();
  player.draw();

  drawHUD(level);
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
    const d = dist(player.x, player.y, e.x, e.y);
    if (d < player.radius + 12) {
      resetPlayerToStart();
    }
  });
}

function drawShards() {
  shards.forEach((s) => {
    s.update();
    s.draw();

    if (!s.collected) {
      const d = dist(player.x, player.y, s.x, s.y);
      if (d < player.radius + 10) {
        s.collected = true;
        totalShardsCollected++;
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
  text("Arrow keys: run • X/Up/Space: jump inward", 14, 48);

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
  text(`Time Shards: ${countCollectedInCurrentLevel()} / ${levelShardTotal}`, 14, 64);
}

// --- Level / game flow ---

function warpToNextLevel() {
  currentLevel = (currentLevel + 1) % levels.length;
  resetPlayerToStart();
  generateEnemies();
  generateShards();
}

function resetPlayerToStart() {
  player = new Player();
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
