/* ---------- 9. 낙화 펀치아웃 (Punch-Out!!) 상태 ---------- */
var PUNCH_ENEMIES = [
  { name: "낙화 견습생", skin: "#f4c2a1", trunk: "#4ea8de", hair: "#2b2d42", maxHp: 60 },
  { name: "홍염 파이터", skin: "#e09f7d", trunk: "#e65c7b", hair: "#1a1a1f", maxHp: 85 },
  { name: "강철 챔피언", skin: "#c68642", trunk: "#ffd166", hair: "#000000", maxHp: 115 }
];

var punchRunning = false;
var punchOver = false;
var punchScore = 0;
var punchBest = Number(localStorage.getItem("nakhwaPunchBest") || 0);
var punchRound = 1;
var punchSessionHadBest = false;

var pBoxerState = "idle";
var pBoxerTimer = 0;
var pBoxerHp = 100;
var pBoxerStamina = 3;

var eBoxerState = "guard";
var eBoxerTimer = 60;
var eBoxerHp = 60;
var eBoxerMaxHp = 60;
var eBoxerYOffset = 0;
var punchShake = 0;
var punchPopupText = "";
var punchPopupTimer = 0;

function getCurrentPunchEnemy() {
  return PUNCH_ENEMIES[(punchRound - 1) % PUNCH_ENEMIES.length];
}

function setupPunchRound(round) {
  punchRound = round;
  const spec = getCurrentPunchEnemy();
  const hpBonus = Math.floor((round - 1) / 3) * 25;
  eBoxerMaxHp = spec.maxHp + hpBonus;
  eBoxerHp = eBoxerMaxHp;
  eBoxerState = "guard";
  eBoxerTimer = 55;
  eBoxerYOffset = 0;
  pBoxerState = "idle";
  pBoxerTimer = 0;
  pBoxerStamina = 3;
  pBoxerHp = Math.min(100, pBoxerHp + 25);
}

function resetPunch() {
  punchScore = 0;
  pBoxerHp = 100;
  punchOver = false;
  punchRunning = true;
  punchShake = 0;
  punchPopupText = "";
  punchPopupTimer = 0;
  punchSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
  setupPunchRound(1);
}

function showPunchPopup(text) {
  punchPopupText = text;
  punchPopupTimer = 32;
}

function punchDodge(dir) {
  if (!punchRunning || punchOver) return;
  if (pBoxerState !== "idle") return;
  pBoxerState = dir === "L" ? "dodgeL" : "dodgeR";
  pBoxerTimer = 26;
}

function punchAttack() {
  if (!punchRunning || punchOver) {
    if (!canRestartNow()) return;
    resetPunch();
    return;
  }
  if (pBoxerState !== "idle" || pBoxerStamina <= 0) return;

  pBoxerState = "punch";
  pBoxerTimer = 14;

  if (eBoxerState === "stunned") {
    const dmg = 22;
    eBoxerHp = Math.max(0, eBoxerHp - dmg);
    eBoxerState = "hurt";
    eBoxerTimer = 18;
    punchShake = 9;
    punchScore += 150;
    showPunchPopup("💥 COUNTER UPPERCUT!");
  } else if (eBoxerState === "telegraphL" || eBoxerState === "telegraphR" || eBoxerState === "telegraphBoth") {
    const dmg = 10;
    eBoxerHp = Math.max(0, eBoxerHp - dmg);
    punchShake = 4;
    punchScore += 60;
    showPunchPopup("⚡ JAB HIT!");
  } else if (eBoxerState === "guard") {
    pBoxerStamina = Math.max(0, pBoxerStamina - 1);
    punchShake = 2;
    showPunchPopup("🛡️ BLOCKED!");
  }

  if (punchScore > punchBest) {
    punchBest = punchScore;
    punchSessionHadBest = true;
    localStorage.setItem("nakhwaPunchBest", String(punchBest));
  }

  if (eBoxerHp <= 0 && eBoxerState !== "ko") {
    eBoxerState = "ko";
    eBoxerTimer = 65;
    punchScore += punchRound * 300;
    if (punchScore > punchBest) {
      punchBest = punchScore;
      punchSessionHadBest = true;
      localStorage.setItem("nakhwaPunchBest", String(punchBest));
    }
    showPunchPopup("🏆 K.O.!!");
  }
}

function updatePunchLogic() {
  if (!punchRunning || punchOver) return;

  if (punchPopupTimer > 0) punchPopupTimer--;

  if (pBoxerTimer > 0) {
    pBoxerTimer--;
    if (pBoxerTimer <= 0) {
      pBoxerState = "idle";
    }
  }

  if (eBoxerState === "ko") {
    eBoxerYOffset += 2.2;
    eBoxerTimer--;
    if (eBoxerTimer <= 0) {
      setupPunchRound(punchRound + 1);
    }
    return;
  }

  eBoxerTimer--;
  if (eBoxerTimer <= 0) {
    if (eBoxerState === "guard" || eBoxerState === "hurt" || eBoxerState === "stunned") {
      pBoxerStamina = 3;
      const telegraphDur = Math.max(22, 46 - punchRound * 3);
      const roll = Math.random();
      if (punchRound >= 2 && roll < 0.28) {
        eBoxerState = "telegraphBoth";
      } else if (roll < 0.64) {
        eBoxerState = "telegraphL";
      } else {
        eBoxerState = "telegraphR";
      }
      eBoxerTimer = telegraphDur;
    } else if (eBoxerState === "telegraphL" || eBoxerState === "telegraphR" || eBoxerState === "telegraphBoth") {
      const atkType = eBoxerState === "telegraphL" ? "attackL"
        : (eBoxerState === "telegraphR" ? "attackR" : "attackBoth");
      eBoxerState = atkType;
      eBoxerTimer = 14;

      const dodged =
        (atkType === "attackL" && pBoxerState === "dodgeR") ||
        (atkType === "attackR" && pBoxerState === "dodgeL") ||
        (atkType === "attackBoth" && (pBoxerState === "dodgeL" || pBoxerState === "dodgeR"));

      if (!dodged) {
        const dmg = atkType === "attackBoth" ? 28 : 20;
        pBoxerHp = Math.max(0, pBoxerHp - dmg);
        pBoxerState = "hurt";
        pBoxerTimer = 20;
        punchShake = 11;
        showPunchPopup("💢 HIT!");

        if (pBoxerHp <= 0) {
          punchOver = true;
          triggerGameOver(punchSessionHadBest, punchScore > 0);
        }
      } else {
        showPunchPopup("✨ DODGE!");
      }
    } else if (eBoxerState === "attackL" || eBoxerState === "attackR" || eBoxerState === "attackBoth") {
      eBoxerState = "stunned";
      eBoxerTimer = Math.max(28, 48 - punchRound * 2);
    }
  }
}

function drawPunchFrame() {
  updatePunchLogic();

  ctx.save();
  if (punchShake > 0.3) {
    ctx.translate((Math.random() - 0.5) * punchShake, (Math.random() - 0.5) * punchShake);
    punchShake *= 0.84;
  }

  ctx.fillStyle = "#16161d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ropeColors = ["#e65c7b", "#f4f4f6", "#4ea8de"];
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = ropeColors[i];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 145 + i * 26);
    ctx.lineTo(canvas.width, 145 + i * 26);
    ctx.stroke();
  }

  ctx.fillStyle = "#1f2430";
  ctx.fillRect(0, 220, canvas.width, 190);
  ctx.strokeStyle = "#3a4256";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 220);
  ctx.lineTo(canvas.width, 220);
  ctx.stroke();

  const spec = getCurrentPunchEnemy();
  ctx.fillStyle = "#9898a6";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`ROUND ${punchRound} · ${spec.name}`, 14, 20);

  ctx.fillStyle = "#282832";
  ctx.fillRect(14, 25, 150, 10);
  ctx.fillStyle = "#e65c7b";
  ctx.fillRect(14, 25, 150 * Math.max(0, eBoxerHp / eBoxerMaxHp), 10);

  ctx.textAlign = "right";
  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(`SCORE ${punchScore}`, 326, 20);
  ctx.fillStyle = "#9898a6";
  ctx.font = "600 11px sans-serif";
  ctx.fillText(`BEST ${punchBest}`, 326, 35);

  ctx.save();
  let ex = 170;
  let ey = 175 + eBoxerYOffset;
  if (eBoxerState === "telegraphL") ex -= 14;
  if (eBoxerState === "telegraphR") ex += 14;
  if (eBoxerState === "hurt") ey -= 8;
  if (eBoxerState === "stunned") ey += 6;

  ctx.translate(ex, ey);

  ctx.fillStyle = spec.trunk;
  ctx.fillRect(-34, 28, 68, 34);

  ctx.fillStyle = eBoxerState === "hurt" ? "#ff8ca5" : spec.skin;
  ctx.fillRect(-38, -28, 76, 58);

  ctx.fillRect(-22, -68, 44, 40);
  ctx.fillStyle = spec.hair;
  ctx.fillRect(-24, -74, 48, 14);

  const isTelegraph = eBoxerState.startsWith("telegraph");
  ctx.fillStyle = isTelegraph ? "#ffd166" : "#121216";
  ctx.fillRect(-13, -52, 8, 6);
  ctx.fillRect(5, -52, 8, 6);

  if (isTelegraph) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -84); ctx.lineTo(0, -72);
    ctx.moveTo(-8, -78); ctx.lineTo(8, -78);
    ctx.stroke();
  }

  ctx.fillStyle = "#d90429";
  if (eBoxerState === "guard") {
    ctx.beginPath(); ctx.arc(-18, -36, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, -36, 16, 0, Math.PI * 2); ctx.fill();
  } else if (eBoxerState === "telegraphL") {
    ctx.beginPath(); ctx.arc(-48, -22, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(22, -32, 15, 0, Math.PI * 2); ctx.fill();
  } else if (eBoxerState === "telegraphR") {
    ctx.beginPath(); ctx.arc(-22, -32, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(48, -22, 18, 0, Math.PI * 2); ctx.fill();
  } else if (eBoxerState === "telegraphBoth") {
    ctx.beginPath(); ctx.arc(-46, -10, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(46, -10, 18, 0, Math.PI * 2); ctx.fill();
  } else if (eBoxerState === "attackL") {
    ctx.beginPath(); ctx.arc(-28, 38, 28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24, -28, 15, 0, Math.PI * 2); ctx.fill();
  } else if (eBoxerState === "attackR") {
    ctx.beginPath(); ctx.arc(-24, -28, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(28, 38, 28, 0, Math.PI * 2); ctx.fill();
  } else if (eBoxerState === "attackBoth") {
    ctx.beginPath(); ctx.arc(-24, 42, 26, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24, 42, 26, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(-42, 14, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(42, 14, 15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  let px = 170;
  let py = 325;
  if (pBoxerState === "dodgeL") px -= 56;
  if (pBoxerState === "dodgeR") px += 56;
  if (pBoxerState === "hurt") py += 14;

  ctx.translate(px, py);

  ctx.fillStyle = "#e65c7b";
  ctx.fillRect(-24, 24, 48, 26);
  ctx.fillStyle = pBoxerState === "hurt" ? "#ff4d6d" : "#f4c2a1";
  ctx.fillRect(-26, -14, 52, 38);
  ctx.fillStyle = "#222228";
  ctx.beginPath();
  ctx.arc(0, -28, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e65c7b";
  ctx.fillRect(-18, -32, 36, 5);

  ctx.fillStyle = "#ff8ca5";
  if (pBoxerState === "punch") {
    ctx.beginPath(); ctx.arc(0, -115, 20, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(-28, -14, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(28, -14, 13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
  ctx.fillRect(0, 372, canvas.width, 38);

  ctx.fillStyle = "#282832";
  ctx.fillRect(14, 380, 130, 10);
  ctx.fillStyle = pBoxerHp > 30 ? "#72efdd" : "#ff4d6d";
  ctx.fillRect(14, 380, 130 * Math.max(0, pBoxerHp / 100), 10);

  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`STAMINA ${"⚡".repeat(pBoxerStamina)}`, 326, 389);

  ctx.fillStyle = "#9898a6";
  ctx.font = "600 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("◀ 좌회피  |  🥊 펀치(중앙)  |  우회피 ▶", 170, 403);

  if (punchPopupTimer > 0) {
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(punchPopupText, 170, 82);
  }

  if (punchOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🥊 다운! 최종 ${punchScore}점 (R${punchRound})`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 도전합니다", canvas.width / 2, 220);
    }
  }

  ctx.restore();
}