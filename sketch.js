// ChronoSpiral: Radial Donkey-Kong-inspired prototype
// p5.js 1.11.x

const CANVAS_W = 960;
const CANVAS_H = 540;

let centerX, centerY;

// Base spiral parameter used by all platform curves
let spiralA = 12; // tightness of the spiral (r = a * theta)
let maxTheta = 10 * Math.PI;

let player;
let currentLevel = 0;

const levels = [
  {
    name: "Stage 1 — Neanderthal",
    palette: { bg: [12, 12, 28], spiral: [90, 200, 140], portal: [80, 180, 255] },
    musicHint: "Cavern beats, bone clacks",
    enemyTint: [220, 120, 80],
    enemyCount: 4,
    enemyOffsets: [-20, 20],
    // Simple Archimedean spiral
    platformCurve: (theta) => spiralA * theta,
  },
  {
    name: "Stage 2 — Ancient India",
    palette: { bg: [9, 10, 24], spiral: [200, 150, 255], portal: [255, 205, 90] },
    musicHint: "Sitar-like arps, tabla blips",
    enemyTint: [255, 140, 120],
    enemyCount: 6,
    enemyOffsets: [-30, -10, 10, 30],
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
    enemyCount: 7,
    enemyOffsets: [-40, -20, 0, 20, 40],
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
    enemyCount: 8,
    enemyOffsets: [-35, -15, 15, 35],
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
    // Start on-screen partway along the spiral instead of at the outer edge
    this.theta = maxTheta * 0.6;
    this.rVel = 0;
    this.jumpStrength = -6; // inward impulse
    this.onGround = false;
    this.radius = 14;
    this.coyoteFrames = 0;

    // Initialize derived values so rendering is correct on the first frame
    const initialR = platformR(this.theta);
    this.r = initialR;
    this.x = centerX + initialR * Math.cos(this.theta);
    this.y = centerY + initialR * Math.sin(this.theta);
  }

  update() {
    const gravity = 0.18; // radial outward acceleration
    const runSpeed = 0.07;

    // Angular movement: LEFT/RIGHT run along the curve
    if (keyIsDown(LEFT_ARROW)) {
      this.theta -= runSpeed;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      this.theta += runSpeed;
    }

    // Clamp theta within spiral limits
    this.theta = constrain(this.theta, 0, maxTheta);

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
    const jumpKeyDown = keyIsDown(88) || keyIsDown(UP_ARROW) || keyIsDown(32); // X, Up, or Space

    if (this.coyoteFrames > 0 && jumpKeyDown) {
      this.rVel = this.jumpStrength;
      this.onGround = false;
      this.coyoteFrames = 0;
      currentR += this.rVel;
    }

    // Prevent falling off outer edge (based on current level's outer radius)
    const maxR = platformR(maxTheta) + 60;
    currentR = constrain(currentR, 0, maxR);

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
    const body = color(255, 230, 150);
    const eye = color(0);

    push();
    translate(this.x, this.y);
    noStroke();

    // Body
    fill(body);
    rectMode(CENTER);
    rect(0, -8, 18, 26, 3);

    // Head
    rect(0, -24, 14, 10, 2);
    fill(eye);
    rect(-3, -24, 3, 3, 1);

    // Outline for pop
    noFill();
    stroke(0);
    strokeWeight(outline);
    rect(0, -8, 18, 26, 3);
    rect(0, -24, 14, 10, 2);

    pop();
  }
}

// --- Enemy ---

class Enemy {
  constructor(theta, offset) {
    this.theta = theta;
    this.offset = offset;
    this.dir = random([1, -1]);
    this.speed = random(0.01, 0.03) * this.dir;
  }

  update() {
    this.theta = constrain(this.theta + this.speed, 0, maxTheta);

    const baseR = platformR(this.theta);
    const radius = baseR + this.offset;

    this.x = centerX + radius * Math.cos(this.theta);
    this.y = centerY + radius * Math.sin(this.theta);
    this.r = radius;

    // Bounce when hitting range ends
    if (this.theta <= 0 || this.theta >= maxTheta) {
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
    rectMode(CENTER);

    // Simple "club guy" / generic baddie silhouette
    rect(0, -6, 16, 16, 3); // body
    rect(0, -16, 12, 6, 2); // head

    pop();
  }
}

// --- p5 setup & draw ---

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  centerX = width / 2;
  centerY = height / 2;
  player = new Player();
  generateEnemies();
  textFont("Courier New");
}

function draw() {
  const level = currentLevelObj();
  background(level.palette.bg);

  drawPortal(level);
  drawSpiral(level);
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
  const pulse = 8 * sin(frameCount * 0.05) + 24;
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
    if (d < player.radius + 10) {
      resetPlayer();
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
}

// --- Level / game flow ---

function warpToNextLevel() {
  currentLevel = (currentLevel + 1) % levels.length;
  resetPlayer(true);
  generateEnemies();
}

function resetPlayer(resetTheta = false) {
  player = new Player();
  if (!resetTheta) {
    // Drop the player a bit outward so restarts feel snappy
    player.theta = constrain(player.theta + 1.8, 0, maxTheta);
  }
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
