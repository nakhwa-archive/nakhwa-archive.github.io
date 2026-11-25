/* ---------- 17. 낙화 좀비 바리케이드 디펜스 (Barricade Defense) 상태 ---------- */
var bcRunning = false;
var bcOver = false;
var bcScore = 0;
var bcLastScore = 0;
var bcBest = Number(localStorage.getItem("nakhwaBarricadeBest") || 0);
var bcSessionHadBest = false;

var bcHp = 100;
var bcAmmo = 8;
var bcMaxAmmo = 8;
var bcReloadTimer = 0;
var bcSpecialType = "normal"; // "normal" | "shotgun" | "pierce"
var bcSpecialShots = 0;
var bcWave = 1;
var bcKills = 0;
var bcFrame = 0;
var bcShake = 0;

var bcAimAngle = -Math.PI / 2;
var bcZombies = [];
var bcBullets = [];
var bcCrates = [];
var bcParticles = [];
var bcPopups = [];
var bcPointerDown = false;
var bcFireCooldown = 0;

var BC_BARRICADE_Y = 336;
var BC_GUN_X = 170;
var BC_GUN_Y = 356;

function resetBarricade() {
  bcScore = 0;
  bcLastScore = 0;
  bcHp = 100;
  bcAmmo = 8;
  bcMaxAmmo = 8;
  bcReloadTimer = 0;
  bcSpecialType = "normal";
  bcSpecialShots = 0;
  bcWave = 1;
  bcKills = 0;
  bcFrame = 0;
  bcShake = 0;
  bcAimAngle = -Math.PI / 2;
  bcZombies = [];
  bcBullets = [];
  bcCrates = [];
  bcParticles = [];
  bcPopups = [];
  bcPointerDown = false;
  bcFireCooldown = 0;
  bcOver = false;
  bcRunning = true;
  bcSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
}

function addBcPopup(x, y, text, color) {
  bcPopups.push({ x, y, text, color, life: 36 });
}

function spawnBcBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 3.2;
    bcParticles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 2 + Math.random() * 2,
      color,
      life: 22
    });
  }
}

function spawnBcZombie() {
  const x = 28 + Math.random() * (canvas.width - 56);
  const roll = Math.random();
  let kind = "walker";
  let hp = 24 + Math.floor(bcWave * 3);
  let speed = 0.55 + Math.min(0.65, bcWave * 0.045);
  let r = 11;
  let pts = 25;
  let color = "#74c69d";

  if (bcWave >= 2 && roll < 0.28) {
    kind = "runner";
    hp = 16 + Math.floor(bcWave * 2);
    speed = 1.05 + Math.min(0.85, bcWave * 0.06);
    r = 9;
    pts = 40;
    color = "#ff8ca5";
  } else if (bcWave >= 3 && roll > 0.8) {
    kind = "tank";
    hp = 62 + bcWave * 8;
    speed = 0.36 + Math.min(0.28, bcWave * 0.02);
    r = 15;
    pts = 80;
    color = "#c77dff";
  }

  bcZombies.push({
    x,
    y: 48,
    hp,
    maxHp: hp,
    speed,
    r,
    pts,
    kind,
    color,
    wobble: Math.random() * Math.PI * 2
  });
}

function spawnBcCrate(x, y) {
  const isShotgun = Math.random() < 0.5;
  bcCrates.push({
    x: Math.max(24, Math.min(canvas.width - 24, x)),
    y: Math.max(60, Math.min(BC_BARRICADE_Y - 28, y)),
    vy: 0.45,
    r: 12,
    type: isShotgun ? "shotgun" : "pierce"
  });
}

function aimBarricadeAt(px, py) {
  const dx = px - BC_GUN_X;
  const dy = Math.min(-24, py - BC_GUN_Y);
  const rawAngle = Math.atan2(dy, dx);
  // 좌/우 극단 각도 제한 (-162도 ~ -18도)
  bcAimAngle = Math.max(-2.82, Math.min(-0.32, rawAngle));
}

function fireBarricadeWeapon() {
  if (!bcRunning || bcOver) {
    if (!canRestartNow()) return;
    resetBarricade();
    return;
  }
  if (bcReloadTimer > 0 || bcFireCooldown > 0) return;

  // 특수 탄약 사용 중일 때
  if (bcSpecialShots > 0) {
    bcSpecialShots--;
    bcFireCooldown = 11;
    const speed = 11.5;

    if (bcSpecialType === "shotgun") {
      [-0.24, -0.12, 0, 0.12, 0.24].forEach(offset => {
        const ang = bcAimAngle + offset;
        bcBullets.push({
          x: BC_GUN_X + Math.cos(ang) * 18,
          y: BC_GUN_Y + Math.sin(ang) * 18,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          dmg: 18,
          pierce: false,
          color: "#ffd166",
          hitIds: new Set()
        });
      });
    } else if (bcSpecialType === "pierce") {
      bcBullets.push({
        x: BC_GUN_X + Math.cos(bcAimAngle) * 18,
        y: BC_GUN_Y + Math.sin(bcAimAngle) * 18,
        vx: Math.cos(bcAimAngle) * (speed + 1.5),
        vy: Math.sin(bcAimAngle) * (speed + 1.5),
        dmg: 34,
        pierce: true,
        color: "#72efdd",
        hitIds: new Set()
      });
    }

    if (bcSpecialShots <= 0) {
      bcSpecialType = "normal";
    }
    return;
  }

  // 기본 탄약 사격
  if (bcAmmo <= 0) {
    bcReloadTimer = 42; // 약 0.7초 재장전
    addBcPopup(BC_GUN_X, BC_GUN_Y - 26, "🔄 RELOAD...", "#ffd166");
    return;
  }

  bcAmmo--;
  bcFireCooldown = 9;
  const speed = 11.5;
  bcBullets.push({
    x: BC_GUN_X + Math.cos(bcAimAngle) * 18,
    y: BC_GUN_Y + Math.sin(bcAimAngle) * 18,
    vx: Math.cos(bcAimAngle) * speed,
    vy: Math.sin(bcAimAngle) * speed,
    dmg: 22,
    pierce: false,
    color: "#ff8ca5",
    hitIds: new Set()
  });

  if (bcAmmo === 0) {
    bcReloadTimer = 42;
    addBcPopup(BC_GUN_X, BC_GUN_Y - 26, "🔄 RELOAD...", "#ffd166");
  }
}

function drawBarricadeFrame() {
  ctx.save();
  if (bcShake > 0.3) {
    ctx.translate((Math.random() - 0.5) * bcShake, (Math.random() - 0.5) * bcShake);
    bcShake *= 0.84;
  }

  if (bcRunning && !bcOver) {
    bcFrame++;
    if (bcFireCooldown > 0) bcFireCooldown--;

    if (bcReloadTimer > 0) {
      bcReloadTimer--;
      if (bcReloadTimer === 0) {
        bcAmmo = bcMaxAmmo;
      }
    }

    // 키보드 조준 지원
    if (dodgeKeys.left) bcAimAngle = Math.max(-2.82, bcAimAngle - 0.055);
    if (dodgeKeys.right) bcAimAngle = Math.min(-0.32, bcAimAngle + 0.055);

    // 마우스/터치 홀드 연사
    if (bcPointerDown && bcFireCooldown === 0 && bcReloadTimer === 0) {
      fireBarricadeWeapon();
    }

    // 웨이브 및 좀비 스폰
    bcWave = 1 + Math.floor(bcKills / 8);
    const spawnInterval = Math.max(28, 76 - bcWave * 4);
    if (bcFrame % spawnInterval === 0) {
      spawnBcZombie();
    }

    // 탄약 상자 이동 및 획득
    for (let i = bcCrates.length - 1; i >= 0; i--) {
      const cr = bcCrates[i];
      cr.y += cr.vy;
      if (Math.hypot(cr.x - BC_GUN_X, cr.y - BC_GUN_Y) < 28) {
        bcSpecialType = cr.type;
        bcSpecialShots = cr.type === "shotgun" ? 6 : 5;
        bcScore += 50;
        addBcPopup(cr.x, cr.y - 10, cr.type === "shotgun" ? "💥 산탄 장전!" : "⚡ 관통탄 장전!", "#ffd166");
        bcCrates.splice(i, 1);
        continue;
      }
      if (cr.y > BC_BARRICADE_Y - 6) bcCrates.splice(i, 1);
    }

    // 총알 이동 및 충돌
    for (let bi = bcBullets.length - 1; bi >= 0; i--) {
      const b = bcBullets[bi];
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < 6 || b.x > canvas.width - 6) {
        b.vx = -b.vx;
      }
      if (b.y < 36) {
        bcBullets.splice(bi, 1);
        continue;
      }

      let removeBullet = false;
      for (let zi = bcZombies.length - 1; zi >= 0; zi--) {
        const z = bcZombies[zi];
        if (b.hitIds.has(zi)) continue;
        if (Math.hypot(b.x - z.x, b.y - z.y) <= z.r + 5) {
          b.hitIds.add(zi);
          z.hp -= b.dmg;
          spawnBcBurst(b.x, b.y, b.color, 6);

          if (z.hp <= 0) {
            bcKills++;
            bcScore += z.pts + bcWave * 5;
            spawnBcBurst(z.x, z.y, z.color, 12);
            addBcPopup(z.x, z.y - 8, `+${z.pts}`, "#ffd166");

            if (Math.random() < 0.16) {
              spawnBcCrate(z.x, z.y);
            }
            bcZombies.splice(zi, 1);
          }

          if (!b.pierce) {
            removeBullet = true;
            break;
          }
        }
      }

      if (removeBullet) {
        bcBullets.splice(bi, 1);
      }
    }

    // 좀비 전진 및 바리케이드 공격
    for (let zi = bcZombies.length - 1; zi >= 0; zi--) {
      const z = bcZombies[zi];
      z.wobble += 0.08;
      z.y += z.speed;
      z.x += Math.sin(z.wobble) * 0.45;
      z.x = Math.max(z.r + 10, Math.min(canvas.width - z.r - 10, z.x));

      if (z.y + z.r >= BC_BARRICADE_Y) {
        const dmg = z.kind === "tank" ? 28 : (z.kind === "runner" ? 16 : 12);
        bcHp = Math.max(0, bcHp - dmg);
        bcShake = 10;
        spawnBcBurst(z.x, BC_BARRICADE_Y, "#ff4d6d", 14);
        addBcPopup(z.x, BC_BARRICADE_Y - 12, `-${dmg}%`, "#ff4d6d");
        bcZombies.splice(zi, 1);

        if (bcHp <= 0) {
          bcOver = true;
          bcLastScore = Math.floor(bcScore);
          const isNewBest = bcLastScore > bcBest;
          if (isNewBest) {
            bcBest = bcLastScore;
            localStorage.setItem("nakhwaBarricadeBest", String(bcBest));
          }
          triggerGameOver(isNewBest, bcLastScore > 0);
          break;
        }
      }
    }
  }

  // 1) 전장 배경
  ctx.fillStyle = "#111218";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#171822";
  ctx.fillRect(0, BC_BARRICADE_Y, canvas.width, canvas.height - BC_BARRICADE_Y);

  // 2) 조준 레이저 가이드
  if (!bcOver) {
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = bcSpecialShots > 0 ? "rgba(255, 209, 102, 0.45)" : "rgba(255, 140, 165, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(BC_GUN_X, BC_GUN_Y);
    ctx.lineTo(
      BC_GUN_X + Math.cos(bcAimAngle) * 140,
      BC_GUN_Y + Math.sin(bcAimAngle) * 140
    );
    ctx.stroke();
    ctx.restore();
  }

  // 3) 탄약 상자
  for (const cr of bcCrates) {
    ctx.fillStyle = cr.type === "shotgun" ? "#ffd166" : "#72efdd";
    ctx.beginPath();
    ctx.roundRect(cr.x - cr.r, cr.y - cr.r, cr.r * 2, cr.r * 2, 6);
    ctx.fill();
    ctx.fillStyle = "#121216";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cr.type === "shotgun" ? "💥" : "⚡", cr.x, cr.y + 0.5);
  }
  ctx.textBaseline = "alphabetic";

  // 4) 좀비 렌더링
  for (const z of bcZombies) {
    ctx.save();
    ctx.translate(z.x, z.y);

    ctx.fillStyle = z.color;
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#121216";
    ctx.fillRect(-z.r * 0.4, -2, 3, 3);
    ctx.fillRect(z.r * 0.15, -2, 3, 3);

    if (z.hp < z.maxHp) {
      const bw = z.r * 2;
      ctx.fillStyle = "#0b0b0e";
      ctx.fillRect(-z.r, -z.r - 7, bw, 3);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(-z.r, -z.r - 7, bw * Math.max(0, z.hp / z.maxHp), 3);
    }
    ctx.restore();
  }

  // 5) 총알 렌더링
  for (const b of bcBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.pierce ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6) 바리케이드 & 포탑
  ctx.fillStyle = "#3a2e28";
  ctx.fillRect(10, BC_BARRICADE_Y, canvas.width - 20, 12);
  ctx.strokeStyle = bcHp > 35 ? "#e65c7b" : "#ff4d6d";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, BC_BARRICADE_Y, canvas.width - 20, 12);

  ctx.save();
  ctx.translate(BC_GUN_X, BC_GUN_Y);
  ctx.rotate(bcAimAngle + Math.PI / 2);
  ctx.fillStyle = bcSpecialShots > 0 ? "#ffd166" : "#f4f4f6";
  ctx.fillRect(-3.5, -18, 7, 18);
  ctx.restore();

  ctx.fillStyle = "#e65c7b";
  ctx.beginPath();
  ctx.arc(BC_GUN_X, BC_GUN_Y + 6, 12, Math.PI, Math.PI * 2);
  ctx.fill();

  // 7) 파티클 & 팝업
  for (let i = bcParticles.length - 1; i >= 0; i--) {
    const pt = bcParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 22);
    ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    ctx.globalAlpha = 1;
    if (pt.life <= 0) bcParticles.splice(i, 1);
  }

  for (let i = bcPopups.length - 1; i >= 0; i--) {
    const pop = bcPopups[i];
    pop.y -= 0.6;
    pop.life--;
    ctx.fillStyle = pop.color;
    ctx.globalAlpha = Math.max(0, pop.life / 36);
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.globalAlpha = 1;
    if (pop.life <= 0) bcPopups.splice(i, 1);
  }

  // 8) 상단 HUD & 하단 탄창/내구도 바
  ctx.fillStyle = "rgba(15, 15, 18, 0.78)";
  ctx.fillRect(0, 0, canvas.width, 42);

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${Math.floor(bcScore)}`, 12, 21);

  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`WAVE ${bcWave} · 바리케이드 ${bcHp}%`, 12, 36);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${bcBest}`, 328, 21);

  if (bcSpecialShots > 0) {
    ctx.fillStyle = "#ffd166";
    ctx.fillText(
      bcSpecialType === "shotgun" ? `💥 산탄 x${bcSpecialShots}` : `⚡ 관통 x${bcSpecialShots}`,
      328,
      36
    );
  } else if (bcReloadTimer > 0) {
    ctx.fillStyle = "#ffd166";
    ctx.fillText("🔄 RELOAD", 328, 36);
  } else {
    ctx.fillStyle = "#72efdd";
    ctx.fillText(`🔫 ${bcAmmo}/${bcMaxAmmo}`, 328, 36);
  }

  if (bcOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🧟 바리케이드 함락 · ${bcLastScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 방어합니다", canvas.width / 2, 220);
    }
  }

  ctx.restore();
}