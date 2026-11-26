/* ---------- 5. 낙화 고군분투 상태 ---------- */
var gogunRunning = false;
var gogunOver = false;
var gogunScore = 0;
var gogunLastScore = 0;
var gogunBest = Number(localStorage.getItem("nakhwaGogunBest") || 0);
var gogunHolding = false;
var gogunHoldFrames = 0;
var gogunSpeed = 4.2;
var gogunFrame = 0;

var gogunPlayer = {
  x: 82,
  y: 120,
  w: 20,
  h: 22,
  vy: 0,
  grounded: false,
  canHook: true
};

var gogunHook = {
  active: false,
  anchorX: 0,
  anchorY: 0,
  length: 0,
  angle: 0,
  angVel: 0
};

var gogunRoofs = [];
var gogunCoins = [];

function spawnGogunSection(startX) {
  const gap = 85 + Math.random() * 90;
  const roofX = startX + gap;
  const roofW = 115 + Math.random() * 120;
  const roofY = 148 + (Math.random() - 0.5) * 30;
  gogunRoofs.push({ x: roofX, y: roofY, w: roofW });

  const midGapX = startX + gap * 0.5;
  const arcY = 58 + Math.random() * 34;
  gogunCoins.push({ x: midGapX - 18, y: arcY + 12, type: "coin", collected: false });
  gogunCoins.push({ x: midGapX, y: arcY, type: "gem", collected: false });
  gogunCoins.push({ x: midGapX + 18, y: arcY + 12, type: "coin", collected: false });

  gogunCoins.push({ x: roofX + roofW * 0.35, y: roofY - 18, type: "coin", collected: false });
  gogunCoins.push({ x: roofX + roofW * 0.65, y: roofY - 18, type: "coin", collected: false });
}

function resetGogun() {
  gogunPlayer.x = 82;
  gogunPlayer.y = 130;
  gogunPlayer.vy = 0;
  gogunPlayer.grounded = true;
  gogunPlayer.canHook = true;
  gogunHook.active = false;
  gogunHolding = false;
  gogunHoldFrames = 0;
  gogunScore = 0;
  gogunSpeed = 4.2;
  gogunFrame = 0;
  gogunOver = false;
  gogunRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
  initPetals();

  gogunRoofs = [{ x: 0, y: 152, w: 300 }];
  gogunCoins = [
    { x: 180, y: 134, type: "coin", collected: false },
    { x: 220, y: 134, type: "coin", collected: false }
  ];
  spawnGogunSection(300);
  spawnGogunSection(580);
}

function attachGogunHook() {
  if (gogunHook.active || !gogunPlayer.canHook) return;
  gogunPlayer.canHook = false;
  gogunPlayer.grounded = false;

  gogunHook.active = true;
  gogunHook.anchorX = gogunPlayer.x + 88;
  gogunHook.anchorY = 12;
  const dx = gogunPlayer.x - gogunHook.anchorX;
  const dy = gogunPlayer.y - gogunHook.anchorY;
  gogunHook.length = Math.max(55, Math.min(145, Math.hypot(dx, dy)));
  gogunHook.angle = Math.atan2(dx, dy);
  gogunHook.angVel = 0.046;
}

function releaseGogunHook() {
  if (!gogunHook.active) return;
  gogunHook.active = false;
  gogunPlayer.vy = Math.min(-4.2, -Math.sin(gogunHook.angle) * 7.5 - 3.5);
}

function handleGogunPressStart() {
  if (!isInPlayScreen || activeGame !== "gogun" || document.activeElement === nickInput) return;

  if (gogunOver || !gogunRunning) {
    if (!canRestartNow()) return;
    resetGogun();
    return;
  }

  if (!gogunPlayer.grounded) return;

  gogunHolding = true;
  gogunHoldFrames = 0;
  gogunPlayer.vy = -8.6;
  gogunPlayer.grounded = false;
}

function handleGogunPressEnd() {
  gogunHolding = false;
  gogunHoldFrames = 0;
  if (gogunHook.active) {
    releaseGogunHook();
  }
}

function drawGogunFrame() {
  ctx.fillStyle = "rgba(255, 226, 154, 0.16)";
  ctx.beginPath();
  ctx.arc(410, 42, 18, 0, Math.PI * 2);
  ctx.fill();

  drawPetals(gogunRunning && !gogunOver);

  if (gogunRunning && !gogunOver) {
    gogunFrame++;
    gogunScore += 0.12;
    gogunSpeed = Math.min(7.8, 4.2 + gogunScore * 0.002);

    gogunRoofs.forEach(r => { r.x -= gogunSpeed; });
    while (gogunRoofs.length > 0 && gogunRoofs[0].x + gogunRoofs[0].w < -40) {
      gogunRoofs.shift();
    }
    const lastRoof = gogunRoofs[gogunRoofs.length - 1];
    if (lastRoof && lastRoof.x + lastRoof.w < canvas.width + 180) {
      spawnGogunSection(lastRoof.x + lastRoof.w);
    }

    for (let i = gogunCoins.length - 1; i >= 0; i--) {
      const c = gogunCoins[i];
      c.x -= gogunSpeed;
      if (!c.collected) {
        const dist = Math.hypot((gogunPlayer.x + 10) - c.x, (gogunPlayer.y + 11) - c.y);
        if (dist < 19) {
          c.collected = true;
          gogunScore += c.type === "gem" ? 50 : 15;
        }
      }
      if (c.x < -30) gogunCoins.splice(i, 1);
    }

    if (gogunHook.active) {
      gogunHook.anchorX -= gogunSpeed * 0.45;
      const gravityAcc = -0.0042 * Math.sin(gogunHook.angle);
      gogunHook.angVel += gravityAcc + 0.0018;
      gogunHook.angVel *= 0.992;
      gogunHook.angle += gogunHook.angVel;

      gogunPlayer.x = gogunHook.anchorX + Math.sin(gogunHook.angle) * gogunHook.length;
      gogunPlayer.y = gogunHook.anchorY + Math.cos(gogunHook.angle) * gogunHook.length;

      if (gogunHook.angle > 0.72 || gogunPlayer.x > 260 || gogunPlayer.y < 24) {
        releaseGogunHook();
      }
    } else {
      gogunPlayer.x += (82 - gogunPlayer.x) * 0.08;

      const prevBottom = gogunPlayer.y + gogunPlayer.h;
      gogunPlayer.vy += 0.48;
      gogunPlayer.y += gogunPlayer.vy;
      gogunPlayer.grounded = false;

      if (gogunHolding && gogunPlayer.canHook) {
        gogunHoldFrames++;
        if (gogunHoldFrames >= 7) {
          attachGogunHook();
        }
      }

      if (gogunPlayer.vy >= 0) {
        for (const r of gogunRoofs) {
          const pCenter = gogunPlayer.x + gogunPlayer.w * 0.5;
          const curBottom = gogunPlayer.y + gogunPlayer.h;
          if (pCenter >= r.x - 4 && pCenter <= r.x + r.w + 4) {
            if (prevBottom <= r.y + 8 && curBottom >= r.y) {
              gogunPlayer.y = r.y - gogunPlayer.h;
              gogunPlayer.vy = 0;
              gogunPlayer.grounded = true;
              gogunPlayer.canHook = true;
              break;
            }
          }
        }
      }
    }

    if (gogunPlayer.y > canvas.height + 10) {
      gogunOver = true;
      gogunLastScore = Math.floor(gogunScore);
      const isNewBest = gogunLastScore > gogunBest;
      if (isNewBest) {
        gogunBest = gogunLastScore;
        localStorage.setItem("nakhwaGogunBest", String(gogunBest));
      }
      triggerGameOver(isNewBest, gogunLastScore > 0);
    }
  }

  gogunRoofs.forEach(r => {
    ctx.fillStyle = "#262630";
    ctx.fillRect(r.x, r.y, r.w, canvas.height - r.y);

    ctx.fillStyle = "#e65c7b";
    ctx.fillRect(r.x - 3, r.y, r.w + 6, 5);

    ctx.fillStyle = "#ff8ca5";
    for (let tx = r.x + 4; tx < r.x + r.w - 6; tx += 14) {
      ctx.fillRect(tx, r.y - 2, 8, 2);
    }
  });

  gogunCoins.forEach(c => {
    if (c.collected) return;
    if (c.type === "gem") {
      ctx.fillStyle = "#ff7999";
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 7);
      ctx.lineTo(c.x + 6, c.y);
      ctx.lineTo(c.x, c.y + 7);
      ctx.lineTo(c.x - 6, c.y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#121216";
      ctx.fillRect(c.x - 1.5, c.y - 1.5, 3, 3);
    }
  });

  if (gogunHook.active) {
    ctx.strokeStyle = "#ff9eb5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gogunPlayer.x + 12, gogunPlayer.y + 4);
    ctx.lineTo(gogunHook.anchorX, gogunHook.anchorY);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(gogunHook.anchorX, gogunHook.anchorY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const gx = Math.round(gogunPlayer.x);
  const gy = Math.round(gogunPlayer.y);

  if (gogunPlayer.grounded && gogunPlayer.canHook && !gogunOver) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(gx + 10, gy - 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#e65c7b";
  const scarfWave = Math.sin(gogunFrame * 0.35) * 3;
  ctx.fillRect(gx - 8, gy + 7 + scarfWave, 10, 4);

  ctx.fillStyle = "#f4f4f6";
  ctx.fillRect(gx + 3, gy + 2, 14, 16);
  ctx.fillStyle = "#e65c7b";
  ctx.fillRect(gx + 3, gy + 5, 14, 3);

  ctx.fillStyle = "#18181d";
  ctx.fillRect(gx + 12, gy + 8, 3, 3);

  ctx.fillStyle = "#9898a6";
  if (!gogunPlayer.grounded) {
    ctx.fillRect(gx + 4, gy + 18, 4, 4);
    ctx.fillRect(gx + 12, gy + 16, 4, 4);
  } else if (Math.floor(gogunFrame / 5) % 2 === 0) {
    ctx.fillRect(gx + 4, gy + 18, 4, 4);
    ctx.fillRect(gx + 12, gy + 18, 4, 2);
  } else {
    ctx.fillRect(gx + 4, gy + 18, 4, 2);
    ctx.fillRect(gx + 12, gy + 18, 4, 4);
  }

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(
    `BEST ${String(gogunBest).padStart(4, "0")}   SCORE ${String(Math.floor(gogunScore)).padStart(4, "0")}`,
    canvas.width - 14,
    24
  );

  if (gogunOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🪝 추락! 최종 기록 ${gogunLastScore}점`, canvas.width / 2, 90);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 118);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("터치 또는 스페이스바로 다시 질주하기", canvas.width / 2, 118);
    }
  }
}

registerGame({
  id: "gogun",
  title: "낙화 고군분투",
  icon: "🪝",
  desc: "길드원·보물 낚시 & 고블린 훔치기! 고군분투 타임어택",
  aspect: "tall",
  unit: "점",
  hint: "길게 눌러 궤적 조준 후 놓으면 발사! (PC: 스페이스바 홀드)",
  rankingTitle: "🪝 낙화 고군분투 TOP 5",
  dbNode: "gogun_scores",
  getBadge: () => `BEST ${gogunBest}점`,
  getScore: () => gogunScore,
  reset: resetGogun,
  draw: drawGogunFrame,
  stop: () => {
    gogunRunning = false;
    gogunHolding = false;
    gogunHoldFrames = 0;
    gogunHook.active = false;
  },
  onPointerDown: (x, y) => {
    if (gogunOver || !gogunRunning) {
      if (!canRestartNow()) return;
      resetGogun();
      return;
    }
    if (!gogunHook.active) {
      gogunHolding = true;
      gogunHoldFrames = 0;
      gogunAimX = x;
      gogunAimY = y;
      updateGogunAimFromPoint(x, y);
    }
  },
  onPointerMove: (x, y) => {
    if (gogunRunning && !gogunOver && gogunHolding && !gogunHook.active) {
      gogunAimX = x;
      gogunAimY = y;
      updateGogunAimFromPoint(x, y);
    }
  },
  onPointerUp: () => {
    if (gogunHolding && !gogunHook.active && gogunRunning && !gogunOver) {
      fireGogunHook();
    }
    gogunHolding = false;
    gogunHoldFrames = 0;
  },
  onKeyDown: (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (gogunOver || !gogunRunning) {
        if (!e.repeat && canRestartNow()) resetGogun();
        return;
      }
      if (!gogunHook.active) {
        gogunHolding = true;
        if (!e.repeat) gogunHoldFrames = 0;
      }
    }
  },
  onKeyUp: (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (gogunHolding && !gogunHook.active && gogunRunning && !gogunOver) {
        fireGogunHook();
      }
      gogunHolding = false;
      gogunHoldFrames = 0;
    }
  }
});
