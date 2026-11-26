/* ---------- 동계 올림픽 3. 스키점프 (Ski Jumping) 상태 ---------- */
var winSjRunning = false;
var winSjOver = false;
var winSjFinished = false;

var winSjPhase = "inrun"; // "inrun" | "flight" | "done"
var winSjDist = 0; // 활주대 거리 (0 ~ 20m 도약대)
var winSjSpeed = 0;
var winSjLastSide = 0;
var winSjLastStepFrame = 0;
var winSjFrame = 0;

var winSjX = 65;
var winSjY = 175;
var winSjVx = 0;
var winSjVy = 0;
var winSjGlided = false;
var winSjAirGainPx = 0;
var winSjJumpDistM = 0;

var winSjScoreCm = 0; // 예: 13850 => 138.50m
var winSjLastScore = 0;
var winSjBestCm = Number(localStorage.getItem("nakhwaWinSkiJumpBestCm") || 0);
var winSjParticles = [];
var winSjPopups = [];

var WIN_SJ_TAKEOFF_DIST = 19.0;
var WIN_SJ_LAND_Y = 308;

function resetWinSkiJump() {
  winSjPhase = "inrun";
  winSjDist = 0;
  winSjSpeed = 0;
  winSjLastSide = 0;
  winSjLastStepFrame = 0;
  winSjFrame = 0;
  winSjX = 65;
  winSjY = 175;
  winSjVx = 0;
  winSjVy = 0;
  winSjGlided = false;
  winSjAirGainPx = 0;
  winSjJumpDistM = 0;
  winSjScoreCm = 0;
  winSjLastScore = 0;
  winSjParticles = [];
  winSjPopups = [];
  winSjOver = false;
  winSjFinished = false;
  winSjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addWinSjPopup(x, y, text, color) {
  winSjPopups.push({ x, y, text, color, life: 36 });
}

function spawnWinSjBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    winSjParticles.push({
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

function stepWinSkiJumpStride(side) {
  if (!winSjRunning || winSjOver || winSjFinished || winSjPhase !== "inrun") return;

  const diffFrames = winSjFrame - winSjLastStepFrame;
  const isAlternating = winSjLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    winSjSpeed = Math.min(1.85, winSjSpeed + bonus);
    spawnWinSjBurst(winSjX, winSjY + 14, "#d8f3ff", 4);
  } else {
    winSjSpeed = Math.max(0.12, winSjSpeed - 0.12);
    addWinSjPopup(canvas.width * 0.5, 130, "좌/우 교대!", "#9898a6");
  }

  winSjLastSide = side;
  winSjLastStepFrame = winSjFrame;
}

function triggerWinSkiJumpAction() {
  if (!winSjRunning || winSjOver || winSjFinished) return;

  if (winSjPhase === "inrun") {
    const distDiff = Math.abs(winSjDist - WIN_SJ_TAKEOFF_DIST);
    const timingFactor = Math.max(0.45, 1 - distDiff / 9.5);
    const speedFactor = Math.max(0.35, Math.min(1.25, winSjSpeed * 0.88));
    const power = speedFactor * timingFactor;

    winSjPhase = "flight";
    winSjVx = 3.0 + power * 3.1;
    winSjVy = -(3.4 + power * 3.4);
    spawnWinSjBurst(winSjX, winSjY + 12, "#ffd166", 10);

    if (distDiff <= 1.4 && winSjSpeed >= 0.85) {
      addWinSjPopup(winSjX, winSjY - 24, "🎿 PERFECT TAKEOFF!", "#ffd166");
    }
  } else if (winSjPhase === "flight" && !winSjGlided) {
    // 공중 V자 활공 자세 활성화
    winSjGlided = true;
    winSjVy = Math.min(winSjVy, -1.4) - 1.3;
    winSjVx = Math.min(7.4, winSjVx + 0.85);
    spawnWinSjBurst(winSjX, winSjY, "#72efdd", 10);
    addWinSjPopup(winSjX, winSjY - 24, "✈️ V-GLIDE!", "#72efdd");
  }
}

function landWinSkiJump() {
  winSjPhase = "done";
  winSjFinished = true;
  winSjRunning = false;

  // 스키점프 착지 거리 산출 (65.00m ~ 146.00m 범위)
  const rawMeters = Math.max(58.0, Math.min(148.0, 65.0 + winSjAirGainPx * 0.34));
  const finalMeters = Number(rawMeters.toFixed(2));
  winSjJumpDistM = finalMeters;
  winSjScoreCm = Math.round(finalMeters * 100);
  winSjLastScore = winSjScoreCm;

  spawnWinSjBurst(winSjX, WIN_SJ_LAND_Y, "#d8f3ff", 14);

  const isNewBest = winSjScoreCm > winSjBestCm;
  if (isNewBest) {
    winSjBestCm = winSjScoreCm;
    localStorage.setItem("nakhwaWinSkiJumpBestCm", String(winSjBestCm));
  }

  triggerGameOver(isNewBest, winSjScoreCm > 0);
}

function drawWinSkiJumpFrame() {
  try {
    ctx.save();

    if (winSjRunning && !winSjOver && !winSjFinished) {
      winSjFrame++;

      if (winSjPhase === "inrun") {
        const minRunSpeed = winSjDist > 0.5 ? 0.14 : 0;
        winSjSpeed = Math.max(minRunSpeed, winSjSpeed * 0.968);
        winSjDist += winSjSpeed * 0.25;

        const ratio = Math.min(1, winSjDist / WIN_SJ_TAKEOFF_DIST);
        winSjX = 65 + ratio * 65;
        winSjY = 175 + ratio * 38;

        // 도약대 끝(20m) 지나면 자동 이륙
        if (winSjDist >= 20.0) {
          triggerWinSkiJumpAction();
        }
      } else if (winSjPhase === "flight") {
        const prevX = winSjX;
        winSjX = Math.min(canvas.width - 28, winSjX + winSjVx);
        winSjAirGainPx += Math.max(0, winSjX - prevX);
        winSjY += winSjVy;
        const gravity = winSjGlided ? 0.13 : 0.19;
        winSjVy += gravity;

        if (winSjY >= WIN_SJ_LAND_Y) {
          winSjY = WIN_SJ_LAND_Y;
          landWinSkiJump();
        }
      }
    }

    // 배경 & 설원 슬로프
    ctx.fillStyle = "#0d1524";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#16243d";
    ctx.fillRect(0, 46, canvas.width, 160);

    // 활주대 & 착지 설면 경사
    ctx.fillStyle = "#dceeff";
    ctx.beginPath();
    ctx.moveTo(0, 162);
    ctx.lineTo(135, 218);
    ctx.lineTo(canvas.width, WIN_SJ_LAND_Y + 8);
    ctx.lineTo(canvas.width, 340);
    ctx.lineTo(0, 340);
    ctx.closePath();
    ctx.fill();

    // 도약대 립 포인트 표시
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(130, 214, 6, 12);

    // 거리 표지판(착지 구간)
    ctx.fillStyle = "#2b4363";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    [80, 100, 120, 140].forEach((m, idx) => {
      const mx = 155 + idx * 36;
      if (mx < canvas.width - 12) {
        const my = 228 + idx * 18;
        ctx.fillText(`${m}m`, mx, my);
      }
    });

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
    if (winSjPhase === "flight") {
      ctx.fillStyle = "#72efdd";
      ctx.fillText("✈️ 공중에서 한 번 더 터치(PC: ↑/Space)하면 V-GLIDE!", canvas.width / 2, 376);
    } else {
      ctx.fillText("◀ 좌 가속 (←/A) · 위 도약(↑/Space) · 우 가속 (→/D) ▶", canvas.width / 2, 376);
    }

    // 스키점퍼 캐릭터 렌더링
    ctx.fillStyle = "#3a86ff";
    ctx.beginPath();
    ctx.arc(winSjX, winSjY + 2, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(winSjX + 5, winSjY - 7, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // 스키 플레이트
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(winSjX - 14, winSjY + 12);
    ctx.lineTo(winSjX + 16, winSjY + 8);
    ctx.stroke();

    // 파티클 & 팝업
    for (let i = winSjParticles.length - 1; i >= 0; i--) {
      const pt = winSjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) winSjParticles.splice(i, 1);
    }

    for (let i = winSjPopups.length - 1; i >= 0; i--) {
      const pop = winSjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) winSjPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 18, 26, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveMeters = (65.0 + winSjAirGainPx * 0.34).toFixed(1);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      winSjPhase === "inrun"
        ? `활주 ${winSjDist.toFixed(1)}m / 20m · 속도 ${winSjSpeed.toFixed(2)}`
        : `비행 거리 ${liveMeters}m`,
      12,
      21
    );

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      winSjPhase === "inrun" ? "도약대(19m) 부근에서 점프!" : winSjGlided ? "V-GLIDE 활공 중!" : "공중에서 터치로 활공 자세!",
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = winSjBestCm > 0 ? `${(winSjBestCm / 100).toFixed(2)}m` : "--.-m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (winSjFinished) {
      ctx.fillStyle = "rgba(15, 18, 26, 0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🎿 스키점프 ${winSjJumpDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "win-skijump",
  title: "스키점프",
  icon: "🎿",
  desc: "활주 가속과 도약 타이밍, 공중 V-GLIDE로 최장 거리 비행!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 가속 · 19m 도약대 위 터치(PC: ↑/Space) · 공중 활공!",
  rankingTitle: "🎿 스키점프 TOP 5 (최장 거리)",
  dbNode: "win_skijump_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (winSjBestCm > 0 ? `BEST ${(winSjBestCm / 100).toFixed(2)}m` : "BEST --.-m"),
  getScore: () => winSjLastScore,
  reset: resetWinSkiJump,
  draw: drawWinSkiJumpFrame,
  stop: () => {
    winSjRunning = false;
  },
  onPointerDown: (x, y) => {
    if (winSjFinished || winSjOver || !winSjRunning) {
      if (!canRestartNow()) return;
      resetWinSkiJump();
      return;
    }
    if (winSjPhase === "flight" || y < 235) {
      triggerWinSkiJumpAction();
    } else {
      stepWinSkiJumpStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (winSjFinished || winSjOver || !winSjRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetWinSkiJump();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerWinSkiJumpAction();
    } else if (winSjPhase === "inrun" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) stepWinSkiJumpStride(-1);
    } else if (winSjPhase === "inrun" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) stepWinSkiJumpStride(1);
    }
  }
});