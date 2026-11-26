/* ---------- 동계 올림픽 6. 바이애슬론 (Biathlon) 상태 ---------- */
var winBioRunning = false;
var winBioOver = false;
var winBioFinished = false;

var winBioPhase = "ski"; // "ski" | "shoot" | "done"
var winBioDist = 0; // 0 ~ 300m
var winBioSpeed = 0;
var winBioLastSide = 0;
var winBioLastStepFrame = 0;
var winBioFrame = 0;
var winBioElapsedFrames = 0;
var winBioBonusMs = 0; // 명중 시 단축되는 보너스 시간(ms)

var winBioStage = 0; // 0: 1차 사격(100m), 1: 2차 사격(200m), 2: 사격 완료
var winBioShotsLeft = 0;
var winBioHits = 0;
var winBioAimX = 40;
var winBioAimDir = 1;

var winBioFinalMs = 0;
var winBioLastScore = 0;
var winBioBestMs = Number(localStorage.getItem("nakhwaWinBiathlonBestMs") || 0);
var winBioParticles = [];
var winBioPopups = [];

var WIN_BIO_CENTER_X = 160;
var WIN_BIO_TARGET_Y = 198;

function resetWinBiathlon() {
  winBioPhase = "ski";
  winBioDist = 0;
  winBioSpeed = 0;
  winBioLastSide = 0;
  winBioLastStepFrame = 0;
  winBioFrame = 0;
  winBioElapsedFrames = 0;
  winBioBonusMs = 0;
  winBioStage = 0;
  winBioShotsLeft = 0;
  winBioHits = 0;
  winBioAimX = 40;
  winBioAimDir = 1;
  winBioFinalMs = 0;
  winBioLastScore = 0;
  winBioParticles = [];
  winBioPopups = [];
  winBioOver = false;
  winBioFinished = false;
  winBioRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addWinBioPopup(x, y, text, color) {
  winBioPopups.push({ x, y, text, color, life: 36 });
}

function spawnWinBioBurst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    winBioParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2 + Math.random() * 2.2,
      color,
      life: 20
    });
  }
}

function enterWinBioShooting() {
  winBioPhase = "shoot";
  winBioShotsLeft = 3;
  winBioAimX = 40;
  winBioAimDir = 1;
  addWinBioPopup(WIN_BIO_CENTER_X, 152, "🎯 사격 개시! 중앙 표적 명중 시 -1.5초!", "#ffd166");
}

function stepWinBioStride(side) {
  if (!winBioRunning || winBioOver || winBioFinished || winBioPhase !== "ski") return;

  const diffFrames = winBioFrame - winBioLastStepFrame;
  const isAlternating = winBioLastSide !== side;

  if (isAlternating) {
    const bonus = diffFrames >= 5 && diffFrames <= 17 ? 0.28 : 0.18;
    winBioSpeed = Math.min(1.8, winBioSpeed + bonus);
    spawnWinBioBurst(85, 292, "#d8f3ff", 4);
  } else {
    winBioSpeed = Math.max(0.14, winBioSpeed - 0.12);
    addWinBioPopup(canvas.width * 0.5, 206, "좌/우 교대 스키!", "#9898a6");
  }

  winBioLastSide = side;
  winBioLastStepFrame = winBioFrame;
}

function shootWinBioTarget() {
  if (!winBioRunning || winBioOver || winBioFinished || winBioPhase !== "shoot") return;

  winBioShotsLeft--;
  const diff = Math.abs(winBioAimX - WIN_BIO_CENTER_X);

  if (diff <= 18) {
    winBioHits++;
    winBioBonusMs += 1500;
    spawnWinBioBurst(winBioAimX, WIN_BIO_TARGET_Y, "#72efdd", 12);
    addWinBioPopup(WIN_BIO_CENTER_X, WIN_BIO_TARGET_Y - 26, "🎯 HIT! -1.50초", "#72efdd");
  } else {
    spawnWinBioBurst(winBioAimX, WIN_BIO_TARGET_Y, "#ff4d6d", 6);
    addWinBioPopup(winBioAimX, WIN_BIO_TARGET_Y - 24, "MISS", "#ff8ca5");
  }

  if (winBioShotsLeft <= 0) {
    winBioStage++;
    winBioPhase = "ski";
    winBioDist += 4;
    addWinBioPopup(WIN_BIO_CENTER_X, 160, "🎿 다시 스키 질주!", "#ffd166");
  }
}

function finishWinBiathlon() {
  winBioPhase = "done";
  winBioFinished = true;
  winBioRunning = false;

  const rawMs = Math.round((winBioElapsedFrames / 60) * 1000);
  const netMs = Math.max(3000, rawMs - winBioBonusMs);

  winBioFinalMs = netMs;
  winBioLastScore = netMs;

  const isNewBest = winBioBestMs === 0 || winBioFinalMs < winBioBestMs;
  if (isNewBest) {
    winBioBestMs = winBioFinalMs;
    localStorage.setItem("nakhwaWinBiathlonBestMs", String(winBioBestMs));
  }

  triggerGameOver(isNewBest, true);
}

function drawWinBiathlonFrame() {
  try {
    ctx.save();

    if (winBioRunning && !winBioOver && !winBioFinished) {
      winBioFrame++;
      winBioElapsedFrames++;

      if (winBioPhase === "ski") {
        const minSkiSpeed = winBioDist > 1 ? 0.14 : 0;
        winBioSpeed = Math.max(minSkiSpeed, winBioSpeed * 0.97);
        winBioDist = Math.min(300, winBioDist + winBioSpeed * 0.72);

        // 100m(1차 사격), 200m(2차 사격) 진입 체크
        if (winBioStage === 0 && winBioDist >= 100) {
          winBioDist = 100;
          enterWinBioShooting();
        } else if (winBioStage === 1 && winBioDist >= 200) {
          winBioDist = 200;
          enterWinBioShooting();
        } else if (winBioDist >= 300) {
          finishWinBiathlon();
        }
      } else if (winBioPhase === "shoot") {
        winBioAimX += winBioAimDir * 3.6;
        if (winBioAimX >= 280) {
          winBioAimX = 280;
          winBioAimDir = -1;
        } else if (winBioAimX <= 40) {
          winBioAimX = 40;
          winBioAimDir = 1;
        }
      }
    }

    // 배경 & 바이애슬론 코스/사격장
    ctx.fillStyle = "#0d1524";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#16243d";
    ctx.fillRect(0, 46, canvas.width, 90);

    // 설원 슬로프
    ctx.fillStyle = "#dceeff";
    ctx.fillRect(0, 136, canvas.width, 204);

    if (winBioPhase === "shoot") {
      // 사격 표적 레인지
      ctx.fillStyle = "#1c283d";
      ctx.fillRect(32, 156, canvas.width - 64, 156);

      // 중앙 표적 원
      ctx.strokeStyle = "#ff4d6d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(WIN_BIO_CENTER_X, WIN_BIO_TARGET_Y, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(WIN_BIO_CENTER_X, WIN_BIO_TARGET_Y, 7, 0, Math.PI * 2);
      ctx.fill();

      // 움직이는 조준선
      ctx.strokeStyle = "#72efdd";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(winBioAimX, WIN_BIO_TARGET_Y - 28);
      ctx.lineTo(winBioAimX, WIN_BIO_TARGET_Y + 28);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(winBioAimX, WIN_BIO_TARGET_Y, 10, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 스키 트랙 라인
      ctx.fillStyle = "rgba(32, 78, 122, 0.25)";
      ctx.fillRect(0, 294, canvas.width, 4);

      const snowScroll = (winBioDist * 8) % 52;
      ctx.fillStyle = "rgba(32, 78, 122, 0.35)";
      for (let x = -snowScroll; x < canvas.width + 52; x += 52) {
        ctx.fillRect(x, 296, 16, 2);
      }

      // 바이애슬론 스키어 렌더링
      const skierX = 85;
      const skierY = 266 + Math.sin(winBioFrame * 0.4) * (winBioSpeed > 0.2 ? 3 : 0);
      const stride = Math.sin(winBioFrame * 0.5) * (winBioSpeed > 0.2 ? 10 : 2);

      ctx.strokeStyle = "#e65c7b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(skierX - 18, skierY + 26);
      ctx.lineTo(skierX + 20, skierY + 24);
      ctx.stroke();

      ctx.fillStyle = "#3a86ff";
      ctx.beginPath();
      ctx.arc(skierX, skierY + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(skierX + 3, skierY - 5, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f4f4f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(skierX + 4, skierY + 6);
      ctx.lineTo(skierX + 12 + stride, skierY + 24);
      ctx.stroke();
    }

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
    if (winBioPhase === "shoot") {
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`🎯 조준선이 중앙 표적에 올 때 터치(PC: ↑/Space)! 남은 탄: ${winBioShotsLeft}`, canvas.width / 2, 376);
    } else {
      ctx.fillText("◀ 좌 스키 (←/A) · 100m/200m 사격 · 우 스키 (→/D) ▶", canvas.width / 2, 376);
    }

    // 파티클 & 팝업
    for (let i = winBioParticles.length - 1; i >= 0; i--) {
      const pt = winBioParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 20);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) winBioParticles.splice(i, 1);
    }

    for (let i = winBioPopups.length - 1; i >= 0; i--) {
      const pop = winBioPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) winBioPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 18, 26, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveNetSec = Math.max(0, (winBioElapsedFrames / 60) - winBioBonusMs / 1000).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(winBioDist)}m / 300m · 명중 ${winBioHits}발`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`보정 기록 ${liveNetSec}초 (-${(winBioBonusMs / 1000).toFixed(1)}초)`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = winBioBestMs > 0 ? `${(winBioBestMs / 1000).toFixed(3)}초` : "--.---";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 오버레이
    if (winBioFinished) {
      ctx.fillStyle = "rgba(15, 18, 26, 0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalSec = (winBioFinalMs / 1000).toFixed(3);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🎯 바이애슬론 완주 · ${finalSec}초`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#72efdd";
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
  id: "win-biathlon",
  title: "바이애슬론",
  icon: "🎯",
  desc: "크로스컨트리 스키 질주와 100m/200m 사격 명중 타임 어택!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "초",
  hint: "좌/우 번갈아 스키 · 100m/200m 사격 시 위 터치(PC: ↑/Space)로 명중!",
  rankingTitle: "🎯 바이애슬론 TOP 5 (빠른 순)",
  dbNode: "win_biathlon_scores",
  formatScore: (score) => `${(score / 1000).toFixed(3)}초`,
  getBadge: () => (winBioBestMs > 0 ? `BEST ${(winBioBestMs / 1000).toFixed(3)}초` : "BEST --.---"),
  getScore: () => winBioLastScore,
  reset: resetWinBiathlon,
  draw: drawWinBiathlonFrame,
  stop: () => {
    winBioRunning = false;
  },
  onPointerDown: (x, y) => {
    if (winBioFinished || winBioOver || !winBioRunning) {
      if (!canRestartNow()) return;
      resetWinBiathlon();
      return;
    }
    if (winBioPhase === "shoot" || y < 235) {
      shootWinBioTarget();
    } else {
      stepWinBioStride(x < canvas.width / 2 ? -1 : 1);
    }
  },
  onKeyDown: (e) => {
    if (winBioFinished || winBioOver || !winBioRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetWinBiathlon();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat && winBioPhase === "shoot") shootWinBioTarget();
    } else if (winBioPhase === "ski" && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (!e.repeat) stepWinBioStride(-1);
    } else if (winBioPhase === "ski" && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!e.repeat) stepWinBioStride(1);
    }
  }
});