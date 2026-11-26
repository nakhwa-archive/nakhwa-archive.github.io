/* ---------- 동계 올림픽 5. 컬링 (Curling) 상태 ---------- */
var winCurlRunning = false;
var winCurlOver = false;
var winCurlFinished = false;

var winCurlPhase = "aim"; // "aim" | "slide" | "done"
var winCurlPower = 50; // 0 ~ 100 투구 파워
var winCurlPowerDir = 1;
var winCurlFrame = 0;
var winCurlSweepCount = 0;

var winCurlStoneX = 72;
var winCurlStoneY = 236;
var winCurlStoneVx = 0;
var winCurlStoneVy = 0;
var winCurlFinalDistPx = 999;

var winCurlScore = 0;
var winCurlBest = Number(localStorage.getItem("nakhwaWinCurlingBest") || 0);
var winCurlParticles = [];
var winCurlPopups = [];

var WIN_CURL_HOUSE_X = 248;
var WIN_CURL_HOUSE_Y = 236;

function resetWinCurling() {
  winCurlPhase = "aim";
  winCurlPower = 45;
  winCurlPowerDir = 1;
  winCurlFrame = 0;
  winCurlSweepCount = 0;
  winCurlStoneX = 72;
  winCurlStoneY = WIN_CURL_HOUSE_Y;
  winCurlStoneVx = 0;
  winCurlStoneVy = 0;
  winCurlFinalDistPx = 999;
  winCurlScore = 0;
  winCurlParticles = [];
  winCurlPopups = [];
  winCurlOver = false;
  winCurlFinished = false;
  winCurlRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addWinCurlPopup(x, y, text, color) {
  winCurlPopups.push({ x, y, text, color, life: 36 });
}

function spawnWinCurlBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.2;
    winCurlParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.6,
      r: 2 + Math.random() * 2,
      color,
      life: 20
    });
  }
}

function adjustWinCurlingPower(dir) {
  if (!winCurlRunning || winCurlOver || winCurlFinished || winCurlPhase !== "aim") return;
  winCurlPower = Math.max(5, Math.min(100, winCurlPower + dir * 7));
}

function triggerWinCurlingAction() {
  if (!winCurlRunning || winCurlOver || winCurlFinished) return;

  if (winCurlPhase === "aim") {
    winCurlPhase = "slide";
    // 72% 파워 부근이 하우스 중심(248px)에 딱 멈추는 구간
    winCurlStoneVx = 2.2 + (winCurlPower / 100) * 5.6;
    winCurlStoneVy = (Math.random() - 0.5) * 0.25;
    spawnWinCurlBurst(winCurlStoneX, winCurlStoneY, "#d8f3ff", 8);
    addWinCurlPopup(winCurlStoneX, winCurlStoneY - 26, "🥌 SLIDE! (터치로 스위핑)", "#72efdd");
  } else if (winCurlPhase === "slide" && winCurlSweepCount < 4) {
    winCurlSweepCount++;
    winCurlStoneVx = Math.min(8.2, winCurlStoneVx + 0.65);
    spawnWinCurlBurst(winCurlStoneX - 10, winCurlStoneY + 4, "#ffd166", 7);
    addWinCurlPopup(winCurlStoneX, winCurlStoneY - 24, `🧹 SWEEP #${winCurlSweepCount}!`, "#ffd166");
  }
}

function finishWinCurling() {
  winCurlPhase = "done";
  winCurlFinished = true;
  winCurlRunning = false;

  const dx = winCurlStoneX - WIN_CURL_HOUSE_X;
  const dy = winCurlStoneY - WIN_CURL_HOUSE_Y;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  winCurlFinalDistPx = Math.round(distPx);

  // 하우스 반경(약 58px) 기준 근접 점수 계산 (최대 500점)
  const rawPts = Math.max(10, Math.round(500 - distPx * 6.2));
  winCurlScore = rawPts;

  spawnWinCurlBurst(winCurlStoneX, winCurlStoneY, distPx <= 14 ? "#ffd166" : "#72efdd", 14);

  const isNewBest = winCurlScore > winCurlBest;
  if (isNewBest) {
    winCurlBest = winCurlScore;
    localStorage.setItem("nakhwaWinCurlingBest", String(winCurlBest));
  }

  triggerGameOver(isNewBest, winCurlScore > 0);
}

function drawWinCurlingFrame() {
  try {
    ctx.save();

    if (winCurlRunning && !winCurlOver && !winCurlFinished) {
      winCurlFrame++;

      if (winCurlPhase === "aim") {
        winCurlPower += winCurlPowerDir * 1.15;
        if (winCurlPower >= 100) {
          winCurlPower = 100;
          winCurlPowerDir = -1;
        } else if (winCurlPower <= 5) {
          winCurlPower = 5;
          winCurlPowerDir = 1;
        }
      } else if (winCurlPhase === "slide") {
        winCurlStoneX += winCurlStoneVx;
        winCurlStoneY += winCurlStoneVy;
        const friction = winCurlSweepCount > 0 ? 0.986 : 0.976;
        winCurlStoneVx *= friction;
        winCurlStoneVy *= 0.96;

        if (winCurlStoneVx < 0.08 || winCurlStoneX >= canvas.width - 18) {
          winCurlStoneVx = 0;
          finishWinCurling();
        }
      }
    }

    // 배경 & 컬링 시트 빙판
    ctx.fillStyle = "#0e1524";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#172338";
    ctx.fillRect(0, 46, canvas.width, 90);

    // 컬링 아이스 시트
    ctx.fillStyle = "#d8f0ff";
    ctx.fillRect(0, 136, canvas.width, 204);

    // 티 라인(가로 중심선)
    ctx.strokeStyle = "rgba(32, 78, 122, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, WIN_CURL_HOUSE_Y);
    ctx.lineTo(canvas.width, WIN_CURL_HOUSE_Y);
    ctx.stroke();

    // 하우스 원형 링 (파랑/하양/빨강/버튼)
    const rings = [
      { r: 58, color: "#1d5fa7" },
      { r: 40, color: "#ffffff" },
      { r: 22, color: "#d6324a" },
      { r: 9, color: "#ffd166" }
    ];
    rings.forEach(ring => {
      ctx.fillStyle = ring.color;
      ctx.beginPath();
      ctx.arc(WIN_CURL_HOUSE_X, WIN_CURL_HOUSE_Y, ring.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 투구 파워 게이지 바(상단 시트 위)
    ctx.fillStyle = "#24324a";
    ctx.fillRect(36, 98, 248, 14);
    ctx.fillStyle = winCurlPower >= 65 && winCurlPower <= 82 ? "#ffd166" : "#72efdd";
    ctx.fillRect(36, 98, 248 * (winCurlPower / 100), 14);

    // 컬링 스톤 렌더링
    ctx.fillStyle = "#333842";
    ctx.beginPath();
    ctx.arc(winCurlStoneX, winCurlStoneY, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(winCurlStoneX, winCurlStoneY, 6, 0, Math.PI * 2);
    ctx.fill();

    // 하단 가이드 존
    ctx.fillStyle = "#141924";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b354a";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#98a6bd";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    if (winCurlPhase === "slide") {
      ctx.fillStyle = "#ffd166";
      ctx.fillText("🧹 투구 중! 터치(PC: ↑/Space)로 스위핑 가속!", canvas.width / 2, 376);
    } else {
      ctx.fillText("◀ 좌/우 파워조절 (←/→) · 위/클릭 투구(↑/Space) ▶", canvas.width / 2, 376);
    }

    // 파티클 & 팝업
    for (let i = winCurlParticles.length - 1; i >= 0; i--) {
      const pt = winCurlParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.08;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) winCurlParticles.splice(i, 1);
    }

    for (let i = winCurlPopups.length - 1; i >= 0; i--) {
      const pop = winCurlPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) winCurlPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 18, 26, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`투구 파워 ${Math.floor(winCurlPower)}% · 스위핑 ${winCurlSweepCount}/4`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("하우스 중앙(노란 버튼)에 가까울수록 고득점!", 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BEST ${winCurlBest}점`, canvas.width - 12, 24);

    // 결과 오버레이
    if (winCurlFinished) {
      ctx.fillStyle = "rgba(15, 18, 26, 0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🥌 컬링 점수 · ${winCurlScore}점`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#72efdd";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 투구하기", canvas.width / 2, 214);
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
  id: "win-curling",
  title: "컬링",
  icon: "🥌",
  desc: "파워 조절과 스위핑으로 하우스 중앙에 스톤을 안착시켜라!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "점",
  hint: "좌/우로 파워 미세조절 · 위/클릭(PC: ↑/Space)으로 투구 후 스위핑!",
  rankingTitle: "🥌 컬링 TOP 5",
  dbNode: "win_curling_scores",
  getBadge: () => `BEST ${winCurlBest}점`,
  getScore: () => winCurlScore,
  reset: resetWinCurling,
  draw: drawWinCurlingFrame,
  stop: () => {
    winCurlRunning = false;
  },
  onPointerDown: (x, y) => {
    if (winCurlFinished || winCurlOver || !winCurlRunning) {
      if (!canRestartNow()) return;
      resetWinCurling();
      return;
    }
    if (winCurlPhase === "slide" || y < 140 || y > 335) {
      triggerWinCurlingAction();
    } else {
      adjustWinCurlingPower(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (winCurlFinished || winCurlOver || !winCurlRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetWinCurling();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) triggerWinCurlingAction();
    } else if (winCurlPhase === "aim" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) adjustWinCurlingPower(-1);
    } else if (winCurlPhase === "aim" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) adjustWinCurlingPower(1);
    }
  }
});