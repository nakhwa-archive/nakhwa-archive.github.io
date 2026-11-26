/* ---------- 동계 올림픽 4. 스노보드 빅에어 (Snowboard Big Air) 상태 ---------- */
var winSbRunning = false;
var winSbOver = false;
var winSbFinished = false;

var winSbPhase = "run"; // "run" | "air" | "done"
var winSbDist = 0; // 슬로프 거리 (0 ~ 20m 키커)
var winSbSpeed = 0;
var winSbLastSide = 0;
var winSbLastStepFrame = 0;
var winSbFrame = 0;

var winSbX = 65;
var winSbY = 175;
var winSbVx = 0;
var winSbVy = 0;
var winSbSpinRad = 0;
var winSbTricksCount = 0;
var winSbTrickPoints = 0;

var winSbScore = 0;
var winSbBest = Number(localStorage.getItem("nakhwaWinSnowboardBest") || 0);
var winSbParticles = [];
var winSbPopups = [];

var WIN_SB_KICKER_DIST = 19.0;
var WIN_SB_LAND_Y = 308;

function resetWinSnowboard() {
  winSbPhase = "run";
  winSbDist = 0;
  winSbSpeed = 0;
  winSbLastSide = 0;
  winSbLastStepFrame = 0;
  winSbFrame = 0;
  winSbX = 65;
  winSbY = 175;
  winSbVx = 0;
  winSbVy = 0;
  winSbSpinRad = 0;
  winSbTricksCount = 0;
  winSbTrickPoints = 0;
  winSbScore = 0;
  winSbParticles = [];
  winSbPopups = [];
  winSbOver = false;
  winSbFinished = false;
  winSbRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addWinSbPopup(x, y, text, color) {
  winSbPopups.push({ x, y, text, color, life: 36 });
}

function spawnWinSbBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    winSbParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2 + Math.random() * 2.2,
      color,
      life: 20
    });
  }
}

function stepWinSnowboardStride(side) {
  if (!winSbRunning || winSbOver || winSbFinished || winSbPhase !== "run") return;

  const diffFrames = winSbFrame - winSbLastStepFrame;
  const isAlternating = winSbLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    winSbSpeed = Math.min(1.85, winSbSpeed + bonus);
    spawnWinSbBurst(winSbX, winSbY + 12, "#d8f3ff", 4);
  } else {
    winSbSpeed = Math.max(0.12, winSbSpeed - 0.12);
    addWinSbPopup(canvas.width * 0.5, 130, "좌/우 교대!", "#9898a6");
  }

  winSbLastSide = side;
  winSbLastStepFrame = winSbFrame;
}

function triggerWinSnowboardAction() {
  if (!winSbRunning || winSbOver || winSbFinished) return;

  if (winSbPhase === "run") {
    const distDiff = Math.abs(winSbDist - WIN_SB_KICKER_DIST);
    const timingFactor = Math.max(0.45, 1 - distDiff / 9.5);
    const speedFactor = Math.max(0.35, Math.min(1.25, winSbSpeed * 0.88));
    const power = speedFactor * timingFactor;

    winSbPhase = "air";
    winSbVx = 2.9 + power * 2.9;
    winSbVy = -(4.4 + power * 3.8);
    spawnWinSbBurst(winSbX, winSbY + 10, "#ffd166", 10);

    if (distDiff <= 1.4 && winSbSpeed >= 0.85) {
      addWinSbPopup(winSbX, winSbY - 24, "🏂 BIG LAUNCH!", "#ffd166");
    }
  } else if (winSbPhase === "air" && winSbTricksCount < 3) {
    winSbTricksCount++;
    const earned = 120 * winSbTricksCount;
    winSbTrickPoints += earned;
    winSbSpinRad += Math.PI * 1.25;
    winSbVy = Math.min(winSbVy, -1.2) - 0.9;

    const trickNames = ["360° INDY", "720° DOUBLE CORK", "1080° TRIPLE SPIN"];
    const label = trickNames[winSbTricksCount - 1] || "TRICK";
    spawnWinSbBurst(winSbX, winSbY, "#72efdd", 11);
    addWinSbPopup(winSbX, winSbY - 26, `🌀 ${label} +${earned}`, "#72efdd");
  }
}

function landWinSnowboard() {
  winSbPhase = "done";
  winSbFinished = true;
  winSbRunning = false;

  const baseLanding = Math.round(50 + winSbSpeed * 45);
  winSbScore = baseLanding + winSbTrickPoints;

  spawnWinSbBurst(winSbX, WIN_SB_LAND_Y, "#ffd166", 14);

  const isNewBest = winSbScore > winSbBest;
  if (isNewBest) {
    winSbBest = winSbScore;
    localStorage.setItem("nakhwaWinSnowboardBest", String(winSbBest));
  }

  triggerGameOver(isNewBest, winSbScore > 0);
}

function drawWinSnowboardFrame() {
  try {
    ctx.save();

    if (winSbRunning && !winSbOver && !winSbFinished) {
      winSbFrame++;

      if (winSbPhase === "run") {
        const minRunSpeed = winSbDist > 0.5 ? 0.14 : 0;
        winSbSpeed = Math.max(minRunSpeed, winSbSpeed * 0.968);
        winSbDist += winSbSpeed * 0.25;

        const ratio = Math.min(1, winSbDist / WIN_SB_KICKER_DIST);
        winSbX = 65 + ratio * 65;
        winSbY = 175 + ratio * 36;

        if (winSbDist >= 20.0) {
          triggerWinSnowboardAction();
        }
      } else if (winSbPhase === "air") {
        winSbX = Math.min(canvas.width - 28, winSbX + winSbVx);
        winSbY += winSbVy;
        winSbVy += 0.17;
        if (winSbTricksCount > 0) {
          winSbSpinRad += 0.16;
        }

        if (winSbY >= WIN_SB_LAND_Y) {
          winSbY = WIN_SB_LAND_Y;
          landWinSnowboard();
        }
      }
    }

    // 배경 & 빅에어 설원 슬로프
    ctx.fillStyle = "#0e1524";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#17253e";
    ctx.fillRect(0, 46, canvas.width, 160);

    ctx.fillStyle = "#dceeff";
    ctx.beginPath();
    ctx.moveTo(0, 162);
    ctx.lineTo(132, 212);
    ctx.lineTo(canvas.width, WIN_SB_LAND_Y + 8);
    ctx.lineTo(canvas.width, 340);
    ctx.lineTo(0, 340);
    ctx.closePath();
    ctx.fill();

    // 키커 점프대 포인트
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(128, 208, 7, 10);

    // 하단 가이드 존
    ctx.fillStyle = "#141924";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b354a";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#98a6bd";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    if (winSbPhase === "air") {
      ctx.fillStyle = "#72efdd";
      ctx.fillText("🌀 공중에서 터치(PC: ↑/Space)로 트릭 콤보 발동!", canvas.width / 2, 376);
    } else {
      ctx.fillText("◀ 좌 가속 (←/A) · 위 도약/트릭(↑/Space) · 우 가속 (→/D) ▶", canvas.width / 2, 376);
    }

    // 스노보더 캐릭터 렌더링
    ctx.save();
    ctx.translate(winSbX, winSbY);
    ctx.rotate(winSbPhase === "air" ? winSbSpinRad : -0.15);

    // 스노보드 데크
    ctx.fillStyle = "#e65c7b";
    ctx.fillRect(-16, 10, 32, 5);

    // 보더 몸통 & 헬멧
    ctx.fillStyle = "#3a86ff";
    ctx.beginPath();
    ctx.arc(0, 1, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(3, -8, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 파티클 & 팝업
    for (let i = winSbParticles.length - 1; i >= 0; i--) {
      const pt = winSbParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) winSbParticles.splice(i, 1);
    }

    for (let i = winSbPopups.length - 1; i >= 0; i--) {
      const pop = winSbPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) winSbPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 18, 26, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const livePts = Math.round(50 + winSbSpeed * 45) + winSbTrickPoints;
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`예상 점수 ${livePts}점 · 트릭 ${winSbTricksCount}/3`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      winSbPhase === "run" ? `활주 ${winSbDist.toFixed(1)}m / 19m 키커` : "착지까지 트릭을 연결해 봐!",
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BEST ${winSbBest}점`, canvas.width - 12, 24);

    // 결과 오버레이
    if (winSbFinished) {
      ctx.fillStyle = "rgba(15, 18, 26, 0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏂 빅에어 점수 · ${winSbScore}점`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#72efdd";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 도전", canvas.width / 2, 214);
      }
    }

    ctx.restore();
  } catch (err) {
    ctx.restore();
    ctx.fillStyle = "#121216";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff4d6d";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("렌더링 오류 발생:", canvas.width / 2, 170);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "12px sans-serif";
    ctx.fillText(String(err && err.message ? err.message : err), canvas.width / 2, 195);
  }
}

registerGame({
  id: "win-snowboard",
  title: "스노보드 빅에어",
  icon: "🏂",
  desc: "키커 도약과 공중 트릭 콤보로 최고 점수를 노려라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "점",
  hint: "좌/우 번갈아 가속 · 19m 키커 위 터치(PC: ↑/Space) · 공중 트릭!",
  rankingTitle: "🏂 스노보드 빅에어 TOP 5",
  dbNode: "win_snowboard_scores",
  getBadge: () => `BEST ${winSbBest}점`,
  getScore: () => winSbScore,
  reset: resetWinSnowboard,
  draw: drawWinSnowboardFrame,
  stop: () => {
    winSbRunning = false;
  },
  onPointerDown: (x, y) => {
    if (winSbFinished || winSbOver || !winSbRunning) {
      if (!canRestartNow()) return;
      resetWinSnowboard();
      return;
    }
    if (winSbPhase === "air" || y < 235) {
      triggerWinSnowboardAction();
    } else {
      stepWinSnowboardStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (winSbFinished || winSbOver || !winSbRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetWinSnowboard();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerWinSnowboardAction();
    } else if (winSbPhase === "run" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) stepWinSnowboardStride(-1);
    } else if (winSbPhase === "run" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) stepWinSnowboardStride(1);
    }
  }
});