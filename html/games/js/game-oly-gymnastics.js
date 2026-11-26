/* ---------- 올림픽 9. 체조 (Floor Gymnastics - Flip Score & Landing Penalty) ---------- */
var olyGmRunning = false;
var olyGmOver = false;
var olyGmFinished = false;

var olyGmRound = 1; // 현재 연기 세트 (1 ~ 6)
var olyGmMaxRoutines = 6;
var olyGmStage = "ready"; // "ready" | "air" | "done"

var olyGmFlipScore = 0; // 누적 회전 점수 (회전 횟수 + 착지 보정, 최소 0)
var olyGmLastScore = 0;
var olyGmBestScore = loadOlyGmBestScore();

var olyGmFrame = 0;
var olyGmX = 145;
var olyGmY = 294;
var olyGmVy = 0;
var olyGmAngle = 0;
var olyGmSpinVel = 0;
var olyGmFlipsCount = 0;
var olyGmSpinInputs = 0;
var olyGmTrail = [];

var olyGmParticles = [];
var olyGmPopups = [];

var OLY_GM_GROUND_Y = 294;

function loadOlyGmBestScore() {
  try {
    const val = Number(localStorage.getItem("nakhwaOlyGymnasticsBestScore"));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch (_) {
    return 0;
  }
}

function saveOlyGmBestScore(score) {
  try {
    localStorage.setItem("nakhwaOlyGymnasticsBestScore", String(score));
  } catch (_) {}
}

function resetOlyGymnastics() {
  olyGmRound = 1;
  olyGmStage = "ready";

  olyGmFlipScore = 0;
  olyGmLastScore = 0;

  olyGmFrame = 0;
  olyGmX = 145;
  olyGmY = OLY_GM_GROUND_Y;
  olyGmVy = 0;
  olyGmAngle = 0;
  olyGmSpinVel = 0;
  olyGmFlipsCount = 0;
  olyGmSpinInputs = 0;
  olyGmTrail = [];

  olyGmParticles = [];
  olyGmPopups = [];

  olyGmOver = false;
  olyGmFinished = false;
  olyGmRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyGmPopup(x, y, text, color) {
  olyGmPopups.push({ x, y, text, color, life: 38 });
}

function spawnOlyGmBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.5;
    olyGmParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.9,
      r: 2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function adjustOlyGmScore(delta) {
  olyGmFlipScore = Math.max(0, olyGmFlipScore + delta);
}

function launchOlyGymnastics() {
  if (!olyGmRunning || olyGmOver || olyGmFinished) return;
  if (olyGmStage !== "ready") return;

  olyGmStage = "air";
  olyGmVy = -7.2;
  olyGmSpinVel = 0.22;
  olyGmAngle = 0;
  olyGmFlipsCount = 0;
  olyGmSpinInputs = 0;
  olyGmTrail = [];

  spawnOlyGmBurst(olyGmX, OLY_GM_GROUND_Y, "#ffd166", 12);
  addOlyGmPopup(olyGmX, olyGmY - 36, "🚀 JUMP!", "#ffd166");
}

function addOlyGymnasticsAerialSpin(dir) {
  if (!olyGmRunning || olyGmOver || olyGmFinished) return;
  if (olyGmStage !== "air") return;

  olyGmSpinInputs++;
  olyGmSpinVel = Math.min(0.72, olyGmSpinVel + 0.14);
  olyGmAngle += dir * 0.45;

  spawnOlyGmBurst(olyGmX, olyGmY - 16, "#72efdd", 6);
  addOlyGmPopup(olyGmX, olyGmY - 40, dir < 0 ? "🌀 SPIN L!" : "🌀 SPIN R!", "#72efdd");
}

function stickOlyGymnasticsLanding(manual = false) {
  if (!olyGmRunning || olyGmOver || olyGmFinished) return;
  if (olyGmStage !== "air") return;

  const heightRatio = Math.max(0, (OLY_GM_GROUND_Y - olyGmY) / 115);

  if (!manual) {
    // 바닥에 닿을 때까지 착지 타이밍을 못 맞춘 경우 감점
    adjustOlyGmScore(-2);
    addOlyGmPopup(olyGmX, OLY_GM_GROUND_Y - 34, "💥 착지 미스 (-2)", "#ff4d6d");
    spawnOlyGmBurst(olyGmX, OLY_GM_GROUND_Y, "#ff4d6d", 10);
  } else if (heightRatio <= 0.35) {
    // 착지 존 진입 후 깔끔한 착지 보너스
    const bonus = olyGmFlipsCount >= 2 ? 3 : 2;
    adjustOlyGmScore(bonus);
    addOlyGmPopup(olyGmX, OLY_GM_GROUND_Y - 38, `✨ STUCK! (+${bonus})`, "#72efdd");
    spawnOlyGmBurst(olyGmX, OLY_GM_GROUND_Y, "#72efdd", 14);
  } else {
    // 공중에서 너무 일찍 착지 시도해 실패 감점
    const penalty = heightRatio > 0.65 ? -3 : -2;
    adjustOlyGmScore(penalty);
    addOlyGmPopup(olyGmX, OLY_GM_GROUND_Y - 38, `💫 착지 실패 (${penalty})`, "#ff4d6d");
    spawnOlyGmBurst(olyGmX, OLY_GM_GROUND_Y, "#ff4d6d", 12);
  }

  advanceOlyGymnasticsRound();
}

function advanceOlyGymnasticsRound() {
  if (olyGmRound >= olyGmMaxRoutines) {
    finishOlyGymnastics();
    return;
  }

  olyGmRound++;
  olyGmStage = "ready";
  olyGmX = 145;
  olyGmY = OLY_GM_GROUND_Y;
  olyGmVy = 0;
  olyGmAngle = 0;
  olyGmSpinVel = 0;
  olyGmFlipsCount = 0;
  olyGmSpinInputs = 0;
  olyGmTrail = [];
}

function finishOlyGymnastics() {
  olyGmStage = "done";
  olyGmFinished = true;
  olyGmRunning = false;

  olyGmLastScore = olyGmFlipScore;

  const isNewBest = olyGmFlipScore > 0 && olyGmFlipScore > olyGmBestScore;
  if (isNewBest) {
    olyGmBestScore = olyGmFlipScore;
    saveOlyGmBestScore(olyGmBestScore);
  }

  triggerGameOver(isNewBest, olyGmFlipScore > 0);
}

function updateOlyGymnastics() {
  if (!olyGmRunning || olyGmOver || olyGmFinished) return;
  olyGmFrame++;

  if (olyGmStage === "air") {
    olyGmTrail.push({ x: olyGmX, y: olyGmY - 16 });
    if (olyGmTrail.length > 24) olyGmTrail.shift();

    const prevRevs = Math.floor(Math.abs(olyGmAngle) / (Math.PI * 2));
    olyGmX = Math.min(265, olyGmX + 1.55);
    olyGmY += olyGmVy;
    olyGmVy += 0.19;
    olyGmAngle += olyGmSpinVel;

    const nextRevs = Math.floor(Math.abs(olyGmAngle) / (Math.PI * 2));
    if (nextRevs > prevRevs) {
      const gainedRevs = nextRevs - prevRevs;
      olyGmFlipsCount = nextRevs;
      adjustOlyGmScore(gainedRevs);
      addOlyGmPopup(olyGmX, olyGmY - 44, `🔥 +${gainedRevs}회전!`, "#ffd166");
    }

    if (olyGmY >= OLY_GM_GROUND_Y) {
      olyGmY = OLY_GM_GROUND_Y;
      olyGmVy = 0;
      olyGmAngle = 0;
      stickOlyGymnasticsLanding(false);
    }
  }
}

function drawOlyGymnasticsFrame() {
  try {
    ctx.save();
    updateOlyGymnastics();

    // 배경 & 체조 마루
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    ctx.fillStyle = "#263859";
    ctx.fillRect(0, 130, canvas.width, 210);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 152, canvas.width - 48, 168);

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, OLY_GM_GROUND_Y + 4, canvas.width, 2);

    // 착지 존 가이드 라인 (지면 위 약 40px 구간)
    const landZoneTopY = OLY_GM_GROUND_Y - 40;
    if (olyGmStage === "air") {
      ctx.fillStyle = "rgba(114, 239, 221, 0.14)";
      ctx.fillRect(26, landZoneTopY, canvas.width - 52, 44);
      ctx.fillStyle = "#72efdd";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("LAND ZONE", canvas.width - 32, landZoneTopY - 3);
    }

    // 공중 액션 가이드 배너
    const bannerText =
      olyGmStage === "ready"
        ? "↑ / W / Space 또는 상단 터치로 점프!"
        : olyGmStage === "air"
          ? `회전 중(${olyGmFlipsCount}바퀴) · 착지 존에서 Space/상단 착지!`
          : "연기 종료";

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(bannerText, canvas.width * 0.5, 98);

    // 하단 조작 가이드
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b2e3d";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀ 공중 좌회전 (←/A)", canvas.width * 0.25, 370);
    ctx.fillText("공중 우회전 (→/D) ▶", canvas.width * 0.75, 370);
    ctx.fillStyle = "#72efdd";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("상단 터치 또는 ↑ / W / Space = 점프 & 착지", canvas.width * 0.5, 392);

    // 공중 회전 궤적
    if (olyGmTrail.length > 1) {
      ctx.strokeStyle = "rgba(114, 239, 221, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(olyGmTrail[0].x, olyGmTrail[0].y);
      for (let i = 1; i < olyGmTrail.length; i++) {
        ctx.lineTo(olyGmTrail[i].x, olyGmTrail[i].y);
      }
      ctx.stroke();
    }

    // 체조 선수 캐릭터
    ctx.save();
    ctx.translate(olyGmX, olyGmY - 16);
    ctx.rotate(olyGmAngle);

    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(9, 16);
    ctx.moveTo(0, 2);
    ctx.lineTo(-9, 16);
    ctx.stroke();

    ctx.fillStyle = olyGmStage === "air" ? "#ff8ca5" : "#e65c7b";
    ctx.beginPath();
    ctx.arc(0, -5, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(1.5, -18, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 파티클 & 팝업
    for (let i = olyGmParticles.length - 1; i >= 0; i--) {
      const pt = olyGmParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyGmParticles.splice(i, 1);
    }

    for (let i = olyGmPopups.length - 1; i >= 0; i--) {
      const pop = olyGmPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 38);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyGmPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`세트 ${olyGmRound}/${olyGmMaxRoutines} · 점수 ${olyGmFlipScore}회전`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`이번 점프 회전 ${olyGmFlipsCount}바퀴 · 입력 ${olyGmSpinInputs}회`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = olyGmBestScore > 0 ? `${olyGmBestScore}회전` : "--회전";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 결과 화면
    if (olyGmFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🤸 체조 ${olyGmFlipScore}회전`, canvas.width / 2, 182);

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
    try {
      ctx.restore();
    } catch (_) {}
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
  id: "oly-gymnastics",
  title: "체조",
  icon: "🤸",
  desc: "점프해서 공중 회전을 쌓고 착지 타이밍으로 최고 회전 기록에 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "회전",
  hint: "↑/W/Space로 점프 · 공중 ←/→ 회전 · LAND ZONE에서 Space/상단 착지!",
  rankingTitle: "🤸 체조 TOP 5 (최다 회전)",
  dbNode: "oly_gymnastics_scores",
  formatScore: (score) => `${score}회전`,
  getBadge: () => (olyGmBestScore > 0 ? `BEST ${olyGmBestScore}회전` : "BEST --회전"),
  getScore: () => olyGmLastScore,
  reset: resetOlyGymnastics,
  draw: drawOlyGymnasticsFrame,
  stop: () => {
    olyGmRunning = false;
  },
  onPointerDown: (x, y) => {
    if (olyGmFinished || olyGmOver || !olyGmRunning) {
      if (!canRestartNow()) return;
      resetOlyGymnastics();
      return;
    }
    if (y < 190) {
      if (olyGmStage === "ready") {
        launchOlyGymnastics();
      } else if (olyGmStage === "air") {
        stickOlyGymnasticsLanding(true);
      }
    } else if (olyGmStage === "air") {
      addOlyGymnasticsAerialSpin(x < canvas.width / 2 ? -1 : 1);
    } else if (olyGmStage === "ready") {
      launchOlyGymnastics();
    }
  },
  onKeyDown: (e) => {
    if (olyGmFinished || olyGmOver || !olyGmRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyGymnastics();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) {
        if (olyGmStage === "ready") {
          launchOlyGymnastics();
        } else if (olyGmStage === "air") {
          stickOlyGymnasticsLanding(true);
        }
      }
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat && olyGmStage === "air") addOlyGymnasticsAerialSpin(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat && olyGmStage === "air") addOlyGymnasticsAerialSpin(1);
    }
  }
});