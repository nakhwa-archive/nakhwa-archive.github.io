/* ---------- 올림픽 7. 높이뛰기 (High Jump) ---------- */
var olyHjRunning = false;
var olyHjOver = false;
var olyHjFinished = false;
var olyHjFailed = false;

var olyHjPhase = "run"; // "run" | "jump" | "done"
var olyHjBarHeightM = 1.60; // 현재 도전 바 높이 (m)
var olyHjClearedHeightM = 0; // 성공한 최고 높이 (m)
var olyHjClearedCount = 0;

var olyHjRunPos = 0; // 도움닫기 진행도 (0 ~ 15)
var olyHjSpeed = 0; // 현재 가속도 (0 ~ 2.0)
var olyHjLastSide = 0;
var olyHjLastStepFrame = 0;
var olyHjFrame = 0;

var olyHjX = 85;
var olyHjY = 294;
var olyHjVy = 0;
var olyHjPeakY = 294;
var olyHjPassedBar = false;

var olyHjScoreCm = 0;
var olyHjLastScore = 0;
var olyHjBestCm = loadOlyHjBestCm();
var olyHjParticles = [];
var olyHjPopups = [];

var OLY_HJ_GROUND_Y = 294;
var OLY_HJ_BASE_BAR_Y = 248;
var OLY_HJ_BAR_X = 225;
var OLY_HJ_START_X = 85;
var OLY_HJ_MAX_RUN_POS = 15;
var OLY_HJ_STEP_M = 0.10;
var OLY_HJ_MAX_BAR_M = 2.60;

function loadOlyHjBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyHighJumpBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyHjBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlyHighJumpBestCm", String(cm));
  } catch (_) {}
}

function getOlyHjBarScreenY(heightM = olyHjBarHeightM) {
  const heightDiff = Math.max(0, heightM - 1.60);
  const pxOffset = heightDiff * 125;
  return Math.max(118, OLY_HJ_BASE_BAR_Y - pxOffset);
}

function resetOlyHighJump() {
  olyHjPhase = "run";
  olyHjBarHeightM = 1.60;
  olyHjClearedHeightM = 0;
  olyHjClearedCount = 0;

  olyHjRunPos = 0;
  olyHjSpeed = 0;
  olyHjLastSide = 0;
  olyHjLastStepFrame = 0;
  olyHjFrame = 0;

  olyHjX = OLY_HJ_START_X;
  olyHjY = OLY_HJ_GROUND_Y;
  olyHjVy = 0;
  olyHjPeakY = OLY_HJ_GROUND_Y;
  olyHjPassedBar = false;

  olyHjScoreCm = 0;
  olyHjLastScore = 0;
  olyHjFailed = false;
  olyHjParticles = [];
  olyHjPopups = [];

  olyHjOver = false;
  olyHjFinished = false;
  olyHjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function prepareNextOlyHjAttempt() {
  olyHjClearedHeightM = olyHjBarHeightM;
  olyHjClearedCount++;
  addOlyHjPopup(OLY_HJ_BAR_X, getOlyHjBarScreenY() - 22, `✨ ${olyHjBarHeightM.toFixed(2)}m CLEAR!`, "#72efdd");
  spawnOlyHjBurst(OLY_HJ_BAR_X, getOlyHjBarScreenY(), "#72efdd", 14);

  if (olyHjBarHeightM >= OLY_HJ_MAX_BAR_M) {
    finishOlyHighJump(false);
    return;
  }

  olyHjBarHeightM = Number((olyHjBarHeightM + OLY_HJ_STEP_M).toFixed(2));
  olyHjPhase = "run";
  olyHjRunPos = 0;
  olyHjSpeed = Math.max(0.45, olyHjSpeed * 0.55);
  olyHjLastSide = 0;
  olyHjX = OLY_HJ_START_X;
  olyHjY = OLY_HJ_GROUND_Y;
  olyHjVy = 0;
  olyHjPeakY = OLY_HJ_GROUND_Y;
  olyHjPassedBar = false;
}

function finishOlyHighJump(failed) {
  olyHjFailed = failed;
  olyHjPhase = "done";
  olyHjFinished = true;
  olyHjRunning = false;

  const finalM = Number(olyHjClearedHeightM.toFixed(2));
  olyHjScoreCm = Math.round(finalM * 100);
  olyHjLastScore = olyHjScoreCm;

  const isNewBest = olyHjScoreCm > 0 && olyHjScoreCm > olyHjBestCm;
  if (isNewBest) {
    olyHjBestCm = olyHjScoreCm;
    saveOlyHjBestCm(olyHjBestCm);
  }

  triggerGameOver(isNewBest, olyHjScoreCm > 0);
}

function addOlyHjPopup(x, y, text, color) {
  olyHjPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlyHjBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.2;
    olyHjParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.8,
      r: 2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function stepOlyHighJumpStride(side) {
  if (!olyHjRunning || olyHjOver || olyHjFinished || olyHjPhase !== "run") return;

  const gapFrames = olyHjFrame - olyHjLastStepFrame;
  const alternating = olyHjLastSide !== side;

  if (alternating) {
    const gain = gapFrames >= 5 && gapFrames <= 18 ? 0.28 : 0.19;
    olyHjSpeed = Math.min(2.0, olyHjSpeed + gain);
    olyHjRunPos = Math.min(OLY_HJ_MAX_RUN_POS, olyHjRunPos + 0.65);
    spawnOlyHjBurst(olyHjX, OLY_HJ_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyHjSpeed = Math.max(0.15, olyHjSpeed - 0.15);
    addOlyHjPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyHjLastSide = side;
  olyHjLastStepFrame = olyHjFrame;
}

function jumpOlyHighJump() {
  if (!olyHjRunning || olyHjOver || olyHjFinished || olyHjPhase !== "run") return;

  const barY = getOlyHjBarScreenY();
  const neededLiftPx = Math.max(46, OLY_HJ_GROUND_Y - barY + 26);
  const speedRatio = Math.max(0.2, Math.min(1, olyHjSpeed / 1.85));
  const distToBar = Math.max(0, OLY_HJ_BAR_X - olyHjX);
  const timingFactor = distToBar <= 95 ? 1.08 : Math.max(0.65, 1 - Math.abs(distToBar - 70) / 180);

  const liftScale = (0.52 + speedRatio * 0.62) * timingFactor;
  const targetVy = -Math.sqrt(2 * 0.24 * neededLiftPx * liftScale);

  olyHjPhase = "jump";
  olyHjVy = targetVy;
  olyHjPeakY = olyHjY;
  olyHjPassedBar = false;

  spawnOlyHjBurst(olyHjX, OLY_HJ_GROUND_Y, "#ffd166", 9);
  if (speedRatio >= 0.72 && distToBar <= 85) {
    addOlyHjPopup(olyHjX, olyHjY - 36, "🚀 HIGH LAUNCH!", "#ffd166");
  }
}

function updateOlyHighJump() {
  if (!olyHjRunning || olyHjOver || olyHjFinished) return;
  olyHjFrame++;

  const barY = getOlyHjBarScreenY();

  if (olyHjPhase === "run") {
    const floorSpeed = olyHjRunPos > 0.3 ? 0.16 : 0;
    olyHjSpeed = Math.max(floorSpeed, olyHjSpeed * 0.972);
    olyHjRunPos += olyHjSpeed * 0.2;

    const maxRunX = OLY_HJ_BAR_X - 18;
    const travelSpan = maxRunX - OLY_HJ_START_X;
    const progress = Math.max(0, Math.min(1, olyHjRunPos / OLY_HJ_MAX_RUN_POS));
    olyHjX = OLY_HJ_START_X + travelSpan * progress;

    if (olyHjRunPos >= OLY_HJ_MAX_RUN_POS) {
      addOlyHjPopup(olyHjX, olyHjY - 34, "❌ NO JUMP!", "#ff4d6d");
      spawnOlyHjBurst(olyHjX, OLY_HJ_GROUND_Y, "#ff4d6d", 12);
      finishOlyHighJump(true);
    }
  } else if (olyHjPhase === "jump") {
    olyHjX += 2.3 + Math.min(1.6, olyHjSpeed * 0.75);
    olyHjY += olyHjVy;
    olyHjVy += 0.24;
    if (olyHjY < olyHjPeakY) olyHjPeakY = olyHjY;

    if (!olyHjPassedBar && olyHjX >= OLY_HJ_BAR_X) {
      olyHjPassedBar = true;
      const bodyBottomY = olyHjY + 2;
      if (bodyBottomY <= barY - 2) {
        addOlyHjPopup(OLY_HJ_BAR_X, barY - 18, "🔥 OVER THE BAR!", "#ffd166");
      } else {
        addOlyHjPopup(OLY_HJ_BAR_X, barY - 18, "💥 BAR HIT!", "#ff4d6d");
        spawnOlyHjBurst(OLY_HJ_BAR_X, barY, "#ff4d6d", 14);
        finishOlyHighJump(true);
        return;
      }
    }

    if (olyHjY >= OLY_HJ_GROUND_Y) {
      olyHjY = OLY_HJ_GROUND_Y;
      olyHjVy = 0;

      if (olyHjPassedBar) {
        prepareNextOlyHjAttempt();
      } else {
        addOlyHjPopup(olyHjX, olyHjY - 30, "❌ SHORT!", "#ff4d6d");
        finishOlyHighJump(true);
      }
    }
  }
}

function drawOlyHighJumpFrame() {
  try {
    ctx.save();
    updateOlyHighJump();

    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, OLY_HJ_BAR_X + 10, 210);

    ctx.fillStyle = "#2b4c7e";
    ctx.fillRect(OLY_HJ_BAR_X + 10, 130, canvas.width - (OLY_HJ_BAR_X + 10), 210);

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_HJ_GROUND_Y + 4, canvas.width, 2);

    const barY = getOlyHjBarScreenY();
    ctx.strokeStyle = "#8c93a8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(OLY_HJ_BAR_X, barY - 24);
    ctx.lineTo(OLY_HJ_BAR_X, OLY_HJ_GROUND_Y + 4);
    ctx.stroke();

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_HJ_BAR_X - 18, barY - 3, 36, 6);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`BAR ${olyHjBarHeightM.toFixed(2)}m`, OLY_HJ_BAR_X, barY - 10);

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
    ctx.fillText("◀ 좌 가속 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("우 가속 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 수직 도약", canvas.width * 0.5, 392);

    const bob = olyHjPhase === "run" ? Math.sin(olyHjFrame * 0.45) * (olyHjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyHjY + bob;
    const legSwing = olyHjPhase === "jump" ? 9 : Math.sin(olyHjFrame * 0.55) * (olyHjSpeed > 0.2 ? 10 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyHjX, OLY_HJ_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyHjX, drawY - 14);
    ctx.lineTo(olyHjX + legSwing, drawY + 2);
    ctx.moveTo(olyHjX, drawY - 14);
    ctx.lineTo(olyHjX - legSwing, drawY + 2);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyHjX, drawY - 22, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olyHjX + 2, drawY - 36, 8, 0, Math.PI * 2);
    ctx.fill();

    for (let i = olyHjParticles.length - 1; i >= 0; i--) {
      const pt = olyHjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyHjParticles.splice(i, 1);
    }

    for (let i = olyHjPopups.length - 1; i >= 0; i--) {
      const pop = olyHjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyHjPopups.splice(i, 1);
    }

    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const speedPct = Math.round(Math.max(0, Math.min(100, (olyHjSpeed / 2.0) * 100)));
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도전 ${olyHjBarHeightM.toFixed(2)}m · 가속 ${speedPct}%`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      olyHjClearedHeightM > 0 ? `성공 기록 ${olyHjClearedHeightM.toFixed(2)}m` : "아직 통과 기록 없음",
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyHjBestCm > 0 ? `${(olyHjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    if (olyHjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olyHjScoreCm > 0 ? "#f4f4f6" : "#ff4d6d";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olyHjScoreCm > 0
          ? `🦘 높이뛰기 ${(olyHjScoreCm / 100).toFixed(2)}m`
          : "❌ 기록 없음 (0.00m)",
        canvas.width / 2,
        182
      );

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
    try {
      ctx.restore();
    } catch (_) {}
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
  icon: "🦘",
  desc: "좌/우 가속 후 수직 도약! 점점 높아지는 바를 넘어 최고 높이에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 바 앞에서 상단 터치(PC: ↑/W/Space)로 수직 점프!",
  rankingTitle: "🦘 높이뛰기 TOP 5 (최고 높이)",
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
    if (y < 190) {
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