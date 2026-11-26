/* ---------- 6. 낙화 수박게임 (Suika) 상태 ---------- */
var SUIKA_TIERS = [
  { r: 14, color: "#ffb7c5", stroke: "#ff8ca5", emoji: "🌸", score: 2 },
  { r: 19, color: "#ff8fab", stroke: "#fb6f92", emoji: "🌷", score: 4 },
  { r: 25, color: "#e63946", stroke: "#ff758f", emoji: "🍒", score: 8 },
  { r: 31, color: "#f4f4f6", stroke: "#b8b8c8", emoji: "🍡", score: 16 },
  { r: 38, color: "#ffccd5", stroke: "#ff8fa3", emoji: "🍑", score: 32 },
  { r: 46, color: "#d90429", stroke: "#ff4d6d", emoji: "🍎", score: 64 },
  { r: 54, color: "#a8d5ba", stroke: "#6ab08c", emoji: "🍈", score: 128 },
  { r: 64, color: "#2b9348", stroke: "#55a630", emoji: "🍉", score: 256 },
  { r: 75, color: "#ffd166", stroke: "#ff9f1c", emoji: "👑", score: 512 }
];

var SUIKA_BOX = { left: 16, right: 324, top: 82, bottom: 398 };
var suikaBalls = [];
var suikaParticles = [];
var suikaScore = 0;
var suikaBest = Number(localStorage.getItem("nakhwaSuikaBest") || 0);
var suikaCurTier = 0;
var suikaNextTier = 0;
var suikaDropX = 170;
var suikaCanDrop = true;
var suikaDropCooldown = 0;
var suikaOver = false;
var suikaRunning = false;
var suikaDangerFrames = 0;
var suikaAiming = false;
var suikaSessionHadBest = false;

function randomSuikaSpawnTier() {
  return Math.floor(Math.random() * 4);
}

function resetSuika() {
  suikaBalls = [];
  suikaParticles = [];
  suikaScore = 0;
  suikaCurTier = randomSuikaSpawnTier();
  suikaNextTier = randomSuikaSpawnTier();
  suikaDropX = (SUIKA_BOX.left + SUIKA_BOX.right) / 2;
  suikaCanDrop = true;
  suikaDropCooldown = 0;
  suikaOver = false;
  suikaRunning = true;
  suikaDangerFrames = 0;
  suikaAiming = false;
  suikaSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
}

function clampSuikaX(x, tier) {
  const r = SUIKA_TIERS[tier].r;
  return Math.max(SUIKA_BOX.left + r + 2, Math.min(SUIKA_BOX.right - r - 2, x));
}

function dropSuikaBall() {
  if (!suikaRunning || suikaOver || !suikaCanDrop) return;
  const tier = suikaCurTier;
  const x = clampSuikaX(suikaDropX, tier);
  suikaBalls.push({
    x,
    y: SUIKA_BOX.top - 18,
    vx: (Math.random() - 0.5) * 0.4,
    vy: 1.5,
    tier,
    r: SUIKA_TIERS[tier].r,
    age: 0,
    merged: false
  });

  suikaCurTier = suikaNextTier;
  suikaNextTier = randomSuikaSpawnTier();
  suikaDropX = clampSuikaX(suikaDropX, suikaCurTier);
  suikaCanDrop = false;
  suikaDropCooldown = 26;
}

function spawnSuikaBurst(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
    const spd = 1.5 + Math.random() * 2.5;
    suikaParticles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: 2.5 + Math.random() * 2,
      color,
      life: 22
    });
  }
}

function stepSuikaPhysics() {
  if (!suikaRunning || suikaOver) return;

  if (!suikaCanDrop) {
    suikaDropCooldown--;
    if (suikaDropCooldown <= 0) suikaCanDrop = true;
  }

  if (dodgeKeys.left) suikaDropX = clampSuikaX(suikaDropX - 4.2, suikaCurTier);
  if (dodgeKeys.right) suikaDropX = clampSuikaX(suikaDropX + 4.2, suikaCurTier);

  const subSteps = 4;
  const gravity = 0.36 / subSteps;

  for (let step = 0; step < subSteps; step++) {
    for (const b of suikaBalls) {
      if (b.merged) continue;
      b.vy += gravity;
      b.vx *= 0.996;
      b.vy *= 0.996;
      b.x += b.vx / subSteps;
      b.y += b.vy / subSteps;

      if (b.x - b.r < SUIKA_BOX.left) {
        b.x = SUIKA_BOX.left + b.r;
        b.vx = Math.abs(b.vx) * 0.35;
      } else if (b.x + b.r > SUIKA_BOX.right) {
        b.x = SUIKA_BOX.right - b.r;
        b.vx = -Math.abs(b.vx) * 0.35;
      }

      if (b.y + b.r > SUIKA_BOX.bottom) {
        b.y = SUIKA_BOX.bottom - b.r;
        b.vy = -Math.abs(b.vy) * 0.25;
        b.vx *= 0.92;
      }
    }

    const newMergedBalls = [];
    for (let i = 0; i < suikaBalls.length; i++) {
      const a = suikaBalls[i];
      if (a.merged) continue;

      for (let j = i + 1; j < suikaBalls.length; j++) {
        const b = suikaBalls[j];
        if (b.merged) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r;

        if (dist < minDist && dist > 0.0001) {
          if (a.tier === b.tier && a.tier < SUIKA_TIERS.length - 1) {
            a.merged = true;
            b.merged = true;
            const nextTier = a.tier + 1;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const nextDef = SUIKA_TIERS[nextTier];

            suikaScore += nextDef.score;
            if (suikaScore > suikaBest) {
              suikaBest = suikaScore;
              suikaSessionHadBest = true;
              localStorage.setItem("nakhwaSuikaBest", String(suikaBest));
            }

            spawnSuikaBurst(mx, my, nextDef.color);
            newMergedBalls.push({
              x: clampSuikaX(mx, nextTier),
              y: Math.min(SUIKA_BOX.bottom - nextDef.r, my),
              vx: (a.vx + b.vx) * 0.3,
              vy: -1.2,
              tier: nextTier,
              r: nextDef.r,
              age: 20,
              merged: false
            });
            break;
          }

          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          const totalMass = a.r * a.r + b.r * b.r;
          const ratioA = (b.r * b.r) / totalMass;
          const ratioB = (a.r * a.r) / totalMass;

          a.x -= nx * overlap * ratioA;
          a.y -= ny * overlap * ratioA;
          b.x += nx * overlap * ratioB;
          b.y += ny * overlap * ratioB;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velAlongNormal = rvx * nx + rvy * ny;
          if (velAlongNormal < 0) {
            const restitution = 0.22;
            const impulse = -(1 + restitution) * velAlongNormal;
            a.vx -= impulse * nx * ratioA;
            a.vy -= impulse * ny * ratioA;
            b.vx += impulse * nx * ratioB;
            b.vy += impulse * ny * ratioB;
          }
        }
      }
    }

    if (newMergedBalls.length > 0) {
      suikaBalls = suikaBalls.filter(b => !b.merged).concat(newMergedBalls);
    }
  }

  let overflow = false;
  for (const b of suikaBalls) {
    b.age++;
    if (b.age > 55 && b.y - b.r < SUIKA_BOX.top) {
      overflow = true;
      break;
    }
  }

  if (overflow) {
    suikaDangerFrames++;
    if (suikaDangerFrames > 65) {
      suikaOver = true;
      triggerGameOver(suikaSessionHadBest, suikaScore > 0);
    }
  } else {
    suikaDangerFrames = Math.max(0, suikaDangerFrames - 2);
  }
}

function drawSuikaBall(x, y, tier, alpha = 1) {
  const def = SUIKA_TIERS[tier];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, def.r, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = def.stroke;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x - def.r * 0.28, y - def.r * 0.28, def.r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill();

  ctx.font = `${Math.round(def.r * 1.15)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def.emoji, x, y + 1);
  ctx.restore();
}

function drawSuikaFrame() {
  stepSuikaPhysics();

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${suikaScore}`, 16, 26);

  ctx.fillStyle = "#9898a6";
  ctx.font = "600 12px sans-serif";
  ctx.fillText(`BEST ${suikaBest}`, 16, 44);

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("NEXT", 292, 28);
  drawSuikaBall(310, 26, Math.min(3, suikaNextTier), 1);

  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  ctx.fillRect(
    SUIKA_BOX.left,
    SUIKA_BOX.top,
    SUIKA_BOX.right - SUIKA_BOX.left,
    SUIKA_BOX.bottom - SUIKA_BOX.top
  );

  ctx.strokeStyle = "#343442";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(SUIKA_BOX.left, SUIKA_BOX.top);
  ctx.lineTo(SUIKA_BOX.left, SUIKA_BOX.bottom);
  ctx.lineTo(SUIKA_BOX.right, SUIKA_BOX.bottom);
  ctx.lineTo(SUIKA_BOX.right, SUIKA_BOX.top);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = suikaDangerFrames > 0 ? "#ff4d6d" : "rgba(230, 92, 123, 0.45)";
  ctx.lineWidth = suikaDangerFrames > 0 ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(SUIKA_BOX.left, SUIKA_BOX.top);
  ctx.lineTo(SUIKA_BOX.right, SUIKA_BOX.top);
  ctx.stroke();
  ctx.restore();

  if (suikaRunning && !suikaOver && suikaCanDrop) {
    const curR = SUIKA_TIERS[suikaCurTier].r;
    const previewY = SUIKA_BOX.top - 18;

    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(255, 183, 197, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(suikaDropX, previewY + curR);
    ctx.lineTo(suikaDropX, SUIKA_BOX.bottom);
    ctx.stroke();
    ctx.restore();

    drawSuikaBall(suikaDropX, previewY, suikaCurTier, 0.95);
  }

  for (const b of suikaBalls) {
    drawSuikaBall(b.x, b.y, b.tier, 1);
  }

  for (let i = suikaParticles.length - 1; i >= 0; i--) {
    const p = suikaParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 22);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (p.life <= 0) suikaParticles.splice(i, 1);
  }

  if (suikaOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🍉 게임 오버 · ${suikaScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 시작합니다", canvas.width / 2, 220);
    }
  }
}

registerGame({
  id: "suika",
  title: "낙화 수박게임",
  icon: "🍉",
  desc: "같은 과일·꽃을 합쳐 거대한 수박과 만개 벚꽃 만들기",
  aspect: "tall",
  unit: "점",
  hint: "드래그로 위치 조준 후 손을 떼면 드롭! (PC: 방향키+스페이스)",
  rankingTitle: "🍉 낙화 수박게임 TOP 5",
  dbNode: "suika_scores",
  getBadge: () => `BEST ${suikaBest}점`,
  getScore: () => suikaScore,
  reset: resetSuika,
  draw: drawSuikaFrame,
  stop: () => {
    suikaRunning = false;
    suikaAiming = false;
  },
  onPointerDown: (x) => {
    if (suikaOver || !suikaRunning) {
      if (!canRestartNow()) return;
      resetSuika();
      return;
    }
    suikaAiming = true;
    suikaDropX = clampSuikaX(x, suikaCurTier);
  },
  onPointerMove: (x, y, e) => {
    if (suikaRunning && !suikaOver && (suikaAiming || e.pointerType === "mouse")) {
      suikaDropX = clampSuikaX(x, suikaCurTier);
    }
  },
  onPointerUp: () => {
    if (suikaAiming) {
      suikaAiming = false;
      dropSuikaBall();
    }
  },
  onKeyDown: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); dodgeKeys.left = true; }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); dodgeKeys.right = true; }
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) {
        if (suikaOver || !suikaRunning) {
          if (canRestartNow()) resetSuika();
        } else {
          dropSuikaBall();
        }
      }
    }
  },
  onKeyUp: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dodgeKeys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dodgeKeys.right = false;
    }
  }
});
