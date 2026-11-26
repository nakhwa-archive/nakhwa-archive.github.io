/* ---------- 올림픽 11. 역도 (Weightlifting) 상태 ---------- */
var olyWlRunning = false;
var olyWlOver = false;
var olyWlFinished = false;

var olyWlPhase = "lift"; // "lift" | "hold" | "done"
var olyWlPower = 0; // 0 ~ 100 리프트 게이지
var olyWlLastSide = 0;
var olyWlLastStepFrame = 0;
var olyWlFrame = 0;

var olyWlBalanceX = 40; // 40 ~ 280 사이 왕복
var olyWlBalanceDir = 1;
var olyWlBarY = 260; // 바벨 높이 (작을수록 머리 위로 올라감)
var olyWlLiftedKg = 0;

var olyWlScore = 0; // 최종 들기 중량 (kg)
var olyWlBest = Number(localStorage.getItem("nakhwaOlyWeightBest") || 0);
var olyWlParticles = [];
var olyWlPopups = [];

var OLY_WL_CENTER_X = 160;
var OLY_WL_LIFTER_X = 160;

function resetOlyWeight() {
  olyWlPhase = "lift";
  olyWlPower = 0;
  olyWlLastSide = 0;
  olyWlLastStepFrame = 0;
  olyWlFrame = 0;
  olyWlBalanceX = 40;
  olyWlBalanceDir = 1;
  olyWlBarY = 262;
  olyWlLiftedKg = 0;
  olyWlScore = 0;
  olyWlParticles = [];
  olyWlPopups = [];
  olyWlOver = false;
  olyWlFinished = false;
  olyWlRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyWlPopup(x, y, text, color) {
  olyWlPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyWlBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.6;
    olyWlParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2.2 + Math.random() * 2.2,
      color,
      life: 20
    });
  }
}

function pumpOlyWeightLift(side) {
  if (!olyWlRunning || olyWlOver || olyWlFinished || olyWlPhase !== "lift") return;

  const diffFrames = olyWlFrame - olyWlLastStepFrame;
  const isAlternating = olyWlLastSide !== side;

  if (isAlternating) {
    const gain = diffFrames >= 5 && diffFrames <= 18 ? 11.5 : 8;
    olyWlPower = Math.min(100, olyWlPower + gain);
    spawnOlyWlBurst(OLY_WL_LIFTER_X, olyWlBarY, "#ff8ca5", 4);
  } else {
    olyWlPower = Math.max(0, olyWlPower - 6);
    addOlyWlPopup(canvas.width * 0.5, 168, "좌/우 교대!", "#9898a6");
  }

  olyWlLastSide = side;
  olyWlLastStepFrame = olyWlFrame;
}

function enterOlyWeightHold() {
  if (!olyWlRunning || olyWlOver || olyWlFinished || olyWlPhase !== "lift") return;
  olyWlPhase = "hold";
  olyWlBalanceX = 40;
  olyWlBalanceDir = 1;
  addOlyWlPopup(OLY_WL_LIFTER_X, 164, "⚖️ 중앙 타이밍에 고정!", "#ffd166");
}

function lockOlyWeightLift() {
  if (!olyWlRunning || olyWlOver || olyWlFinished) return;

  if (olyWlPhase === "lift") {
    enterOlyWeightHold();
    return;
  }

  if (olyWlPhase !== "hold") return;

  const diff = Math.abs(olyWlBalanceX - OLY_WL_CENTER_X);
  const balanceFactor = Math.max(0.45, 1 - diff / 130);
  const powerFactor = Math.max(0.25, olyWlPower / 100);

  // 역도 기록 산출 (60kg ~ 250kg 범위)
  const rawKg = 60 + powerFactor * 125 + balanceFactor * 65;
  const finalKg = Math.round(rawKg);

  olyWlLiftedKg = finalKg;
  olyWlScore = finalKg;
  olyWlPhase = "done";
  olyWlFinished = true;
  olyWlRunning = false;

  spawnOlyWlBurst(OLY_WL_LIFTER_X, olyWlBarY, diff <= 14 ? "#ffd166" : "#72efdd", 14);

  const isNewBest = olyWlScore > olyWlBest;
  if (isNewBest) {
    olyWlBest = olyWlScore;
    localStorage.setItem("nakhwaOlyWeightBest", String(olyWlBest));
  }

  triggerGameOver(isNewBest, olyWlScore > 0);
}

function drawOlyWeightFrame() {
  try {
    ctx.save();

    if (olyWlRunning && !olyWlOver && !olyWlFinished) {
      olyWlFrame++;

      if (olyWlPhase === "lift") {
        olyWlPower = Math.max(0, olyWlPower - 0.22);
        olyWlBarY = 262 - (olyWlPower / 100) * 78;
      } else if (olyWlPhase === "hold") {
        olyWlBarY = 184 + Math.sin(olyWlFrame * 0.28) * 4;
        olyWlBalanceX += olyWlBalanceDir * 3.8;
        if (olyWlBalanceX >= 280) {
          olyWlBalanceX = 280;
          olyWlBalanceDir = -1;
        } else if (olyWlBalanceX <= 40) {
          olyWlBalanceX = 40;
          olyWlBalanceDir = 1;
        }
      }
    }

    // 배경 & 역도 플랫폼
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 120);

    // 플랫폼 바닥
    ctx.fillStyle = "#2b2523";
    ctx.fillRect(28, 286, canvas.width - 56, 26);

    // 역도 선수 렌더링
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(OLY_WL_LIFTER_X, 258, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(OLY_WL_LIFTER_X, 238, 8, 0, Math.PI * 2);
    ctx.fill();

    // 팔과 바벨
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(OLY_WL_LIFTER_X - 10, 252);
    ctx.lineTo(OLY_WL_LIFTER_X - 28, olyWlBarY);
    ctx.moveTo(OLY_WL_LIFTER_X + 10, 252);
    ctx.lineTo(OLY_WL_LIFTER_X + 28, olyWlBarY);
    ctx.stroke();

    // 바벨 샤프트 & 원판
    ctx.strokeStyle = "#cfd6e4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(OLY_WL_LIFTER_X - 68, olyWlBarY);
    ctx.lineTo(OLY_WL_LIFTER_X + 68, olyWlBarY);
    ctx.stroke();

    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(OLY_WL_LIFTER_X - 64, olyWlBarY - 14, 10, 28);
    ctx.fillRect(OLY_WL_LIFTER_X + 54, olyWlBarY - 14, 10, 28);

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_WL_LIFTER_X - 50, olyWlBarY - 10, 8, 20);
    ctx.fillRect(OLY_WL_LIFTER_X + 42, olyWlBarY - 10, 8, 20);

    // 밸런스 타이밍 바(y = 326)
    const trackX = 40;
    const trackW = 240;
    const trackY = 326;

    ctx.fillStyle = "#2b3042";
    ctx.fillRect(trackX, trackY, trackW, 12);

    ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
    ctx.fillRect(OLY_WL_CENTER_X - 14, trackY - 2, 28, 16);

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_WL_CENTER_X - 2, trackY - 4, 4, 20);

    ctx.fillStyle = "#72efdd";
    ctx.fillRect(olyWlBalanceX - 4, trackY - 5, 8, 22);

    // 하단 가이드
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 352, canvas.width, canvas.height - 352);
    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    if (olyWlPhase === "hold") {
      ctx.fillStyle = "#ffd166";
      ctx.fillText("⚖️ 마커가 중앙 노란 선에 올 때 터치(PC: Space/↑)!", canvas.width / 2, 376);
    } else {
      ctx.fillText("◀ 좌 힘모으기 (←/A) · 위 밸런스고정(↑/Space) · 우 ▶", canvas.width / 2, 376);
    }

    // 파티클 & 팝업
    for (let i = olyWlParticles.length - 1; i >= 0; i--) {
      const pt = olyWlParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyWlParticles.splice(i, 1);
    }

    for (let i = olyWlPopups.length - 1; i >= 0; i--) {
      const pop = olyWlPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyWlPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const estKg = Math.round(60 + (olyWlPower / 100) * 125);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`파워 ${Math.floor(olyWlPower)}% · 예상 ~${estKg}kg`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(olyWlPhase === "hold" ? "중앙 밸런스를 맞춰 고정!" : "좌/우 교대로 힘을 모으자!", 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BEST ${olyWlBest}kg`, canvas.width - 12, 24);

    // 종료 오버레이
    if (olyWlFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏋️ 역도 성공 · ${olyWlLiftedKg}kg`, canvas.width / 2, 182);

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
  id: "oly-weight",
  title: "역도",
  icon: "🏋️",
  desc: "파워 충전 후 중앙 밸런스를 맞춰 최고 중량에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "kg",
  hint: "좌/우 번갈아 파워 충전 · 위쪽 터치(PC: ↑/Space)로 밸런스 고정!",
  rankingTitle: "🏋️ 역도 TOP 5 (최고 중량)",
  dbNode: "oly_weight_scores",
  getBadge: () => `BEST ${olyWlBest}kg`,
  getScore: () => olyWlScore,
  reset: resetOlyWeight,
  draw: drawOlyWeightFrame,
  stop: () => {
    olyWlRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyWlFinished || olyWlOver || !olyWlRunning) {
      if (!canRestartNow()) return;
      resetOlyWeight();
      return;
    }
    if (olyWlPhase === "hold") {
      lockOlyWeightLift();
      return;
    }
    if (y < 235) {
      enterOlyWeightHold();
    } else {
      pumpOlyWeightLift(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyWlFinished || olyWlOver || !olyWlRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyWeight();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) {
        if (olyWlPhase === "lift") enterOlyWeightHold();
        else if (olyWlPhase === "hold") lockOlyWeightLift();
      }
    } else if (olyWlPhase === "lift" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) pumpOlyWeightLift(-1);
    } else if (olyWlPhase === "lift" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) pumpOlyWeightLift(1);
    }
  }
});