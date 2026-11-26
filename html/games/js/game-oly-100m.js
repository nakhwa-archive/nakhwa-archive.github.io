/* ---------- 올림픽 1. 100미터 달리기 (100m Sprint) 상태 ---------- */
var oly100Running = false;
var oly100Over = false;
var oly100Finished = false;

var oly100Dist = 0; // 0 ~ 100m
var oly100Speed = 0; // m/s 느낌의 틱당 진행 보정값
var oly100Boost = 0; // 0 ~ 100 리듬 부스트 게이지
var oly100LastStepSide = 0; // -1: 왼발/좌, +1: 오른발/우
var oly100LastStepFrame = 0;
var oly100Frame = 0;
var oly100ElapsedFrames = 0; // 60fps 기준 경과 프레임

var oly100ElapsedMs = 0;
var oly100LastScore = 0;
var oly100BestMs = Number(localStorage.getItem("nakhwaOly100BestMs") || 0);
var oly100Particles = [];
var oly100Popups = [];

function resetOly100() {
  oly100Dist = 0;
  oly100Speed = 0;
  oly100Boost = 0;
  oly100LastStepSide = 0;
  oly100LastStepFrame = 0;
  oly100Frame = 0;
  oly100ElapsedFrames = 0;
  oly100ElapsedMs = 0;
  oly100LastScore = 0;
  oly100Particles = [];
  oly100Popups = [];
  oly100Over = false;
  oly100Finished = false;
  oly100Running = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOly100Popup(x, y, text, color) {
  oly100Popups.push({ x, y, text, color, life: 34 });
}

function spawnOly100Dust(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    oly100Particles.push({
      x,
      y,
      vx: -1.2 - Math.random() * 2.4,
      vy: -0.6 - Math.random() * 1.8,
      r: 2 + Math.random() * 2,
      color,
      life: 18
    });
  }
}

function stepOly100Stride(side) {
  if (!oly100Running || oly100Over || oly100Finished) return;

  const diffFrames = oly100Frame - oly100LastStepFrame;
  const isAlternating = oly100LastStepSide !== side;

  if (isAlternating) {
    // 교대 입력 성공: 간격이 4~18프레임 사이면 리듬 굿!
    if (diffFrames >= 4 && diffFrames <= 18) {
      oly100Boost = Math.min(100, oly100Boost + 14);
      oly100Speed = Math.min(1.65, oly100Speed + 0.24);
      if (diffFrames >= 7 && diffFrames <= 13) {
        addOly100Popup(canvas.width * 0.5, 195, "⚡ PERFECT!", "#ffd166");
      }
    } else {
      oly100Boost = Math.min(100, oly100Boost + 7);
      oly100Speed = Math.min(1.45, oly100Speed + 0.16);
    }
    spawnOly100Dust(85, 292, "#ff8ca5", 5);
  } else {
    // 같은 쪽 연속 입력: 살짝 페널티(완전 멈추진 않게 부드럽게 감속)
    oly100Boost = Math.max(0, oly100Boost - 10);
    oly100Speed = Math.max(0.15, oly100Speed - 0.12);
    addOly100Popup(canvas.width * 0.5, 210, "좌/우 교대!", "#9898a6");
  }

  oly100LastStepSide = side;
  oly100LastStepFrame = oly100Frame;
}

function finishOly100() {
  oly100Finished = true;
  oly100Running = false;
  oly100ElapsedMs = Math.max(100, Math.round((oly100ElapsedFrames / 60) * 1000));
  oly100LastScore = oly100ElapsedMs;

  const isNewBest = oly100BestMs === 0 || oly100ElapsedMs < oly100BestMs;
  if (isNewBest) {
    oly100BestMs = oly100ElapsedMs;
    localStorage.setItem("nakhwaOly100BestMs", String(oly100BestMs));
  }

  triggerGameOver(isNewBest, true);
}

function drawOly100Frame() {
  try {
    ctx.save();

    if (oly100Running && !oly100Over && !oly100Finished) {
      oly100Frame++;
      oly100ElapsedFrames++;

      // 자연 감속 및 부스트 감소
      oly100Boost = Math.max(0, oly100Boost - 0.35);
      const boostBonus = (oly100Boost / 100) * 0.65;
      const targetMinSpeed = oly100Dist > 1 ? 0.12 : 0;
      oly100Speed = Math.max(targetMinSpeed, oly100Speed * 0.968);

      const movePerStep = (oly100Speed + boostBonus) * 0.24;
      oly100Dist = Math.min(100, oly100Dist + movePerStep);

      if (oly100Dist >= 100) {
        finishOly100();
      }
    }

    // 배경(스타디움 트랙)
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 상단 스탠드 장식
    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 트랙 영역
    ctx.fillStyle = "#9e3b33";
    ctx.fillRect(0, 130, canvas.width, 210);

    // 레인 라인
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    [132, 182, 232, 282, 336].forEach(yPos => {
      ctx.fillRect(0, yPos, canvas.width, 2);
    });

    // 거리 마커 (스크롤)
    const scrollOffset = (oly100Dist * 28) % 60;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    for (let x = -scrollOffset; x < canvas.width + 60; x += 60) {
      ctx.fillRect(x, 132, 2, 10);
    }

    // 결승선 표시(90m 이후부터 화면에 등장)
    if (oly100Dist >= 84) {
      const finishX = 85 + (100 - oly100Dist) * 24;
      if (finishX >= 0 && finishX <= canvas.width) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(finishX, 130, 6, 210);
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("FINISH", finishX + 3, 122);
      }
    }

    // 하단 터치 가이드 존
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
    ctx.strokeStyle = "#2b2e3d";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 346);
    ctx.lineTo(canvas.width / 2, canvas.height - 8);
    ctx.stroke();

    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("◀ 좌 터치 (←/A)", canvas.width * 0.25, 376);
    ctx.fillText("우 터치 (→/D) ▶", canvas.width * 0.75, 376);

    // 주자 캐릭터 렌더링
    const runnerX = 85;
    const runnerY = 264 + Math.sin(oly100Frame * 0.45) * (oly100Speed > 0.2 ? 4 : 0);
    const legSwing = Math.sin(oly100Frame * 0.55) * (oly100Speed > 0.2 ? 9 : 1);

    // 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(runnerX, 296, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 다리
    ctx.strokeStyle = "#f4f4f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(runnerX, runnerY + 12);
    ctx.lineTo(runnerX + legSwing, runnerY + 28);
    ctx.moveTo(runnerX, runnerY + 12);
    ctx.lineTo(runnerX - legSwing, runnerY + 28);
    ctx.stroke();

    // 상체/머리
    ctx.fillStyle = "#e65c7b";
    ctx.beginPath();
    ctx.arc(runnerX, runnerY + 4, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(runnerX + 2, runnerY - 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // 파티클 & 팝업
    for (let i = oly100Particles.length - 1; i >= 0; i--) {
      const pt = oly100Particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 18);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) oly100Particles.splice(i, 1);
    }

    for (let i = oly100Popups.length - 1; i >= 0; i--) {
      const pop = oly100Popups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) oly100Popups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, 46);

    const liveSec = (oly100ElapsedFrames / 60).toFixed(2);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${oly100Dist.toFixed(1)}m / 100m`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`기록 ${liveSec}초 · 부스트 ${Math.floor(oly100Boost)}%`, 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    const bestText = oly100BestMs > 0 ? `${(oly100BestMs / 1000).toFixed(3)}초` : "--.---";
    ctx.fillText(`BEST ${bestText}`, canvas.width - 12, 24);

    // 완주 결과 오버레이
    if (oly100Finished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalSec = (oly100ElapsedMs / 1000).toFixed(3);
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🏅 100m 완주 · ${finalSec}초`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#ff8ca5";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 달리기", canvas.width / 2, 214);
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
  id: "oly-100m",
  title: "100미터 달리기",
  icon: "🏃",
  desc: "좌우 번갈아 가속! 가장 빠른 기록으로 100m 결승선 돌파",
  aspect: "tall",
  sortOrder: "asc",
  unit: "초",
  hint: "좌/우 번갈아 터치(PC: ←/→ 또는 A/D)로 질주! 리듬 맞추면 부스트!",
  rankingTitle: "🏃 100m 달리기 TOP 5 (빠른 순)",
  dbNode: "oly_100m_scores",
  formatScore: (score) => `${(score / 1000).toFixed(3)}초`,
  getBadge: () => (oly100BestMs > 0 ? `BEST ${(oly100BestMs / 1000).toFixed(3)}초` : "BEST --.---"),
  getScore: () => oly100LastScore,
  reset: resetOly100,
  draw: drawOly100Frame,
  stop: () => {
    oly100Running = false;
  },
  onPointerDown: (x) => {
    if (oly100Finished || oly100Over || !oly100Running) {
      if (!canRestartNow()) return;
      resetOly100();
      return;
    }
    stepOly100Stride(x < canvas.width / 2 ? -1 : 1);
  },
  onKeyDown: (e) => {
    if (oly100Finished || oly100Over || !oly100Running) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOly100();
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!e.repeat) stepOly100Stride(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!e.repeat) stepOly100Stride(1);
    }
  }
});