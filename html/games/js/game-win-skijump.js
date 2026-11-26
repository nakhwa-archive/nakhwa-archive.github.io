/* ---------- 올림픽 15. 스키점프 (Ski Jumping - Takeoff, Flight Balance & Telemark) ---------- */
var olySjRunning = false;
var olySjOver = false;
var olySjFinished = false;

// "inrun" | "flight" | "done"
var olySjPhase = "inrun";
var olySjInrunDist = 0; // 활강 거리 (0 ~ 65m)
var olySjSpeed = 0; // 현재 활강 속도
var olySjTakeoffDist = 0;
var olySjTakeoffQuality = 0; // 0 ~ 1
var olySjFrame = 0;

var olySjX = 95;
var olySjY = 172;
var olySjVx = 0;
var olySjVy = 0;
var olySjPitch = 0; // 공중 비행 각도 (-1 ~ +1, 0 근처가 최적 V자 양력 자세)
var olySjWind = 0;
var olySjHoldDir = 0;
var olySjFlightGainPx = 0;
var olySjLiftAccum = 0;
var olySjLandedClean = false;
var olySjTrail = [];

var olySjDistM = 0;
var olySjScoreCm = 0; // 예: 13450 => 134.50m
var olySjLastScore = 0;
var olySjBestCm = loadOlySjBestCm();
var olySjParticles = [];
var olySjPopups = [];

var OLY_SJ_START_X = 95;
var OLY_SJ_TAKEOFF_M = 60.0;
var OLY_SJ_MAX_INRUN_M = 63.0;
var OLY_SJ_PX_PER_M = 8;
var OLY_SJ_MIN_M = 75.0;
var OLY_SJ_MAX_M = 148.0;

function loadOlySjBestCm() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlySkiJumpBestCm"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlySjBestCm(cm) {
  try {
    localStorage.setItem("nakhwaOlySkiJumpBestCm", String(cm));
  } catch (_) {}
}

function getOlySjGroundY(screenX) {
  // 도약대 구간(상단 경사)과 착지 사면(하단 가파른 경사) 지형 높이 계산
  const groundScrollPx = getOlySjGroundScrollPx();
  const takeoffScreenX =
    OLY_SJ_START_X + OLY_SJ_TAKEOFF_M * OLY_SJ_PX_PER_M - groundScrollPx;

  if (screenX <= takeoffScreenX) {
    const progress = Math.max(0, Math.min(1, screenX / Math.max(1, takeoffScreenX)));
    return 154 + progress * 46; // 154 -> 200 완만한 인런 슬로프
  }
  const slopeDx = screenX - takeoffScreenX;
  return Math.min(324, 212 + slopeDx * 0.34); // 도약대 턱(12px 낙차) 이후 가파른 착지 사면
}

function getOlySjGroundScrollPx() {
  return (
    olySjInrunDist * OLY_SJ_PX_PER_M +
    (olySjPhase === "flight" || olySjPhase === "done" ? olySjFlightGainPx : 0)
  );
}

function resetOlySkiJump() {
  olySjPhase = "inrun";
  olySjInrunDist = 0;
  olySjSpeed = 0.65;
  olySjTakeoffDist = 0;
  olySjTakeoffQuality = 0;
  olySjFrame = 0;

  olySjX = OLY_SJ_START_X;
  olySjY = 172;
  olySjVx = 0;
  olySjVy = 0;
  olySjPitch = 0;
  olySjWind = (Math.random() - 0.5) * 0.028;
  olySjHoldDir = 0;
  olySjFlightGainPx = 0;
  olySjLiftAccum = 0;
  olySjLandedClean = false;
  olySjTrail = [];

  olySjDistM = 0;
  olySjScoreCm = 0;
  olySjLastScore = 0;
  olySjParticles = [];
  olySjPopups = [];

  olySjOver = false;
  olySjFinished = false;
  olySjRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlySjPopup(x, y, text, color) {
  olySjPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlySjSnow(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.3;
    olySjParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.7,
      r: 2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function computeOlySjMeters() {
  const speedRatio = Math.max(0, Math.min(1, (olySjSpeed - 0.65) / 1.55));
  const flightBonus = Math.max(0, Math.min(26.0, olySjFlightGainPx * 0.042));
  const balanceBonus = Math.max(0, Math.min(16.0, olySjLiftAccum * 0.14));
  const landingBonus = olySjLandedClean ? 6.5 : -4.0;

  const raw =
    OLY_SJ_MIN_M +
    speedRatio * 14.0 +
    olySjTakeoffQuality * 16.5 +
    flightBonus +
    balanceBonus +
    landingBonus;

  const clamped = Math.max(OLY_SJ_MIN_M, Math.min(OLY_SJ_MAX_M, raw));
  return Number(clamped.toFixed(2));
}

function triggerOlySkiJumpAction() {
  if (!olySjRunning || olySjOver || olySjFinished) return;

  if (olySjPhase === "inrun") {
    // 도약대 끝(60.0m) 직전일수록 높은 도약 품질
    const gap = Math.abs(OLY_SJ_TAKEOFF_M - olySjInrunDist);
    const quality = olySjInrunDist > OLY_SJ_TAKEOFF_M ? 0.35 : Math.max(0.25, 1 - gap / 14.0);

    olySjTakeoffDist = olySjInrunDist;
    olySjTakeoffQuality = quality;
    olySjPhase = "flight";
    olySjVy = -(2.2 + quality * 2.1);
    olySjVx = 2.6 + olySjSpeed * 1.15;
    olySjPitch = -0.15;
    olySjFlightGainPx = 0;
    olySjLiftAccum = 0;
    olySjLandedClean = false;

    spawnOlySjSnow(olySjX, olySjY, "#72efdd", 12);
    if (quality >= 0.85) {
      addOlySjPopup(olySjX, olySjY - 34, "🚀 PERFECT TAKEOFF!", "#ffd166");
    } else if (quality >= 0.6) {
      addOlySjPopup(olySjX, olySjY - 34, "✨ GOOD TAKEOFF!", "#72efdd");
    } else {
      addOlySjPopup(olySjX, olySjY - 34, "⚠️ TIMING OFF", "#ff8ca5");
    }
  } else if (olySjPhase === "flight") {
    // 지면 근처에서 누르면 텔레마크 착지 성공
    const groundY = getOlySjGroundY(olySjX);
    const distToGround = groundY - olySjY;
    if (distToGround <= 34 && Math.abs(olySjPitch) <= 0.45 && !olySjLandedClean) {
      olySjLandedClean = true;
      addOlySjPopup(olySjX, olySjY - 34, "🎿 TELEMARK LANDING!", "#72efdd");
      spawnOlySjSnow(olySjX, groundY, "#72efdd", 14);
    }
  }
}

function finishOlySkiJump() {
  olySjPhase = "done";
  olySjFinished = true;
  olySjRunning = false;

  const meters = computeOlySjMeters();
  olySjDistM = meters;
  olySjScoreCm = Math.round(meters * 100);
  olySjLastScore = olySjScoreCm;

  spawnOlySjSnow(olySjX, olySjY, olySjLandedClean ? "#72efdd" : "#ff8ca5", 16);

  const isNewBest = olySjScoreCm > olySjBestCm;
  if (isNewBest) {
    olySjBestCm = olySjScoreCm;
    saveOlySjBestCm(olySjBestCm);
  }

  triggerGameOver(isNewBest, olySjScoreCm > 0);
}

function updateOlySkiJump() {
  if (!olySjRunning || olySjOver || olySjFinished) return;
  olySjFrame++;

  if (olySjPhase === "inrun") {
    // 중력 가속으로 슬로프를 내려오며 자동 속도 축적
    olySjSpeed = Math.min(2.2, olySjSpeed + 0.011);
    olySjInrunDist += olySjSpeed * 0.25;
    olySjY = getOlySjGroundY(olySjX) - 4;

    if (olySjInrunDist >= OLY_SJ_MAX_INRUN_M) {
      olySjInrunDist = OLY_SJ_MAX_INRUN_M;
      triggerOlySkiJumpAction();
    }
  } else if (olySjPhase === "flight") {
    olySjTrail.push({ x: olySjX, y: olySjY });
    if (olySjTrail.length > 34) olySjTrail.shift();

    // 바람 흔들림 + 플레이어 좌/우 자세 보정
    olySjWind += (Math.random() - 0.5) * 0.004;
    olySjWind = Math.max(-0.025, Math.min(0.025, olySjWind));
    olySjPitch += olySjWind + olySjHoldDir * 0.032;
    olySjPitch = Math.max(-1, Math.min(1, olySjPitch));

    // 최적 자세(-0.22 ~ +0.22)일수록 양력이 살아나 낙하가 완만해짐
    const inSweetPosture = Math.abs(olySjPitch) <= 0.24;
    if (inSweetPosture) {
      olySjLiftAccum += 1;
    }
    const gravity = inSweetPosture ? 0.095 : 0.145;

    olySjFlightGainPx += olySjVx;
    olySjX = Math.min(245, olySjX + olySjVx * 0.32);
    olySjY += olySjVy;
    olySjVy += gravity;

    const groundY = getOlySjGroundY(olySjX) - 4;
    if (olySjY >= groundY) {
      olySjY = groundY;
      if (!olySjLandedClean) {
        addOlySjPopup(olySjX, olySjY - 30, "💥 엉덩방아 착지 (-4m)", "#ff4d6d");
      }
      finishOlySkiJump();
    }
  }
}

function drawOlySkiJumpFrame() {
  try {
    ctx.save();
    updateOlySkiJump();

    // 밤하늘 설원 배경
    ctx.fillStyle = "#0e1422";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#162138";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 단일 지면 스크롤 기준으로 슬로프·도약대·K-포인트 마커 동기화
    const groundScrollPx = getOlySjGroundScrollPx();
    const takeoffScreenX =
      OLY_SJ_START_X + OLY_SJ_TAKEOFF_M * OLY_SJ_PX_PER_M - groundScrollPx;

    // 설원 슬로프 폴리곤 그리기
    ctx.fillStyle = "#dceefb";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let sx = 0; sx <= canvas.width; sx += 8) {
      ctx.lineTo(sx, getOlySjGroundY(sx));
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 슬로프 눈 패턴 스크롤
    const scrollOffset = groundScrollPx % 48;
    ctx.fillStyle = "rgba(74, 124, 168, 0.25)";
    for (let sx = -scrollOffset; sx < canvas.width + 48; sx += 48) {
      const gy = getOlySjGroundY(Math.max(0, Math.min(canvas.width, sx)));
      ctx.fillRect(sx, gy + 12, 18, 2);
    }

    // 도약대 끝선 표시
    if (takeoffScreenX >= -20 && takeoffScreenX <= canvas.width + 20) {
      const ty = getOlySjGroundY(takeoffScreenX);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(takeoffScreenX - 2, ty - 14, 4, 22);
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TAKEOFF", takeoffScreenX, ty - 20);
    }

    // K-120m 기준선 표시 (도약대 이후 슬로프 구간)
    const kPointScreenX = takeoffScreenX + 340;
    if (kPointScreenX >= -20 && kPointScreenX <= canvas.width + 20) {
      const ky = getOlySjGroundY(kPointScreenX);
      ctx.fillStyle = "#e63946";
      ctx.fillRect(kPointScreenX - 1.5, ky - 10, 3, 24);
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("K-120m", kPointScreenX, ky - 15);
    }

    // 공중 비행 자세 밸런스 바 (비행 중 표시)
    if (olySjPhase === "flight") {
      const bBarX = 56;
      const bBarY = 82;
      const bBarW = canvas.width - 112;
      const bBarH = 10;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(bBarX, bBarY, bBarW, bBarH);

      // 중앙 양력 골든 존 (-0.24 ~ +0.24)
      ctx.fillStyle = "rgba(114, 239, 221, 0.42)";
      ctx.fillRect(bBarX + bBarW * 0.38, bBarY, bBarW * 0.24, bBarH);

      const ratio = (olySjPitch + 1) * 0.5;
      ctx.fillStyle = Math.abs(olySjPitch) <= 0.24 ? "#72efdd" : "#ffd166";
      ctx.fillRect(bBarX + bBarW * ratio - 3, bBarY - 3, 6, bBarH + 6);

      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("V자 비행 밸런스 (◀/▶ 홀드로 중앙 유지 · 착지 시 ↑/Space)", canvas.width * 0.5, bBarY - 5);
    } else if (olySjPhase === "inrun") {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("활강 가속 중! TAKEOFF 선에서 ↑ / W / Space 또는 상단 터치!", canvas.width * 0.5, 86);
    }

    // 비행 궤적
    if (olySjTrail.length > 1) {
      ctx.strokeStyle = "rgba(114, 239, 221, 0.48)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(olySjTrail[0].x, olySjTrail[0].y);
      for (let i = 1; i < olySjTrail.length; i++) {
        ctx.lineTo(olySjTrail[i].x, olySjTrail[i].y);
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

    ctx.fillStyle = olySjHoldDir === -1 ? "#ffd166" : "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 기수 내림 (←/A 홀드)", canvas.width * 0.25, 370);

    ctx.fillStyle = olySjHoldDir === 1 ? "#ffd166" : "#9898a6";
    ctx.fillText("기수 올림 (→/D 홀드) ▶", canvas.width * 0.75, 370);

    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 도약 & 텔레마크 착지", canvas.width * 0.5, 392);

    // 스키점프 선수 렌더링
    ctx.save();
    ctx.translate(olySjX, olySjY);
    const visualAngle = olySjPhase === "inrun" ? 0.32 : olySjPitch * 0.65;
    ctx.rotate(visualAngle);

    // 스키 플레이트
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(22, 4);
    ctx.stroke();

    // 몸체 (앞으로 倾린 V자 활공 자세)
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.ellipse(2, -4, 12, 6, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // 헬멧 & 고글
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(13, -10, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 파티클 & 팝업
    for (let i = olySjParticles.length - 1; i >= 0; i--) {
      const pt = olySjParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.11;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olySjParticles.splice(i, 1);
    }

    for (let i = olySjPopups.length - 1; i >= 0; i--) {
      const pop = olySjPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olySjPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const kmh = Math.round(olySjSpeed * 44);
    const liveDistText =
      olySjPhase === "done"
        ? `${olySjDistM.toFixed(2)}m`
        : olySjPhase === "flight"
          ? `${computeOlySjMeters().toFixed(2)}m`
          : "--.--m";

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`활강 ${kmh}km/h · 예상 비거리 ${liveDistText}`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    const subStatus =
      olySjPhase === "inrun"
        ? `도약대까지 ${Math.max(0, OLY_SJ_TAKEOFF_M - olySjInrunDist).toFixed(1)}m`
        : olySjLandedClean
          ? "텔레마크 착지 준비 완료!"
          : "착지 직전 ↑/Space로 텔레마크 착지!";
    ctx.fillText(subStatus, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olySjBestCm > 0 ? `${(olySjBestCm / 100).toFixed(2)}m` : "--.--m";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olySjFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🎿 스키점프 ${olySjDistM.toFixed(2)}m`, canvas.width / 2, 182);

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
  id: "oly-skijump",
  title: "스키점프",
  icon: "🎿",
  desc: "도약대 도약 타이밍과 V자 비행 밸런스, 텔레마크 착지로 K-포인트 돌파!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "m",
  hint: "TAKEOFF 선에서 ↑/W/Space 도약 · 공중 ←/→ 밸런스 유지 · 착지 직전 ↑/Space!",
  rankingTitle: "🎿 스키점프 TOP 5 (최장 비행)",
  dbNode: "oly_skijump_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}m`,
  getBadge: () => (olySjBestCm > 0 ? `BEST ${(olySjBestCm / 100).toFixed(2)}m` : "BEST --.--m"),
  getScore: () => olySjLastScore,
  reset: resetOlySkiJump,
  draw: drawOlySkiJumpFrame,
  stop: () => {
    olySjRunning = false;
    olySjHoldDir = 0;
  },
  onPointerDown: (x, y) => {
    if (olySjFinished || olySjOver || !olySjRunning) {
      if (!canRestartNow()) return;
      resetOlySkiJump();
      return;
    }
    if (y < 190) {
      triggerOlySkiJumpAction();
    } else {
      olySjHoldDir = x < canvas.width / 2 ? -1 : 1;
    }
  },
  onPointerUp: () => {
    if (!olySjRunning) return;
    olySjHoldDir = 0;
  },
  onKeyDown: (e) => {
    if (olySjFinished || olySjOver || !olySjRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlySkiJump();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlySkiJumpAction();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      olySjHoldDir = -1;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      olySjHoldDir = 1;
    }
  },
  onKeyUp: (e) => {
    if (!olySjRunning) return;
    if (
      (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") &&
      olySjHoldDir === -1
    ) {
      olySjHoldDir = 0;
    } else if (
      (e.key === "ArrowRight" || e.key === "d" || e.key === "D") &&
      olySjHoldDir === 1
    ) {
      olySjHoldDir = 0;
    }
  }
});