/* ---------- 14. 낙화 등대 수비대 (Lighthouse Defense) 상태 ---------- */
var lhRunning = false;
var lhOver = false;
var lhScore = 0;
var lhLastScore = 0;
var lhBest = Number(localStorage.getItem("nakhwaLighthouseBest") || 0);
var lhSessionHadBest = false;

var lhAngle = -Math.PI / 2; // 위쪽(-90도) 시작
var lhBeamSpread = 0.34;    // 빛줄기 부채꼴 반각(라디안)
var lhBeamRange = 175;      // 빛 사거리
var lhHp = 100;
var lhEnergy = 100;         // 과충전(섬광탄) 게이지
var lhFlashTimer = 0;       // 섬광탄 발동 연출 타이머
var lhFrame = 0;

var lhMonsters = [];
var lhParticles = [];
var lhPointerDown = false;

function resetLighthouse() {
  lhAngle = -Math.PI / 2;
  lhBeamSpread = 0.34;
  lhBeamRange = 175;
  lhHp = 100;
  lhEnergy = 50;
  lhFlashTimer = 0;
  lhFrame = 0;
  lhScore = 0;
  lhMonsters = [];
  lhParticles = [];
  lhOver = false;
  lhRunning = true;
  lhPointerDown = false;
  lhSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();
}

function spawnLhMonster() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 10;
  const ang = Math.random() * Math.PI * 2;
  const spawnDist = 235;
  const x = cx + Math.cos(ang) * spawnDist;
  const y = cy + Math.sin(ang) * spawnDist;

  // 점수에 따라 일반 / 고속 / 거대 요괴 등장
  const roll = Math.random();
  let kind = "normal";
  let hp = 26;
  let speed = 0.55 + Math.min(0.65, lhScore * 0.0004);
  let r = 10;
  let pts = 20;

  if (lhScore > 150 && roll < 0.25) {
    kind = "fast";
    hp = 16;
    speed = 0.95 + Math.min(0.75, lhScore * 0.0005);
    r = 8;
    pts = 30;
  } else if (lhScore > 300 && roll > 0.8) {
    kind = "brute";
    hp = 58;
    speed = 0.38 + Math.min(0.35, lhScore * 0.0002);
    r = 15;
    pts = 60;
  }

  lhMonsters.push({
    x,
    y,
    hp,
    maxHp: hp,
    speed,
    r,
    pts,
    kind,
    lit: false
  });
}

function spawnLhBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 3.2;
    lhParticles.push({
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

function triggerLhFlashBurst() {
  if (!lhRunning || lhOver || lhEnergy < 100) return;
  lhEnergy = 0;
  lhFlashTimer = 22;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 10;
  spawnLhBurst(cx, cy, "#ffd166", 28);

  // 화면 내 모든 몬스터에게 강력한 빛 대미지
  for (let i = lhMonsters.length - 1; i >= 0; i--) {
    const m = lhMonsters[i];
    m.hp -= 45;
    spawnLhBurst(m.x, m.y, "#ff9eb5", 8);
    if (m.hp <= 0) {
      lhScore += m.pts;
      lhMonsters.splice(i, 1);
    }
  }
}

function normalizeAngleDiff(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

function aimLighthouseAt(px, py) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 10;
  lhAngle = Math.atan2(py - cy, px - cx);
}

function drawLighthouseFrame() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 10;

  if (lhRunning && !lhOver) {
    lhFrame++;
    if (lhFlashTimer > 0) lhFlashTimer--;

    // PC 키보드 좌우 회전 지원
    if (dodgeKeys.left) lhAngle -= 0.065;
    if (dodgeKeys.right) lhAngle += 0.065;

    // 스폰 주기 (점수가 오를수록 빨라짐)
    const spawnInterval = Math.max(38, 95 - Math.floor(lhScore / 35));
    if (lhFrame % spawnInterval === 0) {
      spawnLhMonster();
    }

    // 몬스터 이동 및 빛 판정
    for (let i = lhMonsters.length - 1; i >= 0; i--) {
      const m = lhMonsters[i];
      const dx = cx - m.x;
      const dy = cy - m.y;
      const dist = Math.hypot(dx, dy);

      // 등대 방향으로 전진
      if (dist > 1) {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
      }

      // 빛줄기 범위 안에 들어왔는지 체크
      const angToMonster = Math.atan2(m.y - cy, m.x - cx);
      const angDiff = normalizeAngleDiff(angToMonster, lhAngle);
      if (dist <= lhBeamRange + m.r && angDiff <= lhBeamSpread) {
        m.lit = true;
        m.hp -= 1.15; // 빛 정화 대미지
        if (lhFrame % 4 === 0) {
          spawnLhBurst(m.x, m.y, "#ffd166", 2);
        }
      } else {
        m.lit = false;
      }

      // 몬스터 소멸
      if (m.hp <= 0) {
        lhScore += m.pts;
        lhEnergy = Math.min(100, lhEnergy + 12);
        spawnLhBurst(m.x, m.y, "#ff8ca5", 12);
        lhMonsters.splice(i, 1);
        continue;
      }

      // 등대 본체 충돌 판정
      if (dist <= 20 + m.r) {
        const dmg = m.kind === "brute" ? 30 : 18;
        lhHp = Math.max(0, lhHp - dmg);
        spawnLhBurst(m.x, m.y, "#ff4d6d", 14);
        lhMonsters.splice(i, 1);

        if (lhHp <= 0) {
          lhOver = true;
          lhLastScore = Math.floor(lhScore);
          const isNewBest = lhLastScore > lhBest;
          if (isNewBest) {
            lhBest = lhLastScore;
            localStorage.setItem("nakhwaLighthouseBest", String(lhBest));
          }
          triggerGameOver(isNewBest, lhLastScore > 0);
          break;
        }
      }
    }
  }

  // 1) 어두운 밤바다/밤하늘 배경
  ctx.fillStyle = "#0b0c12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 은은한 동심원 레이더 가이드
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  [65, 120, lhBeamRange].forEach(rad => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 2) 등대 서치라이트 빛줄기 (부채꼴 그라데이션)
  const beamGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, lhBeamRange);
  beamGrad.addColorStop(0, "rgba(255, 232, 163, 0.55)");
  beamGrad.addColorStop(0.65, "rgba(255, 183, 197, 0.22)");
  beamGrad.addColorStop(1, "rgba(255, 183, 197, 0)");

  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, lhBeamRange, lhAngle - lhBeamSpread, lhAngle + lhBeamSpread);
  ctx.closePath();
  ctx.fill();

  // 섬광탄 발동 시 화면 전체 플래시
  if (lhFlashTimer > 0) {
    ctx.fillStyle = `rgba(255, 243, 176, ${(lhFlashTimer / 22) * 0.45})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 3) 그림자 요괴 렌더링
  for (const m of lhMonsters) {
    ctx.save();
    ctx.translate(m.x, m.y);

    // 빛을 받으면 붉게 달아오르며 떨림
    if (m.lit) {
      ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }

    ctx.fillStyle = m.lit
      ? "#ff7999"
      : (m.kind === "brute" ? "#3b2848" : (m.kind === "fast" ? "#2b3a55" : "#232332"));
    ctx.beginPath();
    ctx.arc(0, 0, m.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = m.lit ? "#ffd166" : "rgba(230, 92, 123, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 요괴 눈빛
    ctx.fillStyle = m.lit ? "#ffffff" : "#ff4d6d";
    ctx.fillRect(-m.r * 0.45, -2, 3, 3);
    ctx.fillRect(m.r * 0.2, -2, 3, 3);

    // 체력이 깎인 상태면 미니 체력바 표시
    if (m.hp < m.maxHp) {
      const bw = m.r * 2;
      ctx.fillStyle = "#121216";
      ctx.fillRect(-m.r, -m.r - 7, bw, 3);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(-m.r, -m.r - 7, bw * Math.max(0, m.hp / m.maxHp), 3);
    }
    ctx.restore();
  }

  // 4) 중앙 벚꽃 등대 렌더링
  ctx.fillStyle = "#262632";
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e65c7b";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 회전하는 등대 렌즈 포탑
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lhAngle);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.roundRect(-6, -6, 16, 12, 4);
  ctx.fill();
  ctx.restore();

  // 5) 파티클
  for (let i = lhParticles.length - 1; i >= 0; i--) {
    const pt = lhParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 24);
    ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    ctx.globalAlpha = 1;
    if (pt.life <= 0) lhParticles.splice(i, 1);
  }

  // 6) 상단 HUD & 하단 등대 내구도/섬광탄 버튼
  ctx.fillStyle = "rgba(15, 15, 18, 0.72)";
  ctx.fillRect(0, 0, canvas.width, 42);

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${Math.floor(lhScore)}`, 12, 21);

  ctx.fillStyle = "#ff8ca5";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`등대 내구도 ${lhHp}%`, 12, 36);

  ctx.fillStyle = "#9898a6";
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${lhBest}`, 328, 21);
  ctx.fillText("드래그/터치 조준", 328, 36);

  // 하단 섬광탄(필살기) 게이지 바
  const barW = 220;
  const barX = (canvas.width - barW) / 2;
  const barY = 376;
  ctx.fillStyle = "#1e1e26";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 22, 11);
  ctx.fill();

  const ready = lhEnergy >= 100;
  ctx.fillStyle = ready ? "#ffd166" : "#e65c7b";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * (lhEnergy / 100), 22, 11);
  ctx.fill();

  ctx.fillStyle = ready ? "#121216" : "#f4f4f6";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    ready ? "✨ 섬광탄 준비 완료! (스페이스 / 바 터치)" : `빛 에너지 충전 중 (${Math.floor(lhEnergy)}%)`,
    canvas.width / 2,
    barY + 15
  );

  if (lhOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🔦 등대 함락 · ${lhLastScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 수비합니다", canvas.width / 2, 220);
    }
  }
}

registerGame({
  id: "lighthouse",
  title: "낙화 등대 수비대",
  icon: "🔦",
  desc: "빛줄기를 회전시켜 어둠 속 요괴들을 정화하는 디펜스",
  aspect: "tall",
  unit: "점",
  hint: "터치·드래그(또는 ←→)로 빛 조준 · 100% 충전 시 섬광탄(스페이스)!",
  rankingTitle: "🔦 등대 수비대 TOP 5",
  dbNode: "lighthouse_scores",
  getBadge: () => `BEST ${lhBest}점`,
  getScore: () => lhLastScore,
  reset: resetLighthouse,
  draw: drawLighthouseFrame,
  stop: () => {
    lhRunning = false;
    lhPointerDown = false;
  },
  onPointerDown: (x, y) => {
    if (lhOver || !lhRunning) {
      if (!canRestartNow()) return;
      resetLighthouse();
      return;
    }
    if (y >= 365 && lhEnergy >= 100) {
      triggerLhFlashBurst();
      return;
    }
    lhPointerDown = true;
    aimLighthouseAt(x, y);
  },
  onPointerMove: (x, y, e) => {
    if (lhPointerDown && !lhOver) {
      e.preventDefault();
      aimLighthouseAt(x, y);
    }
  },
  onPointerUp: () => {
    lhPointerDown = false;
  },
  onKeyDown: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); dodgeKeys.left = true; }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); dodgeKeys.right = true; }
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) triggerLhFlashBurst();
    }
  },
  onKeyUp: (e) => {
    if (typeof dodgeKeys !== "undefined") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dodgeKeys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dodgeKeys.right = false;
    }
  }
});
