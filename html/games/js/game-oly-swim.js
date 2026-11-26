/* ---------- 올림픽 8. 100m 자유형 수영 (100m Freestyle) ---------- */
var olySwRunning = false;
var olySwOver = false;
var olySwFinished = false;

var olySwDistM = 0; // 현재 수영 거리 (0 ~ 100m)
var olySwSpeed = 0; // 현재 추진 속도
var olySwTurned = false; // 50m 턴 여부
var olySwTurnBoostUsed = false;

var olySwLastSide = 0;
var olySwLastStepFrame = 0;
var olySwFrame = 0;
var olySwElapsedMs = 0;
var olySwLastTickMs = 0;

var olySwX = 105;
var olySwY = 238;
var olySwBoostFrames = 0;

var olySwScoreCs = 0; // 센티초 (예: 4825 => 48.25s, 낮을수록 좋음)
var olySwLastScore = 0;
var olySwBestCs = loadOlySwBestCs();
var olySwParticles = [];
var olySwPopups = [];

var OLY_SW_GOAL_M = 100;
var OLY_SW_TURN_M = 50;
var OLY_SW_LANE_Y = 238;
var OLY_SW_PX_PER_M = 24;

function loadOlySwBestCs() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyFreestyleBestCs"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlySwBestCs(cs) {
  try {
    localStorage.setItem("nakhwaOlyFreestyleBestCs", String(cs));
  } catch (_) {}
}

function resetOlyFreestyle() {
  olySwDistM = 0;
  olySwSpeed = 0;
  olySwTurned = false;
  olySwTurnBoostUsed = false;

  olySwLastSide = 0;
  olySwLastStepFrame = 0;
  olySwFrame = 0;
  olySwElapsedMs = 0;
  olySwLastTickMs = performance.now();

  olySwX = 105;
  olySwY = OLY_SW_LANE_Y;
  olySwBoostFrames = 0;

  olySwScoreCs = 0;
  olySwLastScore = 0;
  olySwParticles = [];
  olySwPopups = [];

  olySwOver = false;
  olySwFinished = false;
  olySwRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlySwPopup(x, y, text, color) {
  olySwPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlySwSplash(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.random() * Math.PI;
    const sp = 1.0 + Math.random() * 2.2;
    olySwParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.6,
      r: 2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function stepOlyFreestyleStroke(side) {
  if (!olySwRunning || olySwOver || olySwFinished) return;

  const gapFrames = olySwFrame - olySwLastStepFrame;
  const alternating = olySwLastSide !== side;

  if (alternating) {
    const gain = gapFrames >= 5 && gapFrames <= 18 ? 0.27 : 0.18;
    olySwSpeed = Math.min(2.3, olySwSpeed + gain);
    spawnOlySwSplash(olySwX - 10, olySwY - 6, "#a8f0ff", 5);
  } else {
    olySwSpeed = Math.max(0.16, olySwSpeed - 0.14);
    addOlySwPopup(canvas.width * 0.5, 175, "좌/우 교대 스트로크!", "#b8d4e8");
  }

  olySwLastSide = side;
  olySwLastStepFrame = olySwFrame;
}

function triggerOlyFreestyleBoost() {
  if (!olySwRunning || olySwOver || olySwFinished) return;

  const nearTurn = Math.abs(olySwDistM - OLY_SW_TURN_M) <= 5.5;
  if (nearTurn && !olySwTurnBoostUsed) {
    olySwTurnBoostUsed = true;
    olySwSpeed = Math.min(2.4, olySwSpeed + 0.45);
    olySwBoostFrames = 26;
    spawnOlySwSplash(olySwX, olySwY - 8, "#ffd166", 14);
    addOlySwPopup(olySwX, olySwY - 34, "🌊 TURN BOOST!", "#ffd166");
  } else if (olySwBoostFrames <= 0) {
    olySwSpeed = Math.min(2.35, olySwSpeed + 0.16);
    olySwBoostFrames = 14;
    spawnOlySwSplash(olySwX - 6, olySwY - 6, "#72efdd", 8);
    addOlySwPopup(olySwX, olySwY - 30, "💧 BREATH PUSH!", "#72efdd");
  }
}

function finishOlyFreestyle() {
  olySwFinished = true;
  olySwRunning = false;

  const finalSec = Number((olySwElapsedMs / 1000).toFixed(2));
  const cs = Math.max(1, Math.round(finalSec * 100));
  olySwScoreCs = cs;
  olySwLastScore = cs;

  spawnOlySwSplash(olySwX, olySwY - 8, "#ffd166", 18);

  const isNewBest = olySwBestCs === 0 || olySwScoreCs < olySwBestCs;
  if (isNewBest) {
    olySwBestCs = olySwScoreCs;
    saveOlySwBestCs(olySwBestCs);
  }

  triggerGameOver(isNewBest, true);
}

function updateOlyFreestyle() {
  if (!olySwRunning || olySwOver || olySwFinished) return;

  const now = performance.now();
  const dtMs = Math.min(100, Math.max(0, now - (olySwLastTickMs || now)));
  olySwLastTickMs = now;
  olySwElapsedMs += dtMs;
  olySwFrame++;

  if (olySwBoostFrames > 0) olySwBoostFrames--;

  const floorSpeed = olySwDistM > 0.2 ? 0.24 : 0;
  olySwSpeed = Math.max(floorSpeed, olySwSpeed * 0.972);
  olySwDistM += olySwSpeed * 0.12;

  if (!olySwTurned && olySwDistM >= OLY_SW_TURN_M) {
    olySwTurned = true;
    addOlySwPopup(olySwX, olySwY - 34, "🔄 50m RETURN!", "#72efdd");
  }

  if (olySwDistM >= OLY_SW_GOAL_M) {
    olySwDistM = OLY_SW_GOAL_M;
    finishOlyFreestyle();
  }
}

function drawOlyFreestyleFrame() {
  try {
    ctx.save();
    updateOlyFreestyle();

    // 배경 & 수영장
    ctx.fillStyle = "#0e1522";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#142238";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 수면/레인 영역
    ctx.fillStyle = olySwTurned ? "#175676" : "#134663";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 물결 라인 스크롤
    const scrollPx = (olySwDistM * OLY_SW_PX_PER_M) % 56;
    ctx.fillStyle = "rgba(168, 240, 255, 0.25)";
    for (let x = -scrollPx; x < canvas.width + 56; x += 56) {
      const waveY = Math.sin((x + olySwFrame * 4) * 0.05) * 3;
      ctx.fillRect(x, 168 + waveY, 24, 2);
      ctx.fillRect(x + 16, 298 - waveY, 24, 2);
    }

    // 레인 구분선
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(0, 152, canvas.width, 2);
    ctx.fillRect(0, 322, canvas.width, 2);

    // 거리 마커 (25m, 50m TURN, 75m, 100m FINISH)
    const markers = [25, 50, 75, 100];
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const mx = olySwX + (m - olySwDistM) * OLY_SW_PX_PER_M;
      if (mx >= -45 && mx <= canvas.width + 45) {
        const isTurn = m === OLY_SW_TURN_M;
        const isGoal = m === OLY_SW_GOAL_M;
        ctx.fillStyle = isGoal ? "#72efdd" : isTurn ? "#ffd166" : "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(mx - 1, 132, 3, 206);
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isGoal ? "FINISH 100m" : isTurn ? "TURN 50m" : `${m}m`, mx, 124);
      }
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
    ctx.fillText("◀ 좌 스트로크 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("우 스트로크 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 브레스 / 50m 턴 부스트", canvas.width * 0.5, 392);

    // 수영 선수 캐릭터
    const strokeBob = Math.sin(olySwFrame * 0.42) * (olySwSpeed > 0.25 ? 3.5 : 0.8);
    const armSwing = Math.sin(olySwFrame * 0.55) * (olySwSpeed > 0.25 ? 14 : 2);
    const drawY = olySwY + strokeBob;

    // 물속 몸체
    ctx.fillStyle = olySwBoostFrames > 0 ? "#72efdd" : "#e65c7b";
    ctx.beginPath();
    ctx.ellipse(olySwX, drawY + 4, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 머리 & 수영모
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olySwX + 18, drawY - 2, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 팔 스트로크
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(olySwX + 6, drawY);
    ctx.lineTo(olySwX + 6 + armSwing, drawY - 12);
    ctx.stroke();

    // 파티클 & 팝업
    for (let i = olySwParticles.length - 1; i >= 0; i--) {
      const pt = olySwParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.11;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olySwParticles.splice(i, 1);
    }

    for (let i = olySwPopups.length - 1; i >= 0; i--) {
      const pop = olySwPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olySwPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const secText = (olySwElapsedMs / 1000).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(olySwDistM)}m / ${OLY_SW_GOAL_M}m · ${secText}s`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(olySwTurned ? "구간: 50~100m 리턴" : "구간: 0~50m 아웃", 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olySwBestCs > 0 ? `${(olySwBestCs / 100).toFixed(2)}s` : "--.--s";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 화면
    if (olySwFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏊 100m 자유형 ${(olySwScoreCs / 100).toFixed(2)}s`, canvas.width / 2, 182);

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
  id: "oly-freestyle",
  title: "100m 자유형",
  icon: "🏊",
  desc: "좌/우 교대 스트로크와 50m 턴 부스트로 최단 완주 기록에 도전!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "s",
  hint: "좌/우 번갈아 스트로크 · 50m 턴 부근 상단 터치(PC: ↑/W/Space)로 부스트!",
  rankingTitle: "🏊 100m 자유형 TOP 5 (최단 시간)",
  dbNode: "oly_freestyle_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}s`,
  getBadge: () => (olySwBestCs > 0 ? `BEST ${(olySwBestCs / 100).toFixed(2)}s` : "BEST --.--s"),
  getScore: () => olySwLastScore,
  reset: resetOlyFreestyle,
  draw: drawOlyFreestyleFrame,
  stop: () => {
    olySwRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olySwFinished || olySwOver || !olySwRunning) {
      if (!canRestartNow()) return;
      resetOlyFreestyle();
      return;
    }
    if (y < 190) {
      triggerOlyFreestyleBoost();
    } else {
      stepOlyFreestyleStroke(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olySwFinished || olySwOver || !olySwRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyFreestyle();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlyFreestyleBoost();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlyFreestyleStroke(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlyFreestyleStroke(1);
    }
  }
});