/* ---------- 올림픽 10. 트리플 점프 (Triple Jump) 상태 ---------- */
var olyTjRunning = false;
var olyTjOver = false;
var olyTjFinished = false;

var olyTjPhase = "run"; // "run" | "hop" | "step" | "jump" | "done"
var olyTjDist = 0; // 도움닫기 거리 (0 ~ 16m)
var olyTjSpeed = 0;
var olyTjLastSide = 0;
var olyTjLastStepFrame = 0;
var olyTjFrame = 0;

var olyTjX = 60;
var olyTjY = 266;
var olyTjVx = 0;
var olyTjVy = 0;
var olyTjTotalGainPx = 0;
var olyTjJumpDistM = 0;

var olyTjScoreCm = 0; // 예: 1825 => 18.25m
var olyTjLastScore = 0;
var olyTjBestCm = Number(localStorage.getItem("nakhwaOlyTripleBestCm") || 0);
var olyTjParticles = [];
var olyTjPopups = [];

var OLY_TJ_GROUND_Y = 266;
var OLY_TJ_BOARD_DIST = 16.0;

function resetOlyTriple() {
  olyTjPhase = "run";
  olyTjDist = 0;
  olyTjSpeed = 0;
  olyTjLastSide = 0;
  olyTjLastStepFrame = 0;
  olyTjFrame = 0;
  olyTjX = 60;
  olyTjY = OLY_TJ_GROUND_Y;
  olyTjVx = 0;
  olyTjVy = 0;
  olyTjTotalGainPx = 0;
  olyTjJumpDistM = 0;
  olyTjScoreCm = 0;
  olyTjLastScore = 0;
  olyTjParticles = [];
  olyTjPopups = [];
  olyTjOver = false;
  olyTjFinished = false;
  olyTjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyTjPopup(x, y, text, color) {
  olyTjPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyTjBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    olyTjParticles.push({
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

function stepOlyTripleStride(side) {
  if (!olyTjRunning || olyTjOver || olyTjFinished || olyTjPhase !== "run") return;

  const diffFrames = olyTjFrame - olyTjLastStepFrame;
  const isAlternating = olyTjLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    olyTjSpeed = Math.min(1.85, olyTjSpeed + bonus);
    spawnOlyTjBurst(olyTjX, 294, "#ff8ca5", 4);
  } else {
    olyTjSpeed = Math.max(0.12, olyTjSpeed - 0.12);
    addOlyTjPopup(canvas.width * 0.5, 194, "좌/우 교대!", "#9898a6");
  }

  olyTjLastSide = side;
  olyTjLastStepFrame = olyTjFrame;
}

function triggerOlyTripleStage() {
  if (!olyTjRunning || olyTjOver || olyTjFinished) return;

  const basePower = Math.max(0.45, Math.min(1.3, olyTjSpeed * 0.9));

  if (olyTjPhase === "run") {
    // 1단: 홉 (Hop)
    olyTjPhase = "hop";
    olyTjVy = -(4.4 + basePower * 2.0);
    olyTjVx = 2.0 + basePower * 1.9;
    spawnOlyTjBurst(olyTjX, 294, "#72efdd", 8);
    addOlyTjPopup(olyTjX, olyTjY - 24, "1️⃣ HOP!", "#72efdd");
  } else if (olyTjPhase === "hop") {
    // 2단: 스텝 (Step) — 공중/착지 직후 이어가기
    olyTjPhase = "step";
    olyTjVy = -(5.0 + basePower * 2.3);
    olyTjVx = 2.3 + basePower * 2.2;
    spawnOlyTjBurst(olyTjX, 294, "#ff8ca5", 9);
    addOlyTjPopup(olyTjX, olyTjY - 26, "2️⃣ STEP!", "#ff8ca5");
  } else if (olyTjPhase === "step") {
    // 3단: 점프 (Jump) — 마지막 큰 도약
    olyTjPhase = "jump";
    olyTjVy = -(6.2 + basePower * 2.9);
    olyTjVx = 2.7 + basePower * 2.7;
    spawnOlyTjBurst(olyTjX, 294, "#ffd166", 12);
    addOlyTjPopup(olyTjX, olyTjY - 30, "3️⃣ JUMP!", "#ffd166");
  }
}

function finishOlyTriple() {
  olyTjPhase = "done";
  olyTjFinished = true;
  olyTjRunning = false;

  // 트리플 점프 기록 계산 (9.50m ~ 18.80m 범위)
  const rawMeters = Math.max(8.8, Math.min(19.0, 9.5 + olyTjTotalGainPx * 0.042));
  const finalMeters = Number(rawMeters.toFixed(2));
  olyTjJumpDistM = finalMeters;
  olyTjScoreCm = Math.round(finalMeters * 100);
  olyTjLastScore = olyTjScoreCm;

  spawnOlyTjBurst(olyTjX, 294, "#ffd166", 14);

  const isNewBest = olyTjScoreCm > olyTjBestCm;
  if (isNewBest) {
    olyTjBestCm = olyTjScoreCm;
    localStorage.setItem("nakhwaOlyTripleBestCm", String(olyTjBestCm));
  }

  triggerGameOver(isNewBest, olyTjScoreCm > 0);
}

function drawOlyTripleFrame() {
  try {
    ctx.save();

    if (olyTjRunning && !olyTjOver && !olyTjFinished) {
      olyTjFrame++;

      if (olyTjPhase === "run") {
        const minRunSpeed = olyTjDist > 0.5 ? 0.14 : 0;
        olyTjSpeed = Math.max(minRunSpeed, olyTjSpeed * 0.968);
        olyTjDist += olyTjSpeed * 0.24;
        olyTjX = Math.min(130, 60 + (olyTjDist / OLY_TJ_BOARD_DIST) * 70);

        // 보드 지나치면 자동으로 1단 홉 시작
        if (olyTjDist >= OLY_TJ_BOARD_DIST + 1.0) {
          triggerOlyTripleStage();
        }
      } else if (olyTjPhase === "hop" || olyTjPhase === "step" || olyTjPhase === "jump") {
        const prevX = olyTjX;
        olyTjX = Math.min(canvas.width - 28, olyTjX + olyTjVx);
        olyTjTotalGainPx += Math.max(0, olyTjX - prevX);
        olyTjY += olyTjVy;
        olyTjVy += 0.27;

        if (olyTjY >= OLY_TJ_GROUND_Y) {
          olyTjY = OLY_TJ_GROUND_Y;
          olyTjVy = 0;

          if (olyTjPhase === "jump") {
            finishOlyTriple();
          } else {
            // 홉/스텝 착지 후 다음 단 입력을 기다리며 살짝 전진
            olyTjVx *= 0.55;
            if (olyTjX >= canvas.width - 34) {
              finishOlyTriple();
            }
          }
        }
      }
    }

    // 배경 & 트랙 + 샌드 피트
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, 140, 210);

    ctx.fillStyle = "#c99b52";
    ctx.fillRect(140, 130, canvas.width - 140, 210);

    // 도약 보드 마커
    ctx.fillStyle = "#72efdd";
    ctx.fillRect(136, 130, 4, 210);
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOARD", 138, 122);

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
    ctx.fillText("◀ 좌 가속 (←/A) · 위 홉→스텝→점프", canvas.width * 0.25, 376);
    ctx.fillText("우 가속 (→/D) · 위 홉→스텝→점프 ▶", canvas.width * 0.75, 376);

    // 선수 캐릭터 렌더링
    const bob = olyTjPhase === "run" ? Math.sin(olyTjFrame * 0.45) * (olyTjSpeed > 0.2 ? 3 : 0) : 0;
    const drawY = olyTjY + bob;
    const legSwing = olyTjPhase !== "run" ? 8 : Math.sin(olyTjFrame * 0.55) * (olyTjSpeed > 0.2 ? 9 : 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(olyTjX, 296, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olyTjX, drawY + 12);
    ctx.lineTo(olyTjX + legSwing, drawY + 28);
    ctx.moveTo(olyTjX, drawY + 12);
    ctx.lineTo(olyTjX - legSwing, drawY + 28);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(olyTjX, drawY + 4, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olyTjX + 2, drawY - 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olyTjParticles.length - 1; i >= 0; i--) {
      const pt = olyTjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyTjParticles.splice(i, 1);
    }

    for (let i = olyTjPopups.length - 1; i >= 0; i--) {
      const pop = olyTjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyTjPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const phaseLabelMap = {
      run: "도움닫기",
      hop: "1단 홉",
      step: "2단 스텝",
      jump: "3단 점프",
      done: "착지"
    };

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${phaseLabelMap[olyTjPhase] || "진행"} · 속도 ${olyTjSpeed.toFixed(2)}`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("3번 연속 점프(HOP → STEP → JUMP)!", 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyTjBestCm > 0 ? `${(olyTjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (olyTjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏃 트리플 점프 ${olyTjJumpDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-triple",
  title: "트리플 점프",
  icon: "🦶",
  desc: "홉 → 스텝 → 점프 3단 도약으로 모래밭 끝까지 날아가라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 위쪽 터치(PC: ↑/Space) 3번으로 홉→스텝→점프!",
  rankingTitle: "🦶 트리플 점프 TOP 5 (최장 거리)",
  dbNode: "oly_triple_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyTjBestCm > 0 ? `BEST ${(olyTjBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyTjLastScore,
  reset: resetOlyTriple,
  draw: drawOlyTripleFrame,
  stop: () => {
    olyTjRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyTjFinished || olyTjOver || !olyTjRunning) {
      if (!canRestartNow()) return;
      resetOlyTriple();
      return;
    }
    if (y < 235 || olyTjPhase === "hop" || olyTjPhase === "step") {
      triggerOlyTripleStage();
    } else {
      stepOlyTripleStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyTjFinished || olyTjOver || !olyTjRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyTriple();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlyTripleStage();
    } else if (olyTjPhase === "run" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) stepOlyTripleStride(-1);
    } else if (olyTjPhase === "run" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) stepOlyTripleStride(1);
    }
  }
});