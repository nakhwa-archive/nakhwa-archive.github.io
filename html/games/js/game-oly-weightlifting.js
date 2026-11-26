/* ---------- 올림픽 11. 역도 (Weightlifting) ---------- */
var olyWlRunning = false;
var olyWlOver = false;
var olyWlFinished = false;
var olyWlFailed = false;

var olyWlPhase = "pull"; // "pull" | "lockout" | "done"
var olyWlWeightKg = 80; // 현재 도전 무게 (kg)
var olyWlClearedKg = 0; // 성공한 최고 무게 (kg)
var olyWlLiftProgress = 0; // 0 ~ 100 (100 도달 시 머리 위 홀드/록아웃 구간 진입)
var olyWlLockTimer = 0; // 록아웃 타이밍 윈도우 진행도 (0 ~ 100)
var olyWlLastSide = 0;
var olyWlFrame = 0;

var olyWlScore = 0; // 성공 중량 (kg 정수)
var olyWlLastScore = 0;
var olyWlBestKg = loadOlyWlBestKg();

var olyWlParticles = [];
var olyWlPopups = [];

var OLY_WL_GROUND_Y = 294;
var OLY_WL_TOP_Y = 178;
var OLY_WL_CENTER_X = 180;
var OLY_WL_STEP_KG = 10;
var OLY_WL_MAX_KG = 260;

function loadOlyWlBestKg() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyWeightliftingBestKg"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyWlBestKg(kg) {
  try {
    localStorage.setItem("nakhwaOlyWeightliftingBestKg", String(kg));
  } catch (_) {}
}

function getOlyWlWeightRatio() {
  return Math.max(0, Math.min(1, (olyWlWeightKg - 80) / (OLY_WL_MAX_KG - 80)));
}

function getOlyWlLockZoneRange() {
  // 무게가 올라갈수록 성공 존 폭이 52% -> 22%로 좁아짐
  const wRatio = getOlyWlWeightRatio();
  const halfWidth = 26 - wRatio * 15;
  const center = 52;
  const start = Math.max(12, center - halfWidth);
  const end = Math.min(92, center + halfWidth);
  return { start, end };
}

function resetOlyWeightlifting() {
  olyWlPhase = "pull";
  olyWlWeightKg = 80;
  olyWlClearedKg = 0;
  olyWlLiftProgress = 0;
  olyWlLockTimer = 0;
  olyWlLastSide = 0;
  olyWlFrame = 0;

  olyWlScore = 0;
  olyWlLastScore = 0;
  olyWlFailed = false;
  olyWlParticles = [];
  olyWlPopups = [];

  olyWlOver = false;
  olyWlFinished = false;
  olyWlRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyWlPopup(x, y, text, color) {
  olyWlPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlyWlBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.1 + Math.random() * 2.4;
    olyWlParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2.2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function getOlyWlBarY() {
  const ratio = Math.max(0, Math.min(1, olyWlLiftProgress / 100));
  return OLY_WL_GROUND_Y - 22 - ratio * (OLY_WL_GROUND_Y - 22 - OLY_WL_TOP_Y);
}

function stepOlyWeightliftingPull(side) {
  if (!olyWlRunning || olyWlOver || olyWlFinished) return;
  if (olyWlPhase !== "pull") return;

  const alternating = olyWlLastSide !== side;
  const wRatio = getOlyWlWeightRatio();
  // 고중량일수록 한 번 연타당 상승폭이 작아짐
  const gainScale = Math.max(0.38, 1 - wRatio * 0.62);

  if (alternating) {
    const gain = (11.5 + Math.random() * 2.0) * gainScale;
    olyWlLiftProgress = Math.min(100, olyWlLiftProgress + gain);
    spawnOlyWlBurst(OLY_WL_CENTER_X, getOlyWlBarY(), "#ffd166", 5);

    if (olyWlLiftProgress >= 100) {
      olyWlPhase = "lockout";
      olyWlLockTimer = 0;
      addOlyWlPopup(OLY_WL_CENTER_X, OLY_WL_TOP_Y - 26, "⚡ LOCKOUT NOW!", "#72efdd");
    }
  } else {
    const penalty = 6 + wRatio * 6;
    olyWlLiftProgress = Math.max(0, olyWlLiftProgress - penalty);
    addOlyWlPopup(canvas.width * 0.5, 165, "좌/우 교대!", "#9898a6");
  }

  olyWlLastSide = side;
}

function triggerOlyWeightliftingAction() {
  if (!olyWlRunning || olyWlOver || olyWlFinished) return;

  if (olyWlPhase === "lockout") {
    const zone = getOlyWlLockZoneRange();
    if (olyWlLockTimer >= zone.start && olyWlLockTimer <= zone.end) {
      olyWlClearedKg = olyWlWeightKg;
      addOlyWlPopup(OLY_WL_CENTER_X, OLY_WL_TOP_Y - 30, `🏋️ ${olyWlWeightKg}kg 성공!`, "#72efdd");
      spawnOlyWlBurst(OLY_WL_CENTER_X, OLY_WL_TOP_Y, "#72efdd", 14);

      if (olyWlWeightKg >= OLY_WL_MAX_KG) {
        finishOlyWeightlifting(false);
        return;
      }

      olyWlWeightKg += OLY_WL_STEP_KG;
      olyWlPhase = "pull";
      olyWlLiftProgress = 0;
      olyWlLockTimer = 0;
      olyWlLastSide = 0;
    } else {
      addOlyWlPopup(OLY_WL_CENTER_X, OLY_WL_TOP_Y - 28, "❌ 타이밍 미스!", "#ff4d6d");
      spawnOlyWlBurst(OLY_WL_CENTER_X, getOlyWlBarY(), "#ff4d6d", 12);
      finishOlyWeightlifting(true);
    }
  }
}

function finishOlyWeightlifting(failed) {
  olyWlFailed = failed;
  olyWlPhase = "done";
  olyWlFinished = true;
  olyWlRunning = false;

  olyWlScore = olyWlClearedKg;
  olyWlLastScore = olyWlScore;

  const isNewBest = olyWlScore > 0 && olyWlScore > olyWlBestKg;
  if (isNewBest) {
    olyWlBestKg = olyWlScore;
    saveOlyWlBestKg(olyWlBestKg);
  }

  triggerGameOver(isNewBest, olyWlScore > 0);
}

function updateOlyWeightlifting() {
  if (!olyWlRunning || olyWlOver || olyWlFinished) return;
  olyWlFrame++;

  const wRatio = getOlyWlWeightRatio();

  if (olyWlPhase === "pull") {
    // 무게가 올라갈수록 바벨이 아래로 떨어지는 힘이 세짐
    const gravityPull = 0.24 + wRatio * 0.62;
    olyWlLiftProgress = Math.max(0, olyWlLiftProgress - gravityPull);
  } else if (olyWlPhase === "lockout") {
    // 무게가 올라갈수록 록아웃 게이지 커서가 더 빠르게 지나감
    const lockSpeed = 1.4 + wRatio * 1.45;
    olyWlLockTimer += lockSpeed;
    if (olyWlLockTimer > 100) {
      addOlyWlPopup(OLY_WL_CENTER_X, OLY_WL_TOP_Y - 28, "💥 버티기 실패!", "#ff4d6d");
      spawnOlyWlBurst(OLY_WL_CENTER_X, getOlyWlBarY(), "#ff4d6d", 14);
      finishOlyWeightlifting(true);
    }
  }
}

function drawOlyWeightliftingFrame() {
  try {
    ctx.save();
    updateOlyWeightlifting();

    // 배경 & 플랫폼
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 역도 플랫폼 매트
    ctx.fillStyle = "#2b2538";
    ctx.fillRect(28, 130, canvas.width - 56, 210);

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_WL_GROUND_Y + 4, canvas.width, 2);

    // 상단 게이지 (PULL 파워 또는 LOCKOUT 타이밍)
    const barX = 48;
    const barY = 92;
    const barW = canvas.width - 96;
    const barH = 10;

    ctx.fillStyle = "rgba(20, 22, 32, 0.88)";
    ctx.fillRect(barX, barY, barW, barH);

    if (olyWlPhase === "pull") {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(barX, barY, barW * (olyWlLiftProgress / 100), barH);
      ctx.fillStyle = "#d6d8e5";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`LIFT ${Math.round(olyWlLiftProgress)}% (${olyWlWeightKg}kg 중력 가속)`, canvas.width * 0.5, barY - 5);
    } else if (olyWlPhase === "lockout") {
      const zone = getOlyWlLockZoneRange();
      const zoneLeft = barX + barW * (zone.start / 100);
      const zoneWidth = barW * ((zone.end - zone.start) / 100);

      ctx.fillStyle = "rgba(114, 239, 221, 0.38)";
      ctx.fillRect(zoneLeft, barY, zoneWidth, barH);
      ctx.fillStyle = "#72efdd";
      ctx.fillRect(barX + barW * Math.min(1, olyWlLockTimer / 100) - 3, barY - 3, 6, barH + 6);
      ctx.fillStyle = "#72efdd";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`LOCKOUT ZONE (${Math.round(zone.end - zone.start)}% 폭) · 고정!`, canvas.width * 0.5, barY - 5);
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
    ctx.fillText("◀ 좌 리프트 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("우 리프트 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("LOCKOUT 구간에서 상단 터치 또는 ↑ / W / Space = 성공 고정", canvas.width * 0.5, 392);

    // 역도 선수 캐릭터
    const lifterY = OLY_WL_GROUND_Y;
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(OLY_WL_CENTER_X, lifterY - 14);
    ctx.lineTo(OLY_WL_CENTER_X + 8, lifterY + 2);
    ctx.moveTo(OLY_WL_CENTER_X, lifterY - 14);
    ctx.lineTo(OLY_WL_CENTER_X - 8, lifterY + 2);
    ctx.stroke();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(OLY_WL_CENTER_X, lifterY - 22, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(OLY_WL_CENTER_X + 1, lifterY - 36, 8, 0, Math.PI * 2);
    ctx.fill();

    // 바벨 & 원판
    const barbellY = getOlyWlBarY();
    const plateRadius = Math.min(22, 11 + Math.floor((olyWlWeightKg - 80) / 20) * 2);

    ctx.strokeStyle = "#dce1eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(OLY_WL_CENTER_X - 6, lifterY - 24);
    ctx.lineTo(OLY_WL_CENTER_X - 24, barbellY);
    ctx.moveTo(OLY_WL_CENTER_X + 6, lifterY - 24);
    ctx.lineTo(OLY_WL_CENTER_X + 24, barbellY);
    ctx.stroke();

    ctx.strokeStyle = "#eef2f7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(OLY_WL_CENTER_X - 58, barbellY);
    ctx.lineTo(OLY_WL_CENTER_X + 58, barbellY);
    ctx.stroke();

    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(OLY_WL_CENTER_X - 52, barbellY - plateRadius, 8, plateRadius * 2);
    ctx.fillRect(OLY_WL_CENTER_X + 44, barbellY - plateRadius, 8, plateRadius * 2);

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_WL_CENTER_X - 42, barbellY - plateRadius + 3, 6, (plateRadius - 3) * 2);
    ctx.fillRect(OLY_WL_CENTER_X + 36, barbellY - plateRadius + 3, 6, (plateRadius - 3) * 2);

    // 파티클 & 팝업
    for (let i = olyWlParticles.length - 1; i >= 0; i--) {
      const pt = olyWlParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyWlParticles.splice(i, 1);
    }

    for (let i = olyWlPopups.length - 1; i >= 0; i--) {
      const pop = olyWlPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyWlPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`도전 ${olyWlWeightKg}kg · 최고 성공 ${olyWlClearedKg}kg`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      olyWlPhase === "pull"
        ? "단계: PULL (무게가 늘수록 게이지 낙하 가속)"
        : olyWlPhase === "lockout"
          ? "단계: LOCKOUT (무게가 늘수록 존 축소·커서 가속)"
          : "경기 종료",
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyWlBestKg > 0 ? `${olyWlBestKg}kg` : "--kg";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyWlFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = olyWlScore > 0 ? "#f4f4f6" : "#ff4d6d";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        olyWlScore > 0 ? `🏋️ 역도 ${olyWlScore}kg` : "❌ 기록 없음 (0kg)",
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
  id: "oly-weightlifting",
  title: "역도",
  icon: "🏋️",
  desc: "고중량일수록 빡빡해지는 게이지! 바벨을 끌어올리고 LOCKOUT을 맞춰라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "kg",
  hint: "좌/우 교대 연타로 PULL · 좁아지는 LOCKOUT ZONE에서 상단 터치(PC: ↑/W/Space)로 고정!",
  rankingTitle: "🏋️ 역도 TOP 5 (최고 중량)",
  dbNode: "oly_weightlifting_scores",
  formatScore: (score) => `${score}kg`,
  getBadge: () => (olyWlBestKg > 0 ? `BEST ${olyWlBestKg}kg` : "BEST --kg"),
  getScore: () => olyWlLastScore,
  reset: resetOlyWeightlifting,
  draw: drawOlyWeightliftingFrame,
  stop: () => {
    olyWlRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyWlFinished || olyWlOver || !olyWlRunning) {
      if (!canRestartNow()) return;
      resetOlyWeightlifting();
      return;
    }
    if (y < 190) {
      triggerOlyWeightliftingAction();
    } else {
      stepOlyWeightliftingPull(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyWlFinished || olyWlOver || !olyWlRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyWeightlifting();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlyWeightliftingAction();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyWeightliftingPull(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyWeightliftingPull(1);
    }
  }
});