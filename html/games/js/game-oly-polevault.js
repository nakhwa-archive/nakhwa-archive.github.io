/* ---------- 올림픽 12. 장대 높이뛰기 (Pole Vault) ---------- */
var olyPvRunning = false;
var olyPvOver = false;
var olyPvFinished = false;
var olyPvFailed = false;

var olyPvPhase = "run"; // "run" | "vault" | "done"
var olyPvBarHeightM = 3.20; // 현재 도전 높이 (m)
var olyPvClearedHeightM = 0; // 성공한 최고 높이 (m)

var olyPvRunPos = 0; // 도움닫기 진행도 (0 ~ 15)
var olyPvSpeed = 0; // 현재 도움닫기 속도 (0 ~ 2.0)
var olyPvLastSide = 0;
var olyPvLastStepFrame = 0;
var olyPvFrame = 0;

var olyPvX = 85;
var olyPvY = 294;
var olyPvVx = 0;
var olyPvVy = 0;
var olyPvBend = 0; // 장대 휘어짐 정도 (0 ~ 1)
var olyPvRecoilDone = false;
var olyPvPassedBar = false;
var olyPvVaultGainPx = 0;

var olyPvScoreCm = 0;
var olyPvLastScore = 0;
var olyPvBestCm = loadOlyPvBestCm();
var olyPvParticles = [];
var olyPvPopups = [];

var OLY_PV_START_X = 85;
var OLY_PV_BAR_BASE_X = 230;
var OLY_PV_GROUND_Y = 294;
var OLY_PV_BASE_BAR_Y = 236;
var OLY_PV_MAX_RUN_POS = 15;
var OLY_PV_PX_PER_RUN_POS = 12;
var OLY_PV_STEP_M = 0.15;
var OLY_PV_MAX_BAR_M = 6.20;

function loadOlyPvBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyPoleVaultBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyPvBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlyPoleVaultBestCm", String(cm));
  } catch (_) {}
}

function getOlyPvBarScreenY(heightM = olyPvBarHeightM) {
  const diff = Math.max(0, heightM - 3.20);
  return Math.max(116, OLY_PV_BASE_BAR_Y - diff * 42);
}

function getOlyPvGroundScrollPx() {
  return (
    olyPvRunPos * OLY_PV_PX_PER_RUN_POS +
    (olyPvPhase === "vault" || olyPvPhase === "done" ? olyPvVaultGainPx * 0.45 : 0)
  );
}

function getOlyPvBarScreenX(groundScrollPx = getOlyPvGroundScrollPx()) {
  const runShift = olyPvRunPos * OLY_PV_PX_PER_RUN_POS * 0.45;
  const vaultShift =
    olyPvPhase === "vault" || olyPvPhase === "done" ? olyPvVaultGainPx * 0.45 : 0;
  return OLY_PV_BAR_BASE_X - runShift - vaultShift;
}

function resetOlyPoleVault() {
  olyPvPhase = "run";
  olyPvBarHeightM = 3.20;
  olyPvClearedHeightM = 0;

  olyPvRunPos = 0;
  olyPvSpeed = 0;
  olyPvLastSide = 0;
  olyPvLastStepFrame = 0;
  olyPvFrame = 0;

  olyPvX = OLY_PV_START_X;
  olyPvY = OLY_PV_GROUND_Y;
  olyPvVx = 0;
  olyPvVy = 0;
  olyPvBend = 0;
  olyPvRecoilDone = false;
  olyPvPassedBar = false;
  olyPvVaultGainPx = 0;

  olyPvScoreCm = 0;
  olyPvLastScore = 0;
  olyPvFailed = false;
  olyPvParticles = [];
  olyPvPopups = [];

  olyPvOver = false;
  olyPvFinished = false;
  olyPvRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyPvPopup(x, y, text, color) {
  olyPvPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlyPvBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.2;
    olyPvParticles.push({
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

function prepareNextOlyPvAttempt() {
  const barX = getOlyPvBarScreenX();
  olyPvClearedHeightM = olyPvBarHeightM;
  addOlyPvPopup(barX, getOlyPvBarScreenY() - 22, `✨ ${olyPvBarHeightM.toFixed(2)}m CLEAR!`, "#72efdd");
  spawnOlyPvBurst(barX, getOlyPvBarScreenY(), "#72efdd", 14);

  if (olyPvBarHeightM >= OLY_PV_MAX_BAR_M) {
    finishOlyPoleVault(false);
    return;
  }

  olyPvBarHeightM = Number((olyPvBarHeightM + OLY_PV_STEP_M).toFixed(2));
  olyPvPhase = "run";
  olyPvRunPos = 0;
  olyPvSpeed = Math.max(0.5, olyPvSpeed * 0.55);
  olyPvLastSide = 0;
  olyPvX = OLY_PV_START_X;
  olyPvY = OLY_PV_GROUND_Y;
  olyPvVx = 0;
  olyPvVy = 0;
  olyPvBend = 0;
  olyPvRecoilDone = false;
  olyPvPassedBar = false;
  olyPvVaultGainPx = 0;
}

function finishOlyPoleVault(failed) {
  olyPvFailed = failed;
  olyPvPhase = "done";
  olyPvFinished = true;
  olyPvRunning = false;

  const finalM = Number(olyPvClearedHeightM.toFixed(2));
  olyPvScoreCm = Math.round(finalM * 100);
  olyPvLastScore = olyPvScoreCm;

  const isNewBest = olyPvScoreCm > 0 && olyPvScoreCm > olyPvBestCm;
  if (isNewBest) {
    olyPvBestCm = olyPvScoreCm;
    saveOlyPvBestCm(olyPvBestCm);
  }

  triggerGameOver(isNewBest, olyPvScoreCm > 0);
}

function stepOlyPoleVaultStride(side) {
  if (!olyPvRunning || olyPvOver || olyPvFinished || olyPvPhase !== "run") return;

  const gapFrames = olyPvFrame - olyPvLastStepFrame;
  const alternating = olyPvLastSide !== side;

  if (alternating) {
    const gain = gapFrames >= 5 && gapFrames <= 18 ? 0.28 : 0.19;
    olyPvSpeed = Math.min(2.0, olyPvSpeed + gain);
    olyPvRunPos = Math.min(OLY_PV_MAX_RUN_POS, olyPvRunPos + 0.65);
    spawnOlyPvBurst(olyPvX, OLY_PV_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyPvSpeed = Math.max(0.15, olyPvSpeed - 0.15);
    addOlyPvPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyPvLastSide = side;
  olyPvLastStepFrame = olyPvFrame;
}

function plantOlyPoleVault() {
  if (!olyPvRunning || olyPvOver || olyPvFinished || olyPvPhase !== "run") return;

  const barY = getOlyPvBarScreenY();
  const barX = getOlyPvBarScreenX();
  const neededLiftPx = Math.max(58, OLY_PV_GROUND_Y - barY + 28);
  const speedRatio = Math.max(0.25, Math.min(1, olyPvSpeed / 1.85));
  const distToBar = Math.max(0, barX - olyPvX);
  const plantTiming = distToBar <= 95 ? 1.12 : Math.max(0.62, 1 - Math.abs(distToBar - 70) / 180);

  olyPvBend = Math.min(1, 0.35 + speedRatio * 0.65);
  olyPvRecoilDone = false;
  olyPvPassedBar = false;
  olyPvVaultGainPx = 0;

  const liftScale = (0.55 + speedRatio * 0.68) * plantTiming;
  olyPvPhase = "vault";
  olyPvVy = -Math.sqrt(2 * 0.22 * neededLiftPx * liftScale);
  olyPvVx = 2.1 + speedRatio * 1.65;

  spawnOlyPvBurst(olyPvX, OLY_PV_GROUND_Y, "#ffd166", 10);
  if (speedRatio >= 0.72 && distToBar <= 85) {
    addOlyPvPopup(olyPvX, olyPvY - 38, "⚡ POLE SPRING!", "#ffd166");
  } else {
    addOlyPvPopup(olyPvX, olyPvY - 34, "🪄 POLE PLANT!", "#72efdd");
  }
}

function updateOlyPoleVault() {
  if (!olyPvRunning || olyPvOver || olyPvFinished) return;
  olyPvFrame++;

  const barY = getOlyPvBarScreenY();
  const barX = getOlyPvBarScreenX();

  if (olyPvPhase === "run") {
    const floorSpeed = olyPvRunPos > 0.3 ? 0.16 : 0;
    olyPvSpeed = Math.max(floorSpeed, olyPvSpeed * 0.972);
    olyPvRunPos += olyPvSpeed * 0.2;

    const maxRunX = Math.max(OLY_PV_START_X + 40, barX - 18);
    const travelSpan = maxRunX - OLY_PV_START_X;
    const progress = Math.max(0, Math.min(1, olyPvRunPos / OLY_PV_MAX_RUN_POS));
    olyPvX = OLY_PV_START_X + travelSpan * progress;

    if (olyPvRunPos >= OLY_PV_MAX_RUN_POS) {
      addOlyPvPopup(olyPvX, olyPvY - 34, "❌ NO PLANT!", "#ff4d6d");
      spawnOlyPvBurst(olyPvX, OLY_PV_GROUND_Y, "#ff4d6d", 12);
      finishOlyPoleVault(true);
    }
  } else if (olyPvPhase === "vault") {
    olyPvVaultGainPx += olyPvVx;
    olyPvX = Math.min(275, olyPvX + olyPvVx * 0.55);
    olyPvY += olyPvVy;
    olyPvVy += 0.22;

    if (!olyPvRecoilDone && olyPvVy >= -1.2) {
      olyPvRecoilDone = true;
      olyPvBend = 0.08;
      olyPvVy -= 1.35 * olyPvBend + 0.85;
      spawnOlyPvBurst(olyPvX, olyPvY - 12, "#72efdd", 8);
      addOlyPvPopup(olyPvX, olyPvY - 36, "🌀 SNAP UP!", "#72efdd");
    } else if (olyPvVy < -1.2) {
      olyPvBend = Math.max(0.2, olyPvBend * 0.96);
    } else {
      olyPvBend = Math.max(0, olyPvBend * 0.85);
    }

    if (!olyPvPassedBar && olyPvX >= barX) {
      olyPvPassedBar = true;
      const bodyBottomY = olyPvY + 2;
      if (bodyBottomY <= barY - 2) {
        addOlyPvPopup(barX, barY - 18, "🔥 CLEAN CLEAR!", "#ffd166");
      } else {
        addOlyPvPopup(barX, barY - 18, "💥 BAR KNOCKED!", "#ff4d6d");
        spawnOlyPvBurst(barX, barY, "#ff4d6d", 14);
        finishOlyPoleVault(true);
        return;
      }
    }

    if (olyPvY >= OLY_PV_GROUND_Y) {
      olyPvY = OLY_PV_GROUND_Y;
      olyPvVy = 0;
      olyPvBend = 0;

      if (olyPvPassedBar) {
        prepareNextOlyPvAttempt();
      } else {
        addOlyPvPopup(olyPvX, olyPvY - 30, "❌ TOO LOW!", "#ff4d6d");
        finishOlyPoleVault(true);
      }
    }
  }
}

function drawOlyPoleVaultFrame() {
  try {
    ctx.save();
    updateOlyPoleVault();

    // 배경 & 매트 존
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 단일 지면 스크롤 기준으로 트랙·매트 경계·바닥 패턴·바 위치를 함께 왼쪽으로 당김
    const groundScrollPx = getOlyPvGroundScrollPx();
    const barX = getOlyPvBarScreenX(groundScrollPx);
    const matStartX = Math.max(0, Math.min(canvas.width, barX + 12));

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, matStartX, 210);

    ctx.fillStyle = "#254e70";
    ctx.fillRect(matStartX, 130, canvas.width - matStartX, 210);

    const scroll = groundScrollPx % 48;
    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    for (let x = -scroll; x < canvas.width + 48; x += 48) {
      ctx.fillRect(x, 142, 18, 2);
      ctx.fillRect(x + 12, 324, 18, 2);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_PV_GROUND_Y + 4, canvas.width, 2);

    // 장대높이뛰기 지주 & 가로 바 (지면 스크롤에 맞춰 함께 이동)
    const barY = getOlyPvBarScreenY();
    if (barX >= -30 && barX <= canvas.width + 30) {
      ctx.strokeStyle = "#8c93a8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(barX, barY - 24);
      ctx.lineTo(barX, OLY_PV_GROUND_Y + 4);
      ctx.stroke();

      ctx.fillStyle = "#ffd166";
      ctx.fillRect(barX - 18, barY - 3, 36, 6);

      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`BAR ${olyPvBarHeightM.toFixed(2)}m`, barX, barY - 10);
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
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 장대 꽂기 & 도약", canvas.width * 0.5, 392);

    // 선수 캐릭터
    const bob = olyPvPhase === "run" ? Math.sin(olyPvFrame * 0.45) * (olyPvSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyPvY + bob;
    const legSwing = olyPvPhase === "vault" ? 9 : Math.sin(olyPvFrame * 0.55) * (olyPvSpeed > 0.2 ? 10 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyPvX, OLY_PV_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 장대 렌더링 (도약 중 휘어짐 곡선 표현)
    ctx.strokeStyle = "#72efdd";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (olyPvPhase === "run") {
      ctx.moveTo(olyPvX - 18, drawY - 12);
      ctx.lineTo(olyPvX + 26, drawY - 26);
    } else {
      const tipX = olyPvX + 18;
      const tipY = OLY_PV_GROUND_Y + 2;
      const midX = olyPvX + 6;
      const midY = (drawY - 22 + tipY) * 0.5 - olyPvBend * 22;
      ctx.moveTo(olyPvX + 4, drawY - 22);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    }
    ctx.stroke();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyPvX, drawY - 14);
    ctx.lineTo(olyPvX + legSwing, drawY + 2);
    ctx.moveTo(olyPvX, drawY - 14);
    ctx.lineTo(olyPvX - legSwing, drawY + 2);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyPvX, drawY - 22, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olyPvX + 2, drawY - 36, 8, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olyPvParticles.length - 1; i >= 0; i--) {
      const pt = olyPvParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyPvParticles.splice(i, 1);
    }

    for (let i = olyPvPopups.length - 1; i >= 0; i--) {
      const pop = olyPvPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyPvPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const speedPct = Math.round(Math.max(0, Math.min(100, (olyPvSpeed / 2.0) * 100)));
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도전 ${olyPvBarHeightM.toFixed(2)}m · 가속 ${speedPct}%`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      olyPvClearedHeightM > 0 ? `성공 기록 ${olyPvClearedHeightM.toFixed(2)}m` : "아직 통과 기록 없음",
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyPvBestCm > 0 ? `${(olyPvBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyPvFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olyPvScoreCm > 0 ? "#f4f4f6" : "#ff4d6d";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olyPvScoreCm > 0
          ? `🪄 장대높이뛰기 ${(olyPvScoreCm / 100).toFixed(2)}m`
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
  id: "oly-polevault",
  title: "장대 높이뛰기",
  icon: "🪄",
  desc: "장대를 휘게 꽂고 튕겨 올라 점점 높아지는 바를 넘어라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 바 앞에서 상단 터치(PC: ↑/W/Space)로 장대 꽂고 도약!",
  rankingTitle: "🪄 장대 높이뛰기 TOP 5 (최고 높이)",
  dbNode: "oly_polevault_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyPvBestCm > 0 ? `BEST ${(olyPvBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyPvLastScore,
  reset: resetOlyPoleVault,
  draw: drawOlyPoleVaultFrame,
  stop: () => {
    olyPvRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyPvFinished || olyPvOver || !olyPvRunning) {
      if (!canRestartNow()) return;
      resetOlyPoleVault();
      return;
    }
    if (y < 190) {
      plantOlyPoleVault();
    } else {
      stepOlyPoleVaultStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyPvFinished || olyPvOver || !olyPvRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyPoleVault();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) plantOlyPoleVault();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyPoleVaultStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyPoleVaultStride(1);
    }
  }
});