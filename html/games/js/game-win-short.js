/* ---------- 동계 올림픽 2. 쇼트트랙 (Short Track) 상태 ---------- */
var winShortRunning = false;
var winShortOver = false;
var winShortFinished = false;

var winShortDist = 0; // 0 ~ 500m
var winShortSpeed = 0;
var winShortBoost = 0; // 0 ~ 100 인코스 추월 부스트
var winShortLastSide = 0;
var winShortLastStepFrame = 0;
var winShortFrame = 0;
var winShortElapsedFrames = 0;

var winShortElapsedMs = 0;
var winShortLastScore = 0;
var winShortBestMs = Number(localStorage.getItem("nakhwaWinShortBestMs") || 0);
var winShortParticles = [];
var winShortPopups = [];

function resetWinShort() {
  winShortDist = 0;
  winShortSpeed = 0;
  winShortBoost = 0;
  winShortLastSide = 0;
  winShortLastStepFrame = 0;
  winShortFrame = 0;
  winShortElapsedFrames = 0;
  winShortElapsedMs = 0;
  winShortLastScore = 0;
  winShortParticles = [];
  winShortPopups = [];
  winShortOver = false;
  winShortFinished = false;
  winShortRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addWinShortPopup(x, y, text, color) {
  winShortPopups.push({ x, y, text, color, life: 34 });
}

function spawnWinShortIce(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    winShortParticles.push({
      x,
      y,
      vx: -1.5 - Math.random() * 2.8,
      vy: -0.8 - Math.random() * 2.0,
      r: 2 + Math.random() * 2.2,
      color,
      life: 19
    });
  }
}

function stepWinShortStride(side) {
  if (!winShortRunning || winShortOver || winShortFinished) return;

  const diffFrames = winShortFrame - winShortLastStepFrame;
  const isAlternating = winShortLastSide !== side;
  const isTurnZone = Math.floor(winShortDist / 100) % 2 === 1;

  if (isAlternating) {
    if (diffFrames >= 3 && diffFrames <= 16) {
      const turnBonus = isTurnZone ? 5 : 0;
      winShortBoost = Math.min(100, winShortBoost + 14 + turnBonus);
      winShortSpeed = Math.min(1.8, winShortSpeed + (isTurnZone ? 0.28 : 0.24));
      if (diffFrames >= 6 && diffFrames <= 12) {
        addWinShortPopup(
          canvas.width * 0.5,
          190,
          isTurnZone ? "⚡ IN-COURSE OVERTAKE!" : "🔥 SHORT DASH!",
          "#ffd166"
        );
      }
    } else {
      winShortBoost = Math.min(100, winShortBoost + 7.5);
      winShortSpeed = Math.min(1.55, winShortSpeed + 0.17);
    }
    spawnWinShortIce(85, 292, "#b8f2ff", 5);
  } else {
    winShortBoost = Math.max(0, winShortBoost - 11);
    winShortSpeed = Math.max(0.15, winShortSpeed - 0.13);
    addWinShortPopup(canvas.width * 0.5, 206, "좌/우 교대!", "#9898a6");
  }

  winShortLastSide = side;
  winShortLastStepFrame = winShortFrame;
}

function finishWinShort() {
  winShortFinished = true;
  winShortRunning = false;
  winShortElapsedMs = Math.max(100, Math.round((winShortElapsedFrames / 60) * 1000));
  winShortLastScore = winShortElapsedMs;

  const isNewBest = winShortBestMs === 0 || winShortElapsedMs < winShortBestMs;
  if (isNewBest) {
    winShortBestMs = winShortElapsedMs;
    localStorage.setItem("nakhwaWinShortBestMs", String(winShortBestMs));
  }

  triggerGameOver(isNewBest, true);
}

function drawWinShortFrame() {
  try {
    ctx.save();

    if (winShortRunning && !winShortOver && !winShortFinished) {
      winShortFrame++;
      winShortElapsedFrames++;

      winShortBoost = Math.max(0, winShortBoost - 0.34);
      const boostBonus = (winShortBoost / 100) * 0.72;
      const minIceSpeed = winShortDist > 2 ? 0.15 : 0;
      winShortSpeed = Math.max(minIceSpeed, winShortSpeed * 0.971);

      const movePerStep = (winShortSpeed + boostBonus) * 1.22;
      winShortDist = Math.min(500, winShortDist + movePerStep);

      if (winShortDist >= 500) {
        finishWinShort();
      }
    }

    // 배경 & 쇼트트랙 링크
    ctx.fillStyle = "#0e1421";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#172033";
    ctx.fillRect(0, 0, canvas.width, 130);

    const isTurnZone = Math.floor(winShortDist / 100) % 2 === 1;
    ctx.fillStyle = isTurnZone ? "#1e4b73" : "#265c8a";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 트랙 라인 및 패딩 느낌의 경계선
    ctx.fillStyle = "rgba(184, 242, 255, 0.35)";
    [132, 184, 236, 288, 336].forEach(yPos => {
      ctx.fillRect(0, yPos, canvas.width, 2);
    });

    const scroll = (winShortDist * 8) % 56;
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    for (let x = -scroll; x < canvas.width + 56; x += 56) {
      ctx.fillRect(x, 132, 2, 10);
    }

    // 결승선(440m 이후 등장)
    if (winShortDist >= 440) {
      const finishX = 85 + (500 - winShortDist) * 5.2;
      if (finishX >= 0 && finishX <= canvas.width) {
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(finishX, 130, 6, 210);
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FINISH", finishX + 3, 122);
      }
    }

    // 하단 조작 가이드 존
    ctx.fillStyle = "#141924";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b354a";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#98a6bd";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 좌 푸시 (←/A)", canvas.width * 0.25, 376);
    ctx.fillText("우 푸시 (→/D) ▶", canvas.width * 0.75, 376);

    // 쇼트트랙 스케이터 렌더링
    const skaterX = 85;
    const skaterY = 266 + Math.sin(winShortFrame * 0.45) * (winShortSpeed > 0.2 ? 3.5 : 0);
    const legSwing = Math.sin(winShortFrame * 0.56) * (winShortSpeed > 0.2 ? 11 : 2);
    const bodyTilt = isTurnZone ? -0.36 : -0.18;

    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(skaterX, 296, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(skaterX, skaterY + 10);
    ctx.lineTo(skaterX + legSwing, skaterY + 26);
    ctx.moveTo(skaterX, skaterY + 10);
    ctx.lineTo(skaterX - legSwing, skaterY + 26);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.ellipse(skaterX + 4, skaterY + 4, 12, 7.5, bodyTilt, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#72efdd";
    ctx.beginPath();
    ctx.arc(skaterX + 14, skaterY - 5, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 얼음 파편 & 팝업
    for (let i = winShortParticles.length - 1; i >= 0; i--) {
      const pt = winShortParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 19);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) winShortParticles.splice(i, 1);
    }

    for (let i = winShortPopups.length - 1; i >= 0; i--) {
      const pop = winShortPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) winShortPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 18, 26, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveSec = (winShortElapsedFrames / 60).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(winShortDist)}m / 500m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      `기록 ${liveSec}초 · ${isTurnZone ? "코너 추월 구간!" : `부스트 ${Math.floor(winShortBoost)}%`}`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = winShortBestMs > 0 ? `${(winShortBestMs / 1000).toFixed(3)}초` : "--.---";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 완주 오버레이
    if (winShortFinished) {
      ctx.fillStyle = "rgba(15, 18, 26, 0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalSec = (winShortElapsedMs / 1000).toFixed(3);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`⚡ 쇼트트랙 완주 · ${finalSec}초`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#72efdd";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 질주하기", canvas.width / 2, 214);
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
  id: "win-short",
  title: "쇼트트랙",
  icon: "⚡",
  desc: "초고속 코너링과 촘촘한 스트로크로 500m 쇼트트랙 제패!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "초",
  hint: "좌/우 번갈아 터치(PC: ←/→ 또는 A/D)로 가속! 코너 구간 리듬 집중!",
  rankingTitle: "⚡ 쇼트트랙 TOP 5 (빠른 순)",
  dbNode: "win_short_scores",
  formatScore: (score) => `${(score / 1000).toFixed(3)}초`,
  getBadge: () => (winShortBestMs > 0 ? `BEST ${(winShortBestMs / 1000).toFixed(3)}초` : "BEST --.---"),
  getScore: () => winShortLastScore,
  reset: resetWinShort,
  draw: drawWinShortFrame,
  stop: () => {
    winShortRunning = false;
  },
  onPointerDown: (x) => {
    if (winShortFinished || winShortOver || !winShortRunning) {
      if (!canRestartNow()) return;
      resetWinShort();
      return;
    }
    stepWinShortStride(x < canvas.width / 2 ? -1 : 1);
  },
  onKeyDown: (e) => {
    if (winShortFinished || winShortOver || !winShortRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetWinShort();
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepWinShortStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepWinShortStride(1);
    }
  }
});