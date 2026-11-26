/* ---------- 올림픽 4. 창던지기 (Javelin Throw) 상태 ---------- */
var olyJavRunning = false;
var olyJavOver = false;
var olyJavFinished = false;
var olyJavFoul = false;

var olyJavPhase = "run"; // "run" | "aim" | "air" | "done"
var olyJavDist = 0; // 도움닫기 거리 (0 ~ 25m 투척선)
var olyJavSpeed = 0;
var olyJavLastSide = 0;
var olyJavLastStepFrame = 0;
var olyJavFrame = 0;

var olyJavAngleDeg = 40; // 15 ~ 65도 사이 왕복
var olyJavAngleDir = 1;

var olyJavSpearX = 85;
var olyJavSpearY = 264;
var olyJavSpearVx = 0;
var olyJavSpearVy = 0;
var olyJavSpearAngleRad = (-40 * Math.PI) / 180;
var olyJavThrowDistM = 0;

var olyJavScoreCm = 0; // 예: 7420 => 74.20m
var olyJavLastScore = 0;
var olyJavBestCm = Number(localStorage.getItem("nakhwaOlyJavelinBestCm") || 0);
var olyJavParticles = [];
var olyJavPopups = [];

var OLY_JAV_THROW_LINE = 25.0;
var OLY_JAV_GROUND_Y = 294;

function resetOlyJavelin() {
  olyJavPhase = "run";
  olyJavDist = 0;
  olyJavSpeed = 0;
  olyJavLastSide = 0;
  olyJavLastStepFrame = 0;
  olyJavFrame = 0;
  olyJavAngleDeg = 40;
  olyJavAngleDir = 1;
  olyJavSpearX = 85;
  olyJavSpearY = 264;
  olyJavSpearVx = 0;
  olyJavSpearVy = 0;
  olyJavSpearAngleRad = (-40 * Math.PI) / 180;
  olyJavThrowDistM = 0;
  olyJavScoreCm = 0;
  olyJavLastScore = 0;
  olyJavParticles = [];
  olyJavPopups = [];
  olyJavFoul = false;
  olyJavOver = false;
  olyJavFinished = false;
  olyJavRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyJavPopup(x, y, text, color) {
  olyJavPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyJavBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    olyJavParticles.push({
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

function stepOlyJavelinStride(side) {
  if (!olyJavRunning || olyJavOver || olyJavFinished || olyJavPhase !== "run") return;

  const diffFrames = olyJavFrame - olyJavLastStepFrame;
  const isAlternating = olyJavLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    olyJavSpeed = Math.min(1.85, olyJavSpeed + bonus);
    spawnOlyJavBurst(85, 294, "#ff8ca5", 4);
  } else {
    olyJavSpeed = Math.max(0.12, olyJavSpeed - 0.12);
    addOlyJavPopup(canvas.width * 0.5, 196, "좌/우 교대!", "#9898a6");
  }

  olyJavLastSide = side;
  olyJavLastStepFrame = olyJavFrame;
}

function enterOlyJavelinAim() {
  if (olyJavPhase !== "run") return;
  if (olyJavDist > OLY_JAV_THROW_LINE) {
    olyJavFoul = true;
    olyJavPhase = "done";
    olyJavFinished = true;
    olyJavRunning = false;
    olyJavScoreCm = 0;
    olyJavLastScore = 0;
    triggerGameOver(false, false);
    return;
  }
  olyJavPhase = "aim";
  olyJavAngleDeg = 35;
  olyJavAngleDir = 1;
  addOlyJavPopup(120, 210, "📐 각도 멈춰서 투척!", "#ffd166");
}

function releaseOlyJavelin() {
  if (!olyJavRunning || olyJavOver || olyJavFinished) return;

  if (olyJavPhase === "run") {
    enterOlyJavelinAim();
    return;
  }

  if (olyJavPhase !== "aim") return;

  // 42도 기준 최적 각도 보너스 (0.65 ~ 1.0)
  const angleDiff = Math.abs(olyJavAngleDeg - 42);
  const angleFactor = Math.max(0.55, 1 - angleDiff / 55);
  const runFactor = Math.max(0.4, Math.min(1.2, olyJavSpeed * 0.85));
  const power = runFactor * angleFactor;

  const rad = (olyJavAngleDeg * Math.PI) / 180;
  const launchSpeed = 6.2 + power * 7.4;

  olyJavSpearX = 115;
  olyJavSpearY = 262;
  olyJavSpearVx = Math.cos(rad) * launchSpeed;
  olyJavSpearVy = -Math.sin(rad) * launchSpeed;
  olyJavSpearAngleRad = -rad;

  olyJavPhase = "air";
  spawnOlyJavBurst(115, 262, "#ffd166", 10);

  if (angleDiff <= 4) {
    addOlyJavPopup(120, 224, "🎯 GOLDEN ANGLE!", "#ffd166");
  }
}

function landOlyJavelin() {
  olyJavPhase = "done";
  olyJavFinished = true;
  olyJavRunning = false;

  // 투척 거리 계산 (22.00m ~ 92.50m 범위)
  const travelPx = Math.max(0, olyJavSpearX - 115);
  const rawMeters = Math.max(18.0, Math.min(94.0, 22.0 + travelPx * 0.34));
  const finalMeters = Number(rawMeters.toFixed(2));
  olyJavThrowDistM = finalMeters;
  olyJavScoreCm = Math.round(finalMeters * 100);
  olyJavLastScore = olyJavScoreCm;

  spawnOlyJavBurst(olyJavSpearX, OLY_JAV_GROUND_Y, "#72efdd", 14);

  const isNewBest = olyJavScoreCm > olyJavBestCm;
  if (isNewBest) {
    olyJavBestCm = olyJavScoreCm;
    localStorage.setItem("nakhwaOlyJavelinBestCm", String(olyJavBestCm));
  }

  triggerGameOver(isNewBest, olyJavScoreCm > 0);
}

function drawOlyJavelinFrame() {
  try {
    ctx.save();

    if (olyJavRunning && !olyJavOver && !olyJavFinished) {
      olyJavFrame++;

      if (olyJavPhase === "run") {
        const minRunSpeed = olyJavDist > 0.5 ? 0.14 : 0;
        olyJavSpeed = Math.max(minRunSpeed, olyJavSpeed * 0.968);
        olyJavDist += olyJavSpeed * 0.25;

        // 25m 투척선에 가까워지면 자동으로 각도 조준 단계 진입
        if (olyJavDist >= OLY_JAV_THROW_LINE - 0.5) {
          olyJavDist = OLY_JAV_THROW_LINE - 0.5;
          enterOlyJavelinAim();
        }
      } else if (olyJavPhase === "aim") {
        olyJavAngleDeg += olyJavAngleDir * 1.45;
        if (olyJavAngleDeg >= 65) {
          olyJavAngleDeg = 65;
          olyJavAngleDir = -1;
        } else if (olyJavAngleDeg <= 15) {
          olyJavAngleDeg = 15;
          olyJavAngleDir = 1;
        }
      } else if (olyJavPhase === "air") {
        olyJavSpearX = Math.min(canvas.width - 14, olyJavSpearX + olyJavSpearVx);
        olyJavSpearY += olyJavSpearVy;
        olyJavSpearVy += 0.24;
        olyJavSpearAngleRad = Math.atan2(olyJavSpearVy, olyJavSpearVx);

        if (olyJavSpearY >= OLY_JAV_GROUND_Y || olyJavSpearX >= canvas.width - 16) {
          olyJavSpearY = OLY_JAV_GROUND_Y;
          landOlyJavelin();
        }
      }
    }

    // 배경 & 투척 필드
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 잔디 투척 구역
    ctx.fillStyle = "#24523a";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 투척 아크 라인
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(115, 130);
    ctx.lineTo(115, 340);
    ctx.stroke();

    // 거리 마커 (투척선 이후)
    ctx.fillStyle = "rgba(244, 244, 246, 0.55)";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    for (let m = 30; m <= 90; m += 10) {
      const mx = 115 + (m - 22) / 0.34;
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
    if (olyJavPhase === "aim") {
      ctx.fillStyle = "#ffd166";
      ctx.fillText("🎯 아무 곳이나 터치(PC: Space/↑)해서 창 투척!", canvas.width * 0.5, 376);
    } else {
      ctx.fillText("◀ 좌 가속 (←/A) · 위 투척조준(↑/Space)", canvas.width * 0.25, 376);
      ctx.fillText("우 가속 (→/D) · 위 투척조준(↑/Space) ▶", canvas.width * 0.75, 376);
    }

    // 선수 & 창 렌더링
    const throwerX = 85;
    const throwerY = 264 + (olyJavPhase === "run" ? Math.sin(olyJavFrame * 0.45) * (olyJavSpeed > 0.2 ? 3 : 0) : 0);

    // 선수
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(throwerX, throwerY + 4, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(throwerX + 2, throwerY - 10, 8, 0, Math.PI * 2);
    ctx.fill();

    if (olyJavPhase === "run" || olyJavPhase === "aim") {
      const aimRad = (-olyJavAngleDeg * Math.PI) / 180;
      ctx.save();
      ctx.translate(throwerX + 8, throwerY - 2);
      ctx.rotate(aimRad);

      // 창 몸체
      ctx.strokeStyle = "#f4f4f6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();

      // 창 끝 촉
      ctx.fillStyle = "#72efdd";
      ctx.beginPath();
      ctx.moveTo(34, 0);
      ctx.lineTo(25, -4);
      ctx.lineTo(25, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 조준각 가이드 라인
      if (olyJavPhase === "aim") {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(throwerX + 8, throwerY - 2);
        ctx.lineTo(
          throwerX + 8 + Math.cos(aimRad) * 95,
          throwerY - 2 + Math.sin(aimRad) * 95
        );
        ctx.stroke();
        ctx.restore();
      }
    } else if (olyJavPhase === "air" || olyJavPhase === "done") {
      ctx.save();
      ctx.translate(olyJavSpearX, olyJavSpearY);
      ctx.rotate(olyJavSpearAngleRad);
      ctx.strokeStyle = "#f4f4f6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(21, -4);
      ctx.lineTo(21, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 파티클 & 팝업
    for (let i = olyJavParticles.length - 1; i >= 0; i--) {
      const pt = olyJavParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyJavParticles.splice(i, 1);
    }

    for (let i = olyJavPopups.length - 1; i >= 0; i--) {
      const pop = olyJavPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyJavPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도움닫기 ${olyJavDist.toFixed(1)}m · 각도 ${Math.round(olyJavAngleDeg)}°`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`속도 ${olyJavSpeed.toFixed(2)} (최적 42°)`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyJavBestCm > 0 ? `${(olyJavBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (olyJavFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      if (olyJavFoul) {
        ctx.fillStyle = "#ff4d6d";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("❌ 투척선 파울! (FOUL)", canvas.width / 2, 182);
        ctx.fillStyle = "#f4f4f6";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("25m 투척선 도달 전에 던져보세요 · 터치로 재시도", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#f4f4f6";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`🎯 투척 기록 ${olyJavThrowDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-javelin",
  title: "창던지기",
  icon: "🎯",
  desc: "가속 후 42° 최적 각도를 맞춰 창을 멀리 날려라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 달리기 · 위쪽 터치(PC: ↑/Space)로 각도 조준 후 발사!",
  rankingTitle: "🎯 창던지기 TOP 5 (최장 거리)",
  dbNode: "oly_javelin_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olyJavBestCm > 0 ? `BEST ${(olyJavBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olyJavLastScore,
  reset: resetOlyJavelin,
  draw: drawOlyJavelinFrame,
  stop: () => {
    olyJavRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyJavFinished || olyJavOver || !olyJavRunning) {
      if (!canRestartNow()) return;
      resetOlyJavelin();
      return;
    }
    if (olyJavPhase === "aim") {
      releaseOlyJavelin();
      return;
    }
    if (y < 235) {
      enterOlyJavelinAim();
    } else {
      stepOlyJavelinStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyJavFinished || olyJavOver || !olyJavRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyJavelin();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) {
        if (olyJavPhase === "run") enterOlyJavelinAim();
        else if (olyJavPhase === "aim") releaseOlyJavelin();
      }
    } else if (olyJavPhase === "run" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) stepOlyJavelinStride(-1);
    } else if (olyJavPhase === "run" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) stepOlyJavelinStride(1);
    }
  }
});