/* ---------- 16. 거품 팡팡 버블 팝 (Bubble Pop) 상태 ---------- */
var BUBBLE_COLORS = [
  { id: "pink", fill: "#ff8ca5", stroke: "#ffc2d1" },
  { id: "mint", fill: "#72efdd", stroke: "#c4fff9" },
  { id: "sky",  fill: "#4ea8de", stroke: "#ade8f4" },
  { id: "lav",  fill: "#b5179e", stroke: "#f72585" }
];

var bubbleRunning = false;
var bubbleOver = false;
var bubbleScore = 0;
var bubbleLastScore = 0;
var bubbleBest = Number(localStorage.getItem("nakhwaBubbleBest") || 0);
var bubbleSessionHadBest = false;

var bubbleStartTime = 0;
var bubbleBonusMs = 0;
var BUBBLE_BASE_MS = 30000; // 기본 30초
var bubbleRemainMs = 30000;

var bubbleList = [];
var bubbleParticles = [];
var bubblePopups = [];
var bubbleLastColor = null;
var bubbleColorChain = 0;
var bubbleFrame = 0;

function resetBubble() {
  bubbleScore = 0;
  bubbleLastScore = 0;
  bubbleBonusMs = 0;
  bubbleStartTime = performance.now();
  bubbleRemainMs = BUBBLE_BASE_MS;
  bubbleList = [];
  bubbleParticles = [];
  bubblePopups = [];
  bubbleLastColor = null;
  bubbleColorChain = 0;
  bubbleFrame = 0;
  bubbleOver = false;
  bubbleRunning = true;
  bubbleSessionHadBest = false;
  isNewBestPending = false;
  hideSubmitBar();

  for (let i = 0; i < 8; i++) {
    spawnBubble(true);
  }
}

function spawnBubble(initialSpread = false) {
  const r = 18 + Math.random() * 9;
  const x = r + 14 + Math.random() * (canvas.width - (r + 14) * 2);
  const y = initialSpread
    ? (90 + Math.random() * 290)
    : (canvas.height + r + 10);

  const roll = Math.random();
  let kind = "normal";
  let colorObj = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];

  if (roll < 0.12) {
    kind = "gold";
    colorObj = { id: "gold", fill: "#ffd166", stroke: "#fff3b0" };
  } else if (roll < 0.27) {
    kind = "spike";
    colorObj = { id: "spike", fill: "#282834", stroke: "#ff4d6d" };
  }

  bubbleList.push({
    x,
    y,
    r,
    vy: -(1.15 + Math.random() * 1.15),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.04 + Math.random() * 0.03,
    kind,
    colorId: colorObj.id,
    fill: colorObj.fill,
    stroke: colorObj.stroke
  });
}

function spawnBubbleBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.4 + Math.random() * 3.4;
    bubbleParticles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 2.2 + Math.random() * 2.2,
      color,
      life: 22
    });
  }
}

function addBubblePopup(x, y, text, color) {
  bubblePopups.push({ x, y, text, color, life: 36 });
}

function handleBubbleTap(px, py) {
  if (!bubbleRunning || bubbleOver) {
    if (!canRestartNow()) return;
    resetBubble();
    return;
  }

  // 위쪽에 그려진 거품부터 우선 판정 (터치 보정 여유 +5px)
  for (let i = bubbleList.length - 1; i >= 0; i--) {
    const b = bubbleList[i];
    if (Math.hypot(px - b.x, py - b.y) <= b.r + 5) {
      bubbleList.splice(i, 1);

      if (b.kind === "spike") {
        bubbleBonusMs -= 3000;
        bubbleColorChain = 0;
        bubbleLastColor = null;
        spawnBubbleBurst(b.x, b.y, "#ff4d6d", 14);
        addBubblePopup(b.x, b.y, "💣 -3.0초!", "#ff4d6d");
        return;
      }

      if (b.kind === "gold") {
        bubbleBonusMs += 2000;
        bubbleScore += 80;
        spawnBubbleBurst(b.x, b.y, "#ffd166", 16);
        addBubblePopup(b.x, b.y, "✨ +80점 · +2.0초!", "#ffd166");
        return;
      }

      // 일반 색깔 거품: 같은 색 연속 터뜨리기 체인 계산
      if (bubbleLastColor === b.colorId) {
        bubbleColorChain++;
      } else {
        bubbleLastColor = b.colorId;
        bubbleColorChain = 1;
      }

      const pts = 20 + (bubbleColorChain - 1) * 15;
      bubbleScore += pts;
      spawnBubbleBurst(b.x, b.y, b.fill, 10);

      if (bubbleColorChain >= 3) {
        // 3연속 같은 색 달성 시 주변 일반 거품 연쇄 폭발!
        let chainBonus = 0;
        for (let j = bubbleList.length - 1; j >= 0; j--) {
          const other = bubbleList[j];
          if (other.kind !== "spike" && Math.hypot(other.x - b.x, other.y - b.y) <= 85) {
            spawnBubbleBurst(other.x, other.y, other.fill, 8);
            bubbleList.splice(j, 1);
            chainBonus += 25;
          }
        }
        const total = pts + chainBonus;
        bubbleScore += chainBonus;
        addBubblePopup(b.x, b.y, `🔥 ${bubbleColorChain}연쇄! +${total}`, "#ffd166");
      } else if (bubbleColorChain === 2) {
        addBubblePopup(b.x, b.y, `CHAIN x2! +${pts}`, "#ff9eb5");
      } else {
        addBubblePopup(b.x, b.y, `+${pts}`, "#f4f4f6");
      }
      return;
    }
  }
}

function drawBubbleFrame() {
  if (bubbleRunning && !bubbleOver) {
    bubbleFrame++;
    const elapsed = performance.now() - bubbleStartTime;
    bubbleRemainMs = Math.max(0, BUBBLE_BASE_MS + bubbleBonusMs - elapsed);

    if (bubbleRemainMs <= 0) {
      bubbleOver = true;
      bubbleLastScore = Math.floor(bubbleScore);
      const isNewBest = bubbleLastScore > bubbleBest;
      if (isNewBest) {
        bubbleBest = bubbleLastScore;
        localStorage.setItem("nakhwaBubbleBest", String(bubbleBest));
      }
      triggerGameOver(isNewBest, bubbleLastScore > 0);
    } else {
      // 화면 내 거품 개수 유지 및 주기적 리필
      if (bubbleList.length < 11 && bubbleFrame % 16 === 0) {
        spawnBubble(false);
      }

      for (let i = bubbleList.length - 1; i >= 0; i--) {
        const b = bubbleList[i];
        b.y += b.vy;
        b.wobblePhase += b.wobbleSpeed;
        b.x += Math.sin(b.wobblePhase) * 0.75;
        b.x = Math.max(b.r + 6, Math.min(canvas.width - b.r - 6, b.x));

        if (b.y < 36 - b.r) {
          bubbleList.splice(i, 1);
        }
      }
    }
  }

  // 1) 배경 그라데이션
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#12131c");
  bgGrad.addColorStop(1, "#181a28");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2) 거품 렌더링
  for (const b of bubbleList) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.fill;
    ctx.globalAlpha = b.kind === "spike" ? 0.92 : 0.82;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.lineWidth = 2;
    ctx.strokeStyle = b.stroke;
    ctx.stroke();

    if (b.kind === "spike") {
      // 가시 거품 경고 표시
      ctx.fillStyle = "#ff4d6d";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💣", b.x, b.y + 1);
    } else if (b.kind === "gold") {
      ctx.fillStyle = "#121216";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌸", b.x, b.y + 1);
    } else {
      // 비눗방울 하이라이트 광택
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fill();
    }
    ctx.restore();
  }

  // 3) 파티클 & 팝업
  for (let i = bubbleParticles.length - 1; i >= 0; i--) {
    const pt = bubbleParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / 22);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (pt.life <= 0) bubbleParticles.splice(i, 1);
  }

  for (let i = bubblePopups.length - 1; i >= 0; i--) {
    const pop = bubblePopups[i];
    pop.y -= 0.65;
    pop.life--;
    ctx.fillStyle = pop.color;
    ctx.globalAlpha = Math.max(0, pop.life / 36);
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.globalAlpha = 1;
    if (pop.life <= 0) bubblePopups.splice(i, 1);
  }

  // 4) 상단 HUD
  ctx.fillStyle = "rgba(15, 15, 18, 0.75)";
  ctx.fillRect(0, 0, canvas.width, 44);

  ctx.fillStyle = "#f4f4f6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${Math.floor(bubbleScore)}`, 12, 21);

  ctx.fillStyle = bubbleColorChain >= 2 ? "#ffd166" : "#9898a6";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(bubbleColorChain >= 2 ? `🔥 같은색 ${bubbleColorChain}연쇄 중!` : "같은 색 연속 터치!", 12, 36);

  const secLeft = (bubbleRemainMs / 1000).toFixed(1);
  ctx.textAlign = "right";
  ctx.fillStyle = "#9898a6";
  ctx.fillText(`BEST ${bubbleBest}`, 328, 21);
  ctx.fillStyle = bubbleRemainMs <= 5000 ? "#ff4d6d" : "#72efdd";
  ctx.fillText(`⏱️ ${secLeft}초`, 328, 36);

  if (bubbleOver) {
    ctx.fillStyle = "rgba(15, 15, 18, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f6";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🫧 타임 오버 · 최종 ${bubbleLastScore}점`, canvas.width / 2, 190);
    if (isNewBestPending) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("🎉 신기록! 아래에서 기록을 등록해 주세요", canvas.width / 2, 220);
    } else {
      ctx.fillStyle = "#ff8ca5";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("화면을 터치하면 다시 터뜨립니다", canvas.width / 2, 220);
    }
  }
}

registerGame({
  id: "bubble",
  title: "거품 팡팡 버블 팝",
  icon: "🫧",
  desc: "같은 색 거품 연쇄 폭발! 30초 순발력 타임어택",
  aspect: "tall",
  unit: "점",
  hint: "같은 색 거품을 연속 터치하면 연쇄 폭발! 가시 거품(💣)은 주의!",
  rankingTitle: "🫧 버블 팝 TOP 5",
  dbNode: "bubble_scores",
  getBadge: () => `BEST ${bubbleBest}점`,
  getScore: () => bubbleLastScore,
  reset: resetBubble,
  draw: drawBubbleFrame,
  stop: () => {
    bubbleRunning = false;
  },
  onPointerDown: (x, y) => {
    handleBubbleTap(x, y);
  },
  onKeyDown: (e) => {
    if (e.code === "Space" && (bubbleOver || !bubbleRunning)) {
      e.preventDefault();
      if (!e.repeat && canRestartNow()) resetBubble();
    }
  }
});
