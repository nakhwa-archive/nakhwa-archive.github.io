/* ---------- 올림픽 12. 장대 높이뛰기 (Pole Vault) 상태 ---------- */
var olyPvRunning = false;
var olyPvOver = false;
var olyPvFinished = false;

var olyPvPhase = "run"; // "run" | "vault" | "done"
var olyPvDist = 0; // 도움닫기 거리 (0 ~ 18m)
var olyPvSpeed = 0;
var olyPvLastSide = 0;
var olyPvLastStepFrame = 0;
var olyPvFrame = 0;

var olyPvX = 75;
var olyPvY = 294;
var olyPvVx = 0;
var olyPvVy = 0;
var olyPvPeakY = 294;
var olyPvPoleBend = 0; // 장대 휨 정도
var olyPvHeightM = 0;

var olyPvScoreCm = 0; // 예: 625 => 6.25m
var olyPvLastScore = 0;
var olyPvBestCm = Number(localStorage.getItem("nakhwaOlyPoleVaultBestCm") || 0);
var olyPvParticles = [];
var olyPvPopups = [];

var OLY_PV_BOX_DIST = 15.2;
var OLY_PV_GROUND_Y = 294;

function resetOlyPoleVault() {
  olyPvPhase = "run";
  olyPvDist = 0;
  olyPvSpeed = 0;
  olyPvLastSide = 0;
  olyPvLastStepFrame = 0;
  olyPvFrame = 0;
  olyPvX = 75;
  olyPvY = OLY_PV_GROUND_Y;
  olyPvVx = 0;
  olyPvVy = 0;
  olyPvPeakY = OLY_PV_GROUND_Y;
  olyPvPoleBend = 0;
  olyPvHeightM = 0;
  olyPvScoreCm = 0;
  olyPvLastScore = 0;
  olyPvParticles = [];
  olyPvPopups = [];
  olyPvOver = false;
  olyPvFinished = false;
  olyPvRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyPvPopup(x, y, text, color) {
  olyPvPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyPvBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    olyPvParticles.push({
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

function stepOlyPoleVaultStride(side) {
  if (!olyPvRunning || olyPvOver || olyPvFinished || olyPvPhase !== "run") return;

  const diffFrames = olyPvFrame - olyPvLastStepFrame;
  const isAlternating = olyPvLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    olyPvSpeed = Math.min(1.85, olyPvSpeed + bonus);
    spawnOlyPvBurst(olyPvX, OLY_PV_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyPvSpeed = Math.max(0.12, olyPvSpeed - 0.12);
    addOlyPvPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyPvLastSide = side;
  olyPvLastStepFrame = olyPvFrame;
}

function plantOlyPoleVault() {
  if (!olyPvRunning || olyPvOver || olyPvFinished || olyPvPhase !== "run") return;

  const distDiff = Math.abs(olyPvDist - OLY_PV_BOX_DIST);
  const timingFactor = Math.max(0.45, 1 - distDiff / 7.5);
  const speedFactor = Math.max(0.35, Math.min(1.25, olyPvSpeed * 0.88));
  const vaultPower = speedFactor * timingFactor;

  olyPvPhase = "vault";
  olyPvVy = -(6.4 + vaultPower * 5.6);
  olyPvVx = 2.6 + speedFactor * 2.4;
  olyPvPoleBend = 18 * vaultPower;
  olyPvPeakY = olyPvY;

  spawnOlyPvBurst(olyPvX + 12, OLY_PV_GROUND_Y, "#ffd166", 12);

  if (distDiff <= 1.2 && olyPvSpeed >= 0.9) {
    addOlyPvPopup(olyPvX, olyPvY - 34, "⚡ POLE LAUNCH!", "#ffd166");
  }
}

function finishOlyPoleVault() {
  olyPvPhase = "done";
  olyPvFinished = true;
  olyPvRunning = false;

  // 장대 높이뛰기 기록 산출 (3.80m ~ 6.35m 범위)
  const reachPx = Math.max(0, OLY_PV_GROUND_Y - olyPvPeakY);
  const rawMeters = Math.max(3.60, Math.min(6.40, 3.80 + reachPx * 0.0155));
  const finalMeters = Number(rawMeters.toFixed(2));

  olyPvHeightM = finalMeters;
  olyPvScoreCm = Math.round(finalMeters * 100);
  olyPvLastScore = olyPvScoreCm;

  spawnOlyPvBurst(olyPvX, OLY_PV_GROUND_Y, "#72efdd", 14);

  const isNewBest = olyPvScoreCm > olyPvBestCm;
  if (isNewBest) {
    olyPvBestCm = olyPvScoreCm;
    localStorage.setItem("nakhwaOlyPoleVaultBestCm", String(olyPvBestCm));
  }

  triggerGameOver(isNewBest, olyPvScoreCm > 0);
}

function drawOlyPoleVaultFrame() {
  try {
    ctx.save();

    if (olyPvRunning && !olyPvOver && !olyPvFinished) {
      olyPvFrame++;

      if (olyPvPhase === "run") {
        const minRunSpeed = olyPvDist > 0.5 ? 0.14 : 0;
        olyPvSpeed = Math.max(minRunSpeed, olyPvSpeed * 0.968);
        olyPvDist += olyPvSpeed * 0.24;
        olyPvX = Math.min(165, 75 + (olyPvDist / OLY_PV_BOX_DIST) * 90);

        if (olyPvDist >= 17.5) {
          plantOlyPoleVault();
        }
      } else if (olyPvPhase === "vault") {
        olyPvX = Math.min(canvas.width - 36, olyPvX + olyPvVx);
        olyPvY += olyPvVy;
        olyPvVy += 0.21;
        olyPvPoleBend = Math.max(0, olyPvPoleBend * 0.92);

        if (olyPvY < olyPvPeakY) {
          olyPvPeakY = olyPvY;
        }

        if (olyPvY >= OLY_PV_GROUND_Y) {
          olyPvY = OLY_PV_GROUND_Y;
          finishOlyPoleVault();
        }
      }
    }

    // 배경 & 경기장
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, 195, 210);

    ctx.fillStyle = "#28598a";
    ctx.fillRect(195, 130, canvas.width - 195, 210);

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_PV_GROUND_Y + 4, canvas.width, 2);

    // 지주 & 바
    ctx.fillStyle = "#cfd6e4";
    ctx.fillRect(215, 140, 6, OLY_PV_GROUND_Y - 136);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(202, 178, 32, 5);

    // 하단 가이드 존
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
    ctx.fillText("◀ 좌 가속 (←/A) · 위 장대도약(↑/Space)", canvas.width * 0.25, 376);
    ctx.fillText("우 가속 (→/D) · 위 장대도약(↑/Space) ▶", canvas.width * 0.75, 376);

    // 장대 렌더링
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(olyPvX + 8, olyPvY - 18);
    ctx.quadraticCurveTo(
      olyPvX + 24 + olyPvPoleBend,
      olyPvY + 12,
      olyPvX + 36,
      OLY_PV_GROUND_Y + 2
    );
    ctx.stroke();

    // 선수 캐릭터 렌더링
    const bob = olyPvPhase === "run" ? Math.sin(olyPvFrame * 0.45) * (olyPvSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyPvY + bob;
    const legSwing = olyPvPhase === "vault" ? 7 : Math.sin(olyPvFrame * 0.55) * (olyPvSpeed > 0.2 ? 9 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyPvX, OLY_PV_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

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
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyPvParticles.splice(i, 1);
    }

    for (let i = olyPvPopups.length - 1; i >= 0; i--) {
      const pop = olyPvPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyPvPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveReach = Math.max(0, OLY_PV_GROUND_Y - olyPvPeakY);
    const liveMeters = (3.80 + liveReach * 0.0155).toFixed(2);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyPvDist.toFixed(1)}m · 높이 ${liveMeters}m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`속도 ${olyPvSpeed.toFixed(2)} (도약존 15m 부근)`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyPvBestCm > 0 ? `${(olyPvBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (olyPvFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🥢 장대 높이뛰기 ${olyPvHeightM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-polevault",
  title: "장대 높이뛰기",
  icon: "🥢",
  desc: "질주 가속과 장대 꽂기 타이밍으로 최고 높이에 도달하라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 15m 도약존 부근에서 위쪽 터치(PC: ↑/Space)로 도약!",
  rankingTitle: "🥢 장대 높이뛰기 TOP 5 (최고 높이)",
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
    if (y < 235) {
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