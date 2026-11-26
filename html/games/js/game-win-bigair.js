/* ---------- 올림픽 16. 스노우보드 빅에어 (Snowboard Big Air - Spin, Grab & Stomp) ---------- */
var olyBaRunning = false;
var olyBaOver = false;
var olyBaFinished = false;

// "approach" | "air" | "done"
var olyBaPhase = "approach";
var olyBaApproachDist = 0; // 키커 진입 거리 (0 ~ 55m)
var olyBaSpeed = 0.75;
var olyBaFrame = 0;

var olyBaX = 95;
var olyBaY = 176;
var olyBaVx = 0;
var olyBaVy = 0;
var olyBaHoldDir = 0; // -1: 반시계 스핀, +1: 시계 스핀
var olyBaSpinDeg = 0; // 누적 공중 회전각 (deg)
var olyBaGrabActive = false;
var olyBaGrabFrames = 0;
var olyBaGrabCount = 0;
var olyBaAirGainPx = 0;
var olyBaTrail = [];

var olyBaPoints = 0; // 최종 빅에어 점수 (0 ~ 1000 정수, sortOrder: "desc")
var olyBaLastScore = 0;
var olyBaBestPts = loadOlyBaBestPts();
var olyBaParticles = [];
var olyBaPopups = [];

var OLY_BA_START_X = 95;
var OLY_BA_KICKER_M = 48.0;
var OLY_BA_MAX_APPROACH_M = 51.5;
var OLY_BA_PX_PER_M = 9;

function loadOlyBaBestPts() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyBigAirBestPts"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyBaBestPts(pts) {
  try {
    localStorage.setItem("nakhwaOlyBigAirBestPts", String(pts));
  } catch (_) {}
}

function getOlyBaGroundScrollPx() {
  return (
    olyBaApproachDist * OLY_BA_PX_PER_M +
    (olyBaPhase === "air" || olyBaPhase === "done" ? olyBaAirGainPx : 0)
  );
}

function getOlyBaSlopeY(screenX) {
  const groundScrollPx = getOlyBaGroundScrollPx();
  const kickerScreenX =
    OLY_BA_START_X + OLY_BA_KICKER_M * OLY_BA_PX_PER_M - groundScrollPx;

  if (screenX < kickerScreenX - 36) {
    // 어프로치 슬로프
    const ratio = Math.max(0, Math.min(1, screenX / Math.max(1, kickerScreenX - 36)));
    return 152 + ratio * 48; // 152 -> 200
  } else if (screenX <= kickerScreenX) {
    // 키커 립(상향 점프대 턱)
    const kRatio = (screenX - (kickerScreenX - 36)) / 36;
    return 200 - Math.sin(kRatio * Math.PI * 0.5) * 28; // 200 -> 172 업킥
  }
  // 착지 랜딩 슬로프
  const slopeDx = screenX - kickerScreenX;
  return Math.min(324, 186 + slopeDx * 0.32);
}

function resetOlyBigAir() {
  olyBaPhase = "approach";
  olyBaApproachDist = 0;
  olyBaSpeed = 0.75;
  olyBaFrame = 0;

  olyBaX = OLY_BA_START_X;
  olyBaY = 176;
  olyBaVx = 0;
  olyBaVy = 0;
  olyBaHoldDir = 0;
  olyBaSpinDeg = 0;
  olyBaGrabActive = false;
  olyBaGrabFrames = 0;
  olyBaGrabCount = 0;
  olyBaAirGainPx = 0;
  olyBaTrail = [];

  olyBaPoints = 0;
  olyBaLastScore = 0;
  olyBaParticles = [];
  olyBaPopups = [];

  olyBaOver = false;
  olyBaFinished = false;
  olyBaRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyBaPopup(x, y, text, color) {
  olyBaPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlyBaBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.1 + Math.random() * 2.4;
    olyBaParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function getSpinAlignmentErrorDeg(deg) {
  const absDeg = Math.abs(deg);
  const nearest360 = Math.round(absDeg / 360) * 360;
  return Math.abs(absDeg - nearest360);
}

function computeOlyBaScore(stomped) {
  const fullSpins = Math.floor((Math.abs(olyBaSpinDeg) + 45) / 360);
  const spinPoints = Math.min(480, fullSpins * 150 + Math.min(120, Math.abs(olyBaSpinDeg) * 0.12));
  const grabPoints = Math.min(220, olyBaGrabCount * 75 + olyBaGrabFrames * 1.4);
  const airPoints = Math.min(140, olyBaAirGainPx * 0.24);
  const alignErr = getSpinAlignmentErrorDeg(olyBaSpinDeg);
  const stompBonus = stomped ? Math.max(40, 160 - alignErr * 1.8) : -90;

  const raw = Math.round(spinPoints + grabPoints + airPoints + stompBonus);
  return Math.max(0, Math.min(1000, raw));
}

function triggerOlyBaAction() {
  if (!olyBaRunning || olyBaOver || olyBaFinished) return;

  if (olyBaPhase === "approach") {
    const distToLip = Math.abs(OLY_BA_KICKER_M - olyBaApproachDist);
    const lipBoost = distToLip <= 5.5 ? 1.15 : 0.88;

    olyBaPhase = "air";
    olyBaVy = -(3.4 + olyBaSpeed * 1.15) * lipBoost;
    olyBaVx = 2.8 + olyBaSpeed * 1.25;
    olyBaSpinDeg = 0;
    olyBaGrabActive = false;
    olyBaGrabFrames = 0;
    olyBaGrabCount = 0;
    olyBaAirGainPx = 0;
    olyBaTrail = [];

    spawnOlyBaBurst(olyBaX, olyBaY, "#ffd166", 12);
    addOlyBaPopup(
      olyBaX,
      olyBaY - 34,
      distToLip <= 5.5 ? "🔥 BIG POP!" : "🏂 KICKER LAUNCH!",
      "#ffd166"
    );
  } else if (olyBaPhase === "air") {
    if (!olyBaGrabActive) {
      olyBaGrabActive = true;
      olyBaGrabFrames = 14;
      olyBaGrabCount++;
      spawnOlyBaBurst(olyBaX, olyBaY, "#72efdd", 9);
      addOlyBaPopup(olyBaX, olyBaY - 32, "✋ INDY GRAB!", "#72efdd");
    }
  }
}

function finishOlyBigAir(stomped) {
  olyBaPhase = "done";
  olyBaFinished = true;
  olyBaRunning = false;

  const pts = computeOlyBaScore(stomped);
  olyBaPoints = pts;
  olyBaLastScore = pts;

  spawnOlyBaBurst(olyBaX, olyBaY, stomped ? "#72efdd" : "#ff4d6d", 16);

  const isNewBest = olyBaPoints > olyBaBestPts;
  if (isNewBest) {
    olyBaBestPts = olyBaPoints;
    saveOlyBaBestPts(olyBaBestPts);
  }

  triggerGameOver(isNewBest, olyBaPoints > 0);
}

function updateOlyBigAir() {
  if (!olyBaRunning || olyBaOver || olyBaFinished) return;
  olyBaFrame++;

  if (olyBaPhase === "approach") {
    olyBaSpeed = Math.min(2.2, olyBaSpeed + 0.013);
    olyBaApproachDist += olyBaSpeed * 0.24;
    olyBaY = getOlyBaSlopeY(olyBaX) - 4;

    if (olyBaApproachDist >= OLY_BA_MAX_APPROACH_M) {
      olyBaApproachDist = OLY_BA_MAX_APPROACH_M;
      triggerOlyBaAction();
    }
  } else if (olyBaPhase === "air") {
    olyBaTrail.push({ x: olyBaX, y: olyBaY });
    if (olyBaTrail.length > 32) olyBaTrail.shift();

    if (olyBaGrabFrames > 0) {
      olyBaGrabFrames--;
      olyBaLiftAccumOrGrabTick();
    } else {
      olyBaGrabActive = false;
    }

    // 좌/우 홀드로 공중 스핀 회전 가속
    const spinAccel = olyBaHoldDir !== 0 ? olyBaHoldDir * 6.2 : 0;
    olyBaSpinDeg += spinAccel;

    olyBaAirGainPx += olyBaVx;
    olyBaX = Math.min(245, olyBaX + olyBaVx * 0.34);
    olyBaY += olyBaVy;
    olyBaVy += 0.135;

    const slopeY = getOlyBaSlopeY(olyBaX) - 4;
    if (olyBaY >= slopeY) {
      olyBaY = slopeY;
      const alignErr = getSpinAlignmentErrorDeg(olyBaSpinDeg);
      const stomped = alignErr <= 42;

      if (stomped) {
        addOlyBaPopup(olyBaX, olyBaY - 34, "✅ STOMP LANDING!", "#72efdd");
      } else {
        addOlyBaPopup(olyBaX, olyBaY - 34, "💥 UNEVEN LANDING!", "#ff4d6d");
      }
      finishOlyBigAir(stomped);
    }
  }
}

function olyBaLiftAccumOrGrabTick() {
  // 그랩 유지 중 보너스 누적
  if (olyBaGrabActive) {
    olyBaGrabFrames += 0;
  }
}

function drawOlyBigAirFrame() {
  try {
    ctx.save();
    updateOlyBigAir();

    // 설산 야간 배경
    ctx.fillStyle = "#0e1524";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#17233b";
    ctx.fillRect(0, 0, canvas.width, 130);

    const groundScrollPx = getOlyBaGroundScrollPx();
    const kickerScreenX =
      OLY_BA_START_X + OLY_BA_KICKER_M * OLY_BA_PX_PER_M - groundScrollPx;

    // 어프로치 · 키커 · 랜딩 슬로프 지형
    ctx.fillStyle = "#e2f1fc";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let sx = 0; sx <= canvas.width; sx += 8) {
      ctx.lineTo(sx, getOlyBaSlopeY(sx));
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 눈밭 스크롤 라인
    const scrollOffset = groundScrollPx % 48;
    ctx.fillStyle = "rgba(67, 118, 166, 0.25)";
    for (let sx = -scrollOffset; sx < canvas.width + 48; sx += 48) {
      const sy = getOlyBaSlopeY(Math.max(0, Math.min(canvas.width, sx)));
      ctx.fillRect(sx, sy + 12, 18, 2);
    }

    // 키커 립 마커
    if (kickerScreenX >= -24 && kickerScreenX <= canvas.width + 24) {
      const ky = getOlyBaSlopeY(kickerScreenX);
      ctx.fillStyle = "#ff8ca5";
      ctx.fillRect(kickerScreenX - 2, ky - 14, 4, 22);
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KICKER", kickerScreenX, ky - 20);
    }

    // 상단 트릭 / 스핀 상태 안내
    if (olyBaPhase === "air") {
      const totalSpin = Math.round(Math.abs(olyBaSpinDeg));
      const alignErr = Math.round(getSpinAlignmentErrorDeg(olyBaSpinDeg));
      ctx.fillStyle = "#72efdd";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `SPIN ${totalSpin}° · GRAB ${olyBaGrabCount}회 · 착지 오차 ${alignErr}°`,
        canvas.width * 0.5,
        84
      );
    } else if (olyBaPhase === "approach") {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("키커 립에서 ↑ / W / Space 또는 상단 터치로 팝!", canvas.width * 0.5, 84);
    }

    // 공중 궤적
    if (olyBaTrail.length > 1) {
      ctx.strokeStyle = olyBaGrabActive ? "rgba(255, 209, 102, 0.65)" : "rgba(114, 239, 221, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(olyBaTrail[0].x, olyBaTrail[0].y);
      for (let i = 1; i < olyBaTrail.length; i++) {
        ctx.lineTo(olyBaTrail[i].x, olyBaTrail[i].y);
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

    ctx.fillStyle = olyBaHoldDir === -1 ? "#ffd166" : "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 좌 스핀 홀드 (←/A)", canvas.width * 0.25, 370);

    ctx.fillStyle = olyBaHoldDir === 1 ? "#ffd166" : "#9898a6";
    ctx.fillText("우 스핀 홀드 (→/D) ▶", canvas.width * 0.75, 370);

    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 키커 팝 & 보드 그랩", canvas.width * 0.5, 392);

    // 스노보드 라이더 렌더링
    ctx.save();
    ctx.translate(olyBaX, olyBaY);
    const visualRot =
      olyBaPhase === "approach"
        ? 0.28
        : (olyBaSpinDeg * Math.PI) / 180;
    ctx.rotate(visualRot);

    // 스노보드 데크
    ctx.strokeStyle = olyBaGrabActive ? "#ffd166" : "#ff4d6d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, 5);
    ctx.lineTo(20, 5);
    ctx.stroke();

    // 라이더 몸체 & 비니
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(0, -4, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, -17, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 파티클 & 팝업
    for (let i = olyBaParticles.length - 1; i >= 0; i--) {
      const pt = olyBaParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.11;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyBaParticles.splice(i, 1);
    }

    for (let i = olyBaPopups.length - 1; i >= 0; i--) {
      const pop = olyBaPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyBaPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const livePts =
      olyBaPhase === "done"
        ? olyBaPoints
        : olyBaPhase === "air"
          ? computeOlyBaScore(true)
          : 0;

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`빅에어 점수 ${livePts} pts`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      olyBaPhase === "approach"
        ? `키커까지 ${Math.max(0, OLY_BA_KICKER_M - olyBaApproachDist).toFixed(1)}m`
        : `회전 ${Math.round(Math.abs(olyBaSpinDeg))}° · 그랩 ${olyBaGrabCount}회`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyBaBestPts > 0 ? `${olyBaBestPts} pts` : "-- pts";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyBaFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏂 스노우보드 빅에어 ${olyBaPoints} pts`, canvas.width / 2, 182);

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
  id: "oly-bigair",
  title: "스노우보드 빅에어",
  icon: "🏂",
  desc: "키커 도약 후 공중 스핀 홀드와 보드 그랩으로 최고 트릭 점수에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "pts",
  hint: "키커에서 ↑/W/Space 팝 · 공중 ←/→ 홀드로 스핀 & ↑/Space 그랩!",
  rankingTitle: "🏂 스노우보드 빅에어 TOP 5 (최고 점수)",
  dbNode: "oly_bigair_scores",
  formatScore: (score) => `${score} pts`,
  getBadge: () => (olyBaBestPts > 0 ? `BEST ${olyBaBestPts} pts` : "BEST -- pts"),
  getScore: () => olyBaLastScore,
  reset: resetOlyBigAir,
  draw: drawOlyBigAirFrame,
  stop: () => {
    olyBaRunning = false;
    olyBaHoldDir = 0;
  },
  onPointerDown: (x, y) => {
    if (olyBaFinished || olyBaOver || !olyBaRunning) {
      if (!canRestartNow()) return;
      resetOlyBigAir();
      return;
    }
    if (y < 190) {
      triggerOlyBaAction();
    } else {
      olyBaHoldDir = x < canvas.width / 2 ? -1 : 1;
    }
  },
  onPointerUp: () => {
    if (!olyBaRunning) return;
    olyBaHoldDir = 0;
  },
  onKeyDown: (e) => {
    if (olyBaFinished || olyBaOver || !olyBaRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyBigAir();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlyBaAction();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      olyBaHoldDir = -1;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      olyBaHoldDir = 1;
    }
  },
  onKeyUp: (e) => {
    if (!olyBaRunning) return;
    if (
      (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") &&
      olyBaHoldDir === -1
    ) {
      olyBaHoldDir = 0;
    } else if (
      (e.key === "ArrowRight" || e.key === "d" || e.key === "D") &&
      olyBaHoldDir === 1
    ) {
      olyBaHoldDir = 0;
    }
  }
});