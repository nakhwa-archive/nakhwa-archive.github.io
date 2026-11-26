/* ---------- 올림픽 4. 창던지기 (Javelin Throw) 상태 ---------- */
var olyJavRunning = false;
var olyJavOver = false;
var olyJavFinished = false;

var olyJavPhase = "run"; // "run" | "flight" | "done"
var olyJavDist = 0; // 도움닫기 거리 (0 ~ 20m)
var olyJavSpeed = 0;
var olyJavLastSide = 0;
var olyJavLastStepFrame = 0;
var olyJavFrame = 0;

var olyJavAngleDeg = 40; // 투척 각도 (20 ~ 65도)
var olyJavAngleDir = 1;

var olyJavX = 75;
var olyJavY = 264;
var olyJavVx = 0;
var olyJavVy = 0;
var olyJavFlightGainPx = 0;
var olyJavThrowDistM = 0;

var olyJavScoreCm = 0; // 예: 8640 => 86.40m
var olyJavLastScore = 0;
var olyJavBestCm = Number(localStorage.getItem("nakhwaOlyJavelinBestCm") || 0);
var olyJavParticles = [];
var olyJavPopups = [];

var OLY_JAV_FOUL_DIST = 17.5;
var OLY_JAV_LAND_Y = 304;

function resetOlyJavelin() {
  olyJavPhase = "run";
  olyJavDist = 0;
  olyJavSpeed = 0;
  olyJavLastSide = 0;
  olyJavLastStepFrame = 0;
  olyJavFrame = 0;
  olyJavAngleDeg = 40;
  olyJavAngleDir = 1;
  olyJavX = 75;
  olyJavY = 264;
  olyJavVx = 0;
  olyJavVy = 0;
  olyJavFlightGainPx = 0;
  olyJavThrowDistM = 0;
  olyJavScoreCm = 0;
  olyJavLastScore = 0;
  olyJavParticles = [];
  olyJavPopups = [];
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
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.27 : 0.18;
    olyJavSpeed = Math.min(1.85, olyJavSpeed + bonus);
    spawnOlyJavBurst(olyJavX, 294, "#ff8ca5", 4);
  } else {
    olyJavSpeed = Math.max(0.12, olyJavSpeed - 0.12);
    addOlyJavPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyJavLastSide = side;
  olyJavLastStepFrame = olyJavFrame;
}

function throwOlyJavelin() {
  if (!olyJavRunning || olyJavOver || olyJavFinished || olyJavPhase !== "run") return;

  const rad = (olyJavAngleDeg * Math.PI) / 180;
  const angleEfficiency = Math.max(0.55, 1 - Math.abs(olyJavAngleDeg - 42) / 36);
  const speedPower = Math.max(0.35, Math.min(1.3, olyJavSpeed * 0.92));

  olyJavPhase = "flight";
  olyJavVx = Math.cos(rad) * (4.8 + speedPower * 4.4);
  olyJavVy = -Math.sin(rad) * (4.6 + speedPower * 4.2);
  olyJavFlightGainPx = 0;

  spawnOlyJavBurst(olyJavX + 12, olyJavY - 8, "#ffd166", 10);

  if (angleEfficiency >= 0.92 && olyJavSpeed >= 0.9) {
    addOlyJavPopup(olyJavX + 20, olyJavY - 34, "🎯 GOLDEN RELEASE!", "#ffd166");
  }
}

function landOlyJavelin() {
  olyJavPhase = "done";
  olyJavFinished = true;
  olyJavRunning = false;

  // 창던지기 기록 산출 (38.00m ~ 96.50m 범위)
  const rawMeters = Math.max(32.00, Math.min(98.50, 38.00 + olyJavFlightGainPx * 0.088));
  const finalMeters = Number(rawMeters.toFixed(2));
  olyJavThrowDistM = finalMeters;
  olyJavScoreCm = Math.round(finalMeters * 100);
  olyJavLastScore = olyJavScoreCm;

  spawnOlyJavBurst(olyJavX, olyJavY, "#72efdd", 14);

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

        const targetX = 75 + (olyJavDist / OLY_JAV_FOUL_DIST) * 70;
        olyJavX = Math.min(145, targetX);
        olyJavY = 264;

        // 각도 조준 왕복 (22도 ~ 62도)
        olyJavAngleDeg += olyJavAngleDir * 0.95;
        if (olyJavAngleDeg >= 62) {
          olyJavAngleDeg = 62;
          olyJavAngleDir = -1;
        } else if (olyJavAngleDeg <= 22) {
          olyJavAngleDeg = 22;
          olyJavAngleDir = 1;
        }

        if (olyJavDist >= 19.8) {
          throwOlyJavelin();
        }
      } else if (olyJavPhase === "flight") {
        // 화면 끝에서 끝나지 않고 뒤쪽 필드가 스크롤되며 창이 계속 날아가게 처리
        const forwardStep = olyJavVx;
        olyJavFlightGainPx += forwardStep;

        if (olyJavX < canvas.width - 56) {
          olyJavX += forwardStep * 0.55;
        }

        olyJavY += olyJavVy;
        olyJavVy += 0.15;

        if (olyJavY >= OLY_JAV_LAND_Y) {
          olyJavY = OLY_JAV_LAND_Y;
          landOlyJavelin();
        }
      }
    }

    // 배경 & 투척 필드
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#2d5a3c";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 파울 라인(도움닫기 구간에서 상대 이동)
    const foulX = olyJavPhase === "run"
      ? olyJavX + (OLY_JAV_FOUL_DIST - olyJavDist) * 10
      : -120;
    if (foulX >= -10 && foulX <= canvas.width + 10) {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(foulX, 130, 4, 210);
    }

    // 거리 눈금 (창 비행 중에도 계속 스크롤되며 멀어짐)
    const meterScrollOffset = olyJavPhase === "flight" || olyJavPhase === "done"
      ? (olyJavFlightGainPx * 0.85) % 240
      : 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    for (let baseIdx = -1; baseIdx <= 2; baseIdx++) {
      const baseDist = 30 + baseIdx * 60;
      const mx = 155 + (baseIdx + 1) * 40 - meterScrollOffset;
      if (mx >= 12 && mx <= canvas.width - 12 && baseDist >= 10) {
        ctx.fillRect(mx, 296, 2, 8);
        ctx.fillText(`${baseDist}m`, mx, 316);
      }
    }

    // 하단 가이드 존 (겹침 없이 깔끔하게 배치)
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

    // 선수 캐릭터 렌더링 (도움닫기 & 투척 자세)
    if (olyJavPhase === "run") {
      const bob = Math.sin(olyJavFrame * 0.45) * (olyJavSpeed > 0.2 ? 3 : 0);
      ctx.fillStyle = "#e65c7b";
      ctx.beginPath();
      ctx.arc(olyJavX, olyJavY + bob, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(olyJavX + 3, olyJavY - 14 + bob, 8, 0, Math.PI * 2);
      ctx.fill();

      const aimRad = (-olyJavAngleDeg * Math.PI) / 180;
      ctx.strokeStyle = "#72efdd";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(olyJavX + 6, olyJavY - 4 + bob);
      ctx.lineTo(olyJavX + 6 + Math.cos(aimRad) * 42, olyJavY - 4 + bob + Math.sin(aimRad) * 42);
      ctx.stroke();
    }

    // 창 렌더링 (비행 각도에 맞춰 기울어지며 계속 날아감)
    const flightAngle = olyJavPhase === "flight" || olyJavPhase === "done"
      ? Math.atan2(olyJavVy, olyJavVx)
      : (-olyJavAngleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(olyJavX + 10, olyJavY - 4);
    ctx.rotate(flightAngle);
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(22, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

    const liveMeters = olyJavPhase === "flight" || olyJavPhase === "done"
      ? (38.00 + olyJavFlightGainPx * 0.088).toFixed(2)
      : "--.--";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      olyJavPhase === "run"
        ? `도움닫기 ${olyJavDist.toFixed(1)}m · 각도 ${Math.round(olyJavAngleDeg)}°`
        : `비행 거리 ${liveMeters}m`,
      12,
      21
    );

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
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏹 창던지기 ${olyJavThrowDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-javelin",
  title: "창던지기",
  icon: "🏹",
  desc: "도움닫기 스피드와 투척 각도 타이밍으로 창을 가장 멀리 날려라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "좌/우 번갈아 가속 · 위쪽 터치(PC: ↑/W/Space)로 투척! (최적 각도 ~42°)",
  rankingTitle: "🏹 창던지기 TOP 5 (최장 거리)",
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
    if (y < 235) {
      throwOlyJavelin();
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
      if (!e.repeat) throwOlyJavelin();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyJavelinStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyJavelinStride(1);
    }
  }
});
