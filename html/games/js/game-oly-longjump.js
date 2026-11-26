/* ---------- 올림픽 3. 멀리뛰기 (Long Jump) ---------- */
var olyLjRunning = false;
var olyLjOver = false;
var olyLjFinished = false;
var olyLjFoul = false;

var olyLjPhase = "run"; // "run" | "jump" | "done"
var olyLjDist = 0; // 도움닫기 거리 (m)
var olyLjSpeed = 0; // 현재 가속도
var olyLjTakeoffSpeed = 0;
var olyLjTakeoffDist = 0;
var olyLjLastSide = 0;
var olyLjLastStepFrame = 0;
var olyLjFrame = 0;

var olyLjX = 95;
var olyLjY = 294;
var olyLjVx = 0;
var olyLjVy = 0;
var olyLjAirPx = 0;
var olyLjJumpDistM = 0;

var olyLjScoreCm = 0;
var olyLjLastScore = 0;
var olyLjBestCm = loadOlyLjBestCm();
var olyLjParticles = [];
var olyLjPopups = [];

var OLY_LJ_START_X = 95;
var OLY_LJ_FOUL_DIST = 28.0;
var OLY_LJ_MAX_DIST = 30.0;
var OLY_LJ_GROUND_Y = 294;
var OLY_LJ_PX_PER_M = 18;
var OLY_LJ_MIN_M = 3.5;
var OLY_LJ_MAX_M = 9.2;

function loadOlyLjBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyLongJumpBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyLjBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlyLongJumpBestCm", String(cm));
  } catch (_) {}
}

function resetOlyLongJump() {
  olyLjPhase = "run";
  olyLjDist = 0;
  olyLjSpeed = 0;
  olyLjTakeoffSpeed = 0;
  olyLjTakeoffDist = 0;
  olyLjLastSide = 0;
  olyLjLastStepFrame = 0;
  olyLjFrame = 0;

  olyLjX = OLY_LJ_START_X;
  olyLjY = OLY_LJ_GROUND_Y;
  olyLjVx = 0;
  olyLjVy = 0;
  olyLjAirPx = 0;
  olyLjJumpDistM = 0;

  olyLjScoreCm = 0;
  olyLjLastScore = 0;
  olyLjFoul = false;
  olyLjParticles = [];
  olyLjPopups = [];

  olyLjOver = false;
  olyLjFinished = false;
  olyLjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyLjPopup(x, y, text, color) {
  olyLjPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyLjBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.4;
    olyLjParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.8,
      r: 2 + Math.random() * 2,
      color,
      life: 20
    });
  }
}

function computeOlyLjMeters(airPx, speed, takeoffDist) {
  const gap = Math.max(0, OLY_LJ_FOUL_DIST - takeoffDist);
  const lineAccuracy = Math.max(0, 1 - gap / 10.0);
  const speedRatio = Math.max(0, Math.min(1, speed / 1.8));
  const airBonus = Math.max(0, Math.min(1.4, airPx * 0.012));

  const raw = OLY_LJ_MIN_M + speedRatio * 2.3 + lineAccuracy * 2.0 + airBonus;
  const clamped = Math.max(OLY_LJ_MIN_M, Math.min(OLY_LJ_MAX_M, raw));
  return Number(clamped.toFixed(2));
}

function stepOlyLongJumpStride(side) {
  if (!olyLjRunning || olyLjOver || olyLjFinished || olyLjPhase !== "run") return;

  const gapFrames = olyLjFrame - olyLjLastStepFrame;
  const alternating = olyLjLastSide !== side;

  if (alternating) {
    const rhythmBonus = gapFrames >= 5 && gapFrames <= 18 ? 0.24 : 0.16;
    olyLjSpeed = Math.min(1.8, olyLjSpeed + rhythmBonus);
    spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyLjSpeed = Math.max(0.1, olyLjSpeed - 0.12);
    addOlyLjPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyLjLastSide = side;
  olyLjLastStepFrame = olyLjFrame;
}

function takeoffOlyLongJump(forceFoul = false) {
  if (!olyLjRunning || olyLjOver || olyLjFinished || olyLjPhase !== "run") return;

  olyLjTakeoffSpeed = olyLjSpeed;
  olyLjTakeoffDist = olyLjDist;
  olyLjFoul = forceFoul || olyLjDist > OLY_LJ_FOUL_DIST;

  const power = Math.max(0.35, Math.min(1.2, olyLjSpeed * 0.72));
  olyLjPhase = "jump";
  olyLjVy = -(2.8 + power * 1.8);
  olyLjVx = 2.4 + power * 2.2;
  olyLjAirPx = 0;

  if (olyLjFoul) {
    addOlyLjPopup(olyLjX, olyLjY - 32, "🚫 FOUL!", "#ff4d6d");
    spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, "#ff4d6d", 10);
  } else {
    spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, "#ffd166", 10);
    if (OLY_LJ_FOUL_DIST - olyLjDist <= 1.2 && olyLjSpeed >= 0.85) {
      addOlyLjPopup(olyLjX, olyLjY - 32, "🔥 PERFECT TAKEOFF!", "#ffd166");
    }
  }
}

function landOlyLongJump() {
  olyLjPhase = "done";
  olyLjFinished = true;
  olyLjRunning = false;

  if (olyLjFoul) {
    olyLjJumpDistM = 0;
    olyLjScoreCm = 0;
    olyLjLastScore = 0;
  } else {
    const meters = computeOlyLjMeters(olyLjAirPx, olyLjTakeoffSpeed, olyLjTakeoffDist);
    olyLjJumpDistM = meters;
    olyLjScoreCm = Math.round(meters * 100);
    olyLjLastScore = olyLjScoreCm;
  }

  spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, olyLjFoul ? "#ff4d6d" : "#e6c68b", 14);

  const isNewBest = !olyLjFoul && olyLjScoreCm > olyLjBestCm;
  if (isNewBest) {
    olyLjBestCm = olyLjScoreCm;
    saveOlyLjBestCm(olyLjBestCm);
  }

  triggerGameOver(isNewBest, !olyLjFoul && olyLjScoreCm > 0);
}

function updateOlyLongJump() {
  if (!olyLjRunning || olyLjOver || olyLjFinished) return;
  olyLjFrame++;

  if (olyLjPhase === "run") {
    const floorSpeed = olyLjDist > 0.4 ? 0.12 : 0;
    olyLjSpeed = Math.max(floorSpeed, olyLjSpeed * 0.97);
    olyLjDist += olyLjSpeed * 0.22;

    olyLjX = Math.min(130, OLY_LJ_START_X + Math.min(olyLjDist, 10) * 3.5);

    if (olyLjDist >= OLY_LJ_MAX_DIST) {
      olyLjDist = OLY_LJ_MAX_DIST;
      takeoffOlyLongJump(true);
    }
  } else if (olyLjPhase === "jump") {
    olyLjAirPx += olyLjVx;
    olyLjX = Math.min(255, olyLjX + olyLjVx * 0.55);
    olyLjY += olyLjVy;
    olyLjVy += 0.23;

    if (olyLjY >= OLY_LJ_GROUND_Y) {
      olyLjY = OLY_LJ_GROUND_Y;
      landOlyLongJump();
    }
  }
}

function drawOlyLongJumpFrame() {
  try {
    ctx.save();
    updateOlyLongJump();

    // 배경 & 트랙/모래
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 단일 지면 스크롤 기준으로 파울라인·모래 경계·바닥 무늬를 함께 왼쪽으로 당김
    const groundScrollPx =
      olyLjDist * OLY_LJ_PX_PER_M +
      (olyLjPhase === "jump" || olyLjPhase === "done" ? olyLjAirPx : 0);
    const foulLineX =
      OLY_LJ_START_X +
      OLY_LJ_FOUL_DIST * OLY_LJ_PX_PER_M -
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
      ctx.fillText("JUMP LINE (28m)", foulLineX, 124);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_LJ_GROUND_Y + 4, canvas.width, 2);

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
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 도약", canvas.width * 0.5, 392);

    // 선수 캐릭터
    const bob = olyLjPhase === "run" ? Math.sin(olyLjFrame * 0.45) * (olyLjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyLjY + bob;
    const legSwing = olyLjPhase === "jump" ? 8 : Math.sin(olyLjFrame * 0.55) * (olyLjSpeed > 0.2 ? 10 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyLjX, OLY_LJ_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyLjX, drawY - 14);
    ctx.lineTo(olyLjX + legSwing, drawY + 2);
    ctx.moveTo(olyLjX, drawY - 14);
    ctx.lineTo(olyLjX - legSwing, drawY + 2);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyLjX, drawY - 22, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olyLjX + 2, drawY - 36, 8, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olyLjParticles.length - 1; i >= 0; i--) {
      const pt = olyLjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyLjParticles.splice(i, 1);
    }

    for (let i = olyLjPopups.length - 1; i >= 0; i--) {
      const pop = olyLjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyLjPopups.splice(i, 1);
    }

    // HUD
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveRecord = olyLjFoul
      ? "FOUL"
      : olyLjPhase === "done"
        ? `${olyLjJumpDistM.toFixed(2)}m`
        : olyLjPhase === "jump"
          ? `${computeOlyLjMeters(olyLjAirPx, olyLjTakeoffSpeed, olyLjTakeoffDist).toFixed(2)}m`
          : "--.--m";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyLjDist.toFixed(1)}m · 기록 ${liveRecord}`, 12, 21);

    const leftLine = OLY_LJ_FOUL_DIST - olyLjDist;
    ctx.fillStyle = leftLine < 0 ? "#ff4d6d" : "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      leftLine >= 0 ? `점프선까지 ${leftLine.toFixed(1)}m` : `발구름선 초과 (+${Math.abs(leftLine).toFixed(1)}m)`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyLjBestCm > 0 ? `${(olyLjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyLjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olyLjFoul ? "#ff4d6d" : "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olyLjFoul ? "🚫 파울 (0.00m)" : `🏃 멀리뛰기 ${olyLjJumpDistM.toFixed(2)}m`,
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
  id: "oly-longjump",
  title: "멀리뛰기",
  icon: "🏃",
  desc: "긴 도움닫기 가속과 발구름 타이밍으로 모래밭 최장 기록에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 점프 라인(28.0m) 직전에서 상단 터치(PC: ↑/W/Space)로 도약!",
  rankingTitle: "🏃 멀리뛰기 TOP 5 (최장 거리)",
  dbNode: "oly_longjump_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyLjBestCm > 0 ? `BEST ${(olyLjBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyLjLastScore,
  reset: resetOlyLongJump,
  draw: drawOlyLongJumpFrame,
  stop: () => {
    olyLjRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyLjFinished || olyLjOver || !olyLjRunning) {
      if (!canRestartNow()) return;
      resetOlyLongJump();
      return;
    }
    if (y < 190) {
      takeoffOlyLongJump(false);
    } else {
      stepOlyLongJumpStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyLjFinished || olyLjOver || !olyLjRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyLongJump();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) takeoffOlyLongJump(false);
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyLongJumpStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyLongJumpStride(1);
    }
  }
});