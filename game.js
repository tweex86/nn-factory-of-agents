"use strict";

/* ==================================================
   NN Factory of Agents
   Pure HTML5 canvas game. No dependencies, no server.
   Logical resolution: 1600 x 900.
   ================================================== */

/* ==================================================
   Canvas and constants
   ================================================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const WIDTH = 1600;
const HEIGHT = 900;
const ASSET_PATH = "assets/";

const POSITIONS = {
  TOP_LEFT: "TOP_LEFT",
  BOTTOM_LEFT: "BOTTOM_LEFT",
  TOP_RIGHT: "TOP_RIGHT",
  BOTTOM_RIGHT: "BOTTOM_RIGHT",
};

const POSITION_KEYS = {
  a: POSITIONS.TOP_LEFT,
  z: POSITIONS.BOTTOM_LEFT,
  k: POSITIONS.TOP_RIGHT,
  m: POSITIONS.BOTTOM_RIGHT,
};

/* ==================================================
   Asset loading with fail-safe placeholders
   ================================================== */

const assetNames = [
  "device.png",
  "red-button.png",
  "reset-button.png",
  "agent-button.png",
  "arrow-top-left.png",
  "arrow-down-left.png",
  "arrow-top-right.png",
  "arrow-down-right.png",
  "employee.png",
  "employee-chill.png",
  "robot.png",
  "coin.png",
  "coin-small.png",
  "grass.png",
  "bush.png",
  "printer-left.png",
  "printer-right.png",
  "platform-left.png",
  "platform-right.png",
];

const assets = {};
const sounds = {};

function loadAssets() {
  assetNames.forEach((name) => {
    const img = new Image();
    img.src = ASSET_PATH + name;
    img.onload = () => {
      img.ready = true;
    };
    img.onerror = () => {
      img.missing = true;
      console.warn("Missing asset: " + name);
    };
    assets[name] = img;
  });
}

/* ==================================================
   Audio loading with safe playback
   ================================================== */

function loadSounds() {
  ["lost.wav", "win.mp3", "robot.wav"].forEach((name) => {
    const audio = new Audio(ASSET_PATH + name);
    audio.preload = "auto";
    audio.onerror = () => {
      console.warn("Missing asset: " + name);
    };
    sounds[name] = audio;
  });
}

function playSound(name) {
  const source = sounds[name];

  if (!source) {
    console.warn("Missing asset: " + name);
    return;
  }

  const audio = source.cloneNode();
  audio.volume = 0.75;
  audio.play().catch(() => {
    // Browsers may block audio before the first user gesture. Gameplay continues.
  });
}

function drawAsset(name, x, y, w, h, options = {}) {
  const img = assets[name];
  if (img && img.ready && !img.missing) {
    if (options.flipX) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    return;
  }

  // Fail-safe rendering keeps the game playable if an image is unavailable.
  ctx.save();
  ctx.fillStyle = options.placeholderFill || "#c7c7c2";
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 4;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#222";
  ctx.font = "18px Courier New";
  ctx.textAlign = "center";
  ctx.fillText(name.replace(".png", ""), x + w / 2, y + h / 2 + 6);
  ctx.restore();
}

/* ==================================================
   Layout and hitboxes
   ================================================== */

const screen = { x: 272, y: 126, w: 1056, h: 562 };

const controlButtons = [
  {
    position: POSITIONS.TOP_LEFT,
    key: "A",
    button: { x: 103, y: 490, w: 100, h: 100 },
    hitbox: { x: 42, y: 430, w: 190, h: 180 },
    arrow: { name: "arrow-top-left.png", x: 51, y: 442, w: 56, h: 70 },
  },
  {
    position: POSITIONS.BOTTOM_LEFT,
    key: "Z",
    button: { x: 103, y: 618, w: 100, h: 100 },
    hitbox: { x: 42, y: 600, w: 190, h: 190 },
    arrow: { name: "arrow-down-left.png", x: 51, y: 707, w: 56, h: 70 },
  },
  {
    position: POSITIONS.TOP_RIGHT,
    key: "K",
    button: { x: 1398, y: 490, w: 100, h: 100 },
    hitbox: { x: 1370, y: 430, w: 190, h: 180 },
    arrow: { name: "arrow-top-right.png", x: 1492, y: 442, w: 56, h: 70 },
  },
  {
    position: POSITIONS.BOTTOM_RIGHT,
    key: "M",
    button: { x: 1398, y: 618, w: 100, h: 100 },
    hitbox: { x: 1370, y: 600, w: 190, h: 190 },
    arrow: { name: "arrow-down-right.png", x: 1492, y: 707, w: 56, h: 70 },
  },
];

const resetButton = { x: 1398, y: 122, w: 110, h: 58 };
const stopButton = { x: 1398, y: 232, w: 110, h: 58 };

const printerLayout = {
  TOP_LEFT: {
    platform: { name: "platform-left.png", x: 285, y: 303, w: 178, h: 94 },
    printer: { name: "printer-left.png", x: 320, y: 218, w: 136, h: 136 },
  },
  BOTTOM_LEFT: {
    platform: { name: "platform-left.png", x: 285, y: 482, w: 178, h: 94 },
    printer: { name: "printer-left.png", x: 324, y: 386, w: 136, h: 136 },
  },
  TOP_RIGHT: {
    platform: { name: "platform-right.png", x: 1141, y: 303, w: 178, h: 94 },
    printer: { name: "printer-right.png", x: 1160, y: 218, w: 136, h: 136 },
  },
  BOTTOM_RIGHT: {
    platform: { name: "platform-right.png", x: 1141, y: 482, w: 178, h: 94 },
    printer: { name: "printer-right.png", x: 1156, y: 386, w: 136, h: 136 },
  },
};

const catchPositions = {
  TOP_LEFT: { x: 690, y: 444, angle: -0.42, faded: true },
  BOTTOM_LEFT: { x: 650, y: 568, angle: -0.42, faded: true },
  TOP_RIGHT: { x: 910, y: 444, angle: 0.42, faded: true },
  BOTTOM_RIGHT: { x: 950, y: 568, angle: 0.42, faded: true },
};

const playerPositions = {
  TOP_LEFT: { x: 620, y: 382, flipX: true },
  BOTTOM_LEFT: { x: 588, y: 492, flipX: true },
  TOP_RIGHT: { x: 790, y: 382, flipX: false },
  BOTTOM_RIGHT: { x: 822, y: 492, flipX: false },
  CENTER: { x: 705, y: 452, flipX: false },
};

const agentButtons = [
  { title: "Chat, Voice &\nMail Intake\nAgents", cost: 20 },
  { title: "Extraction &\nValidation\nAgents", cost: 30 },
  { title: "Policy Rules\nValidation\nAgents", cost: 15 },
  { title: "Review &\nApproval\nAgents", cost: 50 },
  { title: "Personal\nComms\nAgents", cost: 40 },
].map((agent, index) => ({
  ...agent,
  x: 235 + index * 230,
  y: 730,
  w: 218,
  h: 156,
  bought: false,
}));

const robotSlots = [
  { x: 508, y: 532 },
  { x: 635, y: 532 },
  { x: 860, y: 532 },
  { x: 970, y: 532 },
  { x: 1092, y: 532 },
];

const robotCatchOffsets = {
  TOP_LEFT: { x: 28, y: 78, flipX: true },
  BOTTOM_LEFT: { x: 28, y: 78, flipX: true },
  TOP_RIGHT: { x: -72, y: 78, flipX: false },
  BOTTOM_RIGHT: { x: -72, y: 78, flipX: false },
};

/* ==================================================
   Game State
   ================================================== */

let state;
let lastTimestamp = 0;

function createInitialState() {
  return {
    nps: 0,
    coins: 0,
    playerPosition: "CENTER",
    documents: [],
    feedbacks: [],
    robots: [],
    elapsed: 0,
    spawnTimer: 0,
    spawnInterval: 1750,
    documentId: 1,
    lastSpawnPosition: null,
    flashPosition: null,
    flashTimer: 0,
    resetPulse: 0,
    stopped: false,
  };
}

function resetGame() {
  state = createInitialState();
  agentButtons.forEach((agent) => {
    agent.bought = false;
  });
}

function clampNps() {
  state.nps = Math.max(-100, Math.min(100, state.nps));
}

/* ==================================================
   Input
   ================================================== */

function movePlayer(position) {
  if (state.stopped || isFullyAutomated()) {
    return;
  }

  state.playerPosition = position;
  state.flashPosition = position;
  state.flashTimer = 140;
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

function handlePointer(event) {
  event.preventDefault();
  const point = canvasPointFromEvent(event);

  if (pointInRect(point, resetButton)) {
    state.resetPulse = 180;
    resetGame();
    return;
  }

  if (pointInRect(point, stopButton)) {
    state.stopped = !state.stopped;
    return;
  }

  for (const control of controlButtons) {
    if (pointInRect(point, control.hitbox)) {
      movePlayer(control.position);
      return;
    }
  }

  for (const agent of agentButtons) {
    if (!agent.bought && pointInRect(point, agent)) {
      if (!state.stopped) {
        tryBuyAgent(agent);
      }
      return;
    }
  }
}

window.addEventListener("keydown", (event) => {
  if (/^[1-5]$/.test(event.key)) {
    event.preventDefault();
    if (!state.stopped) {
      tryBuyAgent(agentButtons[Number(event.key) - 1]);
    }
    return;
  }

  const position = POSITION_KEYS[event.key.toLowerCase()];
  if (position) {
    event.preventDefault();
    movePlayer(position);
  }
});

canvas.addEventListener("mousedown", handlePointer);
canvas.addEventListener("touchstart", handlePointer, { passive: false });

/* ==================================================
   Document System
   ================================================== */

function pathForPosition(position) {
  const end = catchPositions[position];
  const paths = {
    TOP_LEFT: [
      { x: 612, y: 338, angle: -0.42 },
      end,
    ],
    BOTTOM_LEFT: [
      { x: 586, y: 492, angle: -0.42 },
      end,
    ],
    TOP_RIGHT: [
      { x: 988, y: 338, angle: 0.42 },
      end,
    ],
    BOTTOM_RIGHT: [
      { x: 1014, y: 492, angle: 0.42 },
      end,
    ],
  };
  return paths[position];
}

function spawnDocument(position) {
  state.lastSpawnPosition = position;
  state.documents.push({
    id: state.documentId++,
    position,
    path: pathForPosition(position),
    step: 0,
    stepTimer: 0,
    stepDuration: 420,
  });
}

function spawnDocumentBatch() {
  const positions = Object.values(POSITIONS);
  const availablePositions = positions.filter((position) => position !== state.lastSpawnPosition);
  const robotPressure = state.robots.length;
  const timePressure = Math.floor(state.elapsed / 30000);
  let count = robotPressure >= 2 ? 2 : 1;

  // More agents make the factory answer with more simultaneous paperwork.
  for (let i = 0; i < robotPressure; i++) {
    if (Math.random() < 0.22) {
      count += 1;
    }
  }

  if (timePressure > 0 && Math.random() < Math.min(0.45, timePressure * 0.08)) {
    count += 1;
  }

  count = Math.min(4, count);

  for (let i = availablePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
  }

  if (availablePositions.length < count && !availablePositions.includes(state.lastSpawnPosition)) {
    availablePositions.push(state.lastSpawnPosition);
  }

  availablePositions.slice(0, count).forEach(spawnDocument);
}

function finishDocument(document) {
  const playerCaught = state.playerPosition === document.position;
  const robotCaught = !playerCaught && isDocumentCaughtByRobot(document);
  const catchPoint = catchPositions[document.position];

  if (playerCaught || robotCaught) {
    state.nps += 0.5;
    state.coins += 1;
    playSound("win.mp3");
    spawnFeedback("success", catchPoint.x, catchPoint.y);
  } else {
    state.nps -= missNpsPenalty();
    state.coins = Math.max(0, state.coins - missCoinPenalty());
    playSound("lost.wav");
    spawnFeedback("miss", catchPoint.x, catchPoint.y);
  }

  clampNps();
}

function spawnFeedback(type, x, y) {
  state.feedbacks.push({
    type,
    x,
    y,
    timer: 0,
    duration: 560,
  });
}

function missCoinPenalty() {
  return 1 + state.robots.length;
}

function missNpsPenalty() {
  return missCoinPenalty() * 0.5;
}

function updateDocuments(delta) {
  state.spawnTimer += delta;

  while (state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer -= state.spawnInterval;
    spawnDocumentBatch();
  }

  for (let i = state.documents.length - 1; i >= 0; i--) {
    const document = state.documents[i];
    document.stepTimer += delta;

    if (document.stepTimer >= document.stepDuration) {
      document.stepTimer -= document.stepDuration;
      document.step += 1;

      if (document.step >= document.path.length) {
        finishDocument(document);
        state.documents.splice(i, 1);
      }
    }
  }
}

function updateFeedbacks(delta) {
  for (let i = state.feedbacks.length - 1; i >= 0; i--) {
    const feedback = state.feedbacks[i];
    feedback.timer += delta;

    if (feedback.timer >= feedback.duration) {
      state.feedbacks.splice(i, 1);
    }
  }
}

/* ==================================================
   Economy, Agents, and Robots
   ================================================== */

function tryBuyAgent(agent) {
  if (state.coins < agent.cost || agent.bought || state.robots.length >= 5) {
    return;
  }

  state.coins -= agent.cost;
  agent.bought = true;
  playSound("robot.wav");
  spawnRobot();

  if (isFullyAutomated()) {
    state.playerPosition = "CENTER";
    state.flashPosition = null;
    state.flashTimer = 0;
  }
}

function isFullyAutomated() {
  return state.robots.length >= 5;
}

function spawnRobot() {
  const slot = robotSlots[state.robots.length];
  state.robots.push({
    x: slot.x,
    y: slot.y,
    homeX: slot.x,
    homeY: slot.y,
    targetX: slot.x,
    targetY: slot.y,
    targetDocumentId: null,
    targetPosition: null,
    speed: 0.74 + state.robots.length * 0.05,
    flipX: false,
  });
}

function robotTargetForPosition(position) {
  const catchPoint = catchPositions[position];
  const offset = robotCatchOffsets[position];
  return {
    x: catchPoint.x + offset.x,
    y: catchPoint.y - offset.y,
    flipX: offset.flipX,
  };
}

function availableRobotDocuments() {
  return state.documents
    .filter((document) => document.step < document.path.length)
    .sort((a, b) => {
      const aRemaining = (a.path.length - a.step) * a.stepDuration - a.stepTimer;
      const bRemaining = (b.path.length - b.step) * b.stepDuration - b.stepTimer;
      return aRemaining - bRemaining;
    });
}

function updateRobots(delta) {
  const claimedDocumentIds = new Set();
  const documents = availableRobotDocuments();

  state.robots.forEach((robot) => {
    const currentTargetExists = state.documents.some((document) => document.id === robot.targetDocumentId);

    if (!currentTargetExists) {
      robot.targetDocumentId = null;
      robot.targetPosition = null;
    }

    if (robot.targetDocumentId) {
      claimedDocumentIds.add(robot.targetDocumentId);
    }
  });

  state.robots.forEach((robot) => {
    if (!robot.targetDocumentId) {
      const nextDocument = documents.find((document) => !claimedDocumentIds.has(document.id));

      if (nextDocument) {
        robot.targetDocumentId = nextDocument.id;
        robot.targetPosition = nextDocument.position;
        claimedDocumentIds.add(nextDocument.id);
      }
    }

    if (robot.targetDocumentId) {
      const target = robotTargetForPosition(robot.targetPosition);
      robot.targetX = target.x;
      robot.targetY = target.y;
      robot.flipX = target.flipX;
    } else {
      robot.targetX = robot.homeX;
      robot.targetY = robot.homeY;
      robot.flipX = false;
    }

    moveRobotTowardTarget(robot, delta);
  });
}

function moveRobotTowardTarget(robot, delta) {
  const dx = robot.targetX - robot.x;
  const dy = robot.targetY - robot.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 1) {
    robot.x = robot.targetX;
    robot.y = robot.targetY;
    return;
  }

  const step = Math.min(distance, robot.speed * delta);
  robot.x += (dx / distance) * step;
  robot.y += (dy / distance) * step;
}

function isDocumentCaughtByRobot(document) {
  return state.robots.some((robot) => {
    if (robot.targetDocumentId !== document.id) {
      return false;
    }

    const target = robotTargetForPosition(document.position);
    return Math.hypot(robot.x - target.x, robot.y - target.y) < 34;
  });
}

function updateDifficulty() {
  const difficultyLevel = Math.floor(state.elapsed / 30000);
  const agentPressure = state.robots.length * 115;
  state.spawnInterval = Math.max(520, 1750 - difficultyLevel * 140 - agentPressure);
}

/* ==================================================
   UI helpers
   ================================================== */

function drawText(text, x, y, size, align = "left", color = "#050505") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "700 " + size + "px Courier New";
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawMultilineText(text, x, y, lineHeight, size, align = "center", color = "#111") {
  text.split("\n").forEach((line, index) => {
    drawText(line, x, y + index * lineHeight, size, align, color);
  });
}

function formattedCoins() {
  const rounded = Math.round(state.coins);
  return rounded > 9999 ? "9999+" : String(rounded);
}

function roundedNps() {
  return String(Math.round(state.nps));
}

/* ==================================================
   Rendering
   ================================================== */

function clearCanvas() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.imageSmoothingEnabled = false;
}

function drawDevice() {
  drawAsset("device.png", 0, 0, WIDTH, HEIGHT, { placeholderFill: "#bdbdbb" });
}

function drawDecorations() {
  drawAsset("bush.png", 350, 220, 210, 80);
  drawAsset("bush.png", 1085, 220, 210, 80);
  drawAsset("bush.png", 305, 520, 245, 92);
  drawAsset("bush.png", 1075, 520, 245, 92);

  drawAsset("grass.png", 300, 640, 331, 36);
  drawAsset("grass.png", 970, 640, 331, 36);
}

function drawPrinters() {
  Object.values(printerLayout).forEach((slot) => {
    drawAsset(slot.platform.name, slot.platform.x, slot.platform.y, slot.platform.w, slot.platform.h);
    drawAsset(slot.printer.name, slot.printer.x, slot.printer.y, slot.printer.w, slot.printer.h);
  });
}

function drawDocument(document) {
  const point = document.path[Math.min(document.step, document.path.length - 1)];
  const fadeProgress = point.faded ? document.stepTimer / document.stepDuration : 0;
  const alpha = point.faded ? Math.max(0.12, 0.48 - fadeProgress * 0.36) : 1;
  drawPixelPaper(point.x, point.y, point.angle, alpha);
}

function drawPixelPaper(x, y, angle, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#f9f9ee";
  ctx.strokeStyle = "#202323";
  ctx.lineWidth = 6;
  ctx.fillRect(-22, -32, 44, 64);
  ctx.strokeRect(-22, -32, 44, 64);
  ctx.fillStyle = "#58a93f";
  for (let i = -14; i <= 14; i += 12) {
    ctx.fillRect(-10, i, 24, 5);
  }
  ctx.fillRect(-10, 24, 16, 5);
  ctx.restore();
}

function drawFeedback(feedback) {
  const progress = feedback.timer / feedback.duration;
  const alpha = Math.max(0, 1 - progress);
  const rise = progress > 0.45 ? -8 : 0;
  const block = 8;

  function drawBlocks(blocks, color, offsetX = 0, offsetY = 0) {
    ctx.fillStyle = color;
    blocks.forEach(([gridX, gridY]) => {
      ctx.fillRect(offsetX + gridX * block, offsetY + gridY * block, block, block);
    });
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(feedback.x, feedback.y + rise);

  if (feedback.type === "success") {
    const checkBlocks = [
      [-4, 0],
      [-3, 1],
      [-2, 2],
      [-1, 3],
      [0, 2],
      [1, 1],
      [2, 0],
      [3, -1],
      [4, -2],
    ];
    drawBlocks(checkBlocks, "#163019", 4, 4);
    drawBlocks(checkBlocks, "#72d04a");
  } else {
    const xBlocks = [
      [-3, -3],
      [-2, -2],
      [-1, -1],
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [3, -3],
      [2, -2],
      [1, -1],
      [-1, 1],
      [-2, 2],
      [-3, 3],
    ];
    drawBlocks(xBlocks, "#2b1515", 4, 4);
    drawBlocks(xBlocks, "#d91812");
  }

  ctx.restore();
}

function drawPixelCheck(x, y, scale = 1) {
  const block = 8 * scale;
  const checkBlocks = [
    [-4, 0],
    [-3, 1],
    [-2, 2],
    [-1, 3],
    [0, 2],
    [1, 1],
    [2, 0],
    [3, -1],
    [4, -2],
  ];

  ctx.save();
  checkBlocks.forEach(([gridX, gridY]) => {
    ctx.fillStyle = "#163019";
    ctx.fillRect(x + gridX * block + 4 * scale, y + gridY * block + 4 * scale, block, block);
    ctx.fillStyle = "#72d04a";
    ctx.fillRect(x + gridX * block, y + gridY * block, block, block);
  });
  ctx.restore();
}

function drawPlayer() {
  const pos = playerPositions[state.playerPosition];
  const lift = state.flashTimer > 0 ? -8 : 0;
  const assetName = isFullyAutomated() ? "employee-chill.png" : "employee.png";
  drawAsset(assetName, pos.x, pos.y + lift, 190, 190, { placeholderFill: "#222", flipX: pos.flipX });
}

function drawRobots() {
  state.robots.forEach((robot) => {
    const bob = robot.targetDocumentId && Math.floor(state.elapsed / 140) % 2 === 0 ? -3 : 0;
    drawAsset("robot.png", robot.x, robot.y + bob, 95, 132, {
      placeholderFill: "#6b7470",
      flipX: robot.flipX,
    });
  });

  // A small mascot robot beside the shop echoes the supplied mockup.
  drawAsset("robot.png", 132, 760, 95, 132, { placeholderFill: "#6b7470" });
}

function drawControls() {
  controlButtons.forEach((control) => {
    const disabled = isFullyAutomated();
    const active = !disabled && state.flashPosition === control.position && state.flashTimer > 0;
    const pad = active ? 5 : 0;
    drawAsset(
      "red-button.png",
      control.button.x + pad,
      control.button.y + pad,
      control.button.w - pad * 2,
      control.button.h - pad * 2,
      { placeholderFill: "#d4140c" }
    );
    drawAsset(control.arrow.name, control.arrow.x, control.arrow.y, control.arrow.w, control.arrow.h, {
      placeholderFill: "#222",
    });
    drawText(
      control.key,
      control.button.x + control.button.w / 2,
      control.button.y + control.button.h / 2 - 17,
      36,
      "center",
      disabled ? "#777" : "#111"
    );

    if (disabled) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#b8b8b4";
      ctx.beginPath();
      ctx.arc(control.button.x + control.button.w / 2, control.button.y + control.button.h / 2, 43, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  drawAsset("reset-button.png", resetButton.x, resetButton.y, resetButton.w, resetButton.h, {
    placeholderFill: "#bebebe",
  });
  drawText("Restart", resetButton.x + resetButton.w / 2, resetButton.y + 72, 24, "center");

  drawAsset("reset-button.png", stopButton.x, stopButton.y, stopButton.w, stopButton.h, {
    placeholderFill: "#bebebe",
  });
  drawText(state.stopped ? "Play" : "Stop", stopButton.x + stopButton.w / 2, stopButton.y + 72, 24, "center");
}

function drawHud() {
  drawText("NPS: " + roundedNps(), 705, 156, 62, "center");
  drawAsset("coin.png", 890, 159, 58, 54, { placeholderFill: "#ffd21d" });
  drawText(formattedCoins(), 962, 156, 62, "left");
}

function drawAgentShop() {
  agentButtons.forEach((agent) => {
    const affordable = state.coins >= agent.cost;
    const unavailable = !agent.bought && !affordable;

    drawAsset("agent-button.png", agent.x, agent.y, agent.w, agent.h, { placeholderFill: "#c9c9c5" });

    if (unavailable) {
      ctx.save();
      ctx.globalAlpha = 0.52;
      ctx.fillStyle = "#b8b8b4";
      ctx.fillRect(agent.x + 4, agent.y + 4, agent.w - 8, agent.h - 8);
      ctx.restore();
    }

    const color = unavailable ? "#888" : "#111";
    drawMultilineText(agent.title, agent.x + agent.w / 2, agent.y + 21, 29, 24, "center", color);

    if (agent.bought) {
      drawPixelCheck(agent.x + agent.w / 2, agent.y + 126, 0.62);
    } else {
      ctx.save();
      if (unavailable) {
        ctx.globalAlpha = 0.45;
      }
      drawAsset("coin-small.png", agent.x + 64, agent.y + 116, 36, 34, { placeholderFill: "#ffd21d" });
      ctx.restore();
      drawText("x" + agent.cost, agent.x + 104, agent.y + 118, 28, "left", color);
    }
  });
}

function render() {
  clearCanvas();
  drawDevice();
  drawDecorations();
  drawPrinters();
  state.documents.forEach(drawDocument);
  drawRobots();
  drawPlayer();
  state.feedbacks.forEach(drawFeedback);
  drawHud();
  drawControls();
  drawAgentShop();
}

/* ==================================================
   Game Loop
   ================================================== */

function update(delta) {
  if (state.stopped) {
    return;
  }

  state.elapsed += delta;
  state.flashTimer = Math.max(0, state.flashTimer - delta);
  state.resetPulse = Math.max(0, state.resetPulse - delta);
  updateDifficulty();
  updateRobots(delta);
  updateDocuments(delta);
  updateFeedbacks(delta);
}

function loop(timestamp) {
  const delta = Math.min(50, timestamp - lastTimestamp || 16.67);
  lastTimestamp = timestamp;
  update(delta);
  render();
  requestAnimationFrame(loop);
}

loadAssets();
loadSounds();
resetGame();
requestAnimationFrame(loop);
