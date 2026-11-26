/* ---------- 올림픽 3. 멀리뛰기 (Long Jump) 상태 ---------- */
var olyLjRunning = false;
var olyLjOver = false;
var olyLjFinished = false;
var olyLjFoul = false;

var olyLjPhase = "run"; // "run" | "air" | "done"
var olyLjDist = 0; // 도움닫기 거리 (0 ~ 20m 파울라인)
var olyLjSpeed = 0;
var olyLjLastSide = 0;
var olyLjLastStepFrame = 0;
var olyLjFrame = 0;

var olyLjX = 65;
var olyLjY = 266;
var olyLjVx = 0;
var olyLjVy = 0;
var olyLjJumpDistM = 0;

var olyLjScoreCm = 0; // 예: 785 => 7.85m
var olyLjLastScore = 0;
var olyLjBestCm = Number(localStorage.getItem("nakhwaOlyLongJumpBestCm") || 0);
var olyLjParticles = [];
var olyLjPopups = [];

var OLY_LJ_FOUL_DIST = 20.0;
var OLY_LJ_GROUND_Y = 266;

function resetOlyLongJump() {
  olyLjPhase = "run";
  olyLjDist = 0;
  olyLjSpeed = 0;
  olyLjLastSide = 0;
  olyLjLastStepFrame = 0;
  olyLjFrame = 0;
  olyLjX = 65;
  olyLjY = OLY_LJ_GROUND_Y;
  olyLjVx = 0;
  olyLjVy = 0;
  olyLjJumpDistM = 0;
  olyLjScoreCm = 0;
  olyLjLastScore = 0;
  olyLjParticles = [];
  olyLjPopups = [];
  olyLjFoul = false;
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
    const sp = 1.2 + Math.random() * 2.6;
    olyLjParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2 + Math.random() * 2.2,
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
    spawnOlyLjBurst(olyLjX, 294, "#ff8ca5", 4);
  } else {
    olyLjSpeed = Math.max(0.12, olyLjSpeed - 0.12);
    addOlyLjPopup(canvas.width * 0.5, 196, "좌/우 교대!", "#9898a6");
  }

  olyLjLastSide = side;
  olyLjLastStepFrame = olyLjFrame;
}

function takeoffOlyLongJump() {
  if (!olyLjRunning || olyLjOver || olyLjFinished || olyLjPhase !== "run") return;

  // 파울선(20.0m) 초과 시 파울 처리
  if (olyLjDist > OLY_LJ_FOUL_DIST) {
    olyLjFoul = true;
    olyLjFinished = true;
    olyLjRunning = false;
    olyLjScoreCm = 0;
    olyLjLastScore = 0;
    addOlyLjPopup(canvas.width * 0.5, 185, "❌ FOUL (파울선 초과)!", "#ff4d6d");
    triggerGameOver(false, false);
    return;
  }

  // 파울선 직전(18.2m ~ 20.0m) 도약 시 타이밍 보너스
  const timingRatio = Math.max(0.45, Math.min(1.15, (olyLjDist - 12) / 8));
  const power = Math.max(0.35, olyLjSpeed) * timingRatio;

  olyLjPhase = "air";
  olyLjVy = -(5.4 + power * 3.1);
  olyLjVx = 2.6 + power * 3.8;
  spawnOlyLjBurst(olyLjX, 292, "#ffd166", 10);

  if (olyLjDist >= 18.4 && olyLjDist <= OLY_LJ_FOUL_DIST) {
    addOlyLjPopup(olyLjX, olyLjY - 26, "🔥 PERFECT TAKEOFF!", "#ffd166");
  }
}

function landOlyLongJump() {
  olyLjPhase = "done";
  olyLjFinished = true;
  olyLjRunning = false;

  // 비행 거리 계산 (2.40m ~ 9.20m 범위)
  const rawMeters = Math.max(1.8, Math.min(9.5, 2.2 + (olyLjX - 190) * 0.042));
  const finalMeters = Number(rawMeters.toFixed(2));
  olyLjJumpDistM = finalMeters;
  olyLjScoreCm = Math.round(finalMeters * 100);
  olyLjLastScore = olyLjScoreCm;

  spawnOlyLjBurst(olyLjX, 294, "#ffd166", 14);

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

        // 화면상 주자 X 위치 (도움닫기 진행에 따라 65 -> 195까지 전진)
        olyLjX = Math.min(195, 65 + (olyLjDist / OLY_LJ_FOUL_DIST) * 130);

        // 파울선(20.0m)을 그냥 지나쳐 20.6m에 도달하면 파울 종료
        if (olyLjDist > OLY_LJ_FOUL_DIST + 0.65) {
          olyLjFoul = true;
          olyLjFinished = true;
          olyLjRunning = false;
          olyLjScoreCm = 0;
          olyLjLastScore = 0;
          triggerGameOver(false, false);
        }
      } else if (olyLjPhase === "air") {
        olyLjX = Math.min(canvas.width - 28, olyLjX + olyLjVx);
        olyLjY += olyLjVy;
        olyLjVy += 0.26;

        if (olyLjY >= OLY_LJ_GROUND_Y) {
          olyLjY = OLY_LJ_GROUND_Y;
          landOlyLongJump();
        }
      }
    }

    // 배경 & 트랙 + 모래밭
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 도움닫기 트랙
    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, 200, 210);

    // 모래 피트(착지 구역)
    ctx.fillStyle = "#c99b52";
    ctx.fillRect(200, 130, canvas.width - 200, 210);

    // 파울 보드 라인(x = 195)
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(195, 130, 5, 210);
    ctx.fillStyle = "#ff8ca5";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FOUL LINE", 197, 122);

    // 거리 눈금(모래 피트)
    ctx.fillStyle = "rgba(18, 18, 22, 0.45)";
    ctx.font = "bold 10px sans-serif";
    for (let m = 2; m <= 9; m++) {
      const mx = 200 + (m - 1.5) * 18;
      if (mx < canvas.width - 12) {
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
    ctx.fillText("◀ 좌 가속 (←/A) · 위 도약(↑/Space)", canvas.width * 0.25, 376);
    ctx.fillText("우 가속 (→/D) · 위 도약(↑/Space) ▶", canvas.width * 0.75, 376);

    // 선수 캐릭터 렌더링
    const bob = olyLjPhase === "run" ? Math.sin(olyLjFrame * 0.45) * (olyLjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyLjY + bob;
    const legSwing = olyLjPhase === "air" ? 8 : Math.sin(olyLjFrame * 0.55) * (olyLjSpeed > 0.2 ? 9 : 1);

    // 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyLjX, 296, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 다리
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyLjX, drawY + 12);
    ctx.lineTo(olyLjX + legSwing, drawY + 28);
    ctx.moveTo(olyLjX, drawY + 12);
    ctx.lineTo(olyLjX - legSwing, drawY + 28);
    ctx.stroke();

    // 몸통 & 머리
    ctx.fillStyle = olyLjFoul ? "#ff4d6d" : "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyLjX, drawY + 4, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olyLjX + 2, drawY - 10, 8, 0, Math.PI * 2);
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

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyLjDist.toFixed(1)}m / ${OLY_LJ_FOUL_DIST.toFixed(0)}m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`속도 ${olyLjSpeed.toFixed(2)}`, 12, 38);

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
      if (olyLjFoul) {
        ctx.fillStyle = "#ff4d6d";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("❌ 파울! (FOUL)", canvas.width / 2, 182);
        ctx.fillStyle = "#f4f4f6";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("파울선(20m) 앞에서 도약해 보세요 · 터치로 재시도", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#f4f4f6";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`🦘 기록 ${olyLjJumpDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  icon: "🦘",
  desc: "도움닫기 가속 후 파울선 직전 도약으로 최장 거리 기록!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 20m 파울선 전에 위쪽 터치(PC: ↑/W/Space)로 도약!",
  rankingTitle: "🦘 멀리뛰기 TOP 5 (최장 거리)",
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