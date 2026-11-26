/* ---------- 3. 경단 쌓기 (Stack) 상태 ---------- */
var DANGO_COLORS = [
  { fill: "#ffb7c5", stroke: "#ff8ca5" },
  { fill: "#f4f4f6", stroke: "#d0d0dc" },
  { fill: "#a8d5ba", stroke: "#7bb894" }
];
var STACK_BLOCK_H = 18;
var STACK_BASE_Y = 184;

var stackLayers = [];
var stackMoving = null;
var stackSliced = [];
var stackRunning = false;
var stackOver = false;
var stackFloors = 0;
var stackBest = Number(localStorage.getItem("nakhwaStackBest") || 0);
var stackCameraY = 0;
var stackPerfectTimer = 0;
var stackCombo = 0;

function resetStack() {
  const startW = 140;
  const startX = (canvas.width - startW) / 2;
  stackLayers = [{ x: startX, w: startW, colorIdx: 0 }];
  stackSliced = [];
  stackFloors = 0;
  stackCameraY = 0;
  stackPerfectTimer = 0;
  stackCombo = 0;
  stackOver = false;
  stackRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
  initPetals();
  spawnNextDango();
}

function spawnNextDango() {
  const prev = stackLayers[stackLayers.length - 1];
  const dir = stackLayers.length % 2 === 1 ? 1 : -1;
  const speed = Math.min(7.2, 2.7 + stackFloors * 0.14);
  stackMoving = {
    x: dir === 1 ? 30 : canvas.width - prev.w - 30,
    w: prev.w,
    dir,
    speed,
    colorIdx: stackLayers.length % DANGO_COLORS.length
  };
}

function handleStackAction() {
  if (stackOver || !stackRunning) {
    if (!canRestartNow()) return;
    resetStack();
    return;
  }
  if (!stackMoving) return;

  const prev = stackLayers[stackLayers.length - 1];
  const curr = stackMoving;
  const diff = curr.x - prev.x;

  if (Math.abs(diff) <= 4) {
    stackCombo++;
    const bonusW = stackCombo >= 2 ? Math.min(150, prev.w + 6) : prev.w;
    const alignedX = prev.x - (bonusW - prev.w) / 2;
    stackLayers.push({ x: alignedX, w: bonusW, colorIdx: curr.colorIdx });
    stackFloors++;
    stackPerfectTimer = 28;
    spawnNextDango();
    return;
  }

  stackCombo = 0;
  const overlapLeft = Math.max(prev.x, curr.x);
  const overlapRight = Math.min(prev.x + prev.w, curr.x + curr.w);
  const overlapW = overlapRight - overlapLeft;

  if (overlapW <= 2) {
    stackSliced.push({
      x: curr.x,
      y: STACK_BASE_Y - stackLayers.length * STACK_BLOCK_H + stackCameraY,
      w: curr.w,
      vy: 0,
      colorIdx: curr.colorIdx
    });
    stackMoving = null;
    stackOver = true;
    const isNewBest = stackFloors > stackBest;
    if (isNewBest) {
      stackBest = stackFloors;
      localStorage.setItem("nakhwaStackBest", String(stackBest));
    }
    triggerGameOver(isNewBest, stackFloors > 0);
    return;
  }

  const sliceW = curr.w - overlapW;
  const sliceX = diff < 0 ? curr.x : overlapRight;
  stackSliced.push({
    x: sliceX,
    y: STACK_BASE_Y - stackLayers.length * STACK_BLOCK_H + stackCameraY,
    w: sliceW,
    vy: 0,
    colorIdx: curr.colorIdx
  });

  stackLayers.push({ x: overlapLeft, w: overlapW, colorIdx: curr.colorIdx });
  stackFloors++;
  spawnNextDango();
}

function drawDangoBlock(x, y, w, h, colorIdx) {
  const palette = DANGO_COLORS[colorIdx % DANGO_COLORS.length];
  const r = Math.min(8, h / 2, w / 2);

  ctx.fillStyle = palette.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (w > 16) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(x + 6, y + 3, Math.max(4, w - 12), 2.5);
  }
}

function drawStackFrame() {
  drawPetals(true);

  const targetCam = Math.max(0, (stackLayers.length - 5) * STACK_BLOCK_H);
  stackCameraY += (targetCam - stackCameraY) * 0.15;

  const skewerBottom = STACK_BASE_Y + stackCameraY + 12;
  ctx.strokeStyle = "#8c6d53";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 18);
  ctx.lineTo(canvas.width / 2, Math.min(canvas.height, skewerBottom));
  ctx.stroke();

  stackLayers.forEach((layer, idx) => {
    const y = STACK_BASE_Y - (idx + 1) * STACK_BLOCK_H + stackCameraY;
    if (y > canvas.height + 20) return;
    drawDangoBlock(layer.x, y, layer.w, STACK_BLOCK_H - 1, layer.colorIdx);
  });

  if (stackRunning && !stackOver && stackMoving) {
    stackMoving.x += stackMoving.dir * stackMoving.speed;
    if (stackMoving.x <= 16) {
      stackMoving.x = 16;
      stackMoving.dir = 1;
    } else if (stackMoving.x + stackMoving.w >= canvas.width - 16) {
      stackMoving.x = canvas.width - 16 - stackMoving.w;
      stackMoving.dir = -1;
    }

    const moveY = STACK_BASE_Y - (stackLayers.length + 1) * STACK_BLOCK_H + stackCameraY;
    drawDangoBlock(stackMoving.x, moveY, stackMoving.w, STACK_BLOCK_H - 1, stackMoving.colorIdx);
  }

  for (let i = stackSliced.length - 1; i >= 0; i--) {
    const s = stackSliced[i];
    s.vy += 0.45;
    s.y += s.vy;
    drawDangoBlock(s.x, s.y, s.w, STACK_BLOCK_H - 1, s.colorIdx);
    if (s.y > canvas.height + 30) stackSliced.splice(i, 1);
  }

  if (stackPerfectTimer > 0) {
    stackPerfectTimer--;
    ctx.fillStyle = "#ff8ca5";
    ctx.font = "900 15px sans-serif";
    ctx.textAlign = "center";
    const label = stackCombo >= 2 ? `✨ PERFECT x${stackCombo}! (+폭 회복)` : "✨ PERFECT!";
    ctx.fillText(label, canvas.width / 2, 42);
  }

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${stackBest}층   현재 ${stackFloors}층`, canvas.width - 14, 24);

  if (stackOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🍡 경단 탑 완성 · ${stackFloors}층!`, canvas.width / 2, 90);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 118);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("캔버스 터치 또는 스페이스바로 다시 쌓기", canvas.width / 2, 118);
    }
  }
}

registerGame({
  id: "stack",
  title: "경단 쌓기",
  icon: "🍡",
  desc: "타이밍 맞춰 삼색 경단을 하늘 높이 쌓기",
  aspect: "tall",
  unit: "층",
  hint: "타이밍 맞춰 터치! 중앙에 맞추면 PERFECT 🌸",
  rankingTitle: "🍡 경단 쌓기 TOP 5",
  dbNode: "stack_scores",
  getBadge: () => `BEST ${stackBest}층`,
  getScore: () => stackFloors,
  reset: resetStack,
  draw: drawStackFrame,
  stop: () => {
    stackRunning = false;
  },
  onPointerDown: () => {
    handleStackAction();
  },
  onKeyDown: (e) => {
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) handleStackAction();
    }
  }
});
