/* ---------- 올림픽 8. 클레이사격 (Clay Shooting) 상태 ---------- */
var olyClayRunning = false;
var olyClayOver = false;
var olyClayFinished = false;

var olyClayFrame = 0;
var olyClayTimeLeftFrames = 25 * 60; // 25초 제한
var olyClaySpawnCooldown = 0;
var olyClayCombo = 0;

var olyClayScore = 0;
var olyClayBest = Number(localStorage.getItem("nakhwaOlyClayBest") || 0);
var olyClayTargets = [];
var olyClayParticles = [];
var olyClayPopups = [];

function resetOlyClay() {
  olyClayFrame = 0;
  olyClayTimeLeftFrames = 25 * 60;
  olyClaySpawnCooldown = 12;
  olyClayCombo = 0;
  olyClayScore = 0;
  olyClayTargets = [];
  olyClayParticles = [];
  olyClayPopups = [];
  olyClayOver = false;
  olyClayFinished = false;
  olyClayRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyClayPopup(x, y, text, color) {
  olyClayPopups.push({ x, y, text, color, life: 34 });
}

function spawnOlyClayBurst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.4 + Math.random() * 3.2;
    olyClayParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2.2 + Math.random() * 2.4,
      color,
      life: 22
    });
  }
}

function spawnOlyClayTarget() {
  const fromLeft = Math.random() < 0.5;
  const isGold = Math.random() < 0.22;
  const startX = fromLeft ? 24 : canvas.width - 24;
  const startY = 235 + Math.random() * 55;
  const vx = (fromLeft ? 1 : -1) * (2.2 + Math.random() * 1.9);
  const vy = -(5.8 + Math.random() * 2.4);

  olyClayTargets.push({
    x: startX,
    y: startY,
    vx,
    vy,
    r: isGold ? 15 : 18,
    gold: isGold,
    hit: false
  });
}

function shootOlyClayAt(px, py) {
  if (!olyClayRunning || olyClayOver || olyClayFinished) return;

  let hitAny = false;
  for (let i = olyClayTargets.length - 1; i >= 0; i--) {
    const t = olyClayTargets[i];
    if (t.hit) continue;
    const dx = px - t.x;
    const dy = py - t.y;
    const hitRadius = t.r + 12; // 터치/클릭 편의성 보정
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      t.hit = true;
      hitAny = true;
      olyClayCombo++;
      const basePts = t.gold ? 250 : 100;
      const comboBonus = Math.min(200, (olyClayCombo - 1) * 20);
      const earned = basePts + comboBonus;
      olyClayScore += earned;

      spawnOlyClayBurst(t.x, t.y, t.gold ? "#ffd166" : "#ff8ca5", 14);
      addOlyClayPopup(
        t.x,
        t.y - 10,
        t.gold ? `✨ +${earned}!` : `💥 +${earned}`,
        t.gold ? "#ffd166" : "#72efdd"
      );
      olyClayTargets.splice(i, 1);
      break;
    }
  }

  if (!hitAny) {
    olyClayCombo = 0;
    spawnOlyClayBurst(px, py, "#9898a6", 4);
    addOlyClayPopup(px, py - 8, "MISS", "#9898a6");
  }
}

function finishOlyClay() {
  olyClayFinished = true;
  olyClayRunning = false;

  const isNewBest = olyClayScore > olyClayBest;
  if (isNewBest) {
    olyClayBest = olyClayScore;
    localStorage.setItem("nakhwaOlyClayBest", String(olyClayBest));
  }

  triggerGameOver(isNewBest, olyClayScore > 0);
}

function drawOlyClayFrame() {
  try {
    ctx.save();

    if (olyClayRunning && !olyClayOver && !olyClayFinished) {
      olyClayFrame++;
      olyClayTimeLeftFrames--;

      olyClaySpawnCooldown--;
      if (olyClaySpawnCooldown <= 0) {
        spawnOlyClayTarget();
        olyClaySpawnCooldown = Math.max(24, 46 - Math.floor((25 * 60 - olyClayTimeLeftFrames) / 140));
      }

      for (let i = olyClayTargets.length - 1; i >= 0; i--) {
        const t = olyClayTargets[i];
        t.x += t.vx;
        t.y += t.vy;
        t.vy += 0.16;

        if (t.y > canvas.height - 30 || t.x < -30 || t.x > canvas.width + 30) {
          olyClayTargets.splice(i, 1);
        }
      }

      if (olyClayTimeLeftFrames <= 0) {
        olyClayTimeLeftFrames = 0;
        finishOlyClay();
      }
    }

    // 배경(하늘 & 사격장 언덕)
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#182638";
    ctx.fillRect(0, 46, canvas.width, 250);

    ctx.fillStyle = "#213b2d";
    ctx.fillRect(0, 296, canvas.width, canvas.height - 296);

    // 클레이 접시 렌더링
    for (const t of olyClayTargets) {
      ctx.fillStyle = t.gold ? "#ffd166" : "#e8684a";
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, t.r, t.r * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = t.gold ? "#fff3b0" : "#ffb3a7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 파티클 & 팝업
    for (let i = olyClayParticles.length - 1; i >= 0; i--) {
      const pt = olyClayParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyClayParticles.splice(i, 1);
    }

    for (let i = olyClayPopups.length - 1; i >= 0; i--) {
      const pop = olyClayPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyClayPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const secLeft = (olyClayTimeLeftFrames / 60).toFixed(1);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`점수 ${olyClayScore}점 · ${secLeft}초`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(olyClayCombo > 1 ? `🔥 ${olyClayCombo}연속 명중!` : "날아오는 접시를 터치/클릭!", 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BEST ${olyClayBest}점`, canvas.width - 12, 24);

    // 종료 오버레이
    if (olyClayFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🎯 클레이사격 ${olyClayScore}점`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#ff8ca5";
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
  id: "oly-clay",
  title: "클레이사격",
  icon: "🎯",
  desc: "포물선으로 날아오는 접시를 빠르게 격파하는 사격 승부!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "점",
  hint: "날아오는 클레이 접시를 터치 또는 마우스 클릭으로 명중!",
  rankingTitle: "🎯 클레이사격 TOP 5",
  dbNode: "oly_clay_scores",
  getBadge: () => `BEST ${olyClayBest}점`,
  getScore: () => olyClayScore,
  reset: resetOlyClay,
  draw: drawOlyClayFrame,
  stop: () => {
    olyClayRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyClayFinished || olyClayOver || !olyClayRunning) {
      if (!canRestartNow()) return;
      resetOlyClay();
      return;
    }
    shootOlyClayAt(x, y);
  },
  onKeyDown: (e) => {
    if (olyClayFinished || olyClayOver || !olyClayRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyClay();
      }
    }
  }
});