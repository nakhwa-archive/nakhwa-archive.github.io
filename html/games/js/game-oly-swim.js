/* ---------- 올림픽 7. 100미터 자유 수영 (100m Freestyle) 상태 ---------- */
var olySwimRunning = false;
var olySwimOver = false;
var olySwimFinished = false;

var olySwimDist = 0; // 0 ~ 100m
var olySwimSpeed = 0;
var olySwimBoost = 0; // 0 ~ 100 스트로크 부스트
var olySwimTurnBonusGiven = false;
var olySwimLastSide = 0;
var olySwimLastStepFrame = 0;
var olySwimFrame = 0;
var olySwimElapsedFrames = 0;

var olySwimElapsedMs = 0;
var olySwimLastScore = 0;
var olySwimBestMs = Number(localStorage.getItem("nakhwaOlySwimBestMs") || 0);
var olySwimBubbles = [];
var olySwimPopups = [];

function resetOlySwim() {
  olySwimDist = 0;
  olySwimSpeed = 0;
  olySwimBoost = 0;
  olySwimTurnBonusGiven = false;
  olySwimLastSide = 0;
  olySwimLastStepFrame = 0;
  olySwimFrame = 0;
  olySwimElapsedFrames = 0;
  olySwimElapsedMs = 0;
  olySwimLastScore = 0;
  olySwimBubbles = [];
  olySwimPopups = [];
  olySwimOver = false;
  olySwimFinished = false;
  olySwimRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlySwimPopup(x, y, text, color) {
  olySwimPopups.push({ x, y, text, color, life: 34 });
}

function spawnOlySwimSplash(x, y, color, count = 7) {
  for (let i = 0; i < count; i++) {
    olySwimBubbles.push({
      x,
      y,
      vx: -1.0 - Math.random() * 2.2,
      vy: -0.9 - Math.random() * 2.0,
      r: 2 + Math.random() * 2.5,
      color,
      life: 22
    });
  }
}

function stepOlySwimStroke(side) {
  if (!olySwimRunning || olySwimOver || olySwimFinished) return;

  const diffFrames = olySwimFrame - olySwimLastStepFrame;
  const isAlternating = olySwimLastSide !== side;

  if (isAlternating) {
    if (diffFrames >= 4 && diffFrames <= 18) {
      olySwimBoost = Math.min(100, olySwimBoost + 14);
      olySwimSpeed = Math.min(1.62, olySwimSpeed + 0.24);
      if (diffFrames >= 7 && diffFrames <= 13) {
        addOlySwimPopup(canvas.width * 0.5, 192, "🌊 SMOOTH STROKE!", "#72efdd");
      }
    } else {
      olySwimBoost = Math.min(100, olySwimBoost + 7);
      olySwimSpeed = Math.min(1.42, olySwimSpeed + 0.16);
    }
    spawnOlySwimSplash(85, 250, "#b8f2ff", 5);
  } else {
    olySwimBoost = Math.max(0, olySwimBoost - 10);
    olySwimSpeed = Math.max(0.14, olySwimSpeed - 0.12);
    addOlySwimPopup(canvas.width * 0.5, 208, "좌/우 교대 스트로크!", "#9898a6");
  }

  olySwimLastSide = side;
  olySwimLastStepFrame = olySwimFrame;
}

function finishOlySwim() {
  olySwimFinished = true;
  olySwimRunning = false;
  olySwimElapsedMs = Math.max(100, Math.round((olySwimElapsedFrames / 60) * 1000));
  olySwimLastScore = olySwimElapsedMs;

  const isNewBest = olySwimBestMs === 0 || olySwimElapsedMs < olySwimBestMs;
  if (isNewBest) {
    olySwimBestMs = olySwimElapsedMs;
    localStorage.setItem("nakhwaOlySwimBestMs", String(olySwimBestMs));
  }

  triggerGameOver(isNewBest, true);
}

function drawOlySwimFrame() {
  try {
    ctx.save();

    if (olySwimRunning && !olySwimOver && !olySwimFinished) {
      olySwimFrame++;
      olySwimElapsedFrames++;

      // 50m 반환점 보너스
      if (!olySwimTurnBonusGiven && olySwimDist >= 50) {
        olySwimTurnBonusGiven = true;
        olySwimBoost = Math.min(100, olySwimBoost + 18);
        olySwimSpeed = Math.min(1.7, olySwimSpeed + 0.22);
        addOlySwimPopup(canvas.width * 0.5, 174, "🔄 50m 턴 부스트!", "#ffd166");
        spawnOlySwimSplash(95, 248, "#72efdd", 12);
      }

      olySwimBoost = Math.max(0, olySwimBoost - 0.35);
      const boostBonus = (olySwimBoost / 100) * 0.62;
      const minSwimSpeed = olySwimDist > 1 ? 0.12 : 0;
      olySwimSpeed = Math.max(minSwimSpeed, olySwimSpeed * 0.968);

      const movePerStep = (olySwimSpeed + boostBonus) * 0.23;
      olySwimDist = Math.min(100, olySwimDist + movePerStep);

      if (olySwimDist >= 100) {
        finishOlySwim();
      }
    }

    // 배경 & 수영장 레인
    ctx.fillStyle = "#101522";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#172033";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 수영장 물 영역
    ctx.fillStyle = "#185a8c";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 레인 구분선 & 물결
    ctx.fillStyle = "rgba(184, 242, 255, 0.25)";
    [132, 182, 232, 282, 336].forEach(yPos => {
      ctx.fillRect(0, yPos, canvas.width, 2);
    });

    const waveShift = (olySwimDist * 26) % 48;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 2;
    for (let x = -waveShift; x < canvas.width + 48; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 246);
      ctx.quadraticCurveTo(x + 12, 240, x + 24, 246);
      ctx.quadraticCurveTo(x + 36, 252, x + 48, 246);
      ctx.stroke();
    }

    // 100m 터치패드 표시
    if (olySwimDist >= 84) {
      const finishX = 85 + (100 - olySwimDist) * 24;
      if (finishX >= 0 && finishX <= canvas.width) {
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(finishX, 130, 6, 210);
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("100m WALL", finishX + 3, 122);
      }
    }

    // 하단 조작 가이드 존
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b2e3d";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 좌 스트로크 (←/A)", canvas.width * 0.25, 376);
    ctx.fillText("우 스트로크 (→/D) ▶", canvas.width * 0.75, 376);

    // 수영 선수 캐릭터 렌더링
    const swimmerX = 85;
    const swimmerY = 246 + Math.sin(olySwimFrame * 0.35) * (olySwimSpeed > 0.2 ? 3 : 0);
    const armSwing = Math.sin(olySwimFrame * 0.5) * (olySwimSpeed > 0.2 ? 12 : 2);

    // 수평 자세 몸체
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.ellipse(swimmerX, swimmerY, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 수모 쓴 머리
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(swimmerX + 16, swimmerY - 1, 7, 0, Math.PI * 2);
    ctx.fill();

    // 팔 스트로크
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(swimmerX + 6, swimmerY);
    ctx.lineTo(swimmerX + 12 + armSwing, swimmerY - 9);
    ctx.stroke();

    // 물방울 & 팝업
    for (let i = olySwimBubbles.length - 1; i >= 0; i--) {
      const b = olySwimBubbles[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.08;
      b.life--;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = Math.max(0, b.life / 22);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (b.life <= 0) olySwimBubbles.splice(i, 1);
    }

    for (let i = olySwimPopups.length - 1; i >= 0; i--) {
      const pop = olySwimPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olySwimPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveSec = (olySwimElapsedFrames / 60).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${olySwimDist.toFixed(1)}m / 100m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`기록 ${liveSec}초 · 부스트 ${Math.floor(olySwimBoost)}%`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olySwimBestMs > 0 ? `${(olySwimBestMs / 1000).toFixed(3)}초` : "--.---";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 완주 결과 오버레이
    if (olySwimFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalSec = (olySwimElapsedMs / 1000).toFixed(3);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🏊 100m 자유형 완주 · ${finalSec}초`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#ff8ca5";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 수영하기", canvas.width / 2, 214);
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
  id: "oly-swim",
  title: "100미터 자유 수영",
  icon: "🏊",
  desc: "좌우 리듬 스트로크와 50m 턴 부스트로 물살을 가르자!",
  aspect: "tall",
  sortOrder: "asc",
  unit: "초",
  hint: "좌/우 번갈아 터치(PC: ←/→ 또는 A/D)로 스트로크! 50m 반환점 부스트!",
  rankingTitle: "🏊 100m 자유 수영 TOP 5 (빠른 순)",
  dbNode: "oly_swim_scores",
  formatScore: (score) => `${(score / 1000).toFixed(3)}초`,
  getBadge: () => (olySwimBestMs > 0 ? `BEST ${(olySwimBestMs / 1000).toFixed(3)}초` : "BEST --.---"),
  getScore: () => olySwimLastScore,
  reset: resetOlySwim,
  draw: drawOlySwimFrame,
  stop: () => {
    olySwimRunning = false;
  },
  onPointerDown: (x) => {
    if (olySwimFinished || olySwimOver || !olySwimRunning) {
      if (!canRestartNow()) return;
      resetOlySwim();
      return;
    }
    stepOlySwimStroke(x < canvas.width / 2 ? -1 : 1);
  },
  onKeyDown: (e) => {
    if (olySwimFinished || olySwimOver || !olySwimRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlySwim();
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOlySwimStroke(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOlySwimStroke(1);
    }
  }
});