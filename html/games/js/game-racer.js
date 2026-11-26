/* ---------- 13. 낙화 터보 레이서 (Arcade Racing) 상태 ---------- */
var RACER_ROAD = { left: 46, right: 294, lanes: 4 };
var RACER_LANE_W = (RACER_ROAD.right - RACER_ROAD.left) / RACER_ROAD.lanes;
var RACER_TRAFFIC_COLORS = ["#4ea8de", "#ffd166", "#a8d5ba", "#b5179e", "#f77f00"];

var racerRunning = false;
var racerOver = false;
var racerScore = 0;
var racerLastScore = 0;
var racerBest = Number(localStorage.getItem("nakhwaRacerBest") || 0);
var racerSessionHadBest = false;

var racerSpeed = 4.6;
var racerRoadOffset = 0;
var racerNitroTimer = 0;
var racerFrame = 0;
var racerDragging = false;
var racerLastDragX = 0;

var racerCar = {
  x: 170,
  y: 350,
  w: 26,
  h: 44,
  steerSpeed: 4.8
};

var racerTraffic = [];
var racerPickups = [];
var racerParticles = [];

function getRacerLaneCenterX(laneIdx) {
  return RACER_ROAD.left + RACER_LANE_W * (laneIdx + 0.5);
}

function resetRacer() {
  racerCar.x = getRacerLaneCenterX(1);
  racerCar.y = 350;
  racerTraffic = [];
  racerPickups = [];
  racerParticles = [];
  racerScore = 0;
  racerSpeed = 4.6;
  racerRoadOffset = 0;
  racerNitroTimer = 0;
  racerFrame = 0;
  racerOver = false;
  racerRunning = true;
  racerDragging = false;
  racerSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
}

function spawnRacerWave() {
  const lanes = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const count = racerScore > 450 && Math.random() < 0.45 ? 2 : 1;

  for (let i = 0; i < count; i++) {
    const lane = lanes[i];
    const color = RACER_TRAFFIC_COLORS[Math.floor(Math.random() * RACER_TRAFFIC_COLORS.length)];
    const relSpeed = 1.6 + Math.random() * 1.4;
    racerTraffic.push({
      x: getRacerLaneCenterX(lane),
      y: -55 - i * 18,
      w: 26,
      h: 44,
      color,
      relSpeed,
      blasted: false,
      vx: 0,
      vy: 0
    });
  }

  if (Math.random() < 0.22) {
    const freeLane = lanes[count];
    racerPickups.push({
      x: getRacerLaneCenterX(freeLane),
      y: -50
    });
  }
}

function spawnRacerBurst(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 3.8;
    racerParticles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: 2.5 + Math.random() * 2,
      color,
      life: 24
    });
  }
}

function drawCarSprite(x, y, w, h, bodyColor, isPlayer, isNitro) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(-w / 2 - 2.5, -h / 2 + 6, 3, 9);
  ctx.fillRect(w / 2 - 0.5, -h / 2 + 6, 3, 9);
  ctx.fillRect(-w / 2 - 2.5, h / 2 - 15, 3, 9);
  ctx.fillRect(w / 2 - 0.5, h / 2 - 15, 3, 9);

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 6);
  ctx.fill();

  ctx.fillStyle = "#181820";
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 4, -h / 2 + 10, w - 8, 10, 2);
  ctx.fill();
  ctx.fillRect(-w / 2 + 5, h / 2 - 12, w - 10, 6);

  if (isPlayer) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-2, -h / 2 + 1, 4, 8);
    ctx.fillRect(-2, h / 2 - 6, 4, 5);

    ctx.fillStyle = "rgba(255, 243, 176, 0.35)";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2);
    ctx.lineTo(-w / 2 - 4, -h / 2 - 26);
    ctx.lineTo(-2, -h / 2 - 26);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, -h / 2);
    ctx.lineTo(w / 2 + 4, -h / 2 - 26);
    ctx.lineTo(2, -h / 2 - 26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isNitro ? "#72efdd" : "#ffd166";
    const flameH = isNitro ? 14 + (racerFrame % 4) * 3 : 5 + (racerFrame % 3) * 2;
    ctx.fillRect(-5, h / 2, 4, flameH);
    ctx.fillRect(1, h / 2, 4, flameH);
  } else {
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(-w / 2 + 3, h / 2 - 3, 5, 2.5);
    ctx.fillRect(w / 2 - 8, h / 2 - 3, 5, 2.5);
  }

  ctx.restore();
}

function drawRacerFrame() {
  const isNitro = racerNitroTimer > 0;
  const curSpeed = isNitro ? racerSpeed * 1.65 : racerSpeed;

  if (racerRunning && !racerOver) {
    racerFrame++;
    if (racerNitroTimer > 0) racerNitroTimer--;

    racerScore += isNitro ? 0.45 : 0.2;
    racerSpeed = Math.min(9.5, 4.6 + racerScore * 0.0028);
    racerRoadOffset = (racerRoadOffset + curSpeed * 1.8) % 36;

    if (dodgeKeys.left) racerCar.x -= racerCar.steerSpeed;
    if (dodgeKeys.right) racerCar.x += racerCar.steerSpeed;
    const minX = RACER_ROAD.left + racerCar.w / 2 + 3;
    const maxX = RACER_ROAD.right - racerCar.w / 2 - 3;
    racerCar.x = Math.max(minX, Math.min(maxX, racerCar.x));

    const topCar = racerTraffic[racerTraffic.length - 1];
    const spawnGap = Math.max(115, 165 - racerScore * 0.03);
    if (!topCar || topCar.y > spawnGap) {
      spawnRacerWave();
    }

    for (let i = racerPickups.length - 1; i >= 0; i--) {
      const p = racerPickups[i];
      p.y += curSpeed * 1.25;
      if (Math.hypot(p.x - racerCar.x, p.y - racerCar.y) < 26) {
        racerNitroTimer = 180;
        racerScore += 120;
        spawnRacerBurst(p.x, p.y, "#72efdd");
        racerPickups.splice(i, 1);
        continue;
      }
      if (p.y > canvas.height + 20) racerPickups.splice(i, 1);
    }

    for (let i = racerTraffic.length - 1; i >= 0; i--) {
      const c = racerTraffic[i];
      if (c.blasted) {
        c.x += c.vx;
        c.y += c.vy;
        if (c.y < -80 || c.y > canvas.height + 80) racerTraffic.splice(i, 1);
        continue;
      }

      c.y += curSpeed - c.relSpeed * 0.35;

      const hitX = Math.abs(c.x - racerCar.x) < (c.w + racerCar.w) * 0.42;
      const hitY = Math.abs(c.y - racerCar.y) < (c.h + racerCar.h) * 0.42;

      if (hitX && hitY) {
        if (isNitro) {
          c.blasted = true;
          c.vx = (c.x >= racerCar.x ? 1 : -1) * 7.5;
          c.vy = -8.5;
          racerScore += 80;
          spawnRacerBurst(c.x, c.y, "#ffd166");
        } else {
          racerOver = true;
          racerLastScore = Math.floor(racerScore);
          spawnRacerBurst(racerCar.x, racerCar.y, "#ff4d6d");
          const isNewBest = racerLastScore > racerBest;
          if (isNewBest) {
            racerBest = racerLastScore;
            localStorage.setItem("nakhwaRacerBest", String(racerBest));
          }
          triggerGameOver(isNewBest, racerLastScore > 0);
          break;
        }
      }

      if (c.y > canvas.height + 60) {
        racerTraffic.splice(i, 1);
      }
    }
  }

  ctx.fillStyle = "#12151c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const curbH = 18;
  for (let y = -curbH + (racerRoadOffset % (curbH * 2)); y < canvas.height; y += curbH) {
    const isRed = Math.floor((y - racerRoadOffset) / curbH) % 2 === 0;
    ctx.fillStyle = isRed ? "#e65c7b" : "#f4f4f6";
    ctx.fillRect(RACER_ROAD.left - 6, y, 6, curbH);
    ctx.fillRect(RACER_ROAD.right, y, 6, curbH);
  }

  ctx.fillStyle = "#1d1e26";
  ctx.fillRect(RACER_ROAD.left, 0, RACER_ROAD.right - RACER_ROAD.left, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 18]);
  ctx.lineDashOffset = -racerRoadOffset;
  for (let l = 1; l < RACER_ROAD.lanes; l++) {
    const lx = RACER_ROAD.left + RACER_LANE_W * l;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (isNitro && !racerOver) {
    ctx.strokeStyle = "rgba(114, 239, 221, 0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const sx = i < 3 ? 12 + i * 10 : canvas.width - 12 - (i - 3) * 10;
      const sy = ((racerFrame * 18 + i * 65) % canvas.height);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 28);
      ctx.stroke();
    }
  }

  for (const p of racerPickups) {
    ctx.fillStyle = "#72efdd";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#121216";
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", p.x, p.y + 0.5);
  }
  ctx.textBaseline = "alphabetic";

  for (const c of racerTraffic) {
    drawCarSprite(c.x, c.y, c.w, c.h, c.color, false, false);
  }

  if (!racerOver) {
    drawCarSprite(
      racerCar.x,
      racerCar.y,
      racerCar.w,
      racerCar.h,
      isNitro ? "#72efdd" : "#e65c7b",
      true,
      isNitro
    );
  }

  for (let i = racerParticles.length - 1; i >= 0; i--) {
    const pt = racerParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 24);
    ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    ctx.globalAlpha = 1;
    if (pt.life <= 0) racerParticles.splice(i, 1);
  }

  ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
  ctx.fillRect(0, 0, canvas.width, 44);

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${Math.floor(racerScore)}`, 12, 21);

  const kmh = Math.round(curSpeed * 32);
  ctx.fillStyle = isNitro ? "#72efdd" : "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(isNitro ? `⚡ NITRO ${kmh} km/h` : `${kmh} km/h`, 12, 36);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${racerBest}`, 328, 21);
  ctx.fillText("4차선 질주", 328, 36);

  if (racerOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🏎️ 충돌! 최종 ${racerLastScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 출발합니다", canvas.width / 2, 220);
    }
  }
}

registerGame({
  id: "racer",
  title: "낙화 터보 레이서",
  icon: "🏎️",
  desc: "4차선 고속도로 질주 & 니트로 부스터로 차량 추월!",
  aspect: "tall",
  unit: "점",
  hint: "좌우 드래그(모바일) 또는 방향키/AD(PC)로 차량 추월!",
  rankingTitle: "🏎️ 터보 레이서 TOP 5",
  dbNode: "racer_scores",
  getBadge: () => `BEST ${racerBest}점`,
  getScore: () => racerLastScore,
  reset: resetRacer,
  draw: drawRacerFrame,
  stop: () => {
    racerRunning = false;
    racerDragging = false;
  },
  onPointerDown: (x) => {
    if (racerOver || !racerRunning) {
      if (!canRestartNow()) return;
      resetRacer();
      return;
    }
    racerDragging = true;
    racerLastDragX = x;
  },
  onPointerMove: (x, y, e) => {
    if (racerDragging && !racerOver) {
      e.preventDefault();
      const dx = x - racerLastDragX;
      racerLastDragX = x;
      const minX = RACER_ROAD.left + racerCar.w / 2 + 3;
      const maxX = RACER_ROAD.right - racerCar.w / 2 - 3;
      racerCar.x = Math.max(minX, Math.min(maxX, racerCar.x + dx * 1.15));
    }
  },
  onPointerUp: () => {
    racerDragging = false;
  },
  onKeyDown: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); dodgeKeys.left = true; }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); dodgeKeys.right = true; }
    }
    if (e.code === "Space" && (racerOver || !racerRunning)) {
      e.preventDefault();
      if (!e.repeat && canRestartNow()) resetRacer();
    }
  },
  onKeyUp: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dodgeKeys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dodgeKeys.right = false;
    }
  }
});
