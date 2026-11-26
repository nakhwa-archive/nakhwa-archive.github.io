/* ---------- 올림픽 17. 바이애슬론 (Biathlon - Cross-Country Ski & Precision Shooting) ---------- */
var olyBhRunning = false;
var olyBhOver = false;
var olyBhFinished = false;

// "ski" | "shoot" | "done"
var olyBhPhase = "ski";
var olyBhDistM = 0; // 현재 코스 진행 거리 (0 ~ 1000m)
var olyBhSpeed = 0.7;
var olyBhHoldDir = 0; // -1: 좌, 0: 중립, +1: 우
var olyBhFrame = 0;
var olyBhElapsedMs = 0;
var olyBhLastTickMs = 0;

var olyBhX = 105;
var olyBhY = 238;

// 사격장 상태 (300m, 600m 두 번의 사격 라운드, 라운드당 5발)
var olyBhRangeIndex = 0; // 0: 300m 사격, 1: 600m 사격, 2: 완료
var olyBhShotsFired = 0;
var olyBhTotalHits = 0;
var olyBhTotalShots = 0;
var olyBhPenaltyMs = 0;
var olyBhAimOffset = 0; // -1 ~ +1 조준 오프셋 (0이 정중앙 표적)
var olyBhAimDrift = 0.018;
var olyBhTargetHitFlags = [false, false, false, false, false];

var olyBhScoreCs = 0;
var olyBhLastScore = 0;
var olyBhBestCs = loadOlyBhBestCs();
var olyBhParticles = [];
var olyBhPopups = [];

var OLY_BH_GOAL_M = 1000;
var OLY_BH_RANGES_M = [300, 600];
var OLY_BH_SHOTS_PER_RANGE = 5;
var OLY_BH_TRACK_Y = 238;
var OLY_BH_PX_PER_M = 4.2;

function loadOlyBhBestCs() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyBiathlonBestCs"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyBhBestCs(cs) {
  try {
    localStorage.setItem("nakhwaOlyBiathlonBestCs", String(cs));
  } catch (_) {}
}

function resetOlyBiathlon() {
  olyBhPhase = "ski";
  olyBhDistM = 0;
  olyBhSpeed = 0.7;
  olyBhHoldDir = 0;
  olyBhFrame = 0;
  olyBhElapsedMs = 0;
  olyBhLastTickMs = performance.now();

  olyBhX = 105;
  olyBhY = OLY_BH_TRACK_Y;

  olyBhRangeIndex = 0;
  olyBhShotsFired = 0;
  olyBhTotalHits = 0;
  olyBhTotalShots = 0;
  olyBhPenaltyMs = 0;
  olyBhAimOffset = 0;
  olyBhAimDrift = 0.018;
  olyBhTargetHitFlags = [false, false, false, false, false];

  olyBhScoreCs = 0;
  olyBhLastScore = 0;
  olyBhParticles = [];
  olyBhPopups = [];

  olyBhOver = false;
  olyBhFinished = false;
  olyBhRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyBhPopup(x, y, text, color) {
  olyBhPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyBhBurst(x, y, color, count = 9) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.2;
    olyBhParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.7,
      r: 2 + Math.random() * 2.2,
      color,
      life: 20
    });
  }
}

function enterOlyBhShootingRange() {
  olyBhPhase = "shoot";
  olyBhSpeed = 0;
  olyBhHoldDir = 0;
  olyBhShotsFired = 0;
  olyBhAimOffset = (Math.random() - 0.5) * 0.7;
  olyBhAimDrift = 0.017 + olyBhRangeIndex * 0.006;
  olyBhTargetHitFlags = [false, false, false, false, false];
  addOlyBhPopup(canvas.width * 0.5, 132, "🎯 사격장 진입! 5발 조준 사격", "#72efdd");
}

function fireOlyBhShot() {
  if (!olyBhRunning || olyBhOver || olyBhFinished || olyBhPhase !== "shoot") return;
  if (olyBhShotsFired >= OLY_BH_SHOTS_PER_RANGE) return;

  olyBhTotalShots++;
  const hit = Math.abs(olyBhAimOffset) <= 0.22;
  olyBhTargetHitFlags[olyBhShotsFired] = hit;
  olyBhShotsFired++;

  const targetScreenX = canvas.width * 0.5 + olyBhAimOffset * 110;
  const targetScreenY = 205;

  if (hit) {
    olyBhTotalHits++;
    // 명중 시 시간 보너스(-450ms)
    olyBhPenaltyMs = Math.max(0, olyBhPenaltyMs - 450);
    spawnOlyBhBurst(targetScreenX, targetScreenY, "#72efdd", 12);
    addOlyBhPopup(targetScreenX, targetScreenY - 22, "🎯 HIT!", "#72efdd");
  } else {
    // 빗나감 시 페널티 루프 시간(+1800ms)
    olyBhPenaltyMs += 1800;
    spawnOlyBhBurst(targetScreenX, targetScreenY, "#ff4d6d", 10);
    addOlyBhPopup(targetScreenX, targetScreenY - 22, "❌ MISS (+1.8s)", "#ff4d6d");
  }

  // 다음 표적을 향해 조준점 약간 리셋
  olyBhAimOffset = (Math.random() - 0.5) * 0.85;

  if (olyBhShotsFired >= OLY_BH_SHOTS_PER_RANGE) {
    olyBhRangeIndex++;
    olyBhPhase = "ski";
    olyBhSpeed = 1.15;
    addOlyBhPopup(canvas.width * 0.5, 148, "🎿 사격 완료! 다시 스키 활주", "#ffd166");
  }
}

function finishOlyBiathlon() {
  olyBhPhase = "done";
  olyBhFinished = true;
  olyBhRunning = false;

  const totalTimeMs = Math.max(1000, olyBhElapsedMs + olyBhPenaltyMs);
  const finalSec = Number((totalTimeMs / 1000).toFixed(2));
  const cs = Math.max(1, Math.round(finalSec * 100));

  olyBhScoreCs = cs;
  olyBhLastScore = cs;

  spawnOlyBhBurst(olyBhX, olyBhY, "#ffd166", 16);

  const isNewBest = olyBhBestCs === 0 || olyBhScoreCs < olyBhBestCs;
  if (isNewBest) {
    olyBhBestCs = olyBhScoreCs;
    saveOlyBhBestCs(olyBhBestCs);
  }

  triggerGameOver(isNewBest, true);
}

function updateOlyBiathlon() {
  if (!olyBhRunning || olyBhOver || olyBhFinished) return;

  const now = performance.now();
  const dtMs = Math.min(100, Math.max(0, now - (olyBhLastTickMs || now)));
  olyBhLastTickMs = now;
  olyBhElapsedMs += dtMs;
  olyBhFrame++;

  if (olyBhPhase === "ski") {
    // 좌/우 홀드로 스키 활주 유지
    if (olyBhHoldDir !== 0) {
      olyBhSpeed = Math.min(2.65, olyBhSpeed + 0.032);
      if (olyBhFrame % 6 === 0) {
        spawnOlyBhBurst(olyBhX - 10, olyBhY + 8, "#e0f2fe", 2);
      }
    } else {
      olyBhSpeed = Math.max(0.45, olyBhSpeed * 0.986);
    }

    const prevDist = olyBhDistM;
    olyBhDistM += olyBhSpeed * 1.05;

    // 사격 구간(300m, 600m) 통과 시 사격장 진입
    if (olyBhRangeIndex < OLY_BH_RANGES_M.length) {
      const targetRangeM = OLY_BH_RANGES_M[olyBhRangeIndex];
      if (prevDist < targetRangeM && olyBhDistM >= targetRangeM) {
        olyBhDistM = targetRangeM;
        enterOlyBhShootingRange();
        return;
      }
    }

    if (olyBhDistM >= OLY_BH_GOAL_M) {
      olyBhDistM = OLY_BH_GOAL_M;
      finishOlyBiathlon();
    }
  } else if (olyBhPhase === "shoot") {
    // 호흡에 따른 미세 조준 흔들림 + 좌/우 홀드 조작으로 조준 보정
    const breathWave = Math.sin(olyBhFrame * 0.09) * 0.009;
    olyBhAimOffset += olyBhAimDrift + breathWave + olyBhHoldDir * 0.035;

    if (olyBhAimOffset >= 1.0) {
      olyBhAimOffset = 1.0;
      olyBhAimDrift = -Math.abs(olyBhAimDrift);
    } else if (olyBhAimOffset <= -1.0) {
      olyBhAimOffset = -1.0;
      olyBhAimDrift = Math.abs(olyBhAimDrift);
    }
  }
}

function drawOlyBiathlonFrame() {
  try {
    ctx.save();
    updateOlyBiathlon();

    // 설원 배경
    ctx.fillStyle = "#0e1522";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#172238";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 단일 지면 스크롤 기준으로 설원 패턴과 사격장/거리 마커 동기화
    const groundScrollPx = olyBhDistM * OLY_BH_PX_PER_M;
    const scrollOffset = groundScrollPx % 52;

    if (olyBhPhase === "ski" || olyBhPhase === "done") {
      ctx.fillStyle = "#d9eefb";
      ctx.fillRect(0, 130, canvas.width, 210);

      ctx.fillStyle = "rgba(59, 110, 158, 0.25)";
      for (let x = -scrollOffset; x < canvas.width + 52; x += 52) {
        ctx.fillRect(x, 166, 20, 2);
        ctx.fillRect(x + 14, 304, 20, 2);
      }

      // 사격장(300m, 600m) 및 결승(1000m) 마커
      const markers = [
        { m: 300, label: "RANGE 300m", color: "#0284c7" },
        { m: 600, label: "RANGE 600m", color: "#0284c7" },
        { m: 1000, label: "FINISH 1000m", color: "#e11d48" }
      ];

      for (let i = 0; i < markers.length; i++) {
        const mk = markers[i];
        const mx = olyBhX + (mk.m - olyBhDistM) * OLY_BH_PX_PER_M;
        if (mx >= -50 && mx <= canvas.width + 50) {
          ctx.fillStyle = mk.color;
          ctx.fillRect(mx - 1.5, 132, 3, 206);
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(mk.label, mx, 124);
        }
      }

      // 스키 선수 렌더링
      const bob = Math.sin(olyBhFrame * 0.36) * (olyBhSpeed > 0.4 ? 2 : 0.5);
      const drawY = olyBhY + bob;

      ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
      ctx.beginPath();
      ctx.ellipse(olyBhX, drawY + 13, 18, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(olyBhX - 18, drawY + 11);
      ctx.lineTo(olyBhX + 20, drawY + 11);
      ctx.stroke();

      ctx.fillStyle = "#e65c7b";
      ctx.beginPath();
      ctx.ellipse(olyBhX + 1, drawY - 5, 11, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(olyBhX + 11, drawY - 13, 6.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (olyBhPhase === "shoot") {
      // 사격장 표적 레인 화면
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 130, canvas.width, 210);

      const centerX = canvas.width * 0.5;
      const targetY = 205;

      // 표적 링 (중앙 명중 존)
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, targetY, 54, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(centerX, targetY, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(centerX, targetY, 10, 0, Math.PI * 2);
      ctx.fill();

      // 5발 히트/미스 인디케이터 도트
      for (let i = 0; i < OLY_BH_SHOTS_PER_RANGE; i++) {
        const dotX = centerX - 48 + i * 24;
        const dotY = 286;
        ctx.fillStyle =
          i < olyBhShotsFired
            ? olyBhTargetHitFlags[i]
              ? "#72efdd"
              : "#ff4d6d"
            : "#475569";
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 조준 스코프 크로스헤어
      const aimX = centerX + olyBhAimOffset * 110;
      const inHitZone = Math.abs(olyBhAimOffset) <= 0.22;
      ctx.strokeStyle = inHitZone ? "#72efdd" : "#ffd166";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(aimX, targetY, 16, 0, Math.PI * 2);
      ctx.moveTo(aimX - 22, targetY);
      ctx.lineTo(aimX + 22, targetY);
      ctx.moveTo(aimX, targetY - 22);
      ctx.lineTo(aimX, targetY + 22);
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

    ctx.fillStyle = olyBhHoldDir === -1 ? "#ffd166" : "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      olyBhPhase === "shoot" ? "◀ 좌 조준 (←/A 홀드)" : "◀ 좌 활주 (←/A 홀드)",
      canvas.width * 0.25,
      370
    );

    ctx.fillStyle = olyBhHoldDir === 1 ? "#ffd166" : "#9898a6";
    ctx.fillText(
      olyBhPhase === "shoot" ? "우 조준 (→/D 홀드) ▶" : "우 활주 (→/D 홀드) ▶",
      canvas.width * 0.75,
      370
    );

    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText(
      olyBhPhase === "shoot"
        ? "상단 터치 또는 ↑ / W / Space = 격발"
        : "사격장(300m, 600m) 진입 시 조준 사격!",
      canvas.width * 0.5,
      392
    );

    // 파티클 & 팝업
    for (let i = olyBhParticles.length - 1; i >= 0; i--) {
      const pt = olyBhParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.1;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyBhParticles.splice(i, 1);
    }

    for (let i = olyBhPopups.length - 1; i >= 0; i--) {
      const pop = olyBhPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyBhPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const effectiveSec = ((olyBhElapsedMs + olyBhPenaltyMs) / 1000).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(olyBhDistM)}m / ${OLY_BH_GOAL_M}m · ${effectiveSec}s`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      `명중 ${olyBhTotalHits}/${Math.max(1, olyBhTotalShots)} · ${olyBhPhase === "shoot" ? `사격 (${olyBhShotsFired}/5)` : "스키 주행"}`,
      12,
      38
    );

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestLabel = olyBhBestCs > 0 ? `${(olyBhBestCs / 100).toFixed(2)}s` : "--.--s";
    ctx.fillText(`BEST ${bestLabel}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyBhFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🎯 바이애슬론 ${(olyBhScoreCs / 100).toFixed(2)}s`, canvas.width / 2, 182);

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
  id: "oly-biathlon",
  title: "바이애슬론",
  icon: "🎯",
  desc: "설원 스키 주행과 사격장 5발 조준 사격을 결합한 1000m 바이애슬론!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "s",
  hint: "←/→ 홀드로 스키 활주 & 표적 조준 · 사격장에서 ↑/W/Space(상단 터치) 격발!",
  rankingTitle: "🎯 바이애슬론 TOP 5 (최단 시간)",
  dbNode: "oly_biathlon_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}s`,
  getBadge: () => (olyBhBestCs > 0 ? `BEST ${(olyBhBestCs / 100).toFixed(2)}s` : "BEST --.--s"),
  getScore: () => olyBhLastScore,
  reset: resetOlyBiathlon,
  draw: drawOlyBiathlonFrame,
  stop: () => {
    olyBhRunning = false;
    olyBhHoldDir = 0;
  },
  onPointerDown: (x, y) => {
    if (olyBhFinished || olyBhOver || !olyBhRunning) {
      if (!canRestartNow()) return;
      resetOlyBiathlon();
      return;
    }
    if (y < 190 && olyBhPhase === "shoot") {
      fireOlyBhShot();
    } else {
      olyBhHoldDir = x < canvas.width / 2 ? -1 : 1;
    }
  },
  onPointerUp: () => {
    if (!olyBhRunning) return;
    olyBhHoldDir = 0;
  },
  onKeyDown: (e) => {
    if (olyBhFinished || olyBhOver || !olyBhRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyBiathlon();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat && olyBhPhase === "shoot") fireOlyBhShot();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      olyBhHoldDir = -1;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      olyBhHoldDir = 1;
    }
  },
  onKeyUp: (e) => {
    if (!olyBhRunning) return;
    if (
      (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") &&
      olyBhHoldDir === -1
    ) {
      olyBhHoldDir = 0;
    } else if (
      (e.key === "ArrowRight" || e.key === "d" || e.key === "D") &&
      olyBhHoldDir === 1
    ) {
      olyBhHoldDir = 0;
    }
  }
});