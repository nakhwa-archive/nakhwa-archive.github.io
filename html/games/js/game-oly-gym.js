/* ---------- 올림픽 9. 체조 (Gymnastics Routine) 상태 ---------- */
var olyGymRunning = false;
var olyGymOver = false;
var olyGymFinished = false;

var olyGymFrame = 0;
var olyGymMoveIndex = 0; // 0 ~ 7 (총 8동작)
var olyGymTotalMoves = 8;
var olyGymMarkerX = 40; // 40 ~ 280 사이 왕복
var olyGymMarkerDir = 1;
var olyGymMarkerSpeed = 3.2;
var olyGymCombo = 0;

var olyGymScore = 0;
var olyGymBest = Number(localStorage.getItem("nakhwaOlyGymBest") || 0);
var olyGymParticles = [];
var olyGymPopups = [];

var OLY_GYM_CENTER_X = 160;
var OLY_GYM_MOVE_NAMES = [
  "백핸드스프링",
  "공중제비 트위스트",
  "철봉 키프",
  "마루 턴 콤보",
  "안마 스윙",
  "평행봉 핸드스탠드",
  "더블 살토",
  "착지 피날레"
];

function resetOlyGym() {
  olyGymFrame = 0;
  olyGymMoveIndex = 0;
  olyGymMarkerX = 40;
  olyGymMarkerDir = 1;
  olyGymMarkerSpeed = 3.2;
  olyGymCombo = 0;
  olyGymScore = 0;
  olyGymParticles = [];
  olyGymPopups = [];
  olyGymOver = false;
  olyGymFinished = false;
  olyGymRunning = true;
  isNewBestPending = false;
  hideSubmitBar();
}

function addOlyGymPopup(x, y, text, color) {
  olyGymPopups.push({ x, y, text, color, life: 36 });
}

function spawnOlyGymBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 2.8;
    olyGymParticles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.8,
      r: 2.2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function finishOlyGym() {
  olyGymFinished = true;
  olyGymRunning = false;

  const isNewBest = olyGymScore > olyGymBest;
  if (isNewBest) {
    olyGymBest = olyGymScore;
    localStorage.setItem("nakhwaOlyGymBest", String(olyGymBest));
  }

  triggerGameOver(isNewBest, olyGymScore > 0);
}

function performOlyGymMove() {
  if (!olyGymRunning || olyGymOver || olyGymFinished) return;

  const diff = Math.abs(olyGymMarkerX - OLY_GYM_CENTER_X);
  let pts = 0;
  let label = "";
  let color = "#9898a6";

  if (diff <= 12) {
    olyGymCombo++;
    pts = 200 + (olyGymCombo - 1) * 30;
    label = `🌟 PERFECT +${pts}`;
    color = "#ffd166";
    spawnOlyGymBurst(OLY_GYM_CENTER_X, 240, "#ffd166", 14);
  } else if (diff <= 28) {
    olyGymCombo++;
    pts = 130 + (olyGymCombo - 1) * 20;
    label = `✨ GREAT +${pts}`;
    color = "#72efdd";
    spawnOlyGymBurst(OLY_GYM_CENTER_X, 240, "#72efdd", 10);
  } else if (diff <= 48) {
    olyGymCombo = 0;
    pts = 70;
    label = `👍 GOOD +${pts}`;
    color = "#ff8ca5";
    spawnOlyGymBurst(OLY_GYM_CENTER_X, 240, "#ff8ca5", 6);
  } else {
    olyGymCombo = 0;
    pts = 20;
    label = `흔들림 +${pts}`;
    color = "#9898a6";
    spawnOlyGymBurst(olyGymMarkerX, 240, "#9898a6", 4);
  }

  olyGymScore += pts;
  addOlyGymPopup(OLY_GYM_CENTER_X, 196, label, color);

  olyGymMoveIndex++;
  if (olyGymMoveIndex >= olyGymTotalMoves) {
    finishOlyGym();
    return;
  }

  // 다음 동작으로 넘어가며 바 속도 살짝 상승 + 시작 위치 리셋
  olyGymMarkerSpeed = Math.min(6.2, 3.2 + olyGymMoveIndex * 0.34);
  olyGymMarkerX = olyGymMoveIndex % 2 === 0 ? 40 : 280;
  olyGymMarkerDir = olyGymMoveIndex % 2 === 0 ? 1 : -1;
}

function drawOlyGymFrame() {
  try {
    ctx.save();

    if (olyGymRunning && !olyGymOver && !olyGymFinished) {
      olyGymFrame++;
      olyGymMarkerX += olyGymMarkerDir * olyGymMarkerSpeed;

      if (olyGymMarkerX >= 280) {
        olyGymMarkerX = 280;
        olyGymMarkerDir = -1;
      } else if (olyGymMarkerX <= 40) {
        olyGymMarkerX = 40;
        olyGymMarkerDir = 1;
      }
    }

    // 배경 & 경기장 매트
    ctx.fillStyle = "#12131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#191b26";
    ctx.fillRect(0, 0, canvas.width, 130);

    // 체조 플로어 매트
    ctx.fillStyle = "#203654";
    ctx.fillRect(24, 155, canvas.width - 48, 135);

    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 155, canvas.width - 48, 135);

    // 현재 동작 이름 표시
    const moveName = OLY_GYM_MOVE_NAMES[Math.min(olyGymMoveIndex, OLY_GYM_MOVE_NAMES.length - 1)];
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `동작 ${Math.min(olyGymMoveIndex + 1, olyGymTotalMoves)}/${olyGymTotalMoves}: ${moveName}`,
      canvas.width / 2,
      118
    );

    // 체조 선수 아크로바틱 포즈
    const gymnastX = OLY_GYM_CENTER_X;
    const gymnastY = 212 + Math.sin(olyGymFrame * 0.22) * 5;
    const spinAngle = (olyGymFrame * 0.14) % (Math.PI * 2);

    ctx.save();
    ctx.translate(gymnastX, gymnastY);
    ctx.rotate(spinAngle * 0.35);

    ctx.fillStyle = "#e65c7b";
    ctx.fillRect(-10, -5, 20, 10);

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, -11, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#72efdd";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-20, -8);
    ctx.moveTo(10, 0);
    ctx.lineTo(20, 8);
    ctx.stroke();
    ctx.restore();

    // 타이밍 게이지 트랙(y = 254)
    const trackX = 40;
    const trackW = 240;
    const trackY = 254;

    ctx.fillStyle = "#2b3042";
    ctx.fillRect(trackX, trackY, trackW, 14);

    // 정중앙 퍼펙트 존
    ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
    ctx.fillRect(OLY_GYM_CENTER_X - 12, trackY - 2, 24, 18);

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(OLY_GYM_CENTER_X - 2, trackY - 4, 4, 22);

    // 움직이는 마커
    ctx.fillStyle = "#72efdd";
    ctx.fillRect(olyGymMarkerX - 4, trackY - 5, 8, 24);

    // 하단 안내 존
    ctx.fillStyle = "#161822";
    ctx.fillRect(0, 310, canvas.width, canvas.height - 310);
    ctx.fillStyle = "#9898a6";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("마커가 중앙(노란 선)에 올 때 터치 또는 Space/↑!", canvas.width / 2, 348);

    // 파티클 & 팝업
    for (let i = olyGymParticles.length - 1; i >= 0; i--) {
      const pt = olyGymParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.12;
      pt.life--;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / 22);
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      ctx.globalAlpha = 1;
      if (pt.life <= 0) olyGymParticles.splice(i, 1);
    }

    for (let i = olyGymPopups.length - 1; i >= 0; i--) {
      const pop = olyGymPopups[i];
      pop.y -= 0.7;
      pop.life--;
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = Math.max(0, pop.life / 36);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
      if (pop.life <= 0) olyGymPopups.splice(i, 1);
    }

    // HUD 바
    ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
    ctx.fillRect(0, 0, canvas.width, 46);

    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`점수 ${olyGymScore}점`, 12, 21);

    ctx.fillStyle = "#72efdd";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(olyGymCombo > 1 ? `🔥 ${olyGymCombo}연속 PERFECT/GREAT` : "중앙 타이밍을 노려봐!", 12, 38);

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BEST ${olyGymBest}점`, canvas.width - 12, 24);

    // 종료 오버레이
    if (olyGymFinished) {
      ctx.fillStyle = "rgba(15, 15, 18, 0.84)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f4f4f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🤸 체조 연기 완료 · ${olyGymScore}점`, canvas.width / 2, 182);

      if (isNewBestPending) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 214);
      } else {
        ctx.fillStyle = "#ff8ca5";
        ctx.font = "600 13px sans-serif";
        ctx.fillText("터치 또는 스페이스바로 다시 연기하기", canvas.width / 2, 214);
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
  id: "oly-gym",
  title: "체조",
  icon: "🤸",
  desc: "8단계 연기 시퀀스에서 중앙 타이밍을 맞춰 고득점 도전!",
  aspect: "tall",
  sortOrder: "desc",
  unit: "점",
  hint: "움직이는 마커가 중앙 노란 선에 올 때 터치(PC: Space/↑/W)!",
  rankingTitle: "🤸 체조 TOP 5",
  dbNode: "oly_gym_scores",
  getBadge: () => `BEST ${olyGymBest}점`,
  getScore: () => olyGymScore,
  reset: resetOlyGym,
  draw: drawOlyGymFrame,
  stop: () => {
    olyGymRunning = false;
  },
  onPointerDown: () => {
    if (olyGymFinished || olyGymOver || !olyGymRunning) {
      if (!canRestartNow()) return;
      resetOlyGym();
      return;
    }
    performOlyGymMove();
  },
  onKeyDown: (e) => {
    if (olyGymFinished || olyGymOver || !olyGymRunning) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat && canRestartNow()) resetOlyGym();
      }
      return;
    }
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) performOlyGymMove();
    }
  }
});