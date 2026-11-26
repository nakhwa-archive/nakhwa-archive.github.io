/* ---------- 올림픽 14. 쇼트트랙 (Short Track - Edge Hold & Kick) ---------- */
var olyStRunning = false;
var olyStOver = false;
var olyStFinished = false;

var olyStDistM = 0; // 현재 주행 거리 (0 ~ 1000m)
var olyStSpeed = 0; // 현재 빙판 속도
var olyStHoldDir = 0; // -1: 좌 엣지 홀드, 0: 중립, +1: 우 엣지 홀드
var olyStKickCooldown = 0;
var olyStFrame = 0;
var olyStElapsedMs = 0;
var olyStLastTickMs = 0;

var olyStX = 115;
var olyStY = 238;
var olyStSprintFrames = 0;
var olyStLeanAngle = 0;

var olyStScoreCs = 0;
var olyStLastScore = 0;
var olyStBestCs = loadOlyStBestCs();
var olyStParticles = [];
var olyStPopups = [];

var OLY_ST_GOAL_M = 1000;
var OLY_ST_LAP_M = 250;
var OLY_ST_TRACK_Y = 238;
var OLY_ST_PX_PER_M = 4.5;

function loadOlyStBestCs() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyShortTrackBestCs"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyStBestCs(cs) {
  try {
    localStorage.setItem("nakhwaOlyShortTrackBestCs", String(cs));
  } catch (_) {}
}

function resetOlyShortTrack() {
  olyStDistM = 0;
  olyStSpeed = 0;
  olyStHoldDir = 0;
  olyStKickCooldown = 0;
  olyStFrame = 0;
  olyStElapsedMs = 0;
  olyStLastTickMs = performance.now();

  olyStX = 115;
  olyStY = OLY_ST_TRACK_Y;
  olyStSprintFrames = 0;
  olyStLeanAngle = 0;

  olyStScoreCs = 0;
  olyStLastScore = 0;
  olyStParticles = [];
  olyStPopups = [];

  olyStOver = false;
  olyStFinished = false;
  olyStRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyStPopup(x, y, text, color) {
  olyStPopups.push({ x, y, text, color, life: 34 });
}

function spawnOlyStSpark(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 0.7 + Math.random() * Math.PI * 0.6;
    const sp = 1.3 + Math.random() * 2.5;
    olyStParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.7,
      r: 2 + Math.random() * 2,
      color,
      life: 18
    });
  }
}

function isOlyStCornerZone() {
  const lapPos = olyStDistM % OLY_ST_LAP_M;
  const ratio = lapPos / OLY_ST_LAP_M;
  return (ratio >= 0.22 && ratio <= 0.48) || (ratio >= 0.72 && ratio <= 0.98);
}

function setOlyShortTrackHold(dir) {
  if (!olyStRunning || olyStOver || olyStFinished) return;
  olyStHoldDir = dir;
}

function triggerOlyShortTrackKick() {
  if (!olyStRunning || olyStOver || olyStFinished) return;
  if (olyStKickCooldown > 0) return;

  const inCorner = isOlyStCornerZone();
  const optimalHold = (inCorner && olyStHoldDir === -1) || (!inCorner && olyStHoldDir === 1);

  if (optimalHold) {
    olyStSpeed = Math.min(3.3, olyStSpeed + 0.54);
    olyStKickCooldown = 14;
    olyStSprintFrames = 20;
    spawnOlyStSpark(olyStX - 8, olyStY + 6, "#ffd166", 14);
    addOlyStPopup(
      olyStX,
      olyStY - 34,
      inCorner ? "⚡ APEX KICK!" : "🚀 STRAIGHT KICK!",
      "#ffd166"
    );
  } else {
    olyStSpeed = Math.min(3.1, olyStSpeed + 0.22);
    olyStKickCooldown = 18;
    olyStSprintFrames = 12;
    spawnOlyStSpark(olyStX - 8, olyStY + 6, "#72efdd", 8);
    addOlyStPopup(olyStX, olyStY - 30, "💨 KICK", "#72efdd");
  }
}

function finishOlyShortTrack() {
  olyStFinished = true;
  olyStRunning = false;

  const finalSec = Number((olyStElapsedMs / 1000).toFixed(2));
  const cs = Math.max(1, Math.round(finalSec * 100));
  olyStScoreCs = cs;
  olyStLastScore = cs;

  spawnOlyStSpark(olyStX, olyStY + 4, "#ffd166", 16);

  const isNewBest = olyStBestCs === 0 || olyStScoreCs < olyStBestCs;
  if (isNewBest) {
    olyStBestCs = olyStScoreCs;
    saveOlyStBestCs(olyStBestCs);
  }

  triggerGameOver(isNewBest, true);
}

function updateOlyShortTrack() {
  if (!olyStRunning || olyStOver || olyStFinished) return;

  const now = performance.now();
  const dtMs = Math.min(100, Math.max(0, now - (olyStLastTickMs || now)));
  olyStLastTickMs = now;
  olyStElapsedMs += dtMs;
  olyStFrame++;

  if (olyStKickCooldown > 0) olyStKickCooldown--;
  if (olyStSprintFrames > 0) olyStSprintFrames--;

  const inCorner = isOlyStCornerZone();

  // 연타 대신 엣지 홀드 유지에 따른 가속/그립 변화
  if (inCorner) {
    if (olyStHoldDir === -1) {
      // 코너 안쪽 좌 엣지 홀드: 속도를 끌어올리며 바짝 붙어 돔
      olyStSpeed = Math.min(3.15, olyStSpeed + 0.032);
      olyStLeanAngle = -0.34;
      if (olyStFrame % 5 === 0) spawnOlyStSpark(olyStX - 8, olyStY + 6, "#72efdd", 2);
    } else if (olyStHoldDir === 1) {
      // 코너에서 바깥쪽 우 엣지 홀드: 코너 저항으로 감속
      olyStSpeed = Math.max(0.35, olyStSpeed - 0.022);
      olyStLeanAngle = 0.14;
    } else {
      olyStLeanAngle *= 0.85;
    }
  } else {
    if (olyStHoldDir === 1) {
      // 직선 구간 우 엣지 홀드: 쭉 뻗으며 가속
      olyStSpeed = Math.min(3.2, olyStSpeed + 0.034);
      olyStLeanAngle = -0.14;
      if (olyStFrame % 5 === 0) spawnOlyStSpark(olyStX - 8, olyStY + 6, "#a8f0ff", 2);
    } else if (olyStHoldDir === -1) {
      // 직선에서 좌 엣지 홀드: 약간 감속
      olyStSpeed = Math.max(0.35, olyStSpeed - 0.015);
      olyStLeanAngle = -0.22;
    } else {
      olyStLeanAngle *= 0.85;
    }
  }

  const minSpeed = olyStDistM > 0.4 ? 0.42 : 0;
  olyStSpeed = Math.max(minSpeed, olyStSpeed * 0.986);
  olyStDistM += olyStSpeed * 1.15;

  if (olyStDistM >= OLY_ST_GOAL_M) {
    olyStDistM = OLY_ST_GOAL_M;
    finishOlyShortTrack();
  }
}

function drawOlyShortTrackFrame() {
  try {
    ctx.save();
    updateOlyShortTrack();

    // 배경 & 쇼트트랙 링크
    ctx.fillStyle = "#0d131d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#162033";
    ctx.fillRect(0, 0, canvas.width, 130);

    const inCorner = isOlyStCornerZone();
    ctx.fillStyle = inCorner ? "#bfe3f7" : "#d4ecf9";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 단일 지면 스크롤 기준으로 빙판 패턴과 마커를 함께 왼쪽으로 당김
    const groundScrollPx = olyStDistM * OLY_ST_PX_PER_M;
    const scrollOffset = groundScrollPx % 56;

    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    for (let x = -scrollOffset; x < canvas.width + 56; x += 56) {
      ctx.fillRect(x, 162, 24, 2);
      ctx.fillRect(x + 14, 308, 24, 2);
    }

    ctx.fillStyle = "#e63946";
    ctx.fillRect(0, 148, canvas.width, 3);
    ctx.fillRect(0, 322, canvas.width, 3);

    const markers = [250, 500, 750, 1000];
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const mx = olyStX + (m - olyStDistM) * OLY_ST_PX_PER_M;
      if (mx >= -45 && mx <= canvas.width + 45) {
        const isGoal = m === OLY_ST_GOAL_M;
        ctx.fillStyle = isGoal ? "#e63946" : "#1d4ed8";
        ctx.fillRect(mx - 1.5, 132, 3, 206);
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isGoal ? "FINISH 1000m" : `${m}m`, mx, 124);
      }
    }

    // 구간 & 홀드 상태 안내 배너
    ctx.fillStyle = inCorner ? "#ffd166" : "#72efdd";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    const zoneGuide = inCorner
      ? "⚡ CORNER: ◀ 좌 엣지 홀드로 붙고 ↑/Space 킥!"
      : "➡️ STRAIGHT: ▶ 우 엣지 홀드로 뻗고 ↑/Space 킥!";
    ctx.fillText(zoneGuide, canvas.width * 0.5, 96);

    // 하단 조작 가이드
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b2e3d";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = olyStHoldDir === -1 ? "#ffd166" : "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 좌 엣지 홀드 (←/A)", canvas.width * 0.25, 370);

    ctx.fillStyle = olyStHoldDir === 1 ? "#ffd166" : "#9898a6";
    ctx.fillText("우 엣지 홀드 (→/D) ▶", canvas.width * 0.75, 370);

    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 스퍼트 킥", canvas.width * 0.5, 392);

    // 스케이터 캐릭터
    const bob = Math.sin(olyStFrame * 0.42) * (olyStSpeed > 0.35 ? 2.5 : 0.6);
    const stride = Math.sin(olyStFrame * 0.62) * (olyStSpeed > 0.35 ? 12 : 1.5);
    const drawY = olyStY + bob;

    ctx.save();
    ctx.translate(olyStX, drawY);
    ctx.rotate(olyStLeanAngle);

    ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 17, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-13 + stride * 0.5, 11);
    ctx.lineTo(13 + stride * 0.5, 11);
    ctx.stroke();

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(stride, 10);
    ctx.moveTo(-2, -2);
    ctx.lineTo(-stride, 10);
    ctx.stroke();

    ctx.fillStyle = olyStSprintFrames > 0 ? "#ffd166" : "#e65c7b";
    ctx.beginPath();
    ctx.ellipse(2, -8, 12.5, 7, -0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#72efdd";
    ctx.beginPath();
    ctx.arc(12, -15, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 파티클 & 팝업
    for (let i = olyStParticles.length - 1; i >= 0; i--) {
      const pt = olyStParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.11;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 18);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyStParticles.splice(i, 1);
    }

    for (let i = olyStPopups.length - 1; i >= 0; i--) {
      const pop = olyStPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyStPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const secText = (olyStElapsedMs / 1000).toFixed(2);
    const lapNow = Math.min(4, Math.floor(olyStDistM / OLY_ST_LAP_M) + 1);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(olyStDistM)}m / ${OLY_ST_GOAL_M}m · ${secText}s`, 12, 21);

    const holdLabel =
      olyStHoldDir === -1 ? "좌 엣지 홀드" : olyStHoldDir === 1 ? "우 엣지 홀드" : "중립 활주";
    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`LAP ${lapNow}/4 · ${holdLabel}`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyStBestCs > 0 ? `${(olyStBestCs / 100).toFixed(2)}s` : "--.--s";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyStFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`⚡ 1000m 쇼트트랙 ${(olyStScoreCs / 100).toFixed(2)}s`, canvas.width / 2, 182);

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
  id: "oly-shorttrack",
  title: "쇼트트랙",
  icon: "⚡",
  desc: "코너/직선 엣지 홀드와 타이밍 스퍼트 킥으로 1000m 최단 기록에 도전!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "s",
  hint: "코너는 ◀ 좌 홀드, 직선은 ▶ 우 홀드 유지 · 타이밍 맞춰 ↑/W/Space(상단 터치) 킥!",
  rankingTitle: "⚡ 쇼트트랙 TOP 5 (최단 시간)",
  dbNode: "oly_shorttrack_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}s`,
  getBadge: () => (olyStBestCs > 0 ? `BEST ${(olyStBestCs / 100).toFixed(2)}s` : "BEST --.--s"),
  getScore: () => olyStLastScore,
  reset: resetOlyShortTrack,
  draw: drawOlyShortTrackFrame,
  stop: () => {
    olyStRunning = false;
    olyStHoldDir = 0;
  },
  onPointerDown: (x, y) => {
    if (olyStFinished || olyStOver || !olyStRunning) {
      if (!canRestartNow()) return;
      resetOlyShortTrack();
      return;
    }
    if (y < 190) {
      triggerOlyShortTrackKick();
    } else {
      setOlyShortTrackHold(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onPointerUp: () => {
    if (!olyStRunning) return;
    setOlyShortTrackHold(0);
  },
  onKeyDown: (e) => {
    if (olyStFinished || olyStOver || !olyStRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyShortTrack();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlyShortTrackKick();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      setOlyShortTrackHold(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      setOlyShortTrackHold(1);
    }
  },
  onKeyUp: (e) => {
    if (!olyStRunning) return;
    if (
      (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") &&
      olyStHoldDir === -1
    ) {
      setOlyShortTrackHold(0);
    } else if (
      (e.key === "ArrowRight" || e.key === "d" || e.key === "D") &&
      olyStHoldDir === 1
    ) {
      setOlyShortTrackHold(0);
    }
  }
});