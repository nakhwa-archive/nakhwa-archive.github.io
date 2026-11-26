/* ---------- 올림픽 13. 스피드 스케이팅 (Speed Skating) ---------- */
var olySkRunning = false;
var olySkOver = false;
var olySkFinished = false;

var olySkDistM = 0; // 현재 주행 거리 (0 ~ 500m)
var olySkSpeed = 0; // 현재 빙판 속도
var olySkLastSide = 0;
var olySkLastStepFrame = 0;
var olySkFrame = 0;
var olySkElapsedMs = 0;
var olySkLastTickMs = 0;

var olySkX = 110;
var olySkY = 238;
var olySkBoostFrames = 0;

var olySkScoreCs = 0; // 센티초 (예: 3450 => 34.50s, 낮을수록 좋음)
var olySkLastScore = 0;
var olySkBestCs = loadOlySkBestCs();
var olySkParticles = [];
var olySkPopups = [];

var OLY_SK_GOAL_M = 500;
var OLY_SK_TRACK_Y = 238;
var OLY_SK_PX_PER_M = 6;

function loadOlySkBestCs() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlySpeedSkatingBestCs"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlySkBestCs(cs) {
  try {
    localStorage.setItem("nakhwaOlySpeedSkatingBestCs", String(cs));
  } catch (_) {}
}

function resetOlySpeedSkating() {
  olySkDistM = 0;
  olySkSpeed = 0;
  olySkLastSide = 0;
  olySkLastStepFrame = 0;
  olySkFrame = 0;
  olySkElapsedMs = 0;
  olySkLastTickMs = performance.now();

  olySkX = 110;
  olySkY = OLY_SK_TRACK_Y;
  olySkBoostFrames = 0;

  olySkScoreCs = 0;
  olySkLastScore = 0;
  olySkParticles = [];
  olySkPopups = [];

  olySkOver = false;
  olySkFinished = false;
  olySkRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlySkPopup(x, y, text, color) {
  olySkPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlySkIceBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 0.75 + Math.random() * Math.PI * 0.5;
    const sp = 1.2 + Math.random() * 2.5;
    olySkParticles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 0.6,
      r: 2 + Math.random() * 2,
      color,
      life: 20
    });
  }
}

function stepOlySpeedSkatingStride(side) {
  if (!olySkRunning || olySkOver || olySkFinished) return;

  const gapFrames = olySkFrame - olySkLastStepFrame;
  const alternating = olySkLastSide !== side;

  if (alternating) {
    // 리듬이 맞을수록 얼음 날 차기 가속도가 크게 붙음
    const gain = gapFrames >= 5 && gapFrames <= 18 ? 0.30 : 0.20;
    olySkSpeed = Math.min(2.6, olySkSpeed + gain);
    spawnOlySkIceBurst(olySkX - 10, olySkY + 6, "#d8f3ff", 5);
  } else {
    olySkSpeed = Math.max(0.2, olySkSpeed - 0.12);
    addOlySkPopup(canvas.width * 0.5, 175, "좌/우 교대!", "#9898a6");
  }

  olySkLastSide = side;
  olySkLastStepFrame = olySkFrame;
}

function triggerOlySpeedSkatingEdgeBoost() {
  if (!olySkRunning || olySkOver || olySkFinished) return;
  if (olySkBoostFrames > 0) return;

  olySkSpeed = Math.min(2.7, olySkSpeed + 0.38);
  olySkBoostFrames = 18;
  spawnOlySkIceBurst(olySkX - 8, olySkY + 6, "#ffd166", 12);
  addOlySkPopup(olySkX, olySkY - 34, "⛸️ EDGE BOOST!", "#ffd166");
}

function finishOlySpeedSkating() {
  olySkFinished = true;
  olySkRunning = false;

  const finalSec = Number((olySkElapsedMs / 1000).toFixed(2));
  const cs = Math.max(1, Math.round(finalSec * 100));
  olySkScoreCs = cs;
  olySkLastScore = cs;

  spawnOlySkIceBurst(olySkX, olySkY + 4, "#72efdd", 16);

  const isNewBest = olySkBestCs === 0 || olySkScoreCs < olySkBestCs;
  if (isNewBest) {
    olySkBestCs = olySkScoreCs;
    saveOlySkBestCs(olySkBestCs);
  }

  triggerGameOver(isNewBest, true);
}

function updateOlySpeedSkating() {
  if (!olySkRunning || olySkOver || olySkFinished) return;

  const now = performance.now();
  const dtMs = Math.min(100, Math.max(0, now - (olySkLastTickMs || now)));
  olySkLastTickMs = now;
  olySkElapsedMs += dtMs;
  olySkFrame++;

  if (olySkBoostFrames > 0) olySkBoostFrames--;

  // 얼음판 특성: 마찰 감속이 완만해서(0.984) 활주 여운이 길게 남음
  const minGlideSpeed = olySkDistM > 0.5 ? 0.35 : 0;
  olySkSpeed = Math.max(minGlideSpeed, olySkSpeed * 0.984);
  olySkDistM += olySkSpeed * 0.62;

  if (olySkDistM >= OLY_SK_GOAL_M) {
    olySkDistM = OLY_SK_GOAL_M;
    finishOlySpeedSkating();
  }
}

function drawOlySpeedSkatingFrame() {
  try {
    ctx.save();
    updateOlySpeedSkating();

    // 배경 & 아이스 링크
    ctx.fillStyle = "#0f1520";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#172234";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 빙판 트랙 영역
    ctx.fillStyle = "#cfe9f7";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 단일 지면 스크롤 기준으로 빙판 패턴과 거리 마커를 함께 왼쪽으로 당김
    const groundScrollPx = olySkDistM * OLY_SK_PX_PER_M;
    const scrollOffset = groundScrollPx % 64;

    // 얼음 반사광 & 트랙 가이드 라인
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    for (let x = -scrollOffset; x < canvas.width + 64; x += 64) {
      ctx.fillRect(x, 166, 28, 2);
      ctx.fillRect(x + 20, 304, 28, 2);
    }

    ctx.fillStyle = "rgba(38, 84, 124, 0.25)";
    ctx.fillRect(0, 152, canvas.width, 2);
    ctx.fillRect(0, 322, canvas.width, 2);

    // 거리 마커 (100m, 200m, 300m, 400m, 500m FINISH)
    const markers = [100, 200, 300, 400, 500];
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const mx = olySkX + (m - olySkDistM) * OLY_SK_PX_PER_M;
      if (mx >= -40 && mx <= canvas.width + 40) {
        const isGoal = m === OLY_SK_GOAL_M;
        ctx.fillStyle = isGoal ? "#e63946" : "#2b6cb0";
        ctx.fillRect(mx - 1.5, 132, 3, 206);
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isGoal ? "FINISH 500m" : `${m}m`, mx, 124);
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
    ctx.fillText("◀ 좌 엣지 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("우 엣지 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 코너/스퍼트 킥", canvas.width * 0.5, 392);

    // 스케이터 캐릭터 (숙인 스피드 자세 + 날 움직임)
    const glideBob = Math.sin(olySkFrame * 0.35) * (olySkSpeed > 0.3 ? 2.2 : 0.5);
    const skateStride = Math.sin(olySkFrame * 0.5) * (olySkSpeed > 0.3 ? 11 : 1.5);
    const drawY = olySkY + glideBob;

    // 그림자
    ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
    ctx.beginPath();
    ctx.ellipse(olySkX, drawY + 14, 18, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 스케이트 날
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(olySkX - 14 + skateStride * 0.5, drawY + 11);
    ctx.lineTo(olySkX + 14 + skateStride * 0.5, drawY + 11);
    ctx.stroke();

    // 다리
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(olySkX - 2, drawY - 2);
    ctx.lineTo(olySkX + skateStride, drawY + 10);
    ctx.moveTo(olySkX - 2, drawY - 2);
    ctx.lineTo(olySkX - skateStride, drawY + 10);
    ctx.stroke();

    // 상체 수트 & 헬멧
    ctx.fillStyle = olySkBoostFrames > 0 ? "#00b4d8" : "#e65c7b";
    ctx.beginPath();
    ctx.ellipse(olySkX + 2, drawY - 8, 13, 7, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(olySkX + 13, drawY - 15, 7, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = olySkParticles.length - 1; i >= 0; i--) {
      const pt = olySkParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.1;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olySkParticles.splice(i, 1);
    }

    for (let i = olySkPopups.length - 1; i >= 0; i--) {
      const pop = olySkPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olySkPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const secText = (olySkElapsedMs / 1000).toFixed(2);
    const kmhApprox = Math.round(olySkSpeed * 24);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(olySkDistM)}m / ${OLY_SK_GOAL_M}m · ${secText}s`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`속도 약 ${kmhApprox}km/h · 얼음 활주 중`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olySkBestCs > 0 ? `${(olySkBestCs / 100).toFixed(2)}s` : "--.--s";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 화면
    if (olySkFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`⛸️ 500m 스피드스케이팅 ${(olySkScoreCs / 100).toFixed(2)}s`, canvas.width / 2, 182);

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
  id: "oly-speedskating",
  title: "스피드 스케이팅",
  icon: "⛸️",
  desc: "얼음 위 엣지 스트라이드와 스퍼트 킥으로 500m 최단 기록에 도전!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "s",
  hint: "좌/우 번갈아 엣지 차기 · 상단 터치(PC: ↑/W/Space)로 스퍼트 킥!",
  rankingTitle: "⛸️ 스피드 스케이팅 TOP 5 (최단 시간)",
  dbNode: "oly_speedskating_scores",
  formatScore: (score) => `${(score / 100).toFixed(2)}s`,
  getBadge: () => (olySkBestCs > 0 ? `BEST ${(olySkBestCs / 100).toFixed(2)}s` : "BEST --.--s"),
  getScore: () => olySkLastScore,
  reset: resetOlySpeedSkating,
  draw: drawOlySpeedSkatingFrame,
  stop: () => {
    olySkRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olySkFinished || olySkOver || !olySkRunning) {
      if (!canRestartNow()) return;
      resetOlySpeedSkating();
      return;
    }
    if (y < 190) {
      triggerOlySpeedSkatingEdgeBoost();
    } else {
      stepOlySpeedSkatingStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (olySkFinished || olySkOver || !olySkRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlySpeedSkating();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerOlySpeedSkatingEdgeBoost();
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlySpeedSkatingStride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlySpeedSkatingStride(1);
    }
  }
});