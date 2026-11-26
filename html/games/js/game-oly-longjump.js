/* ---------- 올림픽 3. 멀리뛰기 (Long Jump) 상태 ---------- */
var olyLjRunning = false;
var olyLjOver = false;
var olyLjFinished = false;

var olyLjPhase = "run"; // "run" | "jump" | "done"
var olyLjDist = 0; // 도움닫기 거리 (0 ~ 18m)
var olyLjSpeed = 0;
var olyLjLastSide = 0;
var olyLjLastStepFrame = 0;
var olyLjFrame = 0;

var olyLjX = 75;
var olyLjY = 294;
var olyLjVx = 0;
var olyLjVy = 0;
var olyLjAirGainPx = 0;
var olyLjJumpDistM = 0;

var olyLjScoreCm = 0; // 예: 845 => 8.45m
var olyLjLastScore = 0;
var olyLjBestCm = Number(localStorage.getItem("nakhwaOlyLongJumpBestCm") || 0);
var olyLjParticles = [];
var olyLjPopups = [];

var OLY_LJ_FOUL_DIST = 15.8;
var OLY_LJ_GROUND_Y = 294;

function resetOlyLongJump() {
  olyLjPhase = "run";
  olyLjDist = 0;
  olyLjSpeed = 0;
  olyLjLastSide = 0;
  olyLjLastStepFrame = 0;
  olyLjFrame = 0;
  olyLjX = 75;
  olyLjY = OLY_LJ_GROUND_Y;
  olyLjVx = 0;
  olyLjVy = 0;
  olyLjAirGainPx = 0;
  olyLjJumpDistM = 0;
  olyLjScoreCm = 0;
  olyLjLastScore = 0;
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
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    olyLjParticles.push({
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

function stepOlyLongJumpStride(side) {
  if (!olyLjRunning || olyLjOver || olyLjFinished || olyLjPhase !== "run") return;

  const diffFrames = olyLjFrame - olyLjLastStepFrame;
  const isAlternating = olyLjLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    olyLjSpeed = Math.min(1.85, olyLjSpeed + bonus);
    spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyLjSpeed = Math.max(0.12, olyLjSpeed - 0.12);
    addOlyLjPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyLjLastSide = side;
  olyLjLastStepFrame = olyLjFrame;
}

function takeoffOlyLongJump() {
  if (!olyLjRunning || olyLjOver || olyLjFinished || olyLjPhase !== "run") return;

  const distDiff = Math.abs(olyLjDist - OLY_LJ_FOUL_DIST);
  const timingFactor = Math.max(0.45, 1 - distDiff / 7.5);
  const speedFactor = Math.max(0.35, Math.min(1.25, olyLjSpeed * 0.88));
  const jumpPower = speedFactor * timingFactor;

  olyLjPhase = "jump";
  olyLjVy = -(6.2 + jumpPower * 5.2);
  olyLjVx = 2.6 + jumpPower * 2.5;
  olyLjAirGainPx = 0;

  spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, "#ffd166", 10);

  if (distDiff <= 1.1 && olyLjSpeed >= 0.9) {
    addOlyLjPopup(olyLjX, olyLjY - 34, "🔥 PERFECT TAKEOFF!", "#ffd166");
  }
}

function landOlyLongJump() {
  olyLjPhase = "done";
  olyLjFinished = true;
  olyLjRunning = false;

  // 멀리뛰기 기록 산출 (4.20m ~ 8.95m 범위)
  const rawMeters = Math.max(3.80, Math.min(9.05, 4.20 + olyLjAirGainPx * 0.022));
  const finalMeters = Number(rawMeters.toFixed(2));
  olyLjJumpDistM = finalMeters;
  olyLjScoreCm = Math.round(finalMeters * 100);
  olyLjLastScore = olyLjScoreCm;

  spawnOlyLjBurst(olyLjX, OLY_LJ_GROUND_Y, "#e6c68b", 14);

  const isNewBest = olyLjScoreCm > olyLjBestCm;
  if (isNewBest) {
    olyLjBestCm = olyLjScoreCm;
    localStorage.setItem("nakhwaOlyLongJumpBestCm", String(olyLjBestCm));
  }

  triggerGameOver(isNewBest, olyLjScoreCm > 0);
}

function drawOlyLongJumpFrame() {
  try {
    ctx.save();

    if (olyLjRunning && !olyLjOver && !olyLjFinished) {
      olyLjFrame++;

      if (olyLjPhase === "run") {
        const minRunSpeed = olyLjDist > 0.5 ? 0.14 : 0;
        olyLjSpeed = Math.max(minRunSpeed, olyLjSpeed * 0.968);
        olyLjDist += olyLjSpeed * 0.24;

        // 화면 오른쪽으로 넘어가도 거리가 계속 누적되도록 카메라/위치 보정
        const targetX = 75 + (olyLjDist / OLY_LJ_FOUL_DIST) * 145;
        olyLjX = Math.min(235, targetX);

        if (olyLjDist >= 17.8) {
          takeoffOlyLongJump();
        }
      } else if (olyLjPhase === "jump") {
        // 화면 끝(255px)을 넘어도 공중 비행 거리는 계속 진행
        const stepPx = olyLjVx;
        olyLjAirGainPx += stepPx;
        olyLjX = Math.min(255, olyLjX + stepPx * 0.65);
        olyLjY += olyLjVy;
        olyLjVy += 0.22;

        if (olyLjY >= OLY_LJ_GROUND_Y) {
          olyLjY = OLY_LJ_GROUND_Y;
          landOlyLongJump();
        }
      }
    }

    // 배경 & 트랙 + 모래사장
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, 195, 210);

    ctx.fillStyle = "#d9b372";
    ctx.fillRect(195, 130, canvas.width - 195, 210);

    // 트랙 & 모래 스크롤 라인
    const scrollOffset = olyLjPhase === "jump"
      ? (olyLjAirGainPx * 0.6) % 48
      : (olyLjDist * 14) % 48;

    ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
    for (let x = -scrollOffset; x < canvas.width + 48; x += 48) {
      ctx.fillRect(x, 142, 18, 2);
      ctx.fillRect(x + 12, 324, 18, 2);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_LJ_GROUND_Y + 4, canvas.width, 2);

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
    ctx.fillText("◀ 좌 가속 (←/A)", canvas.width * 0.25, 376);
    ctx.fillText("우 가속 (→/D) ▶", canvas.width * 0.75, 376);

    // 선수 캐릭터 렌더링
    const bob = olyLjPhase === "run" ? Math.sin(olyLjFrame * 0.45) * (olyLjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyLjY + bob;
    const legSwing = olyLjPhase === "jump" ? 9 : Math.sin(olyLjFrame * 0.55) * (olyLjSpeed > 0.2 ? 10 : 1);

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

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveMeters = olyLjPhase === "jump" || olyLjPhase === "done"
      ? (4.20 + olyLjAirGainPx * 0.022).toFixed(2)
      : "--.--";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyLjDist.toFixed(1)}m · 기록 ${liveMeters}m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`속도 ${olyLjSpeed.toFixed(2)} (발구름선 ~15.8m)`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyLjBestCm > 0 ? `${(olyLjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (olyLjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏃 멀리뛰기 ${olyLjJumpDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-longjump",
  title: "멀리뛰기",
  icon: "🏃",
  desc: "질주 가속과 발구름 타이밍으로 모래밭 최장 기록에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 발구름선(15.8m) 부근에서 위쪽 터치(PC: ↑/W/Space)로 도약!",
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
    if (y < 235) {
      takeoffOlyLongJump();
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
      if (!e.repeat) takeoffOlyLongJump();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyLongJumpStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyLongJumpStride(1);
    }
  }
});
