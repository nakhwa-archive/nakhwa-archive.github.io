/* ---------- 12. 낙화 무기 강화 (Weapon Enhancement) 상태 ---------- */
var ENHANCE_TIERS = [
  { minLv: 0, title: "낡은 목검", blade: "#a47148", glow: "rgba(164, 113, 72, 0.25)", guard: "#6f4518" },
  { minLv: 3, title: "강철 장검", blade: "#cbd5e1", glow: "rgba(203, 213, 225, 0.3)", guard: "#64748b" },
  { minLv: 6, title: "벚꽃 명검", blade: "#ff9eb5", glow: "rgba(255, 158, 181, 0.45)", guard: "#e65c7b" },
  { minLv: 9, title: "홍염의 대검", blade: "#ff4d6d", glow: "rgba(255, 77, 109, 0.55)", guard: "#ffd166" },
  { minLv: 12, title: "낙화신검", blade: "#72efdd", glow: "rgba(114, 239, 221, 0.65)", guard: "#ffd166" },
  { minLv: 15, title: "천상의 성검", blade: "#ffd166", glow: "rgba(255, 209, 102, 0.8)", guard: "#ffffff" }
];

var enhanceRunning = false;
var enhanceOver = false;
var enhanceLv = 0;
var enhanceMaxLvThisRun = 0;
var enhanceScore = 0;
var enhanceBest = Number(localStorage.getItem("nakhwaEnhanceBest") || 0);
var enhanceSessionHadBest = false;

var enhanceResultBanner = "";
var enhanceResultColor = "#f4f4f6";
var enhanceBannerTimer = 0;
var enhanceHammerAngle = 0;
var enhanceShake = 0;
var enhanceSparks = [];
var enhanceEndReason = "";

function getEnhanceRates(lv) {
  if (lv <= 3) return { success: 100, keep: 0, down: 0, destroy: 0 };
  if (lv === 4) return { success: 85, keep: 15, down: 0, destroy: 0 };
  if (lv === 5) return { success: 75, keep: 20, down: 5, destroy: 0 };
  if (lv === 6) return { success: 65, keep: 20, down: 10, destroy: 5 };
  if (lv === 7) return { success: 55, keep: 20, down: 15, destroy: 10 };
  if (lv === 8) return { success: 48, keep: 20, down: 17, destroy: 15 };
  if (lv === 9) return { success: 42, keep: 18, down: 20, destroy: 20 };
  if (lv === 10) return { success: 36, keep: 19, down: 20, destroy: 25 };
  if (lv === 11) return { success: 32, keep: 18, down: 20, destroy: 30 };
  if (lv === 12) return { success: 28, keep: 17, down: 20, destroy: 35 };
  const succ = Math.max(12, 26 - (lv - 12) * 2);
  const dest = Math.min(55, 38 + (lv - 12) * 3);
  const down = 20;
  const keep = Math.max(0, 100 - succ - dest - down);
  return { success: succ, keep, down, destroy: dest };
}

function calcEnhanceValue(lv) {
  if (lv <= 0) return 0;
  return Math.round(lv * 100 + Math.pow(lv, 2.35) * 45);
}

function getEnhanceWeaponSpec(lv) {
  let chosen = ENHANCE_TIERS[0];
  for (const t of ENHANCE_TIERS) {
    if (lv >= t.minLv) chosen = t;
  }
  return chosen;
}

function resetEnhance() {
  enhanceLv = 0;
  enhanceMaxLvThisRun = 0;
  enhanceScore = 0;
  enhanceOver = false;
  enhanceRunning = true;
  enhanceSessionHadBest = false;
  enhanceResultBanner = "";
  enhanceBannerTimer = 0;
  enhanceHammerAngle = 0;
  enhanceShake = 0;
  enhanceSparks = [];
  enhanceEndReason = "";
  isNewBestPending = false;
  hideSubmitBar();
}

function spawnEnhanceSparks(color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.8 + Math.random() * 4.5;
    enhanceSparks.push({
      x: 170 + (Math.random() - 0.5) * 24,
      y: 185 + (Math.random() - 0.5) * 24,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 1.2,
      r: 2 + Math.random() * 2.5,
      color,
      life: 28
    });
  }
}

function doEnhanceAttempt() {
  if (!enhanceRunning || enhanceOver) {
    if (!canRestartNow()) return;
    resetEnhance();
    return;
  }

  const rates = getEnhanceRates(enhanceLv);
  const roll = Math.random() * 100;
  enhanceHammerAngle = 1.0;

  if (roll < rates.success) {
    enhanceLv++;
    if (enhanceLv > enhanceMaxLvThisRun) enhanceMaxLvThisRun = enhanceLv;
    enhanceResultBanner = `✨ 강화 성공! (+${enhanceLv}강 달성)`;
    enhanceResultColor = "#72efdd";
    enhanceBannerTimer = 55;
    enhanceShake = 6;
    spawnEnhanceSparks("#ffd166", 18);
  } else if (roll < rates.success + rates.keep) {
    enhanceResultBanner = `🛡️ 강화 실패 (등급 유지 +${enhanceLv}강)`;
    enhanceResultColor = "#9898a6";
    enhanceBannerTimer = 55;
    enhanceShake = 3;
    spawnEnhanceSparks("#9898a6", 8);
  } else if (roll < rates.success + rates.keep + rates.down) {
    enhanceLv = Math.max(0, enhanceLv - 1);
    enhanceResultBanner = `⬇️ 강화 실패! 단계 하락 (+${enhanceLv}강)`;
    enhanceResultColor = "#ffd166";
    enhanceBannerTimer = 55;
    enhanceShake = 8;
    spawnEnhanceSparks("#ff8ca5", 12);
  } else {
    enhanceShake = 16;
    spawnEnhanceSparks("#ff4d6d", 32);
    enhanceOver = true;
    enhanceEndReason = "destroyed";
    enhanceScore = Math.round(calcEnhanceValue(enhanceMaxLvThisRun) * 0.3);
    const isNewBest = enhanceScore > enhanceBest;
    if (isNewBest) {
      enhanceBest = enhanceScore;
      enhanceSessionHadBest = true;
      localStorage.setItem("nakhwaEnhanceBest", String(enhanceBest));
    }
    triggerGameOver(isNewBest, enhanceScore > 0);
  }
}

function sellEnhanceWeapon() {
  if (!enhanceRunning || enhanceOver || enhanceLv <= 0) return;
  enhanceScore = calcEnhanceValue(enhanceLv);
  enhanceOver = true;
  enhanceEndReason = "sold";
  spawnEnhanceSparks("#ffd166", 24);

  const isNewBest = enhanceScore > enhanceBest;
  if (isNewBest) {
    enhanceBest = enhanceScore;
    enhanceSessionHadBest = true;
    localStorage.setItem("nakhwaEnhanceBest", String(enhanceBest));
  }
  triggerGameOver(isNewBest, enhanceScore > 0);
}

function drawEnhanceFrame() {
  ctx.save();
  if (enhanceShake > 0.3) {
    ctx.translate((Math.random() - 0.5) * enhanceShake, (Math.random() - 0.5) * enhanceShake);
    enhanceShake *= 0.85;
  }

  const spec = getEnhanceWeaponSpec(enhanceLv);
  const rates = getEnhanceRates(enhanceLv);
  const currentVal = calcEnhanceValue(enhanceLv);

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`가치 ${currentVal}점`, 14, 22);

  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`최고 도달 +${enhanceMaxLvThisRun}강`, 14, 37);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${enhanceBest}점`, 326, 22);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`+${enhanceLv} ${spec.title}`, 326, 37);

  const cx = 170;
  const cy = 185;
  const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
  const auraRadius = (48 + Math.min(45, enhanceLv * 3)) * pulse;

  const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, auraRadius);
  grad.addColorStop(0, spec.glow);
  grad.addColorStop(1, "rgba(18, 18, 22, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b2d38";
  ctx.beginPath();
  ctx.moveTo(120, 248);
  ctx.lineTo(220, 248);
  ctx.lineTo(205, 266);
  ctx.lineTo(135, 266);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(148, 266, 44, 16);
  ctx.fillRect(130, 282, 80, 10);

  if (!enhanceOver || enhanceEndReason !== "destroyed") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 4);

    ctx.fillStyle = spec.blade;
    ctx.beginPath();
    ctx.moveTo(-7, 25);
    ctx.lineTo(-7, -58);
    ctx.lineTo(0, -76);
    ctx.lineTo(7, -58);
    ctx.lineTo(7, 25);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillRect(-1.5, -56, 3, 76);

    ctx.fillStyle = spec.guard;
    ctx.beginPath();
    ctx.roundRect(-20, 24, 40, 8, 4);
    ctx.fill();

    ctx.fillStyle = "#3a2e28";
    ctx.fillRect(-5, 32, 10, 24);
    ctx.fillStyle = spec.guard;
    ctx.beginPath();
    ctx.arc(0, 58, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  if (enhanceHammerAngle > 0.02) {
    ctx.save();
    ctx.translate(225, 195);
    ctx.rotate(-enhanceHammerAngle * 1.1);
    ctx.fillStyle = "#8c6d53";
    ctx.fillRect(-4, -46, 8, 46);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(-16, -56, 32, 16);
    ctx.restore();
    enhanceHammerAngle *= 0.82;
  }

  ctx.fillStyle = "rgba(20, 20, 26, 0.85)";
  ctx.beginPath();
  ctx.roundRect(16, 298, 308, 42, 8);
  ctx.fill();
  ctx.strokeStyle = "#2c2c38";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#72efdd";
  ctx.fillText(`성공 ${rates.success}%`, 68, 323);
  ctx.fillStyle = "#9898a6";
  ctx.fillText(`유지 ${rates.keep}%`, 136, 323);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`하락 ${rates.down}%`, 204, 323);
  ctx.fillStyle = rates.destroy > 0 ? "#ff4d6d" : "#64748b";
  ctx.fillText(`파괴 ${rates.destroy}%`, 272, 323);

  ctx.fillStyle = "#e65c7b";
  ctx.beginPath();
  ctx.roundRect(16, 348, 186, 48, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🔨 강화하기 (+${enhanceLv}→+${enhanceLv + 1})`, 109, 377);

  const canSell = enhanceLv > 0 && !enhanceOver;
  ctx.fillStyle = canSell ? "#262632" : "#18181f";
  ctx.beginPath();
  ctx.roundRect(210, 348, 114, 48, 10);
  ctx.fill();
  ctx.strokeStyle = canSell ? "#ffd166" : "#282832";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = canSell ? "#ffd166" : "#555566";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("💰 판매 확정", 267, 369);
  ctx.font = "600 10px sans-serif";
  ctx.fillText(`${currentVal}점`, 267, 385);

  if (enhanceBannerTimer > 0) {
    enhanceBannerTimer--;
    ctx.fillStyle = enhanceResultColor;
    ctx.font = "900 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(enhanceResultBanner, 170, 74);
  }

  for (let i = enhanceSparks.length - 1; i >= 0; i--) {
    const sp = enhanceSparks[i];
    sp.vy += 0.22;
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.life--;
    ctx.fillStyle = sp.color;
    ctx.globalAlpha = Math.max(0, sp.life / 28);
    ctx.fillRect(sp.x, sp.y, sp.r, sp.r);
    ctx.globalAlpha = 1;
    if (sp.life <= 0) enhanceSparks.splice(i, 1);
  }

  if (enhanceOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";

    if (enhanceEndReason === "destroyed") {
      ctx.fillStyle = "#ff4d6d";
      ctx.font = "900 21px sans-serif";
      ctx.fillText(`💥 무기 파괴! (최고 +${enhanceMaxLvThisRun}강)`, canvas.width / 2, 178);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`위로금 점수: ${enhanceScore}점`, canvas.width / 2, 204);
    } else {
      ctx.fillStyle = "#ffd166";
      ctx.font = "900 21px sans-serif";
      ctx.fillText(`💰 +${enhanceLv}강 제련 성공!`, canvas.width / 2, 178);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`최종 획득 점수: ${enhanceScore}점`, canvas.width / 2, 204);
    }

    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 234);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 새 무기로 다시 도전합니다", canvas.width / 2, 234);
    }
  }

  ctx.restore();
}