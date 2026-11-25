/* ---------- 11. 꼬리잡기 스네이크 (Snake) 상태 ---------- */
var SNAKE_CELL = 20;
var SNAKE_COLS = 16;
var SNAKE_ROWS = 18;
var SNAKE_OFFSET_X = 10;
var SNAKE_OFFSET_Y = 44;

var snakeRunning = false;
var snakeOver = false;
var snakeScore = 0;
var snakeBest = Number(localStorage.getItem("nakhwaSnakeBest") || 0);
var snakeBody = [];
var snakeDir = { x: 1, y: 0 };
var snakeDirQueue = [];
var snakeFood = { x: 10, y: 9, isBonus: false, timer: 0 };
var snakeLastStepTime = 0;
var snakeSessionHadBest = false;
var snakeSwipeStart = null;

function spawnSnakeFood() {
  const occupied = new Set(snakeBody.map(seg => `${seg.x},${seg.y}`));
  const freeCells = [];
  for (let gx = 0; gx < SNAKE_COLS; gx++) {
    for (let gy = 0; gy < SNAKE_ROWS; gy++) {
      if (!occupied.has(`${gx},${gy}`)) {
        freeCells.push({ x: gx, y: gy });
      }
    }
  }
  if (freeCells.length === 0) return;
  const chosen = freeCells[Math.floor(Math.random() * freeCells.length)];
  const isBonus = snakeBody.length >= 6 && Math.random() < 0.25;
  snakeFood = {
    x: chosen.x,
    y: chosen.y,
    isBonus,
    timer: isBonus ? 90 : 0
  };
}

function resetSnake() {
  snakeBody = [
    { x: 6, y: 9 },
    { x: 5, y: 9 },
    { x: 4, y: 9 }
  ];
  snakeDir = { x: 1, y: 0 };
  snakeDirQueue = [];
  snakeScore = 0;
  snakeOver = false;
  snakeRunning = true;
  snakeSessionHadBest = false;
  snakeSwipeStart = null;
  snakeLastStepTime = performance.now();
  isNewBestPending = false;
  hideSubmitBar();
  spawnSnakeFood();
}

function queueSnakeDirection(nx, ny) {
  if (!snakeRunning || snakeOver) return;
  const lastDir = snakeDirQueue.length > 0 ? snakeDirQueue[snakeDirQueue.length - 1] : snakeDir;
  if ((nx === -lastDir.x && ny === -lastDir.y) || (nx === lastDir.x && ny === lastDir.y)) {
    return;
  }
  if (snakeDirQueue.length < 2) {
    snakeDirQueue.push({ x: nx, y: ny });
  }
}

function stepSnakeLogic() {
  if (!snakeRunning || snakeOver) return;

  const now = performance.now();
  const stepInterval = Math.max(72, 145 - (snakeBody.length - 3) * 2.4);
  if (now - snakeLastStepTime < stepInterval) return;
  snakeLastStepTime = now;

  if (snakeDirQueue.length > 0) {
    snakeDir = snakeDirQueue.shift();
  }

  const head = snakeBody[0];
  const nextX = head.x + snakeDir.x;
  const nextY = head.y + snakeDir.y;

  if (nextX < 0 || nextX >= SNAKE_COLS || nextY < 0 || nextY >= SNAKE_ROWS) {
    snakeOver = true;
    triggerGameOver(snakeSessionHadBest, snakeScore > 0);
    return;
  }

  const willEat = (nextX === snakeFood.x && nextY === snakeFood.y);
  const checkLimit = willEat ? snakeBody.length : snakeBody.length - 1;
  for (let i = 0; i < checkLimit; i++) {
    if (snakeBody[i].x === nextX && snakeBody[i].y === nextY) {
      snakeOver = true;
      triggerGameOver(snakeSessionHadBest, snakeScore > 0);
      return;
    }
  }

  snakeBody.unshift({ x: nextX, y: nextY });

  if (willEat) {
    snakeScore += snakeFood.isBonus ? 30 : 10;
    if (snakeScore > snakeBest) {
      snakeBest = snakeScore;
      snakeSessionHadBest = true;
      localStorage.setItem("nakhwaSnakeBest", String(snakeBest));
    }
    spawnSnakeFood();
  } else {
    snakeBody.pop();
    if (snakeFood.isBonus) {
      snakeFood.timer--;
      if (snakeFood.timer <= 0) {
        spawnSnakeFood();
      }
    }
  }
}

function drawSnakeFrame() {
  stepSnakeLogic();

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${snakeScore}`, 12, 22);

  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`길이 ${snakeBody.length}칸`, 12, 37);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${snakeBest}`, 328, 22);
  ctx.fillText("스와이프 / 방향키", 328, 37);

  const boardW = SNAKE_COLS * SNAKE_CELL;
  const boardH = SNAKE_ROWS * SNAKE_CELL;
  ctx.fillStyle = "#16161d";
  ctx.fillRect(SNAKE_OFFSET_X, SNAKE_OFFSET_Y, boardW, boardH);

  for (let r = 0; r < SNAKE_ROWS; r++) {
    for (let c = 0; c < SNAKE_COLS; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.022)";
        ctx.fillRect(
          SNAKE_OFFSET_X + c * SNAKE_CELL,
          SNAKE_OFFSET_Y + r * SNAKE_CELL,
          SNAKE_CELL,
          SNAKE_CELL
        );
      }
    }
  }

  ctx.strokeStyle = "#343442";
  ctx.lineWidth = 2;
  ctx.strokeRect(SNAKE_OFFSET_X, SNAKE_OFFSET_Y, boardW, boardH);

  const fx = SNAKE_OFFSET_X + snakeFood.x * SNAKE_CELL + SNAKE_CELL / 2;
  const fy = SNAKE_OFFSET_Y + snakeFood.y * SNAKE_CELL + SNAKE_CELL / 2;

  if (snakeFood.isBonus) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(fx, fy - 8);
    ctx.lineTo(fx + 8, fy);
    ctx.lineTo(fx, fy + 8);
    ctx.lineTo(fx - 8, fy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ffb7c5";
    ctx.beginPath();
    ctx.arc(fx, fy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = snakeBody.length - 1; i >= 0; i--) {
    const seg = snakeBody[i];
    const sx = SNAKE_OFFSET_X + seg.x * SNAKE_CELL;
    const sy = SNAKE_OFFSET_Y + seg.y * SNAKE_CELL;

    if (i === 0) {
      ctx.fillStyle = "#e65c7b";
      ctx.beginPath();
      ctx.roundRect(sx + 1, sy + 1, SNAKE_CELL - 2, SNAKE_CELL - 2, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      const eye1X = sx + SNAKE_CELL / 2 + snakeDir.x * 4 - (snakeDir.y !== 0 ? 4 : 0);
      const eye1Y = sy + SNAKE_CELL / 2 + snakeDir.y * 4 - (snakeDir.x !== 0 ? 4 : 0);
      const eye2X = sx + SNAKE_CELL / 2 + snakeDir.x * 4 + (snakeDir.y !== 0 ? 4 : 0);
      const eye2Y = sy + SNAKE_CELL / 2 + snakeDir.y * 4 + (snakeDir.x !== 0 ? 4 : 0);
      ctx.beginPath(); ctx.arc(eye1X, eye1Y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eye2X, eye2Y, 2.2, 0, Math.PI * 2); ctx.fill();
    } else {
      const shrink = Math.min(4, Math.floor(i / 4));
      const pad = 2 + shrink * 0.5;
      ctx.fillStyle = i % 2 === 1 ? "#ff8ca5" : "#ffb7c5";
      ctx.beginPath();
      ctx.roundRect(sx + pad, sy + pad, SNAKE_CELL - pad * 2, SNAKE_CELL - pad * 2, 5);
      ctx.fill();
    }
  }

  if (snakeOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🐍 충돌! 최종 ${snakeScore}점 (${snakeBody.length}칸)`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 시작합니다", canvas.width / 2, 220);
    }
  }
}