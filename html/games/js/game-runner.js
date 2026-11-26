/* ---------- 1. 낙화 러너 상태 ---------- */
var runnerRunning = false;
var runnerOver = false;
var runnerScore = 0;
var runnerLastScore = 0;
var runnerBest = Number(localStorage.getItem("nakhwaRunnerBest") || 0);
var runnerSpeed = 4.5;
var runnerFrame = 0;

var player = {
  x: 48,
  y: GROUND_Y - 28,
  w: 24,
  h: 28,
  vy: 0,
  gravity: 0.62,
  jumpPower: -10.8,
  grounded: true
};
var obstacles = [];

function resetRunner() {
  player.y = GROUND_Y - player.h;
  player.vy = 0;
  player.grounded = true;
  obstacles = [];
  runnerScore = 0;
  runnerSpeed = 4.5;
  runnerFrame = 0;
  runnerOver = false;
  runnerRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
  initPetals();
}

function drawRunnerFrame() {
  drawPetals(runnerRunning && !runnerOver);

  ctx.strokeStyle = "#343440";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  if (runnerRunning && !runnerOver) {
    runnerFrame++;
    runnerScore += 0.15;
    runnerSpeed = Math.min(9.5, 4.5 + runnerScore * 0.004);

    player.vy += player.gravity;
    player.y += player.vy;
    if (player.y >= GROUND_Y - player.h) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.grounded = true;
    }

    const lastObs = obstacles[obstacles.length - 1];
    const minGap = 190 + Math.random() * 140;
    if (!lastObs || canvas.width - lastObs.x > minGap) {
      if (Math.random() < 0.04) {
        const isDouble = runnerScore > 80 && Math.random() < 0.35;
        const w = isDouble ? 30 : 18;
        const h = 22 + Math.floor(Math.random() * 10);
        obstacles.push({
          x: canvas.width + 10,
          y: GROUND_Y - h,
          w,
          h,
          type: isDouble ? "double" : "single"
        });
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= runnerSpeed;

      const pad = 5;
      if (
        player.x + pad < obs.x + obs.w - pad &&
        player.x + player.w - pad > obs.x + pad &&
        player.y + pad < obs.y + obs.h &&
        player.y + player.h - 2 > obs.y + pad
      ) {
        runnerOver = true;
        runnerLastScore = Math.floor(runnerScore);
        const isNewBest = runnerLastScore > runnerBest;
        if (isNewBest) {
          runnerBest = runnerLastScore;
          localStorage.setItem("nakhwaRunnerBest", String(runnerBest));
        }
        triggerGameOver(isNewBest, runnerLastScore > 0);
      }

      if (obs.x + obs.w < 0) obstacles.splice(i, 1);
    }
  }

  obstacles.forEach(obs => {
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    if (obs.type === "double") {
      ctx.moveTo(obs.x, GROUND_Y);
      ctx.lineTo(obs.x + obs.w * 0.25, obs.y);
      ctx.lineTo(obs.x + obs.w * 0.5, GROUND_Y);
      ctx.lineTo(obs.x + obs.w * 0.75, obs.y + 4);
      ctx.lineTo(obs.x + obs.w, GROUND_Y);
    } else {
      ctx.moveTo(obs.x, GROUND_Y);
      ctx.lineTo(obs.x + obs.w / 2, obs.y);
      ctx.lineTo(obs.x + obs.w, GROUND_Y);
    }
    ctx.closePath();
    ctx.fill();
  });

  const px = Math.round(player.x);
  const py = Math.round(player.y);
  ctx.fillStyle = "#ff9eb5";
  ctx.fillRect(px + 2, py + 4, 20, 20);
  ctx.fillRect(px + 4, py + 2, 16, 22);
  ctx.fillStyle = "#e65c7b";
  ctx.fillRect(px + 14, py, 6, 5);
  ctx.fillStyle = "#fff";
  ctx.fillRect(px + 16, py + 2, 2, 2);
  ctx.fillStyle = "#18181d";
  ctx.fillRect(px + 14, py + 10, 3, 4);
  ctx.fillRect(px + 19, py + 10, 3, 4);
  ctx.fillStyle = "#d94868";
  const step = runnerOver ? 0 : Math.floor(runnerFrame / 6) % 2;
  if (!player.grounded) {
    ctx.fillRect(px + 5, py + 24, 5, 4);
    ctx.fillRect(px + 14, py + 22, 5, 4);
  } else if (step === 0) {
    ctx.fillRect(px + 4, py + 24, 5, 4);
    ctx.fillRect(px + 14, py + 24, 5, 2);
  } else {
    ctx.fillRect(px + 4, py + 24, 5, 2);
    ctx.fillRect(px + 14, py + 24, 5, 4);
  }

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(
    `BEST ${String(runnerBest).padStart(4, "0")}   SCORE ${String(Math.floor(runnerScore)).padStart(4, "0")}`,
    canvas.width - 14,
    24
  );

  if (runnerOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`GAME OVER · ${runnerLastScore}점 🌸`, canvas.width / 2, 90);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 118);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("캔버스 터치 또는 스페이스바로 다시 달리기", canvas.width / 2, 118);
    }
  }
}

registerGame({
  id: "runner",
  title: "낙화 러너",
  icon: "🌸",
  desc: "가시 바위를 점프로 피하며 끝없이 달리기",
  aspect: "wide",
  unit: "점",
  hint: "화면 터치 또는 스페이스바(↑)로 점프!",
  rankingTitle: "🏆 낙화 러너 TOP 5",
  dbNode: "runner_scores",
  getBadge: () => `BEST ${runnerBest}점`,
  getScore: () => runnerLastScore,
  reset: resetRunner,
  draw: drawRunnerFrame,
  stop: () => {
    runnerRunning = false;
  },
  onPointerDown: () => {
    if (runnerOver || !runnerRunning) {
      if (!canRestartNow()) return;
      resetRunner();
      return;
    }
    if (player.grounded) {
      player.vy = player.jumpPower;
      player.grounded = false;
    }
  },
  onKeyDown: (e) => {
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) {
        if (runnerOver || !runnerRunning) {
          if (canRestartNow()) resetRunner();
        } else if (player.grounded) {
          player.vy = player.jumpPower;
          player.grounded = false;
        }
      }
    }
  }
});
