/* ---------- 올림픽 5. 창던지기 (Javelin Throw - Camera Follow) ---------- */
var olyJvRunning = false;
var olyJvOver = false;
var olyJvFinished = false;
var olyJvFoul = false;

var olyJvPhase = "run"; // "run" | "flight" | "done"
var olyJvDist = 0; // 도움닫기 거리 (0 ~ 30m)
var olyJvSpeed = 0; // 현재 도움닫기 속도 (0 ~ 2.0)
var olyJvThrowSpeed = 0;
var olyJvThrowDist = 0;
var olyJvLastSide = 0;
var olyJvLastStepFrame = 0;
var olyJvFrame = 0;

var olyJvX = 95;
var olyJvY = 294;

// 창의 월드 좌표 및 카메라 추적 스크롤
var olyJvSpearWorldX = 104;
var olyJvSpearY = 272;
var olyJvSpearVx = 0;
var olyJvSpearVy = 0;
var olyJvSpearAngle = -0.42;
var olyJvFlightPx = 0;
var olyJvCamScrollPx = 0;
var olyJvTrace = []; // { worldX, y }

var olyJvThrowDistM = 0;
var olyJvScoreCm = 0;
var olyJvLastScore = 0;
var olyJvBestCm = loadOlyJvBestCm();
var olyJvParticles = [];
var olyJvPopups = [];

var OLY_JV_START_X = 95;
var OLY_JV_SWEET_START = 24.5;
var OLY_JV_FOUL_DIST = 28.0;
var OLY_JV_MAX_DIST = 30.0;
var OLY_JV_GROUND_Y = 294;
var OLY_JV_PX_PER_M = 18;
var OLY_JV_MIN_M = 30.0;
var OLY_JV_MAX_M = 98.0;

function loadOlyJvBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyJavelinBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyJvBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlyJavelinBestCm", String(cm));
  } catch (_) {}
}

function resetOlyJavelin() {
  olyJvPhase = "run";
  olyJvDist = 0;
  olyJvSpeed = 0;
  olyJvThrowSpeed = 0;
  olyJvThrowDist = 0;
  olyJvLastSide = 0;
  olyJvLastStepFrame = 0;
  olyJvFrame = 0;

  olyJvX = OLY_JV_START_X;
  olyJvY = OLY_JV_GROUND_Y;
  olyJvSpearWorldX = olyJvX + 9;
  olyJvSpearY = olyJvY - 22;
  olyJvSpearVx = 0;
  olyJvSpearVy = 0;
  olyJvSpearAngle = -0.42;
  olyJvFlightPx = 0;
  olyJvCamScrollPx = 0;
  olyJvTrace = [];

  olyJvThrowDistM = 0;
  olyJvScoreCm = 0;
  olyJvLastScore = 0;
  olyJvFoul = false;
  olyJvParticles = [];
  olyJvPopups = [];

  olyJvOver = false;
  olyJvFinished = false;
  olyJvRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyJvPopup(x, y, text, color) {
  olyJvPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlyJvBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 1.1 + Math.random() * 2.3;
    olyJvParticles.push({
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

function getOlyJvTimingScore(throwDist) {
  if (throwDist < OLY_JV_SWEET_START) {
    return Math.max(0.15, (throwDist / OLY_JV_SWEET_START) * 0.55);
  }
  const span = OLY_JV_FOUL_DIST - OLY_JV_SWEET_START;
  const progress = Math.max(0, Math.min(1, (throwDist - OLY_JV_SWEET_START) / span));
  return 0.55 + progress * 0.45;
}

function computeOlyJvMeters(flightPx, speed, throwDist) {
  const speedRatio = Math.max(0, Math.min(1, speed / 2.0));
  const timingRatio = getOlyJvTimingScore(throwDist);
  const carryBonus = Math.max(0, Math.min(12.0, flightPx * 0.032));

  const raw = OLY_JV_MIN_M + speedRatio * 30.0 + timingRatio * 26.0 + carryBonus;
  const clamped = Math.max(OLY_JV_MIN_M, Math.min(OLY_JV_MAX_M, raw));
  return Number(clamped.toFixed(2));
}

function stepOlyJavelinStride(side) {
  if (!olyJvRunning || olyJvOver || olyJvFinished || olyJvPhase !== "run") return;

  const gapFrames = olyJvFrame - olyJvLastStepFrame;
  const alternating = olyJvLastSide !== side;

  if (alternating) {
    const gain = gapFrames >= 5 && gapFrames <= 18 ? 0.27 : 0.18;
    olyJvSpeed = Math.min(2.0, olyJvSpeed + gain);
    spawnOlyJvBurst(olyJvX, OLY_JV_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyJvSpeed = Math.max(0.12, olyJvSpeed - 0.14);
    addOlyJvPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyJvLastSide = side;
  olyJvLastStepFrame = olyJvFrame;
}

function launchOlyJavelin(forceFoul = false) {
  if (!olyJvRunning || olyJvOver || olyJvFinished || olyJvPhase !== "run") return;

  olyJvThrowSpeed = olyJvSpeed;
  olyJvThrowDist = olyJvDist;
  olyJvFoul = forceFoul || olyJvDist > OLY_JV_FOUL_DIST;

  const timingRatio = getOlyJvTimingScore(olyJvDist);
  const speedRatio = Math.max(0.2, Math.min(1, olyJvSpeed / 2.0));
  const launchPower = speedRatio * 0.65 + timingRatio * 0.35;

  olyJvPhase = "flight";
  olyJvSpearWorldX = olyJvX + 10;
  olyJvSpearY = olyJvY - 24;
  olyJvSpearVx = 4.6 + launchPower * 5.2;
  olyJvSpearVy = -(3.2 + launchPower * 3.1);
  olyJvSpearAngle = Math.atan2(olyJvSpearVy, olyJvSpearVx);
  olyJvFlightPx = 0;
  olyJvCamScrollPx = 0;
  olyJvTrace = [{ worldX: olyJvSpearWorldX, y: olyJvSpearY }];

  if (olyJvFoul) {
    addOlyJvPopup(olyJvX, olyJvY - 38, "🚫 FOUL!", "#ff4d6d");
    spawnOlyJvBurst(olyJvX, OLY_JV_GROUND_Y, "#ff4d6d", 12);
  } else if (olyJvDist >= 27.0 && olyJvSpeed >= 1.1) {
    addOlyJvPopup(olyJvX, olyJvY - 38, "⚡ SWEET SPOT!", "#ffd166");
    spawnOlyJvBurst(olyJvSpearWorldX, olyJvSpearY, "#ffd166", 12);
  } else {
    spawnOlyJvBurst(olyJvSpearWorldX, olyJvSpearY, "#72efdd", 8);
  }
}

function landOlyJavelin() {
  olyJvPhase = "done";
  olyJvFinished = true;
  olyJvRunning = false;

  if (olyJvFoul) {
    olyJvThrowDistM = 0;
    olyJvScoreCm = 0;
    olyJvLastScore = 0;
  } else {
    const meters = computeOlyJvMeters(olyJvFlightPx, olyJvThrowSpeed, olyJvThrowDist);
    olyJvThrowDistM = meters;
    olyJvScoreCm = Math.round(meters * 100);
    olyJvLastScore = olyJvScoreCm;
  }

  const impactScreenX = Math.max(
    24,
    Math.min(canvas.width - 24, olyJvSpearWorldX - olyJvCamScrollPx)
  );
  spawnOlyJvBurst(impactScreenX, OLY_JV_GROUND_Y + 2, olyJvFoul ? "#ff4d6d" : "#72efdd", 16);

  const isNewBest = !olyJvFoul && olyJvScoreCm > olyJvBestCm;
  if (isNewBest) {
    olyJvBestCm = olyJvScoreCm;
    saveOlyJvBestCm(olyJvBestCm);
  }

  triggerGameOver(isNewBest, !olyJvFoul && olyJvScoreCm > 0);
}

function updateOlyJavelin() {
  if (!olyJvRunning || olyJvOver || olyJvFinished) return;
  olyJvFrame++;

  if (olyJvPhase === "run") {
    const floorSpeed = olyJvDist > 0.35 ? 0.14 : 0;
    olyJvSpeed = Math.max(floorSpeed, olyJvSpeed * 0.968);
    olyJvDist += olyJvSpeed * 0.24;

    olyJvX = Math.min(125, OLY_JV_START_X + Math.min(olyJvDist, 10) * 3.0);
    olyJvSpearWorldX = olyJvX + 9;
    olyJvSpearY = olyJvY - 22;
    olyJvSpearAngle = -0.42;
    olyJvCamScrollPx = 0;

    if (olyJvDist >= OLY_JV_MAX_DIST) {
      olyJvDist = OLY_JV_MAX_DIST;
      launchOlyJavelin(true);
    }
  } else if (olyJvPhase === "flight") {
    olyJvSpearWorldX += olyJvSpearVx;
    olyJvSpearY += olyJvSpearVy;
    olyJvSpearVy += 0.15;
    olyJvFlightPx += Math.hypot(olyJvSpearVx, olyJvSpearVy);
    olyJvSpearAngle = Math.atan2(olyJvSpearVy, olyJvSpearVx);

    olyJvTrace.push({ worldX: olyJvSpearWorldX, y: olyJvSpearY });
    if (olyJvTrace.length > 34) olyJvTrace.shift();

    // 날아가는 창을 카메라가 부드럽게 추적
    const targetCamScroll = Math.max(0, olyJvSpearWorldX - canvas.width * 0.56);
    olyJvCamScrollPx += (targetCamScroll - olyJvCamScrollPx) * 0.18;

    if (olyJvSpearY >= OLY_JV_GROUND_Y + 2) {
      olyJvSpearY = OLY_JV_GROUND_Y + 2;
      landOlyJavelin();
    }
  }
}

function drawJavelinSpear(x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = color || "#f4f4f6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(18, -3.5);
  ctx.lineTo(18, 3.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawOlyJavelinFrame() {
  try {
    ctx.save();
    updateOlyJavelin();

    // 배경 & 필드
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 단일 지면 스크롤 기준으로 스위트존·파울라인·필드 경계·바닥 무늬를 함께 왼쪽으로 당김
    const groundScrollPx = olyJvDist * OLY_JV_PX_PER_M + olyJvCamScrollPx;
    const sweetStartX =
      OLY_JV_START_X +
      OLY_JV_SWEET_START * OLY_JV_PX_PER_M -
      groundScrollPx;
    const foulLineX =
      OLY_JV_START_X +
      OLY_JV_FOUL_DIST * OLY_JV_PX_PER_M -
      groundScrollPx;
    const fieldStartX = Math.max(0, Math.min(canvas.width, foulLineX + 10));

    // 도움닫기 트랙
    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, fieldStartX, 210);

    // 스위트 스팟 구간 강조
    const zoneLeft = Math.max(0, sweetStartX);
    const zoneRight = Math.max(zoneLeft, Math.min(fieldStartX, foulLineX));
    if (zoneRight > zoneLeft) {
      ctx.fillStyle = "rgba(114, 239, 221, 0.16)";
      ctx.fillRect(zoneLeft, 132, zoneRight - zoneLeft, 206);
    }

    // 투척 필드
    ctx.fillStyle = "#2d5a43";
    ctx.fillRect(fieldStartX, 130, canvas.width - fieldStartX, 210);

    const scroll = groundScrollPx % 48;

    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    for (let x = -scroll; x < canvas.width + 48; x += 48) {
      ctx.fillRect(x, 142, 18, 2);
      ctx.fillRect(x + 12, 324, 18, 2);
    }

    // 파울 라인(28m)
    if (foulLineX >= -20 && foulLineX <= canvas.width + 20) {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(foulLineX - 2, 132, 4, 206);
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FOUL LINE (28m)", foulLineX, 124);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_JV_GROUND_Y + 4, canvas.width, 2);

    // 상단 속도 & 투척 존 게이지
    const barX = 16;
    const barY = 62;
    const barW = 148;
    const barH = 10;
    const speedPct = Math.max(0, Math.min(1, olyJvSpeed / 2.0));

    ctx.fillStyle = "rgba(20, 22, 32, 0.85)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = speedPct >= 0.65 ? "#72efdd" : "#ffd166";
    ctx.fillRect(barX, barY, barW * speedPct, barH);
    ctx.strokeStyle = "#3a3f54";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = "#d6d8e5";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`RUN SPEED ${Math.round(speedPct * 100)}%`, barX, barY - 4);

    const zoneBarY = 92;
    const sweetStartRatio = OLY_JV_SWEET_START / OLY_JV_MAX_DIST;
    const foulRatio = OLY_JV_FOUL_DIST / OLY_JV_MAX_DIST;
    const curPosRatio = Math.max(0, Math.min(1, olyJvDist / OLY_JV_MAX_DIST));

    ctx.fillStyle = "rgba(20, 22, 32, 0.85)";
    ctx.fillRect(barX, zoneBarY, barW, barH);
    ctx.fillStyle = "rgba(114, 239, 221, 0.35)";
    ctx.fillRect(
      barX + barW * sweetStartRatio,
      zoneBarY,
      barW * (foulRatio - sweetStartRatio),
      barH
    );
    ctx.fillStyle = "rgba(255, 77, 109, 0.38)";
    ctx.fillRect(barX + barW * foulRatio, zoneBarY, barW * (1 - foulRatio), barH);

    ctx.fillStyle = "#ff8ca5";
    ctx.fillRect(barX + barW * curPosRatio - 2, zoneBarY - 3, 4, barH + 6);

    ctx.fillStyle = "#d6d8e5";
    ctx.fillText("RELEASE ZONE (24.5~28m)", barX, zoneBarY - 4);

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
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 창 던지기", canvas.width * 0.5, 392);

    // 카메라 스크롤 반영 비행 궤적
    if (olyJvTrace.length > 1) {
      ctx.strokeStyle = olyJvFoul ? "rgba(255, 77, 109, 0.48)" : "rgba(114, 239, 221, 0.48)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < olyJvTrace.length; i++) {
        const tx = olyJvTrace[i].worldX - olyJvCamScrollPx;
        const ty = olyJvTrace[i].y;
        if (!started) {
          ctx.moveTo(tx, ty);
          started = true;
        } else {
          ctx.lineTo(tx, ty);
        }
      }
      ctx.stroke();
    }

    // 선수 캐릭터 (카메라 추적에 따라 왼쪽으로 밀려남)
    const throwerScreenX = olyJvX - olyJvCamScrollPx;
    const bob = olyJvPhase === "run" ? Math.sin(olyJvFrame * 0.45) * (olyJvSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyJvY + bob;

    if (throwerScreenX >= -40 && throwerScreenX <= canvas.width + 40) {
      const legSwing = olyJvPhase === "flight" ? 7 : Math.sin(olyJvFrame * 0.55) * (olyJvSpeed > 0.2 ? 10 : 1);

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(throwerScreenX, OLY_JV_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f4f4f6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(throwerScreenX, drawY - 14);
      ctx.lineTo(throwerScreenX + legSwing, drawY + 2);
      ctx.moveTo(throwerScreenX, drawY - 14);
      ctx.lineTo(throwerScreenX - legSwing, drawY + 2);
      ctx.stroke();

      ctx.fillStyle = "#e65c7b";
      ctx.beginPath();
      ctx.arc(throwerScreenX, drawY - 22, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(throwerScreenX + 2, drawY - 36, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 창 렌더링
    if (olyJvPhase === "run") {
      drawJavelinSpear(throwerScreenX + 9, drawY - 22, -0.42, "#f4f4f6");
    } else {
      const spearScreenX = olyJvSpearWorldX - olyJvCamScrollPx;
      if (spearScreenX >= -45 && spearScreenX <= canvas.width + 45) {
        drawJavelinSpear(
          spearScreenX,
          olyJvSpearY,
          olyJvSpearAngle,
          olyJvFoul ? "#ff4d6d" : "#72efdd"
        );
      }
    }

    // 파티클 & 팝업
    for (let i = olyJvParticles.length - 1; i >= 0; i--) {
      const pt = olyJvParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyJvParticles.splice(i, 1);
    }

    for (let i = olyJvPopups.length - 1; i >= 0; i--) {
      const pop = olyJvPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyJvPopups.splice(i, 1);
    }

    // HUD
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveRecord = olyJvFoul
      ? "FOUL"
      : olyJvPhase === "done"
        ? `${olyJvThrowDistM.toFixed(2)}m`
        : olyJvPhase === "flight"
          ? `${computeOlyJvMeters(olyJvFlightPx, olyJvThrowSpeed, olyJvThrowDist).toFixed(2)}m`
          : "--.--m";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyJvDist.toFixed(1)}m · 기록 ${liveRecord}`, 12, 21);

    const leftLine = OLY_JV_FOUL_DIST - olyJvDist;
    ctx.fillStyle = leftLine < 0 ? "#ff4d6d" : "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      leftLine >= 0 ? `파울선까지 ${leftLine.toFixed(1)}m` : `파울선 초과 (+${Math.abs(leftLine).toFixed(1)}m)`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyJvBestCm > 0 ? `${(olyJvBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyJvFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olyJvFoul ? "#ff4d6d" : "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olyJvFoul ? "🚫 파울 (0.00m)" : `🎯 창던지기 ${olyJvThrowDistM.toFixed(2)}m`,
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
  id: "oly-javelin",
  title: "창던지기",
  icon: "🎯",
  desc: "도움닫기 가속과 스위트 스팟 타이밍, 카메라 추적 비행으로 창을 멀리 꽂아라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 24.5~28m 구간에서 상단 터치(PC: ↑/W/Space)로 투척!",
  rankingTitle: "🎯 창던지기 TOP 5 (최장 거리)",
  dbNode: "oly_javelin_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyJvBestCm > 0 ? `BEST ${(olyJvBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyJvLastScore,
  reset: resetOlyJavelin,
  draw: drawOlyJavelinFrame,
  stop: () => {
    olyJvRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyJvFinished || olyJvOver || !olyJvRunning) {
      if (!canRestartNow()) return;
      resetOlyJavelin();
      return;
    }
    if (y < 190) {
      launchOlyJavelin(false);
    } else {
      stepOlyJavelinStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyJvFinished || olyJvOver || !olyJvRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyJavelin();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) launchOlyJavelin(false);
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyJavelinStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyJavelinStride(1);
    }
  }
});
