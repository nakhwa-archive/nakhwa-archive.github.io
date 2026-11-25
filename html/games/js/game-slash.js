/* ---------- 2. 낙화 발도술 상태 ---------- */
var slashState = "idle";
var slashSignalTime = 0;
var slashTimer = null;
var slashReactionMs = 0;
var slashBestMs = Number(localStorage.getItem("nakhwaSlashBest") || 0);
var slashFlashAlpha = 0;

function resetSlashToIdle() {
  clearTimeout(slashTimer);
  slashState = "idle";
  slashFlashAlpha = 0;
  isNewBestPending = false;
  hideSubmitBar();
}

function startSlashRound() {
  clearTimeout(slashTimer);
  slashState = "waiting";
  slashFlashAlpha = 0;
  isNewBestPending = false;
  hideSubmitBar();

  const delay = 1500 + Math.random() * 2900;
  slashTimer = setTimeout(() => {
    if (!isInPlayScreen || activeGame !== "slash") return;
    slashState = "signal";
    slashSignalTime = performance.now();
    slashFlashAlpha = 1;
  }, delay);
}

function handleSlashAction() {
  if (slashState === "idle") {
    startSlashRound();
  } else if (slashState === "result" || slashState === "foul") {
    if (!canRestartNow()) return;
    startSlashRound();
  } else if (slashState === "waiting") {
    clearTimeout(slashTimer);
    slashState = "foul";
    triggerGameOver(false, false);
  } else if (slashState === "signal") {
    const diff = Math.round(performance.now() - slashSignalTime);
    slashReactionMs = Math.max(1, diff);
    slashState = "result";
    slashFlashAlpha = 1;

    const isNewBest = (slashBestMs === 0 || slashReactionMs < slashBestMs);
    if (isNewBest) {
      slashBestMs = slashReactionMs;
      localStorage.setItem("nakhwaSlashBest", String(slashBestMs));
    }
    triggerGameOver(isNewBest, true);
  }
}

function drawSamurai(x, y, facingRight, slashed) {
  ctx.save();
  ctx.translate(x, y);
  if (!facingRight) ctx.scale(-1, 1);

  ctx.fillStyle = facingRight ? "#ff9eb5" : "#9898a6";
  ctx.beginPath();
  ctx.moveTo(-16, -24);
  ctx.lineTo(0, -34);
  ctx.lineTo(16, -24);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(-7, -23, 14, 23);

  ctx.strokeStyle = slashed ? "#ffffff" : "#e65c7b";
  ctx.lineWidth = slashed ? 3 : 2;
  ctx.beginPath();
  if (slashed) {
    ctx.moveTo(8, -14);
    ctx.lineTo(38, -26);
  } else {
    ctx.moveTo(-4, -10);
    ctx.lineTo(16, -6);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSlashFrame() {
  if (slashState === "signal") {
    ctx.fillStyle = "rgba(230, 92, 123, 0.22)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawPetals(true);

  ctx.strokeStyle = "#343440";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  const isPlayerWin = slashState === "result";
  const isEnemyWin = slashState === "foul";
  drawSamurai(isPlayerWin ? 350 : 120, GROUND_Y, true, isPlayerWin);
  drawSamurai(isEnemyWin ? 130 : 360, GROUND_Y, false, isEnemyWin);

  if (slashFlashAlpha > 0.02) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${slashFlashAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, GROUND_Y - 18);
    ctx.lineTo(canvas.width - 40, GROUND_Y - 22);
    ctx.stroke();
    slashFlashAlpha *= 0.88;
  }

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "right";
  const bestText = slashBestMs > 0 ? `${(slashBestMs / 1000).toFixed(3)}초` : "--.---";
  ctx.fillText(`MY BEST ${bestText}`, canvas.width - 14, 24);

  ctx.textAlign = "center";
  if (slashState === "idle") {
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText("⚔️ 낙화 발도술 승부", canvas.width / 2, 78);
    ctx.fillStyle = "#ff8ca5";
    ctx.font = "600 13px sans-serif";
    ctx.fillText("화면 터치 또는 스페이스바로 대결 시작", canvas.width / 2, 104);
  } else if (slashState === "waiting") {
    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("기다려...", canvas.width / 2, 88);
  } else if (slashState === "signal") {
    ctx.fillStyle = "#ff5e84";
    ctx.font = "900 30px sans-serif";
    ctx.fillText("⚔️ 베기!!", canvas.width / 2, 92);
  } else if (slashState === "foul") {
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("🚫 너무 빨랐습니다! (부정출발)", canvas.width / 2, 78);
    ctx.fillStyle = "#9898a6";
    ctx.font = "600 13px sans-serif";
    ctx.fillText("터치하여 재도전", canvas.width / 2, 104);
  } else if (slashState === "result") {
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px sans-serif";
    ctx.fillText(`⚡ ${(slashReactionMs / 1000).toFixed(3)}초 (${slashReactionMs}ms)`, canvas.width / 2, 78);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 104);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("터치하여 다시 대결하기", canvas.width / 2, 104);
    }
  }
}