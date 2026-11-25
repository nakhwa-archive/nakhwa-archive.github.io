/* ---------- 7. 건물 부수기 (Building Smash) 상태 ---------- */
var smashState = "idle";
var smashPower = 0;
var smashChargeStart = 0;
var SMASH_CHARGE_MS = 5000;
var smashGaugePos = 0.5;
var smashGaugeDir = 1;
var smashMultiplier = 1.0;
var smashCritLabel = "";
var smashTargetFloors = 0;
var smashBrokenFloors = 0;
var smashBest = Number(localStorage.getItem("nakhwaSmashBest") || 0);
var smashDebris = [];
var smashShake = 0;
var smashAuraPulse = 0;

function resetSmash() {
  smashState = "idle";
  smashPower = 0;
  smashGaugePos = 0.5;
  smashGaugeDir = 1;
  smashMultiplier = 1.0;
  smashCritLabel = "";
  smashTargetFloors = 0;
  smashBrokenFloors = 0;
  smashDebris = [];
  smashShake = 0;
  smashAuraPulse = 0;
  isNewBestPending = false;
  hideSubmitBar();
}

function spawnSmashDebris(y, count) {
  const colors = ["#78788c", "#565668", "#e65c7b", "#ffb7c5", "#d0d0dc"];
  for (let i = 0; i < count; i++) {
    smashDebris.push({
      x: 115 + Math.random() * 110,
      y: y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 9,
      vy: -2 - Math.random() * 5,
      w: 6 + Math.random() * 8,
      h: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 45
    });
  }
}

function handleSmashAction() {
  if (smashState === "idle") {
    smashState = "charging";
    smashPower = 3;
    smashChargeStart = performance.now();
    smashBrokenFloors = 0;
    smashDebris = [];
    smashAuraPulse = 1;
    smashShake = 3;
    isNewBestPending = false;
    hideSubmitBar();
    return;
  }

  if (smashState === "result") {
    if (!canRestartNow()) return;
    smashState = "charging";
    smashPower = 3;
    smashChargeStart = performance.now();
    smashBrokenFloors = 0;
    smashDebris = [];
    smashAuraPulse = 1;
    smashShake = 3;
    isNewBestPending = false;
    hideSubmitBar();
    return;
  }

  if (smashState === "charging") {
    smashPower += 3.2;
    smashAuraPulse = 1;
    smashShake = Math.min(8, 2 + smashPower * 0.04);
    return;
  }

  if (smashState === "timing") {
    const distFromCenter = Math.abs(smashGaugePos - 0.5);
    if (distFromCenter <= 0.06) {
      smashMultiplier = 1.5;
      smashCritLabel = "💥 CRITICAL x1.5!!";
    } else if (distFromCenter <= 0.16) {
      smashMultiplier = 1.2;
      smashCritLabel = "⚡ GREAT x1.2!";
    } else {
      smashMultiplier = 0.9;
      smashCritLabel = "👊 HIT x0.9";
    }

    smashTargetFloors = Math.max(1, Math.round(smashPower * smashMultiplier));
    smashBrokenFloors = 0;
    smashState = "smashing";
    smashShake = 14;
  }
}

function drawSmashFrame() {
  ctx.save();
  if (smashShake > 0.3) {
    const sx = (Math.random() - 0.5) * smashShake;
    const sy = (Math.random() - 0.5) * smashShake;
    ctx.translate(sx, sy);
    smashShake *= 0.86;
  }

  let remainSec = 5.0;
  if (smashState === "charging") {
    const elapsed = performance.now() - smashChargeStart;
    remainSec = Math.max(0, (SMASH_CHARGE_MS - elapsed) / 1000);
    if (elapsed >= SMASH_CHARGE_MS) {
      smashState = "timing";
      smashGaugePos = 0.1;
      smashGaugeDir = 1;
    }
  } else if (smashState === "timing") {
    smashGaugePos += smashGaugeDir * 0.026;
    if (smashGaugePos >= 1) {
      smashGaugePos = 1;
      smashGaugeDir = -1;
    } else if (smashGaugePos <= 0) {
      smashGaugePos = 0;
      smashGaugeDir = 1;
    }
  } else if (smashState === "smashing") {
    const step = Math.max(1, Math.ceil((smashTargetFloors - smashBrokenFloors) * 0.14));
    smashBrokenFloors = Math.min(smashTargetFloors, smashBrokenFloors + step);
    if (Math.random() < 0.75) {
      spawnSmashDebris(290, 5);
      smashShake = 7;
    }
    if (smashBrokenFloors >= smashTargetFloors) {
      smashState = "result";
      const isNewBest = smashTargetFloors > smashBest;
      if (isNewBest) {
        smashBest = smashTargetFloors;
        localStorage.setItem("nakhwaSmashBest", String(smashBest));
      }
      triggerGameOver(isNewBest, smashTargetFloors > 0);
    }
  }

  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${smashBest}층`, 324, 24);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`내공 POWER ${Math.round(smashPower)}`, 16, 24);

  const groundY = 315;
  const bX = 112;
  const bW = 116;
  const floorH = 22;
  const visibleFloors = 10;
  const dropOffset = smashState === "smashing" ? (smashBrokenFloors % 2) * 5 : 0;

  for (let i = 0; i < visibleFloors; i++) {
    const floorNum = smashBrokenFloors + i + 1;
    const fy = groundY - (i + 1) * floorH + dropOffset;

    ctx.fillStyle = i % 2 === 0 ? "#2a2a35" : "#23232d";
    ctx.fillRect(bX, fy, bW, floorH - 1);
    ctx.strokeStyle = "#3a3a48";
    ctx.lineWidth = 1;
    ctx.strokeRect(bX, fy, bW, floorH - 1);

    ctx.fillStyle = i === 0 && (smashState === "smashing" || smashState === "result")
      ? "#ff5e84"
      : "rgba(255, 209, 102, 0.25)";
    ctx.fillRect(bX + 14, fy + 5, 20, 11);
    ctx.fillRect(bX + 48, fy + 5, 20, 11);
    ctx.fillRect(bX + 82, fy + 5, 20, 11);

    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${floorNum}F`, bX - 6, fy + 15);
  }

  ctx.fillStyle = "#1c1c22";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.strokeStyle = "#e65c7b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();

  if (smashPower > 0 && (smashState === "charging" || smashState === "timing")) {
    const auraR = Math.min(68, 22 + smashPower * 0.35 + smashAuraPulse * 8);
    ctx.fillStyle = "rgba(230, 92, 123, 0.22)";
    ctx.beginPath();
    ctx.arc(170, groundY + 18, auraR, Math.PI, Math.PI * 2);
    ctx.fill();
    smashAuraPulse *= 0.85;
  }

  const cx = 160;
  const cy = groundY + 4;
  ctx.fillStyle = "#f4f4f6";
  ctx.fillRect(cx + 2, cy, 16, 18);
  ctx.fillStyle = "#e65c7b";
  ctx.fillRect(cx + 2, cy + 3, 16, 3);
  ctx.fillStyle = "#ffd166";
  if (smashState === "smashing" || smashState === "result") {
    ctx.fillRect(cx + 6, cy - 10, 8, 10);
  } else {
    ctx.fillRect(cx + 16, cy + 7, 7, 7);
  }

  for (let i = smashDebris.length - 1; i >= 0; i--) {
    const d = smashDebris[i];
    d.vy += 0.38;
    d.x += d.vx;
    d.y += d.vy;
    d.rot += d.vrot;
    d.life--;

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = d.color;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();

    if (d.life <= 0) smashDebris.splice(i, 1);
  }

  ctx.textAlign = "center";
  if (smashState === "idle") {
    ctx.fillStyle = "rgba(15, 15, 18, 0.65)";
    ctx.fillRect(24, 125, 292, 86);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("🏢 초고층 건물 부수기", 170, 158);
    ctx.fillStyle = "#ff8ca5";
    ctx.font = "600 13px sans-serif";
    ctx.fillText("터치 또는 스페이스바를 연타해 시작!", 170, 184);
  } else if (smashState === "charging") {
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 22px sans-serif";
    ctx.fillText(`🔥 연타해서 기 모으기! (${remainSec.toFixed(1)}초)`, 170, 62);

    const barW = 240;
    const barX = 50;
    const fillRatio = Math.min(1, smashPower / 110);
    ctx.fillStyle = "#262630";
    ctx.fillRect(barX, 74, barW, 14);
    ctx.fillStyle = fillRatio > 0.8 ? "#ff4d6d" : "#e65c7b";
    ctx.fillRect(barX, 74, barW * fillRatio, 14);
  } else if (smashState === "timing") {
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 18px sans-serif";
    ctx.fillText("⚡ 중앙에 맞춰 일격 필살!!", 170, 355);

    const gX = 40;
    const gW = 260;
    const gY = 368;
    const gH = 18;

    ctx.fillStyle = "#262630";
    ctx.fillRect(gX, gY, gW, gH);

    ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
    ctx.fillRect(gX + gW * 0.34, gY, gW * 0.32, gH);

    ctx.fillStyle = "#e65c7b";
    ctx.fillRect(gX + gW * 0.44, gY, gW * 0.12, gH);

    const cursorX = gX + gW * smashGaugePos;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cursorX - 2.5, gY - 4, 5, gH + 8);
  } else if (smashState === "smashing" || smashState === "result") {
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 16px sans-serif";
    ctx.fillText(smashCritLabel, 170, 348);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 22px sans-serif";
    ctx.fillText(`💥 ${smashBrokenFloors}층 격파!`, 170, 376);

    if (smashState === "result") {
      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", 170, 398);
      } else {
        ctx.fillStyle = "#ff8ca5";
        ctx.font = "600 12px sans-serif";
        ctx.fillText("터치하여 다시 도전하기", 170, 398);
      }
    }
  }

  ctx.restore();
}