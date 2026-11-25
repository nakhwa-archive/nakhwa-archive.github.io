/* ---------- 4. 낙화 닷지 (Dodge) 상태 ---------- */
var dodgeRunning = false;
var dodgeOver = false;
var dodgeStartTime = 0;
var dodgeElapsedMs = 0;
var dodgeBestMs = Number(localStorage.getItem("nakhwaDodgeBest") || 0);
var dodgeBullets = [];
var dodgeSpawnTimer = 0;

var dodgeShip = {
  x: 240,
  y: 102,
  r: 5,
  speed: 3.4
};

var dodgeKeys = { up: false, down: false, left: false, right: false };
var dodgePointerActive = false;
var dodgeLastPointer = { x: 0, y: 0 };

function spawnDodgeBullet() {
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = Math.random() * canvas.width; y = -6; }
  else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height + 6; }
  else if (side === 2) { x = -6; y = Math.random() * canvas.height; }
  else { x = canvas.width + 6; y = Math.random() * canvas.height; }

  let targetX = dodgeShip.x + (Math.random() - 0.5) * 90;
  let targetY = dodgeShip.y + (Math.random() - 0.5) * 90;
  if (Math.random() < 0.3) {
    targetX = Math.random() * canvas.width;
    targetY = Math.random() * canvas.height;
  }

  const angle = Math.atan2(targetY - y, targetX - x);
  const sec = dodgeElapsedMs / 1000;
  const speed = 1.6 + Math.random() * 1.4 + Math.min(2.2, sec * 0.06);

  dodgeBullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 3.2,
    isPink: Math.random() < 0.35
  });
}

function resetDodge() {
  dodgeShip.x = canvas.width / 2;
  dodgeShip.y = canvas.height / 2;
  dodgeBullets = [];
  dodgeSpawnTimer = 0;
  dodgeElapsedMs = 0;
  dodgeStartTime = performance.now();
  dodgeOver = false;
  dodgeRunning = true;
  dodgePointerActive = false;
  isNewBestPending = false;
  hideSubmitBar();

  for (let i = 0; i < 14; i++) {
    spawnDodgeBullet();
  }
}

function drawDodgeFrame() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  if (dodgeRunning && !dodgeOver) {
    dodgeElapsedMs = Math.floor(performance.now() - dodgeStartTime);

    let mx = 0, my = 0;
    if (dodgeKeys.left) mx -= 1;
    if (dodgeKeys.right) mx += 1;
    if (dodgeKeys.up) my -= 1;
    if (dodgeKeys.down) my += 1;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      dodgeShip.x += (mx / len) * dodgeShip.speed;
      dodgeShip.y += (my / len) * dodgeShip.speed;
      dodgeShip.x = Math.max(dodgeShip.r + 4, Math.min(canvas.width - dodgeShip.r - 4, dodgeShip.x));
      dodgeShip.y = Math.max(dodgeShip.r + 4, Math.min(canvas.height - dodgeShip.r - 4, dodgeShip.y));
    }

    const targetCount = Math.min(65, 16 + Math.floor(dodgeElapsedMs / 650));
    dodgeSpawnTimer++;
    if (dodgeBullets.length < targetCount && dodgeSpawnTimer % 4 === 0) {
      spawnDodgeBullet();
    }

    for (let i = dodgeBullets.length - 1; i >= 0; i--) {
      const b = dodgeBullets[i];
      b.x += b.vx;
      b.y += b.vy;

      const dist = Math.hypot(b.x - dodgeShip.x, b.y - dodgeShip.y);
      if (dist < b.r + dodgeShip.r - 1.2) {
        dodgeOver = true;
        const isNewBest = dodgeElapsedMs > dodgeBestMs;
        if (isNewBest) {
          dodgeBestMs = dodgeElapsedMs;
          localStorage.setItem("nakhwaDodgeBest", String(dodgeBestMs));
        }
        triggerGameOver(isNewBest, dodgeElapsedMs > 0);
        break;
      }

      if (b.x < -16 || b.x > canvas.width + 16 || b.y < -16 || b.y > canvas.height + 16) {
        dodgeBullets.splice(i, 1);
        spawnDodgeBullet();
      }
    }
  }

  dodgeBullets.forEach(b => {
    ctx.fillStyle = b.isPink ? "#ff7999" : "#ffd166";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(dodgeShip.x, dodgeShip.y);
  ctx.fillStyle = "rgba(230, 92, 123, 0.28)";
  ctx.beginPath();
  ctx.arc(0, 0, dodgeShip.r + 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(7, 7);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e65c7b";
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "right";
  const bestSec = (dodgeBestMs / 1000).toFixed(2);
  const curSec = (dodgeElapsedMs / 1000).toFixed(2);
  ctx.fillText(`BEST ${bestSec}초   생존 ${curSec}초`, canvas.width - 14, 24);

  if (dodgeOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`💥 피격! 생존 기록 ${(dodgeElapsedMs / 1000).toFixed(2)}초`, canvas.width / 2, 90);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 118);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("캔버스 터치 또는 스페이스바로 다시 도전", canvas.width / 2, 118);
    }
  }
}