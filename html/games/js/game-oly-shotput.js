/* ---------- 올림픽 5. 투포환 (Shot Put) 상태 ---------- */
var olySpRunning = false;
var olySpOver = false;
var olySpFinished = false;
var olySpFoul = false;

var olySpPhase = "charge"; // "charge" | "aim" | "air" | "done"
var olySpPower = 0; // 0 ~ 100 파워 게이지
var olySpLastSide = 0;
var olySpLastStepFrame = 0;
var olySpFrame = 0;

var olySpAngleDeg = 40; // 25 ~ 55도 왕복
var olySpAngleDir = 1;

var olySpBallX = 95;
var olySpBallY = 264;
var olySpBallVx = 0;
var olySpBallVy = 0;
var olySpThrowDistM = 0;

var olySpScoreCm = 0; // 예: 2145 => 21.45m
var olySpLastScore = 0;
var olySpBestCm = Number(localStorage.getItem("nakhwaOlyShotputBestCm") || 0);
var olySpParticles = [];
var olySpPopups = [];

var OLY_SP_CIRCLE_X = 95;
var OLY_SP_GROUND_Y = 294;

function resetOlyShotput() {
  olySpPhase = "charge";
  olySpPower = 0;
  olySpLastSide = 0;
  olySpLastStepFrame = 0;
  olySpFrame = 0;
  olySpAngleDeg = 40;
  olySpAngleDir = 1;
  olySpBallX = OLY_SP_CIRCLE_X;
  olySpBallY = 264;
  olySpBallVx = 0;
  olySpBallVy = 0;
  olySpThrowDistM = 0;
  olySpScoreCm = 0;
  olySpLastScore = 0;
  olySpParticles = [];
  olySpPopups = [];
  olySpFoul = false;
  olySpOver = false;
  olySpFinished = false;
  olySpRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlySpPopup(x, y, text, color) {
  olySpPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlySpBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.1 + Math.random() * 2.3;
    olySpParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.7,
      r: 2 + Math.random() * 2.2,
      color,
      life: 20
    });
  }
}

function pumpOlyShotputPower(side) {
  if (!olySpRunning || olySpOver || olySpFinished || olySpPhase !== "charge") return;

  const diffFrames = olySpFrame - olySpLastStepFrame;
  const isAlternating = olySpLastSide !== side;

  if (isAlternating) {
    const gain = diffFrames >= 5 && diffFrames <= 18 ? 11 : 7.5;
    olySpPower = Math.min(100, olySpPower + gain);
    spawnOlySpBurst(OLY_SP_CIRCLE_X, 294, "#ff8ca5", 4);
  } else {
    olySpPower = Math.max(0, olySpPower - 6);
    addOlySpPopup(canvas.width * 0.5, 196, "좌/우 교대!", "#9898a6");
  }

  olySpLastSide = side;
  olySpLastStepFrame = olySpFrame;
}

function enterOlyShotputAim() {
  if (!olySpRunning || olySpOver || olySpFinished || olySpPhase !== "charge") return;
  olySpPhase = "aim";
  olySpAngleDeg = 40;
  olySpAngleDir = 1;
  addOlySpPopup(115, 210, "📐 각도 멈춰서 투척!", "#ffd166");
}

function launchOlyShotput() {
  if (!olySpRunning || olySpOver || olySpFinished) return;

  if (olySpPhase === "charge") {
    enterOlyShotputAim();
    return;
  }

  if (olySpPhase !== "aim") return;

  // 투포환 최적 각도 40도 기준 보정
  const angleDiff = Math.abs(olySpAngleDeg - 40);
  const angleFactor = Math.max(0.58, 1 - angleDiff / 48);
  const powerFactor = Math.max(0.25, olySpPower / 100);
  const totalPower = powerFactor * angleFactor;

  const rad = (olySpAngleDeg * Math.PI) / 180;
  const speed = 5.0 + totalPower * 6.8;

  olySpBallX = OLY_SP_CIRCLE_X + 12;
  olySpBallY = 262;
  olySpBallVx = Math.cos(rad) * speed;
  olySpBallVy = -Math.sin(rad) * speed;

  olySpPhase = "air";
  spawnOlySpBurst(olySpBallX, olySpBallY, "#ffd166", 10);

  if (angleDiff <= 3 && olySpPower >= 70) {
    addOlySpPopup(120, 224, "💥 POWER SHOT!", "#ffd166");
  }
}

function landOlyShotput() {
  olySpPhase = "done";
  olySpFinished = true;
  olySpRunning = false;

  // 투포환 기록 계산 (6.50m ~ 23.50m 범위)
  const travelPx = Math.max(0, olySpBallX - (OLY_SP_CIRCLE_X + 12));
  const rawMeters = Math.max(6.2, Math.min(23.8, 6.5 + travelPx * 0.085));
  const finalMeters = Number(rawMeters.toFixed(2));
  olySpThrowDistM = finalMeters;
  olySpScoreCm = Math.round(finalMeters * 100);
  olySpLastScore = olySpScoreCm;

  spawnOlySpBurst(olySpBallX, OLY_SP_GROUND_Y, "#72efdd", 14);

  const isNewBest = olySpScoreCm > olySpBestCm;
  if (isNewBest) {
    olySpBestCm = olySpScoreCm;
    localStorage.setItem("nakhwaOlyShotputBestCm", String(olySpBestCm));
  }

  triggerGameOver(isNewBest, olySpScoreCm > 0);
}

function drawOlyShotputFrame() {
  try {
    ctx.save();

    if (olySpRunning && !olySpOver && !olySpFinished) {
      olySpFrame++;

      if (olySpPhase === "charge") {
        // 시간이 지나면서 파워가 아주 천천히 빠짐
        olySpPower = Math.max(0, olySpPower - 0.22);
      } else if (olySpPhase === "aim") {
        olySpAngleDeg += olySpAngleDir * 1.3;
        if (olySpAngleDeg >= 55) {
          olySpAngleDeg = 55;
          olySpAngleDir = -1;
        } else if (olySpAngleDeg <= 25) {
          olySpAngleDeg = 25;
          olySpAngleDir = 1;
        }
      } else if (olySpPhase === "air") {
        olySpBallX = Math.min(canvas.width - 14, olySpBallX + olySpBallVx);
        olySpBallY += olySpBallVy;
        olySpBallVy += 0.28;

        if (olySpBallY >= OLY_SP_GROUND_Y || olySpBallX >= canvas.width - 14) {
          olySpBallY = OLY_SP_GROUND_Y;
          landOlyShotput();
        }
      }
    }

    // 배경 & 투척 서클 + 낙하장
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 투척 필드
    ctx.fillStyle = "#2b4c3b";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 서클 & 스톱보드
    ctx.fillStyle = "#484d5e";
    ctx.beginPath();
    ctx.ellipse(OLY_SP_CIRCLE_X, 294, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_SP_CIRCLE_X + 18, 286, 5, 10);

    // 거리 눈금
    ctx.fillStyle = "rgba(244, 244, 246, 0.55)";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    for (let m = 10; m <= 22; m += 2) {
      const mx = OLY_SP_CIRCLE_X + 12 + (m - 6.5) / 0.085;
      if (mx > 125 && mx < canvas.width - 10) {
        ctx.fillRect(mx, 294, 2, 10);
        ctx.fillText(`${m}m`, mx, 316);
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
    if (olySpPhase === "aim") {
      ctx.fillStyle = "#ffd166";
      ctx.fillText("🎯 아무 곳이나 터치(PC: Space/↑)해서 포환 투척!", canvas.width * 0.5, 376);
    } else {
      ctx.fillText("◀ 좌 파워 (←/A) · 위 각도조준(↑/Space)", canvas.width * 0.25, 376);
      ctx.fillText("우 파워 (→/D) · 위 각도조준(↑/Space) ▶", canvas.width * 0.75, 376);
    }

    // 선수 & 포환 렌더링
    const throwerX = OLY_SP_CIRCLE_X;
    const throwerY = 264 - (olySpPhase === "charge" ? (olySpPower / 100) * 5 : 0);

    // 선수 몸통 & 머리
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(throwerX, throwerY + 4, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(throwerX + 2, throwerY - 11, 8, 0, Math.PI * 2);
    ctx.fill();

    if (olySpPhase === "charge" || olySpPhase === "aim") {
      const aimRad = (-olySpAngleDeg * Math.PI) / 180;
      const handX = throwerX + 10 + Math.cos(aimRad) * 10;
      const handY = throwerY - 2 + Math.sin(aimRad) * 10;

      // 묵직한 쇠구슬(포환)
      ctx.fillStyle = "#cfd6e4";
      ctx.beginPath();
      ctx.arc(handX, handY, 6.5, 0, Math.PI * 2);
      ctx.fill();

      if (olySpPhase === "aim") {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(handX + Math.cos(aimRad) * 80, handY + Math.sin(aimRad) * 80);
        ctx.stroke();
        ctx.restore();
      }
    } else if (olySpPhase === "air" || olySpPhase === "done") {
      ctx.fillStyle = "#cfd6e4";
      ctx.beginPath();
      ctx.arc(olySpBallX, olySpBallY, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 파워 게이지 바 (좌상단 아래)
    ctx.fillStyle = "#242836";
    ctx.fillRect(12, 54, 130, 10);
    ctx.fillStyle = olySpPower >= 75 ? "#ffd166" : "#72efdd";
    ctx.fillRect(12, 54, 130 * (olySpPower / 100), 10);

    // 파티클 & 팝업
    for (let i = olySpParticles.length - 1; i >= 0; i--) {
      const pt = olySpParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olySpParticles.splice(i, 1);
    }

    for (let i = olySpPopups.length - 1; i >= 0; i--) {
      const pop = olySpPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olySpPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`파워 ${Math.floor(olySpPower)}% · 각도 ${Math.round(olySpAngleDeg)}°`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`최적 각도 40° (25°~55° 스윙)`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olySpBestCm > 0 ? `${(olySpBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (olySpFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`⚫ 투포환 기록 ${olySpThrowDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-shotput",
  title: "투포환",
  icon: "⚫",
  desc: "파워 충전 후 40° 최적 각도로 묵직한 포환을 밀어내라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 파워 충전 · 위쪽 터치(PC: ↑/Space)로 각도 조준 후 투척!",
  rankingTitle: "⚫ 투포환 TOP 5 (최장 거리)",
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
    if (olySpPhase === "aim") {
      launchOlyShotput();
      return;
    }
    if (y < 235) {
      enterOlyShotputAim();
    } else {
      pumpOlyShotputPower(x < canvas.width / 2 ? -1 : 1);
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
      if (!e.repeat) {
        if (olySpPhase === "charge") enterOlyShotputAim();
        else if (olySpPhase === "aim") launchOlyShotput();
      }
    } else if (olySpPhase === "charge" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) pumpOlyShotputPower(-1);
    } else if (olySpPhase === "charge" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) pumpOlyShotputPower(1);
    }
  }
});