/* ---------- 올림픽 6. 높이뛰기 (High Jump) 상태 ---------- */
var olyHjRunning = false;
var olyHjOver = false;
var olyHjFinished = false;
var olyHjCleared = false;

var olyHjPhase = "run"; // "run" | "air" | "done"
var olyHjDist = 0; // 도움닫기 거리 (0 ~ 18m)
var olyHjSpeed = 0;
var olyHjLastSide = 0;
var olyHjLastStepFrame = 0;
var olyHjFrame = 0;

var olyHjX = 75;
var olyHjY = 294;
var olyHjVx = 0;
var olyHjVy = 0;
var olyHjPeakY = 294;
var olyHjBarY = 205; // 화면상 바 높이 (작을수록 높음)
var olyHjHeightM = 0;

var olyHjScoreCm = 0; // 예: 245 => 2.45m
var olyHjLastScore = 0;
var olyHjBestCm = Number(localStorage.getItem("nakhwaOlyHighJumpBestCm") || 0);
var olyHjParticles = [];
var olyHjPopups = [];

var OLY_HJ_TAKEOFF_DIST = 15.2;
var OLY_HJ_BAR_X = 210;
var OLY_HJ_GROUND_Y = 294;

function resetOlyHighJump() {
  olyHjPhase = "run";
  olyHjDist = 0;
  olyHjSpeed = 0;
  olyHjLastSide = 0;
  olyHjLastStepFrame = 0;
  olyHjFrame = 0;
  olyHjX = 75;
  olyHjY = OLY_HJ_GROUND_Y;
  olyHjVx = 0;
  olyHjVy = 0;
  olyHjPeakY = OLY_HJ_GROUND_Y;
  olyHjBarY = 205;
  olyHjHeightM = 0;
  olyHjScoreCm = 0;
  olyHjLastScore = 0;
  olyHjParticles = [];
  olyHjPopups = [];
  olyHjCleared = false;
  olyHjOver = false;
  olyHjFinished = false;
  olyHjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyHjPopup(x, y, text, color) {
  olyHjPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyHjBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    olyHjParticles.push({
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

function stepOlyHighJumpStride(side) {
  if (!olyHjRunning || olyHjOver || olyHjFinished || olyHjPhase !== "run") return;

  const diffFrames = olyHjFrame - olyHjLastStepFrame;
  const isAlternating = olyHjLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    olyHjSpeed = Math.min(1.85, olyHjSpeed + bonus);
    spawnOlyHjBurst(olyHjX, OLY_HJ_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyHjSpeed = Math.max(0.12, olyHjSpeed - 0.12);
    addOlyHjPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyHjLastSide = side;
  olyHjLastStepFrame = olyHjFrame;
}

function jumpOlyHighJump() {
  if (!olyHjRunning || olyHjOver || olyHjFinished || olyHjPhase !== "run") return;

  // 최적 도약존(13.5m ~ 16.2m) 근접도 계산
  const distDiff = Math.abs(olyHjDist - OLY_HJ_TAKEOFF_DIST);
  const timingFactor = Math.max(0.45, 1 - distDiff / 7.5);
  const speedFactor = Math.max(0.35, Math.min(1.25, olyHjSpeed * 0.88));
  const liftPower = speedFactor * timingFactor;

  olyHjPhase = "air";
  olyHjVy = -(5.6 + liftPower * 4.8);
  olyHjVx = 2.4 + speedFactor * 2.2;
  olyHjPeakY = olyHjY;

  spawnOlyHjBurst(olyHjX, OLY_HJ_GROUND_Y, "#ffd166", 10);

  if (distDiff <= 1.2 && olyHjSpeed >= 0.9) {
    addOlyHjPopup(olyHjX, olyHjY - 32, "🚀 HIGH LAUNCH!", "#ffd166");
  }
}

function finishOlyHighJump() {
  olyHjPhase = "done";
  olyHjFinished = true;
  olyHjRunning = false;

  // 최고 도달 높이 기준 기록 산출 (1.50m ~ 2.52m 범위)
  const reachPx = Math.max(0, OLY_HJ_GROUND_Y - olyHjPeakY);
  const rawMeters = Math.max(1.45, Math.min(2.55, 1.50 + reachPx * 0.0072));
  const finalMeters = Number(rawMeters.toFixed(2));

  olyHjHeightM = finalMeters;
  olyHjScoreCm = Math.round(finalMeters * 100);
  olyHjLastScore = olyHjScoreCm;
  olyHjCleared = reachPx >= 72;

  spawnOlyHjBurst(olyHjX, OLY_HJ_GROUND_Y, olyHjCleared ? "#72efdd" : "#ff8ca5", 14);

  const isNewBest = olyHjScoreCm > olyHjBestCm;
  if (isNewBest) {
    olyHjBestCm = olyHjScoreCm;
    localStorage.setItem("nakhwaOlyHighJumpBestCm", String(olyHjBestCm));
  }

  triggerGameOver(isNewBest, olyHjScoreCm > 0);
}

function drawOlyHighJumpFrame() {
  try {
    ctx.save();

    if (olyHjRunning && !olyHjOver && !olyHjFinished) {
      olyHjFrame++;

      if (olyHjPhase === "run") {
        const minRunSpeed = olyHjDist > 0.5 ? 0.14 : 0;
        olyHjSpeed = Math.max(minRunSpeed, olyHjSpeed * 0.968);
        olyHjDist += olyHjSpeed * 0.24;
        olyHjX = Math.min(165, 75 + (olyHjDist / OLY_HJ_TAKEOFF_DIST) * 90);

        // 도약존 지나쳐 17.5m 도달 시 자동 도약
        if (olyHjDist >= 17.5) {
          jumpOlyHighJump();
        }
      } else if (olyHjPhase === "air") {
        olyHjX = Math.min(canvas.width - 36, olyHjX + olyHjVx);
        olyHjY += olyHjVy;
        olyHjVy += 0.22;

        if (olyHjY < olyHjPeakY) {
          olyHjPeakY = olyHjY;
        }

        if (olyHjY >= OLY_HJ_GROUND_Y) {
          olyHjY = OLY_HJ_GROUND_Y;
          finishOlyHighJump();
        }
      }
    }

    // 배경 & 경기장
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 트랙 & 착지 매트
    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, 195, 210);

    ctx.fillStyle = "#28598a";
    ctx.fillRect(195, 130, canvas.width - 195, 210);

    // 지면 라인
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_HJ_GROUND_Y + 4, canvas.width, 2);

    // 높이뛰기 지주 & 가로바
    ctx.fillStyle = "#cfd6e4";
    ctx.fillRect(OLY_HJ_BAR_X - 3, 145, 6, OLY_HJ_GROUND_Y - 141);

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_HJ_BAR_X - 14, olyHjBarY, 28, 5);
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BAR", OLY_HJ_BAR_X, olyHjBarY - 6);

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
    ctx.fillText("◀ 좌 가속 (←/A) · 위 점프(↑/Space)", canvas.width * 0.25, 376);
    ctx.fillText("우 가속 (→/D) · 위 점프(↑/Space) ▶", canvas.width * 0.75, 376);

    // 선수 캐릭터 렌더링
    const bob = olyHjPhase === "run" ? Math.sin(olyHjFrame * 0.45) * (olyHjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyHjY + bob;
    const legSwing = olyHjPhase === "air" ? 7 : Math.sin(olyHjFrame * 0.55) * (olyHjSpeed > 0.2 ? 9 : 1);

    // 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyHjX, OLY_HJ_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 다리
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyHjX, drawY - 14);
    ctx.lineTo(olyHjX + legSwing, drawY + 2);
    ctx.moveTo(olyHjX, drawY - 14);
    ctx.lineTo(olyHjX - legSwing, drawY + 2);
    ctx.stroke();

    // 몸통 & 머리
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyHjX, drawY - 22, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#72efdd";
    ctx.beginPath();
    ctx.arc(olyHjX + 2, drawY - 36, 8, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olyHjParticles.length - 1; i >= 0; i--) {
      const pt = olyHjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyHjParticles.splice(i, 1);
    }

    for (let i = olyHjPopups.length - 1; i >= 0; i--) {
      const pop = olyHjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyHjPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveReach = Math.max(0, OLY_HJ_GROUND_Y - olyHjPeakY);
    const liveMeters = (1.50 + liveReach * 0.0072).toFixed(2);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyHjDist.toFixed(1)}m · 높이 ${liveMeters}m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`속도 ${olyHjSpeed.toFixed(2)} (도약존 15m 부근)`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyHjBestCm > 0 ? `${(olyHjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (olyHjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`⬆️ 높이뛰기 기록 ${olyHjHeightM.toFixed(2)}m`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#ff8ca5";
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
  id: "oly-highjump",
  title: "높이뛰기",
  icon: "⬆️",
  desc: "도움닫기 속도와 도약 타이밍으로 최고 높이에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 15m 도약존 부근에서 위쪽 터치(PC: ↑/Space)로 점프!",
  rankingTitle: "⬆️ 높이뛰기 TOP 5 (최고 높이)",
  dbNode: "oly_highjump_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyHjBestCm > 0 ? `BEST ${(olyHjBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyHjLastScore,
  reset: resetOlyHighJump,
  draw: drawOlyHighJumpFrame,
  stop: () => {
    olyHjRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyHjFinished || olyHjOver || !olyHjRunning) {
      if (!canRestartNow()) return;
      resetOlyHighJump();
      return;
    }
    if (y < 235) {
      jumpOlyHighJump();
    } else {
      stepOlyHighJumpStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyHjFinished || olyHjOver || !olyHjRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyHighJump();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) jumpOlyHighJump();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyHighJumpStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyHighJumpStride(1);
    }
  }
});