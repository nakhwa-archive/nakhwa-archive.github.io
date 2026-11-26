/* ---------- 올림픽 10. 트리플 점프 (Triple Jump) ---------- */
var olyTjRunning = false;
var olyTjOver = false;
var olyTjFinished = false;
var olyTjFoul = false;

// "run" | "hop" | "step" | "jump" | "done"
var olyTjStage = "run";
var olyTjBoundIndex = 0; // 0: 도움닫기, 1: 홉, 2: 스텝, 3: 점프

var olyTjDist = 0; // 도움닫기 거리 (0 ~ 30m)
var olyTjSpeed = 0; // 현재 가속도
var olyTjTakeoffSpeed = 0;
var olyTjTakeoffDist = 0;
var olyTjLastSide = 0;
var olyTjLastStepFrame = 0;
var olyTjFrame = 0;

var olyTjX = 95;
var olyTjY = 294;
var olyTjVx = 0;
var olyTjVy = 0;
var olyTjTotalGainPx = 0;
var olyTjTrail = [];

var olyTjJumpDistM = 0;
var olyTjScoreCm = 0; // 예: 1645 => 16.45m
var olyTjLastScore = 0;
var olyTjBestCm = loadOlyTjBestCm();
var olyTjParticles = [];
var olyTjPopups = [];

var OLY_TJ_START_X = 95;
var OLY_TJ_FOUL_DIST = 28.0;
var OLY_TJ_MAX_RUN_DIST = 30.0;
var OLY_TJ_GROUND_Y = 294;
var OLY_TJ_PX_PER_M = 18;
var OLY_TJ_MIN_M = 8.0;
var OLY_TJ_MAX_M = 18.5;

function loadOlyTjBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyTripleJumpBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyTjBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlyTripleJumpBestCm", String(cm));
  } catch (_) {}
}

function resetOlyTripleJump() {
  olyTjStage = "run";
  olyTjBoundIndex = 0;

  olyTjDist = 0;
  olyTjSpeed = 0;
  olyTjTakeoffSpeed = 0;
  olyTjTakeoffDist = 0;
  olyTjLastSide = 0;
  olyTjLastStepFrame = 0;
  olyTjFrame = 0;

  olyTjX = OLY_TJ_START_X;
  olyTjY = OLY_TJ_GROUND_Y;
  olyTjVx = 0;
  olyTjVy = 0;
  olyTjTotalGainPx = 0;
  olyTjTrail = [];

  olyTjJumpDistM = 0;
  olyTjScoreCm = 0;
  olyTjLastScore = 0;
  olyTjFoul = false;
  olyTjParticles = [];
  olyTjPopups = [];

  olyTjOver = false;
  olyTjFinished = false;
  olyTjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyTjPopup(x, y, text, color) {
  olyTjPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyTjBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 1.1 + Math.random() * 2.2;
    olyTjParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.8,
      r: 2 + Math.random() * 2,
      color,
      life: 20
    });
  }
}

function computeOlyTjMeters(gainPx, speed, takeoffDist) {
  const speedRatio = Math.max(0, Math.min(1, speed / 1.85));
  const lineGap = Math.max(0, OLY_TJ_FOUL_DIST - takeoffDist);
  const timingRatio = Math.max(0, 1 - lineGap / 10.0);
  const gainBonus = Math.max(0, Math.min(4.5, gainPx * 0.015));

  const raw = OLY_TJ_MIN_M + speedRatio * 3.2 + timingRatio * 2.8 + gainBonus;
  const clamped = Math.max(OLY_TJ_MIN_M, Math.min(OLY_TJ_MAX_M, raw));
  return Number(clamped.toFixed(2));
}

function stepOlyTripleJumpStride(side) {
  if (!olyTjRunning || olyTjOver || olyTjFinished) return;
  if (olyTjStage !== "run") return;

  const gapFrames = olyTjFrame - olyTjLastStepFrame;
  const alternating = olyTjLastSide !== side;

  if (alternating) {
    const bonus = gapFrames >= 5 && gapFrames <= 18 ? 0.25 : 0.17;
    olyTjSpeed = Math.min(1.85, olyTjSpeed + bonus);
    spawnOlyTjBurst(olyTjX, OLY_TJ_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyTjSpeed = Math.max(0.12, olyTjSpeed - 0.12);
    addOlyTjPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyTjLastSide = side;
  olyTjLastStepFrame = olyTjFrame;
}

function startOlyTjBound(boundType, forceFoul = false) {
  const pwr = Math.max(0.35, Math.min(1.25, olyTjSpeed * 0.75));

  if (boundType === "hop") {
    olyTjTakeoffSpeed = olyTjSpeed;
    olyTjTakeoffDist = olyTjDist;
    olyTjFoul = forceFoul || olyTjDist > OLY_TJ_FOUL_DIST;
    olyTjBoundIndex = 1;
    olyTjStage = "hop";
    olyTjVy = -(2.7 + pwr * 1.3);
    olyTjVx = 2.2 + pwr * 1.5;
    addOlyTjPopup(
      olyTjX,
      olyTjY - 32,
      olyTjFoul ? "🚫 FOUL HOP!" : "1. HOP!",
      olyTjFoul ? "#ff4d6d" : "#ffd166"
    );
    spawnOlyTjBurst(olyTjX, OLY_TJ_GROUND_Y, olyTjFoul ? "#ff4d6d" : "#ffd166", 8);
  } else if (boundType === "step") {
    olyTjBoundIndex = 2;
    olyTjStage = "step";
    olyTjVy = -(3.1 + pwr * 1.5);
    olyTjVx = 2.5 + pwr * 1.7;
    addOlyTjPopup(olyTjX, olyTjY - 32, "2. STEP!", "#72efdd");
    spawnOlyTjBurst(olyTjX, OLY_TJ_GROUND_Y, "#72efdd", 8);
  } else if (boundType === "jump") {
    olyTjBoundIndex = 3;
    olyTjStage = "jump";
    olyTjVy = -(3.8 + pwr * 1.9);
    olyTjVx = 2.9 + pwr * 2.0;
    addOlyTjPopup(olyTjX, olyTjY - 34, "3. JUMP!", "#ff8ca5");
    spawnOlyTjBurst(olyTjX, OLY_TJ_GROUND_Y, "#ff8ca5", 10);
  }
}

function triggerOlyTjAction(forceFoul = false) {
  if (!olyTjRunning || olyTjOver || olyTjFinished) return;

  if (olyTjStage === "run") {
    startOlyTjBound("hop", forceFoul);
  } else if (olyTjStage === "hop" && olyTjY >= OLY_TJ_GROUND_Y - 14) {
    olyTjY = OLY_TJ_GROUND_Y;
    startOlyTjBound("step", false);
  } else if (olyTjStage === "step" && olyTjY >= OLY_TJ_GROUND_Y - 14) {
    olyTjY = OLY_TJ_GROUND_Y;
    startOlyTjBound("jump", false);
  }
}

function finishOlyTripleJump() {
  olyTjStage = "done";
  olyTjFinished = true;
  olyTjRunning = false;

  if (olyTjFoul) {
    olyTjJumpDistM = 0;
    olyTjScoreCm = 0;
    olyTjLastScore = 0;
  } else {
    const meters = computeOlyTjMeters(olyTjTotalGainPx, olyTjTakeoffSpeed, olyTjTakeoffDist);
    olyTjJumpDistM = meters;
    olyTjScoreCm = Math.round(meters * 100);
    olyTjLastScore = olyTjScoreCm;
  }

  spawnOlyTjBurst(olyTjX, OLY_TJ_GROUND_Y, olyTjFoul ? "#ff4d6d" : "#e6c68b", 15);

  const isNewBest = !olyTjFoul && olyTjScoreCm > olyTjBestCm;
  if (isNewBest) {
    olyTjBestCm = olyTjScoreCm;
    saveOlyTjBestCm(olyTjBestCm);
  }

  triggerGameOver(isNewBest, !olyTjFoul && olyTjScoreCm > 0);
}

function updateOlyTripleJump() {
  if (!olyTjRunning || olyTjOver || olyTjFinished) return;
  olyTjFrame++;

  if (olyTjStage === "run") {
    const floorSpeed = olyTjDist > 0.4 ? 0.13 : 0;
    olyTjSpeed = Math.max(floorSpeed, olyTjSpeed * 0.97);
    olyTjDist += olyTjSpeed * 0.22;

    olyTjX = Math.min(125, OLY_TJ_START_X + Math.min(olyTjDist, 10) * 3.0);

    if (olyTjDist >= OLY_TJ_MAX_RUN_DIST) {
      olyTjDist = OLY_TJ_MAX_RUN_DIST;
      triggerOlyTjAction(true);
    }
  } else if (olyTjStage === "hop" || olyTjStage === "step" || olyTjStage === "jump") {
    olyTjTrail.push({ x: olyTjX, y: olyTjY });
    if (olyTjTrail.length > 32) olyTjTrail.shift();

    olyTjTotalGainPx += olyTjVx;
    olyTjX = Math.min(255, olyTjX + olyTjVx * 0.45);
    olyTjY += olyTjVy;
    olyTjVy += 0.24;

    if (olyTjY >= OLY_TJ_GROUND_Y) {
      olyTjY = OLY_TJ_GROUND_Y;
      olyTjVy = 0;

      if (olyTjStage === "hop") {
        startOlyTjBound("step", false);
      } else if (olyTjStage === "step") {
        startOlyTjBound("jump", false);
      } else if (olyTjStage === "jump") {
        finishOlyTripleJump();
      }
    }
  }
}

function drawOlyTripleJumpFrame() {
  try {
    ctx.save();
    updateOlyTripleJump();

    // 배경 & 트랙/모래
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 단일 지면 스크롤 기준으로 파울라인·모래 경계·바닥 무늬를 함께 왼쪽으로 당김
    const groundScrollPx =
      olyTjDist * OLY_TJ_PX_PER_M +
      (olyTjBoundIndex > 0 || olyTjStage === "done" ? olyTjTotalGainPx : 0);
    const foulLineX =
      OLY_TJ_START_X +
      OLY_TJ_FOUL_DIST * OLY_TJ_PX_PER_M -
      groundScrollPx;
    const sandX = Math.max(0, Math.min(canvas.width, foulLineX + 12));

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, sandX, 210);

    ctx.fillStyle = "#d9b372";
    ctx.fillRect(sandX, 130, canvas.width - sandX, 210);

    const scroll = groundScrollPx % 48;

    ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
    for (let x = -scroll; x < canvas.width + 48; x += 48) {
      ctx.fillRect(x, 142, 18, 2);
      ctx.fillRect(x + 12, 324, 18, 2);
    }

    if (foulLineX >= -10 && foulLineX <= canvas.width + 10) {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(foulLineX - 2, 132, 4, 206);
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FOUL LINE (28m)", foulLineX, 124);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_TJ_GROUND_Y + 4, canvas.width, 2);

    // 3단 도약 궤적
    if (olyTjTrail.length > 1) {
      ctx.strokeStyle = "rgba(255, 209, 102, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(olyTjTrail[0].x, olyTjTrail[0].y);
      for (let i = 1; i < olyTjTrail.length; i++) {
        ctx.lineTo(olyTjTrail[i].x, olyTjTrail[i].y);
      }
      ctx.stroke();
    }

    // 하단 조작 가이드
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
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 3단 도약 시작 (HOP→STEP→JUMP)", canvas.width * 0.5, 392);

    // 선수 캐릭터
    const bob = olyTjStage === "run" ? Math.sin(olyTjFrame * 0.45) * (olyTjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyTjY + bob;
    const legSwing = olyTjBoundIndex > 0 ? 9 : Math.sin(olyTjFrame * 0.55) * (olyTjSpeed > 0.2 ? 10 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyTjX, OLY_TJ_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyTjX, drawY - 14);
    ctx.lineTo(olyTjX + legSwing, drawY + 2);
    ctx.moveTo(olyTjX, drawY - 14);
    ctx.lineTo(olyTjX - legSwing, drawY + 2);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyTjX, drawY - 22, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olyTjX + 2, drawY - 36, 8, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olyTjParticles.length - 1; i >= 0; i--) {
      const pt = olyTjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyTjParticles.splice(i, 1);
    }

    for (let i = olyTjPopups.length - 1; i >= 0; i--) {
      const pop = olyTjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyTjPopups.splice(i, 1);
    }

    // HUD
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveRecord = olyTjFoul
      ? "FOUL"
      : olyTjStage === "done"
        ? `${olyTjJumpDistM.toFixed(2)}m`
        : olyTjBoundIndex > 0
          ? `${computeOlyTjMeters(olyTjTotalGainPx, olyTjTakeoffSpeed, olyTjTakeoffDist).toFixed(2)}m`
          : "--.--m";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyTjDist.toFixed(1)}m · 기록 ${liveRecord}`, 12, 21);

    const stageLabel =
      olyTjStage === "run"
        ? `파울선까지 ${Math.max(0, OLY_TJ_FOUL_DIST - olyTjDist).toFixed(1)}m`
        : `단계: ${olyTjStage.toUpperCase()} (${olyTjBoundIndex}/3)`;

    ctx.fillStyle = olyTjFoul ? "#ff4d6d" : "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(stageLabel, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyTjBestCm > 0 ? `${(olyTjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyTjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olyTjFoul ? "#ff4d6d" : "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olyTjFoul ? "🚫 파울 (0.00m)" : `🏃 트리플 점프 ${olyTjJumpDistM.toFixed(2)}m`,
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
  id: "oly-triplejump",
  title: "트리플 점프",
  icon: "🏃",
  desc: "홉·스텝·점프 3단 도약으로 모래밭 최장 기록에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 파울선(28.0m) 직전 상단 터치(PC: ↑/W/Space)로 3단 도약!",
  rankingTitle: "🏃 트리플 점프 TOP 5 (최장 거리)",
  dbNode: "oly_triplejump_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyTjBestCm > 0 ? `BEST ${(olyTjBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyTjLastScore,
  reset: resetOlyTripleJump,
  draw: drawOlyTripleJumpFrame,
  stop: () => {
    olyTjRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyTjFinished || olyTjOver || !olyTjRunning) {
      if (!canRestartNow()) return;
      resetOlyTripleJump();
      return;
    }
    if (y < 190) {
      triggerOlyTjAction(false);
    } else {
      stepOlyTripleJumpStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyTjFinished || olyTjOver || !olyTjRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyTripleJump();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlyTjAction(false);
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyTripleJumpStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyTripleJumpStride(1);
    }
  }
});