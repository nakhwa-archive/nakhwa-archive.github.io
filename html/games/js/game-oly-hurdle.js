/* ---------- 올림픽 2. 110미터 허들 (110m Hurdles) 상태 ---------- */
var olyHurdleRunning = false;
var olyHurdleOver = false;
var olyHurdleFinished = false;

var olyHurdleDist = 0; // 0 ~ 110m
var olyHurdleSpeed = 0;
var olyHurdleBoost = 0; // 0 ~ 100 리듬 가속 게이지
var olyHurdleLastSide = 0;
var olyHurdleLastStepFrame = 0;
var olyHurdleFrame = 0;
var olyHurdleElapsedFrames = 0;

var olyHurdleJumpZ = 0; // 점프 높이 (0이면 지면, >0이면 공중)
var olyHurdleJumpVz = 0;
var olyHurdleStumbleFrames = 0;

var olyHurdleElapsedMs = 0;
var olyHurdleLastScore = 0;
var olyHurdleBestMs = Number(localStorage.getItem("nakhwaOlyHurdleBestMs") || 0);
var olyHurdleParticles = [];
var olyHurdlePopups = [];

// 허들 위치(m) 목록 (110m 레이스 기준 10개)
var OLY_HURDLE_MARKS = [13.72, 22.86, 32.0, 41.14, 50.28, 59.42, 68.56, 77.7, 86.84, 95.98];
var olyHurdleClearedSet = {};

function resetOlyHurdle() {
  olyHurdleDist = 0;
  olyHurdleSpeed = 0;
  olyHurdleBoost = 0;
  olyHurdleLastSide = 0;
  olyHurdleLastStepFrame = 0;
  olyHurdleFrame = 0;
  olyHurdleElapsedFrames = 0;
  olyHurdleJumpZ = 0;
  olyHurdleJumpVz = 0;
  olyHurdleStumbleFrames = 0;
  olyHurdleElapsedMs = 0;
  olyHurdleLastScore = 0;
  olyHurdleClearedSet = {};
  olyHurdleParticles = [];
  olyHurdlePopups = [];
  olyHurdleOver = false;
  olyHurdleFinished = false;
  olyHurdleRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyHurdlePopup(x, y, text, color) {
  olyHurdlePopups.push({ x, y, text, color, life: 34 });
}

function spawnOlyHurdleBurst(x, y, color, count = 7) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.4;
    olyHurdleParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2 + Math.random() * 2,
      color,
      life: 20
    });
  }
}

function stepOlyHurdleStride(side) {
  if (!olyHurdleRunning || olyHurdleOver || olyHurdleFinished) return;
  if (olyHurdleStumbleFrames > 0) return;

  const diffFrames = olyHurdleFrame - olyHurdleLastStepFrame;
  const isAlternating = olyHurdleLastSide !== side;

  if (isAlternating) {
    if (diffFrames >= 4 && diffFrames <= 18) {
      olyHurdleBoost = Math.min(100, olyHurdleBoost + 14);
      olyHurdleSpeed = Math.min(1.75, olyHurdleSpeed + 0.24);
      if (diffFrames >= 7 && diffFrames <= 13) {
        addOlyHurdlePopup(canvas.width * 0.5, 192, "⚡ HURDLE RHYTHM!", "#72efdd");
      }
    } else {
      olyHurdleBoost = Math.min(100, olyHurdleBoost + 7);
      olyHurdleSpeed = Math.min(1.5, olyHurdleSpeed + 0.16);
    }
    spawnOlyHurdleBurst(85, 294, "#ff8ca5", 4);
  } else {
    olyHurdleBoost = Math.max(0, olyHurdleBoost - 10);
    olyHurdleSpeed = Math.max(0.14, olyHurdleSpeed - 0.12);
    addOlyHurdlePopup(canvas.width * 0.5, 208, "좌/우 교대!", "#9898a6");
  }

  olyHurdleLastSide = side;
  olyHurdleLastStepFrame = olyHurdleFrame;
}

function jumpOlyHurdle() {
  if (!olyHurdleRunning || olyHurdleOver || olyHurdleFinished) return;
  if (olyHurdleJumpZ > 0) return; // 공중 이중점프 방지

  olyHurdleJumpVz = 4.2;
  olyHurdleJumpZ = 1;
  spawnOlyHurdleBurst(85, 294, "#ffd166", 6);
}

function finishOlyHurdle() {
  olyHurdleFinished = true;
  olyHurdleRunning = false;
  olyHurdleElapsedMs = Math.max(100, Math.round((olyHurdleElapsedFrames / 60) * 1000));
  olyHurdleLastScore = olyHurdleElapsedMs;

  const isNewBest = olyHurdleBestMs === 0 || olyHurdleElapsedMs < olyHurdleBestMs;
  if (isNewBest) {
    olyHurdleBestMs = olyHurdleElapsedMs;
    localStorage.setItem("nakhwaOlyHurdleBestMs", String(olyHurdleBestMs));
  }

  triggerGameOver(isNewBest, true);
}

function drawOlyHurdleFrame() {
  try {
    ctx.save();

    if (olyHurdleRunning && !olyHurdleOver && !olyHurdleFinished) {
      olyHurdleFrame++;
      olyHurdleElapsedFrames++;

      if (olyHurdleStumbleFrames > 0) {
        olyHurdleStumbleFrames--;
      }

      if (olyHurdleJumpZ > 0 || olyHurdleJumpVz !== 0) {
        olyHurdleJumpZ += olyHurdleJumpVz;
        olyHurdleJumpVz -= 0.34;
        if (olyHurdleJumpZ <= 0) {
          olyHurdleJumpZ = 0;
          olyHurdleJumpVz = 0;
        }
      }

      olyHurdleBoost = Math.max(0, olyHurdleBoost - 0.35);
      const boostBonus = (olyHurdleBoost / 100) * 0.65;
      const minRunSpeed = olyHurdleDist > 0.5 ? 0.14 : 0;
      const stumbleFactor = olyHurdleStumbleFrames > 0 ? 0.35 : 1.0;

      olyHurdleSpeed = Math.max(minRunSpeed, olyHurdleSpeed * 0.97);
      const stepDist = (olyHurdleSpeed + boostBonus) * 0.32 * stumbleFactor;
      olyHurdleDist = Math.min(110, olyHurdleDist + stepDist);

      // 허들 충돌 및 통과 판정 (선수 위치 기준 85px = olyHurdleDist)
      for (let i = 0; i < OLY_HURDLE_MARKS.length; i++) {
        if (olyHurdleClearedSet[i]) continue;
        const hDist = OLY_HURDLE_MARKS[i];
        const diffM = hDist - olyHurdleDist;

        if (Math.abs(diffM) < 0.75) {
          if (olyHurdleJumpZ >= 10) {
            olyHurdleClearedSet[i] = true;
            olyHurdleBoost = Math.min(100, olyHurdleBoost + 8);
            addOlyHurdlePopup(85, 242 - olyHurdleJumpZ, "✨ CLEAR!", "#72efdd");
          } else {
            olyHurdleClearedSet[i] = true;
            olyHurdleStumbleFrames = 22;
            olyHurdleSpeed = Math.max(0.18, olyHurdleSpeed * 0.45);
            olyHurdleBoost = Math.max(0, olyHurdleBoost - 25);
            spawnOlyHurdleBurst(85, 274, "#ff4d6d", 10);
            addOlyHurdlePopup(85, 226, "💥 걸림!", "#ff4d6d");
          }
        } else if (diffM < -0.75) {
          olyHurdleClearedSet[i] = true;
        }
      }

      if (olyHurdleDist >= 110) {
        finishOlyHurdle();
      }
    }

    // 배경 & 트랙
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, canvas.width, 210);

    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    [132, 184, 236, 288, 336].forEach(yPos => {
      ctx.fillRect(0, yPos, canvas.width, 2);
    });

    const pxPerMeter = 22;
    const runnerX = 85;
    const trackBaseY = 278;

    // 허들 렌더링
    OLY_HURDLE_MARKS.forEach((hDist, idx) => {
      const hx = runnerX + (hDist - olyHurdleDist) * pxPerMeter;
      if (hx < -30 || hx > canvas.width + 30) return;

      ctx.fillStyle = "#f4f4f6";
      ctx.fillRect(hx - 2, trackBaseY - 14, 4, 24);
      ctx.fillStyle = olyHurdleClearedSet[idx] ? "#72efdd" : "#ffd166";
      ctx.fillRect(hx - 10, trackBaseY - 16, 20, 5);
    });

    // 결승선
    if (olyHurdleDist >= 96) {
      const finishX = runnerX + (110 - olyHurdleDist) * pxPerMeter;
      if (finishX >= 0 && finishX <= canvas.width) {
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(finishX, 130, 6, 210);
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("110m FINISH", finishX + 3, 122);
      }
    }

    // 하단 조작 가이드 존
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b2e3d";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 좌 달리기 (←/A)", canvas.width * 0.25, 376);
    ctx.fillText("우 달리기 (→/D) ▶", canvas.width * 0.75, 376);

    // 선수 캐릭터 렌더링
    const bob = olyHurdleJumpZ === 0 ? Math.sin(olyHurdleFrame * 0.45) * (olyHurdleSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = trackBaseY - olyHurdleJumpZ + bob;
    const legSwing = olyHurdleJumpZ > 0 ? 9 : Math.sin(olyHurdleFrame * 0.55) * (olyHurdleSpeed > 0.2 ? 10 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(runnerX, trackBaseY + 18, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(runnerX, drawY + 4);
    ctx.lineTo(runnerX + legSwing, drawY + 18);
    ctx.moveTo(runnerX, drawY + 4);
    ctx.lineTo(runnerX - legSwing, drawY + 18);
    ctx.stroke();

    ctx.fillStyle = olyHurdleStumbleFrames > 0 ? "#ff4d6d" : "#e65c7b";
    ctx.beginPath();
    ctx.arc(runnerX, drawY - 4, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#72efdd";
    ctx.beginPath();
    ctx.arc(runnerX + 2, drawY - 17, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olyHurdleParticles.length - 1; i >= 0; i--) {
      const pt = olyHurdleParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyHurdleParticles.splice(i, 1);
    }

    for (let i = olyHurdlePopups.length - 1; i >= 0; i--) {
      const pop = olyHurdlePopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyHurdlePopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveSec = (olyHurdleElapsedFrames / 60).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${olyHurdleDist.toFixed(1)}m / 110m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`기록 ${liveSec}초 · 부스트 ${Math.floor(olyHurdleBoost)}%`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyHurdleBestMs > 0 ? `${(olyHurdleBestMs / 1000).toFixed(3)}초` : "--.---";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 완주 오버레이
    if (olyHurdleFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalSec = (olyHurdleElapsedMs / 1000).toFixed(3);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🚧 110m 허들 · ${finalSec}초`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#ff8ca5";
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
  id: "oly-hurdle",
  title: "110미터 허들",
  icon: "🚧",
  desc: "좌우 교대 가속과 허들 점프로 110m 트랙을 가장 빨리 돌파!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "초",
  hint: "좌/우 번갈아 달리기 · 허들 앞에선 위쪽 터치(PC: ↑/W/Space)로 점프!",
  rankingTitle: "🚧 110미터 허들 TOP 5 (빠른 순)",
  dbNode: "oly_hurdle_scores",
  formatScore: (score) => `${(score / 1000).toFixed(3)}초`,
  getBadge: () => (olyHurdleBestMs > 0 ? `BEST ${(olyHurdleBestMs / 1000).toFixed(3)}초` : "BEST --.---"),
  getScore: () => olyHurdleLastScore,
  reset: resetOlyHurdle,
  draw: drawOlyHurdleFrame,
  stop: () => {
    olyHurdleRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyHurdleFinished || olyHurdleOver || !olyHurdleRunning) {
      if (!canRestartNow()) return;
      resetOlyHurdle();
      return;
    }
    if (y < 235) {
      jumpOlyHurdle();
    } else {
      stepOlyHurdleStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyHurdleFinished || olyHurdleOver || !olyHurdleRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyHurdle();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) jumpOlyHurdle();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyHurdleStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyHurdleStride(1);
    }
  }
});
