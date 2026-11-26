/* ---------- 올림픽 4. 110m 허들 (110m Hurdles) ---------- */
var olyHdRunning = false;
var olyHdOver = false;
var olyHdFinished = false;

var olyHdDistM = 0; // 현재 주행 거리 (0 ~ 110m)
var olyHdSpeed = 0; // 현재 가속도
var olyHdLastSide = 0;
var olyHdLastStepFrame = 0;
var olyHdFrame = 0;
var olyHdElapsedMs = 0;
var olyHdLastTickMs = 0;

var olyHdX = 100;
var olyHdY = 294;
var olyHdVy = 0;
var olyHdIsAir = false;
var olyHdInvulnFrames = 0;

var olyHdHurdles = []; // { dist: number, cleared: boolean, hit: boolean }
var olyHdClearedCount = 0;
var olyHdHitCount = 0;

var olyHdScoreCs = 0; // 완주 기록 (센티초: 예 1245 => 12.45초, 낮을수록 좋음)
var olyHdLastScore = 0;
var olyHdBestCs = loadOlyHdBestCs();
var olyHdParticles = [];
var olyHdPopups = [];

var OLY_HD_GOAL_M = 110;
var OLY_HD_GROUND_Y = 294;
var OLY_HD_PX_PER_M = 28;
var OLY_HD_FIRST_HURDLE_M = 18;
var OLY_HD_HURDLE_STEP_M = 9;
var OLY_HD_HURDLE_COUNT = 10;

function loadOlyHdBestCs() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyHurdlesBestCs"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyHdBestCs(cs) {
  try {
    localStorage.setItem("nakhwaOlyHurdlesBestCs", String(cs));
  } catch (_) {}
}

function buildOlyHdHurdles() {
  const list = [];
  for (let i = 0; i < OLY_HD_HURDLE_COUNT; i++) {
    const d = OLY_HD_FIRST_HURDLE_M + i * OLY_HD_HURDLE_STEP_M;
    if (d < OLY_HD_GOAL_M - 4) {
      list.push({ dist: d, cleared: false, hit: false });
    }
  }
  return list;
}

function resetOlyHurdles() {
  olyHdDistM = 0;
  olyHdSpeed = 0;
  olyHdLastSide = 0;
  olyHdLastStepFrame = 0;
  olyHdFrame = 0;
  olyHdElapsedMs = 0;
  olyHdLastTickMs = performance.now();

  olyHdX = 100;
  olyHdY = OLY_HD_GROUND_Y;
  olyHdVy = 0;
  olyHdIsAir = false;
  olyHdInvulnFrames = 0;

  olyHdHurdles = buildOlyHdHurdles();
  olyHdClearedCount = 0;
  olyHdHitCount = 0;

  olyHdScoreCs = 0;
  olyHdLastScore = 0;
  olyHdParticles = [];
  olyHdPopups = [];

  olyHdOver = false;
  olyHdFinished = false;
  olyHdRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyHdPopup(x, y, text, color) {
  olyHdPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyHdBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.0;
    olyHdParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.7,
      r: 2 + Math.random() * 2,
      color,
      life: 20
    });
  }
}

function stepOlyHurdlesStride(side) {
  if (!olyHdRunning || olyHdOver || olyHdFinished) return;
  if (olyHdIsAir) return;

  const gapFrames = olyHdFrame - olyHdLastStepFrame;
  const alternating = olyHdLastSide !== side;

  if (alternating) {
    const rhythmBonus = gapFrames >= 5 && gapFrames <= 20 ? 0.26 : 0.17;
    olyHdSpeed = Math.min(2.2, olyHdSpeed + rhythmBonus);
    spawnOlyHdBurst(olyHdX, OLY_HD_GROUND_Y, "#ff8ca5", 4);
  } else {
    olyHdSpeed = Math.max(0.16, olyHdSpeed - 0.14);
    addOlyHdPopup(canvas.width * 0.5, 190, "좌/우 교대!", "#9898a6");
  }

  olyHdLastSide = side;
  olyHdLastStepFrame = olyHdFrame;
}

function jumpOlyHurdles() {
  if (!olyHdRunning || olyHdOver || olyHdFinished) return;
  if (olyHdIsAir) return;

  olyHdIsAir = true;
  const speedBoost = Math.min(0.9, olyHdSpeed * 0.25);
  olyHdVy = -(5.4 + speedBoost);
  olyHdSpeed = Math.min(2.3, olyHdSpeed + 0.08);
  spawnOlyHdBurst(olyHdX, OLY_HD_GROUND_Y, "#ffd166", 7);
}

function finishOlyHurdles() {
  olyHdFinished = true;
  olyHdRunning = false;

  const finalSec = Number((olyHdElapsedMs / 1000).toFixed(2));
  const cs = Math.max(1, Math.round(finalSec * 100));
  olyHdScoreCs = cs;
  olyHdLastScore = cs;

  spawnOlyHdBurst(olyHdX, olyHdY - 12, "#72efdd", 18);

  const isNewBest = olyHdBestCs === 0 || olyHdScoreCs < olyHdBestCs;
  if (isNewBest) {
    olyHdBestCs = olyHdScoreCs;
    saveOlyHdBestCs(olyHdBestCs);
  }

  triggerGameOver(isNewBest, true);
}

function checkOlyHdHurdles() {
  for (let i = 0; i < olyHdHurdles.length; i++) {
    const h = olyHdHurdles[i];
    if (h.cleared || h.hit) continue;

    const distDelta = h.dist - olyHdDistM;

    if (distDelta <= 0.45 && distDelta >= -0.95) {
      if (olyHdY < OLY_HD_GROUND_Y - 14) {
        h.cleared = true;
        olyHdClearedCount++;
        olyHdSpeed = Math.min(2.3, olyHdSpeed + 0.14);
        addOlyHdPopup(olyHdX, olyHdY - 38, "✨ CLEAR!", "#72efdd");
        spawnOlyHdBurst(olyHdX, olyHdY - 10, "#72efdd", 8);
      } else if (olyHdInvulnFrames <= 0) {
        h.hit = true;
        olyHdHitCount++;
        olyHdInvulnFrames = 26;
        olyHdSpeed = Math.max(0.24, olyHdSpeed * 0.5);
        addOlyHdPopup(olyHdX, olyHdY - 38, "💥 HIT!", "#ff4d6d");
        spawnOlyHdBurst(olyHdX, olyHdY - 10, "#ff4d6d", 12);
      }
    } else if (distDelta < -0.95) {
      h.cleared = true;
    }
  }
}

function updateOlyHurdles() {
  if (!olyHdRunning || olyHdOver || olyHdFinished) return;

  const now = performance.now();
  const dtMs = Math.min(100, Math.max(0, now - (olyHdLastTickMs || now)));
  olyHdLastTickMs = now;
  olyHdElapsedMs += dtMs;
  olyHdFrame++;

  if (olyHdInvulnFrames > 0) olyHdInvulnFrames--;

  if (!olyHdIsAir) {
    const baseFloor = olyHdDistM > 0.2 ? 0.22 : 0;
    olyHdSpeed = Math.max(baseFloor, olyHdSpeed * 0.972);
  } else {
    olyHdSpeed = Math.max(0.28, olyHdSpeed * 0.99);
    olyHdY += olyHdVy;
    olyHdVy += 0.24;

    if (olyHdY >= OLY_HD_GROUND_Y) {
      olyHdY = OLY_HD_GROUND_Y;
      olyHdVy = 0;
      olyHdIsAir = false;
    }
  }

  olyHdDistM += olyHdSpeed * 0.11;
  checkOlyHdHurdles();

  if (olyHdDistM >= OLY_HD_GOAL_M) {
    olyHdDistM = OLY_HD_GOAL_M;
    finishOlyHurdles();
  }
}

function drawOlyHurdlesFrame() {
  try {
    ctx.save();
    updateOlyHurdles();

    // 배경 & 하늘/관중석
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 트랙
    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 트랙 라인 스크롤
    const scrollPx = (olyHdDistM * OLY_HD_PX_PER_M) % 56;
    ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
    for (let x = -scrollPx; x < canvas.width + 56; x += 56) {
      ctx.fillRect(x, 142, 22, 2);
      ctx.fillRect(x + 16, 324, 22, 2);
    }

    // 거리 마커 (10m 단위 + 결승선 110m)
    const startMarker = Math.max(0, Math.floor((olyHdDistM - 8) / 10) * 10);
    for (let m = startMarker; m <= OLY_HD_GOAL_M; m += 10) {
      const markerX = olyHdX + (m - olyHdDistM) * OLY_HD_PX_PER_M;
      if (markerX >= -40 && markerX <= canvas.width + 40) {
        const isGoal = m === OLY_HD_GOAL_M;
        ctx.fillStyle = isGoal ? "#72efdd" : "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(markerX - (isGoal ? 2 : 1), 132, isGoal ? 4 : 2, 206);
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isGoal ? "FINISH 110m" : `${m}m`, markerX, 124);
      }
    }

    // 지면 기준선
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_HD_GROUND_Y + 4, canvas.width, 2);

    // 허들 렌더링
    for (let i = 0; i < olyHdHurdles.length; i++) {
      const h = olyHdHurdles[i];
      const hx = olyHdX + (h.dist - olyHdDistM) * OLY_HD_PX_PER_M;
      if (hx < -30 || hx > canvas.width + 30) continue;

      const hurdleH = 26;
      const topY = OLY_HD_GROUND_Y + 4 - hurdleH;

      ctx.strokeStyle = h.hit ? "#ff4d6d" : h.cleared ? "#72efdd" : "#f4f4f6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx - 6, OLY_HD_GROUND_Y + 4);
      ctx.lineTo(hx - 6, topY);
      ctx.moveTo(hx + 6, OLY_HD_GROUND_Y + 4);
      ctx.lineTo(hx + 6, topY);
      ctx.stroke();

      ctx.fillStyle = h.hit ? "#ff4d6d" : "#ffd166";
      ctx.fillRect(hx - 10, topY - 3, 20, 5);
    }

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
    ctx.fillText("◀ 좌 가속 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("우 가속 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 허들 점프", canvas.width * 0.5, 392);

    // 선수 캐릭터
    if (olyHdInvulnFrames <= 0 || olyHdFrame % 4 < 2) {
      const bob = !olyHdIsAir ? Math.sin(olyHdFrame * 0.35) * (olyHdSpeed > 0.25 ? 2.5 : 0) : 0;
      const drawY = olyHdY + bob;
      const legSwing = olyHdIsAir ? 9 : Math.sin(olyHdFrame * 0.42) * (olyHdSpeed > 0.25 ? 9 : 1);

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(olyHdX, OLY_HD_GROUND_Y + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f4f4f6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(olyHdX, drawY - 14);
      ctx.lineTo(olyHdX + legSwing, drawY + 2);
      ctx.moveTo(olyHdX, drawY - 14);
      ctx.lineTo(olyHdX - legSwing, drawY + 2);
      ctx.stroke();

      ctx.fillStyle = "#e65c7b";
      ctx.beginPath();
      ctx.arc(olyHdX, drawY - 22, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(olyHdX + 2, drawY - 36, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 파티클 & 팝업
    for (let i = olyHdParticles.length - 1; i >= 0; i--) {
      const pt = olyHdParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyHdParticles.splice(i, 1);
    }

    for (let i = olyHdPopups.length - 1; i >= 0; i--) {
      const pop = olyHdPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyHdPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const secText = (olyHdElapsedMs / 1000).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(olyHdDistM)}m / ${OLY_HD_GOAL_M}m · ${secText}s`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`허들 통과 ${olyHdClearedCount}/${olyHdHurdles.length}`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyHdBestCs > 0 ? `${(olyHdBestCs / 100).toFixed(2)}s` : "--.--s";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyHdFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏃 110m 완주 ${(olyHdScoreCs / 100).toFixed(2)}s`, canvas.width / 2, 176);

      ctx.fillStyle = "#9898a6";
      ctx.font = "600 12px sans-serif";
      ctx.fillText(
        `통과 ${olyHdClearedCount}/${olyHdHurdles.length} · 충돌 ${olyHdHitCount}회`,
        canvas.width / 2,
        198
      );

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 222);
      } else {
        ctx.fillStyle = "#ff8ca5";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 도전", canvas.width / 2, 222);
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
  id: "oly-hurdles",
  title: "110m 허들",
  icon: "🏃",
  desc: "110m 트랙을 질주하며 허들을 넘고 최단 완주 기록에 도전!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "s",
  hint: "좌/우 번갈아 달리기 · 허들 앞에서 상단 터치(PC: ↑/W/Space)로 점프!",
  rankingTitle: "🏃 110m 허들 TOP 5 (최단 시간)",
  dbNode: "oly_hurdle_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}s`,
  getBadge: () => (olyHdBestCs > 0 ? `BEST ${(olyHdBestCs / 100).toFixed(2)}s` : "BEST --.--s"),
  getScore: () => olyHdLastScore,
  reset: resetOlyHurdles,
  draw: drawOlyHurdlesFrame,
  stop: () => {
    olyHdRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyHdFinished || olyHdOver || !olyHdRunning) {
      if (!canRestartNow()) return;
      resetOlyHurdles();
      return;
    }
    if (y < 190) {
      jumpOlyHurdles();
    } else {
      stepOlyHurdlesStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olyHdFinished || olyHdOver || !olyHdRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyHurdles();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) jumpOlyHurdles();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyHurdlesStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyHurdlesStride(1);
    }
  }
});
