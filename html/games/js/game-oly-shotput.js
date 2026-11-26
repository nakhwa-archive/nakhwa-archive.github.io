/* ---------- 올림픽 6. 투포환 (Shot Put - Camera Follow) ---------- */
var olySpRunning = false;
var olySpOver = false;
var olySpFinished = false;
var olySpFoul = false;

var olySpPhase = "charge"; // "charge" | "flight" | "done"
var olySpCirclePos = 0; // 서클 내 전진 거리 (0 ~ 22m)
var olySpPower = 0; // 0 ~ 100
var olySpAngleDeg = 40; // 진동하는 릴리즈 각도 (25 ~ 55도)
var olySpAngleDir = 1;
var olySpThrowPower = 0;
var olySpThrowAngle = 40;
var olySpThrowPos = 0;

var olySpLastSide = 0;
var olySpLastStepFrame = 0;
var olySpFrame = 0;

var olySpX = 95;
var olySpY = 294;

// 공의 월드 좌표 (도약 기준선 기준 누적 픽셀)
var olySpBallWorldX = 104;
var olySpBallY = 270;
var olySpBallVx = 0;
var olySpBallVy = 0;
var olySpFlightPx = 0;
var olySpCamScrollPx = 0;
var olySpTrail = []; // { worldX, y }

var olySpThrowDistM = 0;
var olySpScoreCm = 0;
var olySpLastScore = 0;
var olySpBestCm = loadOlySpBestCm();
var olySpParticles = [];
var olySpPopups = [];

var OLY_SP_START_X = 95;
var OLY_SP_FOUL_POS = 20.0;
var OLY_SP_MAX_POS = 22.0;
var OLY_SP_GROUND_Y = 294;
var OLY_SP_PX_PER_M = 18;
var OLY_SP_MIN_M = 8.0;
var OLY_SP_MAX_M = 25.0;

function loadOlySpBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyShotputBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlySpBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlyShotputBestCm", String(cm));
  } catch (_) {}
}

function resetOlyShotput() {
  olySpPhase = "charge";
  olySpCirclePos = 0;
  olySpPower = 0;
  olySpAngleDeg = 40;
  olySpAngleDir = 1;
  olySpThrowPower = 0;
  olySpThrowAngle = 40;
  olySpThrowPos = 0;

  olySpLastSide = 0;
  olySpLastStepFrame = 0;
  olySpFrame = 0;

  olySpX = OLY_SP_START_X;
  olySpY = OLY_SP_GROUND_Y;
  olySpBallWorldX = olySpX + 9;
  olySpBallY = olySpY - 24;
  olySpBallVx = 0;
  olySpBallVy = 0;
  olySpFlightPx = 0;
  olySpCamScrollPx = 0;
  olySpTrail = [];

  olySpThrowDistM = 0;
  olySpScoreCm = 0;
  olySpLastScore = 0;
  olySpFoul = false;
  olySpParticles = [];
  olySpPopups = [];

  olySpOver = false;
  olySpFinished = false;
  olySpRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlySpPopup(x, y, text, color) {
  olySpPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlySpBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.2;
    olySpParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.7,
      r: 2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function computeOlySpMeters(power, angleDeg, throwPos) {
  const angleDiff = Math.abs(angleDeg - 42);
  const angleFactor = Math.max(0.25, 1 - angleDiff / 22);
  const powerFactor = Math.max(0, Math.min(1, power / 100));
  const boardGap = Math.max(0, OLY_SP_FOUL_POS - throwPos);
  const boardBonus = Math.max(0, 1 - boardGap / 8.0) * 2.5;

  const raw = OLY_SP_MIN_M + powerFactor * 10.5 + angleFactor * 4.0 + boardBonus;
  const clamped = Math.max(OLY_SP_MIN_M, Math.min(OLY_SP_MAX_M, raw));
  return Number(clamped.toFixed(2));
}

function stepOlyShotputStride(side) {
  if (!olySpRunning || olySpOver || olySpFinished || olySpPhase !== "charge") return;

  const gapFrames = olySpFrame - olySpLastStepFrame;
  const alternating = olySpLastSide !== side;

  if (alternating) {
    const gain = gapFrames >= 5 && gapFrames <= 18 ? 9.5 : 6.5;
    olySpPower = Math.min(100, olySpPower + gain);
    olySpCirclePos = Math.min(OLY_SP_MAX_POS, olySpCirclePos + 0.55);
    spawnOlySpBurst(olySpX, OLY_SP_GROUND_Y, "#ff8ca5", 4);
  } else {
    olySpPower = Math.max(0, olySpPower - 5.5);
    addOlySpPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olySpLastSide = side;
  olySpLastStepFrame = olySpFrame;
}

function releaseOlyShotput(forceFoul = false) {
  if (!olySpRunning || olySpOver || olySpFinished || olySpPhase !== "charge") return;

  olySpThrowPower = olySpPower;
  olySpThrowAngle = olySpAngleDeg;
  olySpThrowPos = olySpCirclePos;
  olySpFoul = forceFoul || olySpCirclePos > OLY_SP_FOUL_POS;

  const rad = (olySpThrowAngle * Math.PI) / 180;
  const speedMag = 3.4 + (olySpThrowPower / 100) * 5.8;

  olySpPhase = "flight";
  olySpBallWorldX = olySpX + 10;
  olySpBallY = olySpY - 26;
  olySpBallVx = Math.cos(rad) * speedMag;
  olySpBallVy = -Math.sin(rad) * speedMag;
  olySpFlightPx = 0;
  olySpCamScrollPx = 0;
  olySpTrail = [{ worldX: olySpBallWorldX, y: olySpBallY }];

  if (olySpFoul) {
    addOlySpPopup(olySpX, olySpY - 38, "🚫 FOUL!", "#ff4d6d");
    spawnOlySpBurst(olySpX, OLY_SP_GROUND_Y, "#ff4d6d", 12);
  } else {
    const angleDiff = Math.abs(olySpThrowAngle - 42);
    if (olySpThrowPower >= 75 && angleDiff <= 4) {
      addOlySpPopup(olySpX, olySpY - 38, "🎯 GOLDEN RELEASE!", "#ffd166");
    } else if (angleDiff <= 5) {
      addOlySpPopup(olySpX, olySpY - 38, "✨ NICE ANGLE!", "#72efdd");
    }
    spawnOlySpBurst(olySpBallWorldX, olySpBallY, "#ffd166", 9);
  }
}

function landOlyShotput() {
  olySpPhase = "done";
  olySpFinished = true;
  olySpRunning = false;

  if (olySpFoul) {
    olySpThrowDistM = 0;
    olySpScoreCm = 0;
    olySpLastScore = 0;
  } else {
    const meters = computeOlySpMeters(olySpThrowPower, olySpThrowAngle, olySpThrowPos);
    olySpThrowDistM = meters;
    olySpScoreCm = Math.round(meters * 100);
    olySpLastScore = olySpScoreCm;
  }

  const impactScreenX = Math.max(
    24,
    Math.min(canvas.width - 24, olySpBallWorldX - olySpCamScrollPx)
  );
  spawnOlySpBurst(impactScreenX, OLY_SP_GROUND_Y + 2, olySpFoul ? "#ff4d6d" : "#ffd166", 16);

  const isNewBest = !olySpFoul && olySpScoreCm > olySpBestCm;
  if (isNewBest) {
    olySpBestCm = olySpScoreCm;
    saveOlySpBestCm(olySpBestCm);
  }

  triggerGameOver(isNewBest, !olySpFoul && olySpScoreCm > 0);
}

function updateOlyShotput() {
  if (!olySpRunning || olySpOver || olySpFinished) return;
  olySpFrame++;

  if (olySpPhase === "charge") {
    olySpPower = Math.max(0, olySpPower - 0.55);
    if (olySpCirclePos > 0.2) {
      olySpCirclePos = Math.min(OLY_SP_MAX_POS, olySpCirclePos + 0.03 + (olySpPower / 100) * 0.05);
    }

    olySpAngleDeg += olySpAngleDir * 1.15;
    if (olySpAngleDeg >= 55) {
      olySpAngleDeg = 55;
      olySpAngleDir = -1;
    } else if (olySpAngleDeg <= 25) {
      olySpAngleDeg = 25;
      olySpAngleDir = 1;
    }

    olySpX = Math.min(125, OLY_SP_START_X + Math.min(olySpCirclePos, 8) * 3.5);
    olySpBallWorldX = olySpX + 9;
    olySpBallY = olySpY - 24;
    olySpCamScrollPx = 0;
  } else if (olySpPhase === "flight") {
    olySpBallWorldX += olySpBallVx;
    olySpBallY += olySpBallVy;
    olySpBallVy += 0.19;
    olySpFlightPx += Math.hypot(olySpBallVx, olySpBallVy);

    olySpTrail.push({ worldX: olySpBallWorldX, y: olySpBallY });
    if (olySpTrail.length > 34) olySpTrail.shift();

    // 카메라가 날아가는 투포환을 부드럽게 따라감 (공이 화면 56% 지점 부근에 오도록 스크롤)
    const targetCamScroll = Math.max(0, olySpBallWorldX - canvas.width * 0.56);
    olySpCamScrollPx += (targetCamScroll - olySpCamScrollPx) * 0.18;

    if (olySpBallY >= OLY_SP_GROUND_Y + 2) {
      olySpBallY = OLY_SP_GROUND_Y + 2;
      landOlyShotput();
    }
  }
}

function drawOlyShotputFrame() {
  try {
    ctx.save();
    updateOlyShotput();

    // 배경 & 필드
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 서클 전진 스크롤 + 비행 중 카메라 추격 스크롤을 합친 단일 지면 스크롤
    const groundScrollPx = olySpCirclePos * OLY_SP_PX_PER_M + olySpCamScrollPx;
    const boardX =
      OLY_SP_START_X +
      OLY_SP_FOUL_POS * OLY_SP_PX_PER_M -
      groundScrollPx;
    const fieldStartX = Math.max(0, Math.min(canvas.width, boardX + 10));

    // 서클 구간
    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, fieldStartX, 210);

    // 낙하 필드 구간
    ctx.fillStyle = "#364f6b";
    ctx.fillRect(fieldStartX, 130, canvas.width - fieldStartX, 210);

    const scroll = groundScrollPx % 48;

    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    for (let x = -scroll; x < canvas.width + 48; x += 48) {
      ctx.fillRect(x, 142, 18, 2);
      ctx.fillRect(x + 12, 324, 18, 2);
    }

    // 스톱보드(파울선 20m)
    if (boardX >= -20 && boardX <= canvas.width + 20) {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(boardX - 3, 132, 6, 206);
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("STOP BOARD (20m)", boardX, 124);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_SP_GROUND_Y + 4, canvas.width, 2);

    // 파워 & 릴리즈 각도 인디케이터 (상단 필드 영역)
    const barX = 16;
    const barY = 62;
    const barW = 148;
    const barH = 10;

    ctx.fillStyle = "rgba(20, 22, 32, 0.85)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = olySpPower >= 75 ? "#ffd166" : "#72efdd";
    ctx.fillRect(barX, barY, barW * (olySpPower / 100), barH);
    ctx.strokeStyle = "#3a3f54";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = "#d6d8e5";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`POWER ${Math.round(olySpPower)}%`, barX, barY - 4);

    const angBarY = 92;
    const bestStartRatio = (38 - 25) / (55 - 25);
    const bestWidthRatio = (46 - 38) / (55 - 25);
    const curRatio = Math.max(0, Math.min(1, (olySpAngleDeg - 25) / (55 - 25)));

    ctx.fillStyle = "rgba(20, 22, 32, 0.85)";
    ctx.fillRect(barX, angBarY, barW, barH);
    ctx.fillStyle = "rgba(114, 239, 221, 0.35)";
    ctx.fillRect(barX + barW * bestStartRatio, angBarY, barW * bestWidthRatio, barH);

    const markerX = barX + barW * curRatio;
    ctx.fillStyle = "#ff8ca5";
    ctx.fillRect(markerX - 2, angBarY - 3, 4, barH + 6);

    ctx.fillStyle = "#d6d8e5";
    ctx.fillText(`ANGLE ${Math.round(olySpAngleDeg)}° (목표 42°)`, barX, angBarY - 4);

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
    ctx.fillText("◀ 좌 파워 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("우 파워 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 각도 맞춰 투척", canvas.width * 0.5, 392);

    // 카메라 스크롤 반영 비행 궤적
    for (let i = 0; i < olySpTrail.length; i++) {
      const t = olySpTrail[i];
      const tx = t.worldX - olySpCamScrollPx;
      if (tx >= -12 && tx <= canvas.width + 12) {
        ctx.fillStyle = olySpFoul ? "rgba(255, 77, 109, 0.38)" : "rgba(255, 209, 102, 0.42)";
        ctx.beginPath();
        ctx.arc(tx, t.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 선수 캐릭터 (카메라가 따라가면서 왼쪽으로 밀려남)
    const lifterScreenX = olySpX - olySpCamScrollPx;
    if (lifterScreenX >= -40 && lifterScreenX <= canvas.width + 40) {
      const bob = olySpPhase === "charge" ? Math.sin(olySpFrame * 0.45) * (olySpPower > 15 ? 2.5 : 0) : 0;
      const drawY = olySpY + bob;
      const legSwing = olySpPhase === "flight" ? 7 : Math.sin(olySpFrame * 0.55) * (olySpPower > 15 ? 9 : 1);

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(lifterScreenX, OLY_SP_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f4f4f6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lifterScreenX, drawY - 14);
      ctx.lineTo(lifterScreenX + legSwing, drawY + 2);
      ctx.moveTo(lifterScreenX, drawY - 14);
      ctx.lineTo(lifterScreenX - legSwing, drawY + 2);
      ctx.stroke();

      ctx.fillStyle = "#e65c7b";
      ctx.beginPath();
      ctx.arc(lifterScreenX, drawY - 22, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(lifterScreenX + 2, drawY - 36, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 투포환 공 (카메라가 따라가므로 화면 안에 계속 잡힘)
    const bx =
      olySpPhase === "charge"
        ? lifterScreenX + 9
        : olySpBallWorldX - olySpCamScrollPx;
    const by = olySpPhase === "charge" ? olySpY - 24 : olySpBallY;

    if (bx >= -20 && bx <= canvas.width + 20) {
      // 공 아래 지면 그림자
      ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
      ctx.beginPath();
      ctx.ellipse(bx, OLY_SP_GROUND_Y + 4, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = olySpFoul ? "#ff4d6d" : "#dce1eb";
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#12131a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 파티클 & 팝업
    for (let i = olySpParticles.length - 1; i >= 0; i--) {
      const pt = olySpParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olySpParticles.splice(i, 1);
    }

    for (let i = olySpPopups.length - 1; i >= 0; i--) {
      const pop = olySpPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olySpPopups.splice(i, 1);
    }

    // HUD
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveRecord = olySpFoul
      ? "FOUL"
      : olySpPhase === "done"
        ? `${olySpThrowDistM.toFixed(2)}m`
        : olySpPhase === "flight"
          ? `${computeOlySpMeters(olySpThrowPower, olySpThrowAngle, olySpThrowPos).toFixed(2)}m`
          : "--.--m";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`서클 ${olySpCirclePos.toFixed(1)}m · 기록 ${liveRecord}`, 12, 21);

    const leftBoard = OLY_SP_FOUL_POS - olySpCirclePos;
    ctx.fillStyle = leftBoard < 0 ? "#ff4d6d" : "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      leftBoard >= 0 ? `스톱보드까지 ${leftBoard.toFixed(1)}m` : `스톱보드 초과 (+${Math.abs(leftBoard).toFixed(1)}m)`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olySpBestCm > 0 ? `${(olySpBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olySpFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olySpFoul ? "#ff4d6d" : "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olySpFoul ? "🚫 파울 (0.00m)" : `🏋️ 투포환 ${olySpThrowDistM.toFixed(2)}m`,
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
  id: "oly-shotput",
  title: "투포환",
  icon: "🏋️",
  desc: "파워 충전과 릴리즈 각도 타이밍, 날아가는 공을 쫓는 카메라로 최장 기록 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 교대로 파워 충전 · 각도(42°)와 스톱보드(20m)를 노려 상단 터치(PC: ↑/W/Space)로 투척!",
  rankingTitle: "🏋️ 투포환 TOP 5 (최장 거리)",
  dbNode: "oly_shotput_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olySpBestCm > 0 ? `BEST ${(olySpBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olySpLastScore,
  reset: resetOlyShotput,
  draw: drawOlyShotputFrame,
  stop: () => {
    olySpRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olySpFinished || olySpOver || !olySpRunning) {
      if (!canRestartNow()) return;
      resetOlyShotput();
      return;
    }
    if (y < 190) {
      releaseOlyShotput(false);
    } else {
      stepOlyShotputStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olySpFinished || olySpOver || !olySpRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyShotput();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) releaseOlyShotput(false);
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyShotputStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyShotputStride(1);
    }
  }
});
