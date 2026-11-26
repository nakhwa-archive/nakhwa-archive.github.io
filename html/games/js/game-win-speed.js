/* ---------- 동계 올림픽 1. 스피드 스케이팅 500m (Speed Skating) 상태 ---------- */
var winSpeedRunning = false;
var winSpeedOver = false;
var winSpeedFinished = false;

var winSpeedDist = 0; // 0 ~ 500m
var winSpeedSpeed = 0;
var winSpeedBoost = 0; // 0 ~ 100 빙판 추진력 게이지
var winSpeedLastSide = 0;
var winSpeedLastStepFrame = 0;
var winSpeedFrame = 0;
var winSpeedElapsedFrames = 0;

var winSpeedElapsedMs = 0;
var winSpeedLastScore = 0;
var winSpeedBestMs = Number(localStorage.getItem("nakhwaWinSpeedBestMs") || 0);
var winSpeedParticles = [];
var winSpeedPopups = [];

function resetWinSpeed() {
  winSpeedDist = 0;
  winSpeedSpeed = 0;
  winSpeedBoost = 0;
  winSpeedLastSide = 0;
  winSpeedLastStepFrame = 0;
  winSpeedFrame = 0;
  winSpeedElapsedFrames = 0;
  winSpeedElapsedMs = 0;
  winSpeedLastScore = 0;
  winSpeedParticles = [];
  winSpeedPopups = [];
  winSpeedOver = false;
  winSpeedFinished = false;
  winSpeedRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addWinSpeedPopup(x, y, text, color) {
  winSpeedPopups.push({ x, y, text, color, life: 34 });
}

function spawnWinSpeedIce(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    winSpeedParticles.push({
      x,
      y,
      vx: -1.4 - Math.random() * 2.6,
      vy: -0.7 - Math.random() * 1.8,
      r: 2 + Math.random() * 2.2,
      color,
      life: 20
    });
  }
}

function stepWinSpeedStride(side) {
  if (!winSpeedRunning || winSpeedOver || winSpeedFinished) return;

  const diffFrames = winSpeedFrame - winSpeedLastStepFrame;
  const isAlternating = winSpeedLastSide !== side;
  const inCorner = winSpeedDist >= 150 && winSpeedDist <= 350;

  if (isAlternating) {
    if (diffFrames >= 4 && diffFrames <= 18) {
      const cornerBonus = inCorner ? 4 : 0;
      winSpeedBoost = Math.min(100, winSpeedBoost + 13 + cornerBonus);
      winSpeedSpeed = Math.min(1.75, winSpeedSpeed + (inCorner ? 0.27 : 0.23));
      if (diffFrames >= 7 && diffFrames <= 13) {
        addWinSpeedPopup(
          canvas.width * 0.5,
          190,
          inCorner ? "❄️ CORNER ACCEL!" : "⚡ ICE GLIDE!",
          "#72efdd"
        );
      }
    } else {
      winSpeedBoost = Math.min(100, winSpeedBoost + 7);
      winSpeedSpeed = Math.min(1.5, winSpeedSpeed + 0.16);
    }
    spawnWinSpeedIce(85, 292, "#d8f3ff", 5);
  } else {
    winSpeedBoost = Math.max(0, winSpeedBoost - 10);
    winSpeedSpeed = Math.max(0.15, winSpeedSpeed - 0.12);
    addWinSpeedPopup(canvas.width * 0.5, 206, "좌/우 교대 스케이팅!", "#9898a6");
  }

  winSpeedLastSide = side;
  winSpeedLastStepFrame = winSpeedFrame;
}

function finishWinSpeed() {
  winSpeedFinished = true;
  winSpeedRunning = false;
  winSpeedElapsedMs = Math.max(100, Math.round((winSpeedElapsedFrames / 60) * 1000));
  winSpeedLastScore = winSpeedElapsedMs;

  const isNewBest = winSpeedBestMs === 0 || winSpeedElapsedMs < winSpeedBestMs;
  if (isNewBest) {
    winSpeedBestMs = winSpeedElapsedMs;
    localStorage.setItem("nakhwaWinSpeedBestMs", String(winSpeedBestMs));
  }

  triggerGameOver(isNewBest, true);
}

function drawWinSpeedFrame() {
  try {
    ctx.save();

    if (winSpeedRunning && !winSpeedOver && !winSpeedFinished) {
      winSpeedFrame++;
      winSpeedElapsedFrames++;

      winSpeedBoost = Math.max(0, winSpeedBoost - 0.32);
      const boostBonus = (winSpeedBoost / 100) * 0.68;
      const minIceSpeed = winSpeedDist > 2 ? 0.14 : 0;
      winSpeedSpeed = Math.max(minIceSpeed, winSpeedSpeed * 0.972);

      // 500m 스케일 이동량
      const movePerStep = (winSpeedSpeed + boostBonus) * 1.18;
      winSpeedDist = Math.min(500, winSpeedDist + movePerStep);

      if (winSpeedDist >= 500) {
        finishWinSpeed();
      }
    }

    // 배경 & 빙상 링크
    ctx.fillStyle = "#101624";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#182236";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 빙판 트랙
    const inCorner = winSpeedDist >= 150 && winSpeedDist <= 350;
    ctx.fillStyle = inCorner ? "#254a6e" : "#2c5a84";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 빙판 반사 라인 & 레인
    ctx.fillStyle = "rgba(216, 243, 255, 0.32)";
    [132, 184, 236, 288, 336].forEach(yPos => {
      ctx.fillRect(0, yPos, canvas.width, 2);
    });

    const iceScroll = (winSpeedDist * 7) % 60;
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    for (let x = -iceScroll; x < canvas.width + 60; x += 60) {
      ctx.fillRect(x, 132, 2, 10);
    }

    // 결승선(440m 이후 등장)
    if (winSpeedDist >= 440) {
      const finishX = 85 + (500 - winSpeedDist) * 5.2;
      if (finishX >= 0 && finishX <= canvas.width) {
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(finishX, 130, 6, 210);
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("500m FINISH", finishX + 3, 122);
      }
    }

    // 하단 조작 가이드 존
    ctx.fillStyle = "#141a26";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b354a";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#98a6bd";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 왼발 푸시 (←/A)", canvas.width * 0.25, 376);
    ctx.fillText("오른발 푸시 (→/D) ▶", canvas.width * 0.75, 376);

    // 스케이터 캐릭터 렌더링 (낮고 유선형 자세)
    const skaterX = 85;
    const lean = inCorner ? -6 : 0;
    const skaterY = 266 + Math.sin(winSpeedFrame * 0.4) * (winSpeedSpeed > 0.2 ? 3 : 0);
    const legSwing = Math.sin(winSpeedFrame * 0.5) * (winSpeedSpeed > 0.2 ? 11 : 2);

    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(skaterX, 296, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 스케이트 날 & 다리
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(skaterX, skaterY + 10);
    ctx.lineTo(skaterX + legSwing, skaterY + 26);
    ctx.moveTo(skaterX, skaterY + 10);
    ctx.lineTo(skaterX - legSwing, skaterY + 26);
    ctx.stroke();

    // 몸통 & 헬멧
    ctx.fillStyle = "#3a86ff";
    ctx.beginPath();
    ctx.ellipse(skaterX + 4, skaterY + 4 + lean * 0.3, 12, 7.5, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(skaterX + 14, skaterY - 5 + lean * 0.4, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 얼음 파편 & 팝업
    for (let i = winSpeedParticles.length - 1; i >= 0; i--) {
      const pt = winSpeedParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) winSpeedParticles.splice(i, 1);
    }

    for (let i = winSpeedPopups.length - 1; i >= 0; i--) {
      const pop = winSpeedPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) winSpeedPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 18, 26, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveSec = (winSpeedElapsedFrames / 60).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(winSpeedDist)}m / 500m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      `기록 ${liveSec}초 · ${inCorner ? "코너 가속 구간!" : `부스트 ${Math.floor(winSpeedBoost)}%`}`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = winSpeedBestMs > 0 ? `${(winSpeedBestMs / 1000).toFixed(3)}초` : "--.---";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 완주 오버레이
    if (winSpeedFinished) {
      ctx.fillStyle = "rgba(15, 18, 26, 0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalSec = (winSpeedElapsedMs / 1000).toFixed(3);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`⛸️ 스피드 스케이팅 · ${finalSec}초`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#72efdd";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 레이스", canvas.width / 2, 214);
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
  id: "win-speed",
  title: "스피드 스케이팅",
  icon: "⛸️",
  desc: "좌우 교대 스트로크와 코너 가속으로 500m 빙판을 돌파!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "초",
  hint: "좌/우 번갈아 터치(PC: ←/→ 또는 A/D)로 질주! 150~350m 코너 가속!",
  rankingTitle: "⛸️ 스피드 스케이팅 500m TOP 5 (빠른 순)",
  dbNode: "win_speed_scores",
  formatScore: (score) => `${(score / 1000).toFixed(3)}초`,
  getBadge: () => (winSpeedBestMs > 0 ? `BEST ${(winSpeedBestMs / 1000).toFixed(3)}초` : "BEST --.---"),
  getScore: () => winSpeedLastScore,
  reset: resetWinSpeed,
  draw: drawWinSpeedFrame,
  stop: () => {
    winSpeedRunning = false;
  },
  onPointerDown: (x) => {
    if (winSpeedFinished || winSpeedOver || !winSpeedRunning) {
      if (!canRestartNow()) return;
      resetWinSpeed();
      return;
    }
    stepWinSpeedStride(x < canvas.width / 2 ? -1 : 1);
  },
  onKeyDown: (e) => {
    if (winSpeedFinished || winSpeedOver || !winSpeedRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetWinSpeed();
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepWinSpeedStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepWinSpeedStride(1);
    }
  }
});