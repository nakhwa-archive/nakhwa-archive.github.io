/* ---------- 10. 벚꽃 벽돌깨기 (Brick Breaker) 상태 ---------- */
var BRICK_PALETTE = [
  { fill: "#e65c7b", stroke: "#ff8ca5" },
  { fill: "#ff9eb5", stroke: "#ffd1dc" },
  { fill: "#ffd166", stroke: "#ffe8a3" },
  { fill: "#72efdd", stroke: "#b8f7ee" },
  { fill: "#a8d5ba", stroke: "#d4edde" }
];

var brickRunning = false;
var brickOver = false;
var brickScore = 0;
var brickBest = Number(localStorage.getItem("nakhwaBrickBest") || 0);
var brickStage = 1;
var brickLives = 3;
var brickSessionHadBest = false;

var brickPaddle = {
  x: 170,
  y: 378,
  w: 76,
  h: 11,
  speed: 5.5,
  wideTimer: 0
};

var brickBalls = [];
var brickBlocks = [];
var brickItems = [];
var brickParticles = [];
var brickDragging = false;
var brickLastDragX = 0;

function buildBrickStage(stage) {
  brickBlocks = [];
  const rows = Math.min(7, 4 + Math.floor(stage / 2));
  const cols = 7;
  const padX = 12;
  const gap = 4;
  const totalGap = gap * (cols - 1);
  const bw = Math.floor((340 - padX * 2 - totalGap) / cols);
  const bh = 16;
  const startY = 54;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isHard = stage >= 2 && r === 0 && (c % 2 === 0);
      brickBlocks.push({
        x: padX + c * (bw + gap),
        y: startY + r * (bh + gap),
        w: bw,
        h: bh,
        hp: isHard ? 2 : 1,
        maxHp: isHard ? 2 : 1,
        colorIdx: r % BRICK_PALETTE.length
      });
    }
  }
}

function spawnAnchoredBrickBall() {
  brickBalls = [{
    x: brickPaddle.x,
    y: brickPaddle.y - 12,
    vx: 0,
    vy: 0,
    r: 6,
    stuck: true
  }];
}

function launchStuckBrickBalls() {
  const baseSpeed = 4.2 + Math.min(2.2, (brickStage - 1) * 0.3);
  for (const b of brickBalls) {
    if (b.stuck) {
      b.stuck = false;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
      b.vx = Math.cos(ang) * baseSpeed;
      b.vy = Math.sin(ang) * baseSpeed;
    }
  }
}

function resetBrick() {
  brickScore = 0;
  brickStage = 1;
  brickLives = 3;
  brickPaddle.x = 170;
  brickPaddle.w = 76;
  brickPaddle.wideTimer = 0;
  brickItems = [];
  brickParticles = [];
  brickOver = false;
  brickRunning = true;
  brickDragging = false;
  brickSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
  buildBrickStage(1);
  spawnAnchoredBrickBall();
}

function spawnBrickBurst(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    const spd = 1.2 + Math.random() * 2.4;
    brickParticles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: 2.2,
      color,
      life: 20
    });
  }
}

function applyBrickItem(type) {
  if (type === "W") {
    brickPaddle.w = 112;
    brickPaddle.wideTimer = 600;
  } else if (type === "M") {
    const src = brickBalls.find(b => !b.stuck) || brickBalls[0];
    if (src && brickBalls.length < 9) {
      const spd = Math.hypot(src.vx, src.vy) || 4.4;
      [-0.45, 0.45].forEach(offset => {
        const ang = -Math.PI / 2 + offset;
        brickBalls.push({
          x: src.x,
          y: src.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 6,
          stuck: false
        });
      });
    }
  } else if (type === "+") {
    brickLives = Math.min(5, brickLives + 1);
    brickScore += 150;
  }
}

function drawBrickFrame() {
  if (brickRunning && !brickOver) {
    if (brickPaddle.wideTimer > 0) {
      brickPaddle.wideTimer--;
      if (brickPaddle.wideTimer <= 0) brickPaddle.w = 76;
    }

    if (dodgeKeys.left) brickPaddle.x -= brickPaddle.speed;
    if (dodgeKeys.right) brickPaddle.x += brickPaddle.speed;
    const halfW = brickPaddle.w / 2;
    brickPaddle.x = Math.max(halfW + 6, Math.min(canvas.width - halfW - 6, brickPaddle.x));

    for (let bi = brickBalls.length - 1; bi >= 0; bi--) {
      const b = brickBalls[bi];
      if (b.stuck) {
        b.x = brickPaddle.x;
        b.y = brickPaddle.y - b.r - 2;
        continue;
      }

      b.x += b.vx;
      b.y += b.vy;

      if (b.x - b.r < 6) {
        b.x = 6 + b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x + b.r > canvas.width - 6) {
        b.x = canvas.width - 6 - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.r < 44) {
        b.y = 44 + b.r;
        b.vy = Math.abs(b.vy);
      }

      if (
        b.vy > 0 &&
        b.y + b.r >= brickPaddle.y &&
        b.y - b.r <= brickPaddle.y + brickPaddle.h &&
        b.x >= brickPaddle.x - halfW - b.r &&
        b.x <= brickPaddle.x + halfW + b.r
      ) {
        const hitRatio = Math.max(-1, Math.min(1, (b.x - brickPaddle.x) / halfW));
        const bounceAngle = -Math.PI / 2 + hitRatio * 1.05;
        const speed = Math.min(7.2, Math.hypot(b.vx, b.vy) * 1.01);
        b.vx = Math.cos(bounceAngle) * speed;
        b.vy = Math.sin(bounceAngle) * speed;
        b.y = brickPaddle.y - b.r - 1;
      }

      for (let i = brickBlocks.length - 1; i >= 0; i--) {
        const blk = brickBlocks[i];
        if (
          b.x + b.r > blk.x &&
          b.x - b.r < blk.x + blk.w &&
          b.y + b.r > blk.y &&
          b.y - b.r < blk.y + blk.h
        ) {
          const overlapLeft = (b.x + b.r) - blk.x;
          const overlapRight = (blk.x + blk.w) - (b.x - b.r);
          const overlapTop = (b.y + b.r) - blk.y;
          const overlapBottom = (blk.y + blk.h) - (b.y - b.r);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapLeft || minOverlap === overlapRight) {
            b.vx = -b.vx;
          } else {
            b.vy = -b.vy;
          }

          blk.hp--;
          const pal = BRICK_PALETTE[blk.colorIdx];
          if (blk.hp <= 0) {
            brickScore += blk.maxHp === 2 ? 60 : 30;
            if (brickScore > brickBest) {
              brickBest = brickScore;
              brickSessionHadBest = true;
              localStorage.setItem("nakhwaBrickBest", String(brickBest));
            }
            spawnBrickBurst(blk.x + blk.w / 2, blk.y + blk.h / 2, pal.fill);

            if (Math.random() < 0.18) {
              const pool = ["W", "M", "+"];
              const kind = pool[Math.floor(Math.random() * pool.length)];
              brickItems.push({
                x: blk.x + blk.w / 2,
                y: blk.y + blk.h / 2,
                vy: 2.2,
                kind
              });
            }

            brickBlocks.splice(i, 1);
          } else {
            spawnBrickBurst(blk.x + blk.w / 2, blk.y + blk.h / 2, "#ffffff");
          }
          break;
        }
      }

      if (b.y - b.r > canvas.height + 10) {
        brickBalls.splice(bi, 1);
      }
    }

    if (brickBalls.length === 0) {
      brickLives--;
      brickPaddle.w = 76;
      brickPaddle.wideTimer = 0;
      if (brickLives <= 0) {
        brickOver = true;
        triggerGameOver(brickSessionHadBest, brickScore > 0);
      } else {
        spawnAnchoredBrickBall();
      }
    }

    if (brickBlocks.length === 0 && !brickOver) {
      brickStage++;
      brickScore += 200;
      if (brickScore > brickBest) {
        brickBest = brickScore;
        brickSessionHadBest = true;
        localStorage.setItem("nakhwaBrickBest", String(brickBest));
      }
      brickItems = [];
      buildBrickStage(brickStage);
      spawnAnchoredBrickBall();
    }

    for (let i = brickItems.length - 1; i >= 0; i--) {
      const it = brickItems[i];
      it.y += it.vy;
      const halfW = brickPaddle.w / 2;
      if (
        it.y + 8 >= brickPaddle.y &&
        it.y - 8 <= brickPaddle.y + brickPaddle.h &&
        Math.abs(it.x - brickPaddle.x) <= halfW + 10
      ) {
        applyBrickItem(it.kind);
        if (brickScore > brickBest) {
          brickBest = brickScore;
          brickSessionHadBest = true;
          localStorage.setItem("nakhwaBrickBest", String(brickBest));
        }
        brickItems.splice(i, 1);
        continue;
      }
      if (it.y > canvas.height + 16) brickItems.splice(i, 1);
    }
  }

  ctx.strokeStyle = "#282832";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, 44);
  ctx.lineTo(canvas.width - 6, 44);
  ctx.stroke();

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${brickScore}`, 12, 22);

  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`STAGE ${brickStage}`, 12, 37);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${brickBest}`, 328, 22);
  ctx.fillText("❤️".repeat(Math.max(0, brickLives)), 328, 38);

  for (const blk of brickBlocks) {
    const pal = BRICK_PALETTE[blk.colorIdx];
    ctx.fillStyle = blk.hp === 2 ? "#9898a6" : pal.fill;
    ctx.beginPath();
    ctx.roundRect(blk.x, blk.y, blk.w, blk.h, 4);
    ctx.fill();

    ctx.strokeStyle = blk.hp === 2 ? "#f4f4f6" : pal.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(blk.x + 3, blk.y + 2, blk.w - 6, 2.5);
  }

  for (const it of brickItems) {
    ctx.fillStyle = it.kind === "W" ? "#4ea8de" : (it.kind === "M" ? "#e65c7b" : "#ffd166");
    ctx.beginPath();
    ctx.roundRect(it.x - 11, it.y - 7, 22, 14, 7);
    ctx.fill();

    ctx.fillStyle = it.kind === "+" ? "#121216" : "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(it.kind, it.x, it.y + 0.5);
  }
  ctx.textBaseline = "alphabetic";

  const pLeft = brickPaddle.x - brickPaddle.w / 2;
  ctx.fillStyle = brickPaddle.wideTimer > 0 ? "#4ea8de" : "#e65c7b";
  ctx.beginPath();
  ctx.roundRect(pLeft, brickPaddle.y, brickPaddle.w, brickPaddle.h, 5.5);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillRect(pLeft + 8, brickPaddle.y + 2, brickPaddle.w - 16, 2.5);

  for (const b of brickBalls) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb7c5";
    ctx.beginPath();
    ctx.arc(b.x - 1.5, b.y - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!brickOver && brickBalls.some(b => b.stuck)) {
    ctx.fillStyle = "#ff8ca5";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("터치 또는 스페이스바로 공 발사! 🌸", canvas.width / 2, 275);
  }

  for (let i = brickParticles.length - 1; i >= 0; i--) {
    const pt = brickParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 20);
    ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    ctx.globalAlpha = 1;
    if (pt.life <= 0) brickParticles.splice(i, 1);
  }

  if (brickOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🧱 게임 오버 · ${brickScore}점`, canvas.width / 2, 190);
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
  id: "brick",
  title: "벚꽃 벽돌깨기",
  icon: "🧱",
  desc: "패들로 공을 튕겨 아이템과 함께 블록 격파!",
  aspect: "tall",
  unit: "점",
  hint: "좌우 드래그(모바일) 또는 방향키(PC) · 스페이스바로 발사!",
  rankingTitle: "🧱 벚꽃 벽돌깨기 TOP 5",
  dbNode: "brick_scores",
  getBadge: () => `BEST ${brickBest}점`,
  getScore: () => brickScore,
  reset: resetBrick,
  draw: drawBrickFrame,
  stop: () => {
    brickRunning = false;
    brickDragging = false;
  },
  onPointerDown: (x) => {
    if (brickOver || !brickRunning) {
      if (!canRestartNow()) return;
      resetBrick();
      return;
    }
    launchStuckBrickBalls();
    brickDragging = true;
    brickLastDragX = x;
  },
  onPointerMove: (x, y, e) => {
    if (brickDragging && !brickOver) {
      e.preventDefault();
      const dx = x - brickLastDragX;
      brickLastDragX = x;
      const halfW = brickPaddle.w / 2;
      brickPaddle.x = Math.max(halfW + 6, Math.min(canvas.width - halfW - 6, brickPaddle.x + dx * 1.15));
    }
  },
  onPointerUp: () => {
    brickDragging = false;
  },
  onKeyDown: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); dodgeKeys.left = true; }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); dodgeKeys.right = true; }
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) {
        if (brickOver || !brickRunning) {
          if (canRestartNow()) resetBrick();
        } else {
          launchStuckBrickBalls();
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
