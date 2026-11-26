/* ---------- 15. 낙화 궁술 명중 (Archery) 상태 ---------- */
var archeryRunning = false;
var archeryOver = false;
var archeryScore = 0;
var archeryLastScore = 0;
var archeryBest = Number(localStorage.getItem("nakhwaArcheryBest") || 0);
var archerySessionHadBest = false;

var archeryArrows = 10;
var archeryCombo = 0;
var archeryStage = 1;
var archeryWind = 0; // -2.5 ~ +2.5
var archeryFrame = 0;

var archeryTarget = {
  x: 170,
  y: 96,
  r: 34,
  dir: 1,
  speed: 1.2
};

var archeryApple = {
  active: false,
  x: 170,
  y: 54,
  r: 10
};

var archeryBow = {
  x: 170,
  y: 368,
  aimAngle: -Math.PI / 2,
  aimDir: 1
};

var archeryFlyingArrows = [];
var archeryStuckArrows = [];
var archeryPopups = [];
var archeryParticles = [];

function setupArcheryStage(stage) {
  archeryStage = stage;
  archeryTarget.r = Math.max(22, 35 - stage * 1.1);
  archeryTarget.speed = stage === 1 ? 0.9 : Math.min(3.8, 1.0 + stage * 0.28);
  archeryWind = stage === 1 ? 0 : Number(((Math.random() - 0.5) * Math.min(4.6, 1.4 + stage * 0.35)).toFixed(1));
  archeryStuckArrows = [];

  if (stage >= 2 && Math.random() < 0.65) {
    archeryApple.active = true;
    archeryApple.x = archeryTarget.x;
    archeryApple.y = archeryTarget.y - archeryTarget.r - 14;
  } else {
    archeryApple.active = false;
  }
}

function resetArchery() {
  archeryScore = 0;
  archeryArrows = 10;
  archeryCombo = 0;
  archeryFrame = 0;
  archeryTarget.x = 170;
  archeryTarget.y = 96;
  archeryTarget.dir = 1;
  archeryBow.x = 170;
  archeryBow.aimAngle = -Math.PI / 2;
  archeryBow.aimDir = 1;
  archeryFlyingArrows = [];
  archeryStuckArrows = [];
  archeryPopups = [];
  archeryParticles = [];
  archeryOver = false;
  archeryRunning = true;
  archerySessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
  setupArcheryStage(1);
}

function addArcheryPopup(x, y, text, color) {
  archeryPopups.push({ x, y, text, color, life: 42 });
}

function spawnArcheryBurst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 3.2;
    archeryParticles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 2 + Math.random() * 2,
      color,
      life: 24
    });
  }
}

function shootArcheryArrow() {
  if (!archeryRunning || archeryOver) {
    if (!canRestartNow()) return;
    resetArchery();
    return;
  }
  if (archeryArrows <= 0 || archeryFlyingArrows.length > 0) return;

  archeryArrows--;
  const speed = 10.5;
  archeryFlyingArrows.push({
    x: archeryBow.x,
    y: archeryBow.y - 14,
    vx: Math.cos(archeryBow.aimAngle) * speed,
    vy: Math.sin(archeryBow.aimAngle) * speed
  });
}

function finishArcheryCheck() {
  if (archeryArrows <= 0 && archeryFlyingArrows.length === 0 && !archeryOver) {
    archeryOver = true;
    archeryLastScore = Math.floor(archeryScore);
    const isNewBest = archeryLastScore > archeryBest;
    if (isNewBest) {
      archeryBest = archeryLastScore;
      localStorage.setItem("nakhwaArcheryBest", String(archeryBest));
    }
    triggerGameOver(isNewBest, archeryLastScore > 0);
  }
}

function drawArcheryFrame() {
  if (archeryRunning && !archeryOver) {
    archeryFrame++;

    // 조준선 좌우 스윙
    const aimSpeed = 0.024 + Math.min(0.018, archeryStage * 0.0015);
    archeryBow.aimAngle += archeryBow.aimDir * aimSpeed;
    if (archeryBow.aimAngle > -Math.PI / 2 + 0.52) {
      archeryBow.aimAngle = -Math.PI / 2 + 0.52;
      archeryBow.aimDir = -1;
    } else if (archeryBow.aimAngle < -Math.PI / 2 - 0.52) {
      archeryBow.aimAngle = -Math.PI / 2 - 0.52;
      archeryBow.aimDir = 1;
    }

    // 과녁 좌우 이동
    const prevTargetX = archeryTarget.x;
    archeryTarget.x += archeryTarget.dir * archeryTarget.speed;
    const margin = archeryTarget.r + 22;
    if (archeryTarget.x > canvas.width - margin) {
      archeryTarget.x = canvas.width - margin;
      archeryTarget.dir = -1;
    } else if (archeryTarget.x < margin) {
      archeryTarget.x = margin;
      archeryTarget.dir = 1;
    }
    const deltaX = archeryTarget.x - prevTargetX;

    // 꽂힌 화살 & 사과도 과녁과 함께 이동
    for (const s of archeryStuckArrows) {
      s.offsetX += 0;
    }
    if (archeryApple.active) {
      archeryApple.x = archeryTarget.x;
    }

    // 날아가는 화살 물리 & 명중 판정
    for (let i = archeryFlyingArrows.length - 1; i >= 0; i--) {
      const a = archeryFlyingArrows[i];
      a.vx += archeryWind * 0.045;
      a.x += a.vx;
      a.y += a.vy;

      // 1) 보너스 사과 명중 체크
      if (archeryApple.active) {
        const distApple = Math.hypot(a.x - archeryApple.x, a.y - archeryApple.y);
        if (distApple <= archeryApple.r + 6) {
          archeryApple.active = false;
          archeryArrows += 2;
          archeryScore += 150;
          spawnArcheryBurst(archeryApple.x, archeryApple.y, "#ffd166", 16);
          addArcheryPopup(archeryApple.x, archeryApple.y - 10, "🍎 +150점 · 화살 +2!", "#ffd166");
        }
      }

      // 2) 과녁 명중 체크 (과녁 높이에 도달했을 때)
      if (a.y <= archeryTarget.y + 8 && a.y >= archeryTarget.y - archeryTarget.r) {
        const dist = Math.hypot(a.x - archeryTarget.x, a.y - archeryTarget.y);
        if (dist <= archeryTarget.r + 3) {
          archeryFlyingArrows.splice(i, 1);
          archeryStuckArrows.push({
            offsetX: a.x - archeryTarget.x,
            offsetY: a.y - archeryTarget.y
          });

          const ratio = dist / archeryTarget.r;
          let pts = 30;
          let label = "HIT +30";
          let col = "#72efdd";

          if (ratio <= 0.28) {
            archeryCombo++;
            archeryArrows++; // 정중앙 명중 시 화살 1발 회수!
            pts = 120 + (archeryCombo - 1) * 30;
            label = `🎯 BULLSEYE! +${pts} (+1발)`;
            col = "#ffd166";
            spawnArcheryBurst(a.x, a.y, "#ffd166", 18);
          } else if (ratio <= 0.62) {
            archeryCombo++;
            pts = 60 + (archeryCombo - 1) * 15;
            label = `✨ GREAT! +${pts}`;
            col = "#ff8ca5";
            spawnArcheryBurst(a.x, a.y, "#ff8ca5", 10);
          } else {
            archeryCombo = 0;
            spawnArcheryBurst(a.x, a.y, "#72efdd", 6);
          }

          archeryScore += pts;
          addArcheryPopup(archeryTarget.x, archeryTarget.y + archeryTarget.r + 18, label, col);

          // 3발 꽂히면 다음 스테이지로 진급
          if (archeryStuckArrows.length >= 3) {
            setupArcheryStage(archeryStage + 1);
          }
          finishArcheryCheck();
          continue;
        }
      }

      // 화면 밖으로 빗나감
      if (a.y < -20 || a.x < -20 || a.x > canvas.width + 20) {
        archeryFlyingArrows.splice(i, 1);
        archeryCombo = 0;
        addArcheryPopup(Math.max(45, Math.min(295, a.x)), 46, "💨 MISS", "#9898a6");
        finishArcheryCheck();
      }
    }
  }

  // 1) 배경 & 거리 눈금선
  ctx.fillStyle = "#121218";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let y = 140; y <= 320; y += 60) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
  }

  // 2) 과녁 렌더링
  const tx = archeryTarget.x;
  const ty = archeryTarget.y;
  const tr = archeryTarget.r;

  const rings = [
    { ratio: 1.0, color: "#f4f4f6" },
    { ratio: 0.78, color: "#282834" },
    { ratio: 0.56, color: "#4ea8de" },
    { ratio: 0.34, color: "#e65c7b" },
    { ratio: 0.16, color: "#ffd166" }
  ];
  for (const ring of rings) {
    ctx.fillStyle = ring.color;
    ctx.beginPath();
    ctx.arc(tx, ty, tr * ring.ratio, 0, Math.PI * 2);
    ctx.fill();
  }

  // 과녁에 꽂힌 화살들
  for (const s of archeryStuckArrows) {
    const sx = tx + s.offsetX;
    const sy = ty + s.offsetY;
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 4, sy + 14);
    ctx.stroke();
    ctx.fillStyle = "#e65c7b";
    ctx.fillRect(sx + 2, sy + 12, 4, 4);
  }

  // 보너스 황금 사과
  if (archeryApple.active) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(archeryApple.x, archeryApple.y, archeryApple.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#72efdd";
    ctx.fillRect(archeryApple.x - 1, archeryApple.y - archeryApple.r - 4, 3, 5);
  }

  // 3) 하단 활 & 조준 가이드
  const bx = archeryBow.x;
  const by = archeryBow.y;

  if (!archeryOver && archeryArrows > 0 && archeryFlyingArrows.length === 0) {
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = "rgba(255, 140, 165, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by - 14);
    ctx.lineTo(
      bx + Math.cos(archeryBow.aimAngle) * 145,
      by - 14 + Math.sin(archeryBow.aimAngle) * 145
    );
    ctx.stroke();
    ctx.restore();
  }

  // 활 본체 그리기
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(archeryBow.aimAngle + Math.PI / 2);

  ctx.strokeStyle = "#e65c7b";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 8, 26, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // 시위
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.lineTo(0, 4);
  ctx.lineTo(22, -4);
  ctx.stroke();

  // 장전된 화살
  if (archeryArrows > 0 && archeryFlyingArrows.length === 0 && !archeryOver) {
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, -24);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-4, -21);
    ctx.lineTo(4, -21);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4) 날아가는 화살
  for (const a of archeryFlyingArrows) {
    const ang = Math.atan2(a.vy, a.vx);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, -14);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-4, -11);
    ctx.lineTo(4, -11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 5) 파티클 & 팝업
  for (let i = archeryParticles.length - 1; i >= 0; i--) {
    const pt = archeryParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 24);
    ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    ctx.globalAlpha = 1;
    if (pt.life <= 0) archeryParticles.splice(i, 1);
  }

  for (let i = archeryPopups.length - 1; i >= 0; i--) {
    const pop = archeryPopups[i];
    pop.y -= 0.5;
    pop.life--;
    ctx.fillStyle = pop.color;
    ctx.globalAlpha = Math.max(0, pop.life / 42);
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.globalAlpha = 1;
    if (pop.life <= 0) archeryPopups.splice(i, 1);
  }

  // 6) 상단 HUD (점수, 바람 세기, 남은 화살)
  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${Math.floor(archeryScore)}`, 12, 21);

  const windDirText = archeryWind === 0
    ? "WIND 무풍"
    : (archeryWind > 0 ? `WIND ▶ ${archeryWind}` : `WIND ◀ ${Math.abs(archeryWind)}`);
  ctx.fillStyle = archeryWind === 0 ? "#9898a6" : "#72efdd";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`STAGE ${archeryStage} · ${windDirText}`, 12, 36);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${archeryBest}`, 328, 21);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`🏹 x ${archeryArrows}`, 328, 36);

  if (archeryOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🏹 화살 소진 · 최종 ${archeryLastScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 활을 당깁니다", canvas.width / 2, 220);
    }
  }
}

registerGame({
  id: "archery",
  title: "낙화 궁술 명중",
  icon: "🏹",
  desc: "바람과 움직임을 읽어 정중앙 불스아이 명중!",
  aspect: "tall",
  unit: "점",
  hint: "터치 또는 스페이스바로 발사! 정중앙 명중 시 화살 +1발!",
  rankingTitle: "🏹 궁술 명중 TOP 5",
  dbNode: "archery_scores",
  getBadge: () => `BEST ${archeryBest}점`,
  getScore: () => archeryLastScore,
  reset: resetArchery,
  draw: drawArcheryFrame,
  stop: () => {
    archeryRunning = false;
  },
  onPointerDown: () => {
    shootArcheryArrow();
  },
  onKeyDown: (e) => {
    if (e.code === "Space" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!e.repeat) shootArcheryArrow();
    }
  }
});
