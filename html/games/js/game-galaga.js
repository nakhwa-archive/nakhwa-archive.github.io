/* ---------- 8. 낙화 갤러그 (Galaga Shooter) 상태 ---------- */
var galagaRunning = false;
var galagaOver = false;
var galagaScore = 0;
var galagaBest = Number(localStorage.getItem("nakhwaGalagaBest") || 0);
var galagaStage = 1;
var galagaLives = 3;
var galagaWeaponLv = 1;
var galagaFrame = 0;
var galagaInvuln = 0;
var galagaSessionHadBest = false;

var galagaShip = {
  x: 170,
  y: 376,
  w: 24,
  h: 22,
  speed: 4.5
};

var galagaBullets = [];
var galagaEnemies = [];
var galagaEnemyBullets = [];
var galagaPowerups = [];
var galagaParticles = [];
var galagaStars = [];
var galagaFormDir = 1;
var galagaDragging = false;
var galagaLastDragX = 0;

function initGalagaStars() {
  galagaStars = Array.from({ length: 28 }, () => ({
    x: Math.random() * 340,
    y: Math.random() * 410,
    s: 1 + Math.random() * 1.8,
    vy: 0.5 + Math.random() * 1.3
  }));
}

function spawnGalagaStage(stage) {
  galagaEnemies = [];
  galagaFormDir = 1;
  const rows = 4;
  const cols = 7;
  const startX = 36;
  const startY = 54;
  const gapX = 44;
  const gapY = 30;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kind = r === 0 ? "boss" : (r === 1 ? "elite" : "grunt");
      const hp = kind === "boss" ? 2 : 1;
      const pts = kind === "boss" ? 150 : (kind === "elite" ? 80 : 40);
      galagaEnemies.push({
        homeX: startX + c * gapX,
        homeY: startY + r * gapY,
        x: startX + c * gapX,
        y: startY + r * gapY - 120,
        kind,
        hp,
        pts,
        diving: false,
        diveT: 0,
        diveStartX: 0,
        diveStartY: 0,
        diveTargetX: 170,
        entering: true
      });
    }
  }
}

function resetGalaga() {
  galagaShip.x = 170;
  galagaShip.y = 376;
  galagaBullets = [];
  galagaEnemyBullets = [];
  galagaPowerups = [];
  galagaParticles = [];
  galagaScore = 0;
  galagaStage = 1;
  galagaLives = 3;
  galagaWeaponLv = 1;
  galagaFrame = 0;
  galagaInvuln = 0;
  galagaOver = false;
  galagaRunning = true;
  galagaDragging = false;
  galagaSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
  initGalagaStars();
  spawnGalagaStage(1);
}

function spawnGalagaExplosion(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
    const spd = 1.2 + Math.random() * 3.0;
    galagaParticles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: 2 + Math.random() * 2,
      color,
      life: 24
    });
  }
}

function hitGalagaPlayer() {
  if (galagaInvuln > 0 || galagaOver) return;
  spawnGalagaExplosion(galagaShip.x, galagaShip.y, "#ff5e84");
  galagaLives--;
  galagaWeaponLv = Math.max(1, galagaWeaponLv - 1);
  galagaInvuln = 110;

  if (galagaLives <= 0) {
    galagaOver = true;
    triggerGameOver(galagaSessionHadBest, galagaScore > 0);
  }
}

function drawGalagaFrame() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  for (const st of galagaStars) {
    if (galagaRunning && !galagaOver) {
      st.y += st.vy;
      if (st.y > canvas.height) {
        st.y = 0;
        st.x = Math.random() * canvas.width;
      }
    }
    ctx.fillRect(st.x, st.y, st.s, st.s);
  }

  if (galagaRunning && !galagaOver) {
    galagaFrame++;
    if (galagaInvuln > 0) galagaInvuln--;

    if (dodgeKeys.left) galagaShip.x -= galagaShip.speed;
    if (dodgeKeys.right) galagaShip.x += galagaShip.speed;
    galagaShip.x = Math.max(18, Math.min(canvas.width - 18, galagaShip.x));

    if (galagaFrame % 12 === 0) {
      if (galagaWeaponLv === 1) {
        galagaBullets.push({ x: galagaShip.x, y: galagaShip.y - 14, vx: 0, vy: -7.5 });
      } else if (galagaWeaponLv === 2) {
        galagaBullets.push({ x: galagaShip.x - 6, y: galagaShip.y - 12, vx: 0, vy: -7.5 });
        galagaBullets.push({ x: galagaShip.x + 6, y: galagaShip.y - 12, vx: 0, vy: -7.5 });
      } else {
        galagaBullets.push({ x: galagaShip.x, y: galagaShip.y - 15, vx: 0, vy: -7.8 });
        galagaBullets.push({ x: galagaShip.x - 7, y: galagaShip.y - 10, vx: -0.9, vy: -7.4 });
        galagaBullets.push({ x: galagaShip.x + 7, y: galagaShip.y - 10, vx: 0.9, vy: -7.4 });
      }
    }

    for (let i = galagaBullets.length - 1; i >= 0; i--) {
      const b = galagaBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -10) galagaBullets.splice(i, 1);
    }

    const formSpeed = (0.7 + Math.min(1.2, galagaStage * 0.14)) * galagaFormDir;
    let hitEdge = false;
    for (const e of galagaEnemies) {
      e.homeX += formSpeed;
      if (e.homeX < 22 || e.homeX > canvas.width - 22) hitEdge = true;
    }
    if (hitEdge) galagaFormDir *= -1;

    const diveInterval = Math.max(45, 115 - galagaStage * 12);
    if (galagaFrame % diveInterval === 0 && galagaEnemies.length > 0) {
      const candidates = galagaEnemies.filter(e => !e.diving && !e.entering);
      if (candidates.length > 0) {
        const diver = candidates[Math.floor(Math.random() * candidates.length)];
        diver.diving = true;
        diver.diveT = 0;
        diver.diveStartX = diver.x;
        diver.diveStartY = diver.y;
        diver.diveTargetX = galagaShip.x;
      }
    }

    for (let i = galagaEnemies.length - 1; i >= 0; i--) {
      const e = galagaEnemies[i];

      if (e.entering) {
        e.x += (e.homeX - e.x) * 0.1;
        e.y += (e.homeY - e.y) * 0.1;
        if (Math.abs(e.y - e.homeY) < 1.5) e.entering = false;
      } else if (e.diving) {
        e.diveT += 0.014 + galagaStage * 0.0015;
        const t = e.diveT;
        const targetX = e.diveTargetX + Math.sin(t * Math.PI * 2.2) * 55;
        e.x = e.diveStartX * (1 - t) + targetX * t;
        e.y = e.diveStartY + t * (canvas.height - e.diveStartY + 35);

        if (Math.abs(t - 0.35) < 0.015) {
          const ang = Math.atan2(galagaShip.y - e.y, galagaShip.x - e.x);
          const bSpd = 2.8 + Math.min(1.8, galagaStage * 0.25);
          galagaEnemyBullets.push({
            x: e.x,
            y: e.y + 8,
            vx: Math.cos(ang) * bSpd,
            vy: Math.sin(ang) * bSpd
          });
        }

        if (e.y > canvas.height + 24) {
          e.diving = false;
          e.entering = true;
          e.y = -20;
          e.x = e.homeX;
        }
      } else {
        e.x = e.homeX;
        e.y = e.homeY + Math.sin(galagaFrame * 0.06 + e.homeX * 0.05) * 2;
      }

      if (Math.hypot(e.x - galagaShip.x, e.y - galagaShip.y) < 17) {
        hitGalagaPlayer();
      }

      for (let bi = galagaBullets.length - 1; bi >= 0; bi--) {
        const b = galagaBullets[bi];
        if (Math.abs(b.x - e.x) < 13 && Math.abs(b.y - e.y) < 11) {
          galagaBullets.splice(bi, 1);
          e.hp--;
          if (e.hp <= 0) {
            const earned = e.diving ? e.pts * 2 : e.pts;
            galagaScore += earned;
            if (galagaScore > galagaBest) {
              galagaBest = galagaScore;
              galagaSessionHadBest = true;
              localStorage.setItem("nakhwaGalagaBest", String(galagaBest));
            }

            const boomColor = e.kind === "boss" ? "#ffd166" : (e.kind === "elite" ? "#ff7999" : "#72efdd");
            spawnGalagaExplosion(e.x, e.y, boomColor);

            if (Math.random() < 0.12 && galagaWeaponLv < 3) {
              galagaPowerups.push({ x: e.x, y: e.y, vy: 2.0 });
            }

            galagaEnemies.splice(i, 1);
          } else {
            spawnGalagaExplosion(e.x, e.y, "#ffffff");
          }
          break;
        }
      }
    }

    if (galagaEnemies.length === 0) {
      galagaStage++;
      spawnGalagaStage(galagaStage);
    }

    for (let i = galagaEnemyBullets.length - 1; i >= 0; i--) {
      const eb = galagaEnemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;
      if (Math.hypot(eb.x - galagaShip.x, eb.y - galagaShip.y) < 10) {
        galagaEnemyBullets.splice(i, 1);
        hitGalagaPlayer();
        continue;
      }
      if (eb.y > canvas.height + 10 || eb.x < -10 || eb.x > canvas.width + 10) {
        galagaEnemyBullets.splice(i, 1);
      }
    }

    for (let i = galagaPowerups.length - 1; i >= 0; i--) {
      const p = galagaPowerups[i];
      p.y += p.vy;
      if (Math.hypot(p.x - galagaShip.x, p.y - galagaShip.y) < 18) {
        galagaWeaponLv = Math.min(3, galagaWeaponLv + 1);
        galagaScore += 100;
        if (galagaScore > galagaBest) {
          galagaBest = galagaScore;
          galagaSessionHadBest = true;
          localStorage.setItem("nakhwaGalagaBest", String(galagaBest));
        }
        galagaPowerups.splice(i, 1);
        continue;
      }
      if (p.y > canvas.height + 15) galagaPowerups.splice(i, 1);
    }
  }

  for (const e of galagaEnemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.diving) {
      ctx.rotate(Math.sin(e.diveT * Math.PI * 2) * 0.35);
    }

    const wingFlap = Math.sin(galagaFrame * 0.25 + e.homeX) * 2;
    if (e.kind === "boss") {
      ctx.fillStyle = e.hp === 2 ? "#ffd166" : "#ff6b6b";
      ctx.fillRect(-10, -4 - wingFlap, 20, 8);
      ctx.fillRect(-6, -8, 12, 14);
      ctx.fillStyle = "#121216";
      ctx.fillRect(-4, -3, 2, 3);
      ctx.fillRect(2, -3, 2, 3);
    } else if (e.kind === "elite") {
      ctx.fillStyle = "#ff7999";
      ctx.fillRect(-9, -3 - wingFlap, 18, 6);
      ctx.fillRect(-5, -6, 10, 11);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-3, -2, 2, 2);
      ctx.fillRect(1, -2, 2, 2);
    } else {
      ctx.fillStyle = "#72efdd";
      ctx.fillRect(-8, -3 - wingFlap, 16, 6);
      ctx.fillRect(-4, -5, 8, 9);
      ctx.fillStyle = "#e65c7b";
      ctx.fillRect(-2, -1, 4, 3);
    }
    ctx.restore();
  }

  if (!galagaOver && (galagaInvuln === 0 || Math.floor(galagaInvuln / 5) % 2 === 0)) {
    const sx = Math.round(galagaShip.x);
    const sy = Math.round(galagaShip.y);

    ctx.fillStyle = galagaFrame % 4 < 2 ? "#ff5e84" : "#ffd166";
    ctx.fillRect(sx - 3, sy + 10, 6, 5);

    ctx.fillStyle = "#f4f4f6";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 13);
    ctx.lineTo(sx + 13, sy + 10);
    ctx.lineTo(sx, sy + 6);
    ctx.lineTo(sx - 13, sy + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e65c7b";
    ctx.fillRect(sx - 2, sy - 5, 4, 8);
    ctx.fillRect(sx - 11, sy + 2, 3, 6);
    ctx.fillRect(sx + 8, sy + 2, 3, 6);
  }

  ctx.fillStyle = "#ff9eb5";
  for (const b of galagaBullets) {
    ctx.fillRect(b.x - 1.5, b.y - 5, 3, 10);
  }

  ctx.fillStyle = "#ffd166";
  for (const eb of galagaEnemyBullets) {
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of galagaPowerups) {
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("P", p.x, p.y + 0.5);
  }

  for (let i = galagaParticles.length - 1; i >= 0; i--) {
    const pt = galagaParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 24);
    ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    ctx.globalAlpha = 1;
    if (pt.life <= 0) galagaParticles.splice(i, 1);
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${galagaScore}`, 12, 22);

  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`STAGE ${galagaStage} · LV.${galagaWeaponLv}`, 12, 37);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${galagaBest}`, 328, 22);
  ctx.fillText("❤️".repeat(Math.max(0, galagaLives)), 328, 38);

  if (galagaOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🚀 격추됨 · ${galagaScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 출격합니다", canvas.width / 2, 220);
    }
  }
}