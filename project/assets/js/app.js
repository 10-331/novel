const STORY_PATH = "./stories/ep01.json";
const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;

const state = {
  story: [],
  index: 0,
  isTyping: false,
  isLineComplete: false,
  isAutoSkip: false,
  typeSpeed: 28,
  typingTimer: null,
  tokens: [],
  currentTokenIndex: 0
};

const el = {
  gameViewport: document.getElementById("gameViewport"),
  gameStage: document.getElementById("gameStage"),
  bgImage: document.getElementById("bgImage"),
  chars: [
    document.getElementById("char1"),
    document.getElementById("char2"),
    document.getElementById("char3")
  ],
  speakerJa: document.getElementById("speakerJa"),
  speakerEn: document.getElementById("speakerEn"),
  dialogueText: document.getElementById("dialogueText"),
  nextBtn: document.getElementById("nextBtn"),
  tapZone: document.getElementById("tapZone"),
  menuBtn: document.getElementById("menuBtn"),
  menuPanel: document.getElementById("menuPanel"),
  menuClose: document.getElementById("menuClose"),
  skipToggle: document.getElementById("skipToggle"),
  speedRange: document.getElementById("speedRange"),
  restartBtn: document.getElementById("restartBtn"),
  skipBanner: document.getElementById("skipBanner"),
  episodeEnd: document.getElementById("episodeEnd"),
  readNextBtn: document.getElementById("readNextBtn"),
  closeStoryBtn: document.getElementById("closeStoryBtn")
};

async function init() {
  try {
    const res = await fetch(STORY_PATH);
    state.story = await res.json();
    bindEvents();
    fitStage();
    renderLine();
  } catch (error) {
    console.error("ストーリー読込失敗:", error);
    el.dialogueText.textContent = "ストーリーの読み込みに失敗しました。";
  }
}

function bindEvents() {
  window.addEventListener("resize", fitStage);
  window.addEventListener("orientationchange", () => {
    setTimeout(fitStage, 250);
  });

  el.tapZone.addEventListener("click", handleTap);

  el.menuBtn.addEventListener("click", () => {
    el.menuPanel.classList.remove("hidden");
  });

  el.menuClose.addEventListener("click", () => {
    el.menuPanel.classList.add("hidden");
  });

  el.skipToggle.addEventListener("change", (e) => {
    state.isAutoSkip = e.target.checked;
    el.skipBanner.classList.toggle("hidden", !state.isAutoSkip);

    if (state.isAutoSkip && state.isLineComplete) {
      proceedToNext();
    }
  });

  el.speedRange.addEventListener("input", (e) => {
    state.typeSpeed = Number(e.target.value);
  });

  el.restartBtn.addEventListener("click", () => {
    clearTyping();
    state.index = 0;
    el.episodeEnd.classList.add("hidden");
    el.menuPanel.classList.add("hidden");
    renderLine();
  });

  el.readNextBtn.addEventListener("click", () => {
    alert("ここを次話読込処理に差し替える");
  });

  el.closeStoryBtn.addEventListener("click", () => {
    el.episodeEnd.classList.add("hidden");
  });
}

function fitStage() {
  if (!el.gameViewport || !el.gameStage) return;

  const vw = el.gameViewport.clientWidth;
  const vh = el.gameViewport.clientHeight;

  const scale = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT);

  el.gameStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function handleTap() {
  if (!el.menuPanel.classList.contains("hidden")) return;
  if (!el.episodeEnd.classList.contains("hidden")) return;

  if (state.isTyping) {
    completeCurrentLine();
    return;
  }

  if (state.isLineComplete) {
    proceedToNext();
  }
}

function proceedToNext() {
  state.index += 1;

  if (state.index >= state.story.length) {
    showEpisodeEnd();
    return;
  }

  renderLine();
}

function showEpisodeEnd() {
  clearTyping();
  state.isTyping = false;
  state.isLineComplete = false;
  el.nextBtn.classList.add("hidden");
  el.episodeEnd.classList.remove("hidden");
}

function renderLine() {
  clearTyping();

  const line = state.story[state.index];
  if (!line) return;

  applyScene(line);
  applySpeaker(line);

  state.tokens = tokenizeRichText(line.text || "");
  state.currentTokenIndex = 0;
  state.isTyping = true;
  state.isLineComplete = false;

  el.dialogueText.innerHTML = "";
  el.nextBtn.classList.add("hidden");

  typeNextToken();
}

function applyScene(line) {
  if (line.bg) {
    el.bgImage.src = line.bg;
  }

  renderCharacters(line.characters || [], line.activeId);
}

function renderCharacters(characters, activeId) {
  const slots = getSlots(characters.length);

  el.chars.forEach((img, index) => {
    const data = characters[index];

    img.className = "char hidden";
    img.style.removeProperty("--char-scale");
    img.style.removeProperty("bottom");

    if (!data) return;

    img.src = data.src || "";
    img.style.display = data.visible === false ? "none" : "block";
    img.style.bottom = `${data.bottom ?? 0}px`;

    const slotClass = slots[index];
    if (slotClass) img.classList.add(slotClass);

    if (data.id && activeId && data.id === activeId) {
      img.classList.add("is-active");
    }

    if (data.motion?.depth === "front") {
      img.classList.add("motion-front");
    }

    if (data.motion?.depth === "back") {
      img.classList.add("motion-back");
    }

    if (data.motion?.effect === "pop") {
      img.classList.add("motion-pop");
    }

    if (data.motion?.effect === "float") {
      img.classList.add("motion-float");
    }

    if (typeof data.motion?.scale === "number") {
      img.style.setProperty("--char-scale", data.motion.scale);
    }

    if (typeof data.motion?.x === "number") {
      const baseLeft = getSlotLeftValue(slotClass);
      img.style.left = `calc(${baseLeft}% + ${data.motion.x}px)`;
    }

    if (typeof data.motion?.y === "number") {
      img.style.bottom = `${(data.bottom ?? 0) + data.motion.y}px`;
    }

    img.classList.remove("hidden");
  });
}

function getSlots(count) {
  if (count === 1) return ["slot-single"];
  if (count === 2) return ["slot-left", "slot-right"];
  return ["slot-left", "slot-center", "slot-right"];
}

function getSlotLeftValue(slotClass) {
  if (slotClass === "slot-single") return 50;
  if (slotClass === "slot-left") return 31.5;
  if (slotClass === "slot-center") return 50;
  if (slotClass === "slot-right") return 68.5;
  return 50;
}

function applySpeaker(line) {
  el.speakerJa.textContent = line.speaker || "";
  el.speakerEn.textContent = line.speakerSub || "";
}

function typeNextToken() {
  if (state.currentTokenIndex >= state.tokens.length) {
    finishTyping();
    return;
  }

  const token = state.tokens[state.currentTokenIndex];
  appendToken(token);
  state.currentTokenIndex += 1;

  state.typingTimer = setTimeout(typeNextToken, state.typeSpeed);
}

function appendToken(token) {
  const span = document.createElement("span");
  span.className = `tx ${token.fontClass || ""}`;
  span.textContent = token.char;

  if (token.color) span.style.color = token.color;
  if (token.scale) span.style.fontSize = `${token.scale}em`;

  el.dialogueText.appendChild(span);
}

function completeCurrentLine() {
  clearTyping();
  el.dialogueText.innerHTML = "";

  for (const token of state.tokens) {
    appendToken(token);
  }

  finishTyping();
}

function finishTyping() {
  state.isTyping = false;
  state.isLineComplete = true;
  el.nextBtn.classList.remove("hidden");

  if (state.isAutoSkip) {
    setTimeout(() => {
      if (state.isLineComplete) proceedToNext();
    }, 450);
  }
}

function clearTyping() {
  if (state.typingTimer) {
    clearTimeout(state.typingTimer);
    state.typingTimer = null;
  }
}

function tokenizeRichText(input) {
  const tokens = [];
  const stack = [{
    color: null,
    scale: 1,
    fontClass: ""
  }];

  let i = 0;

  while (i < input.length) {
    if (input[i] === "<") {
      const closeIndex = input.indexOf(">", i);
      if (closeIndex !== -1) {
        const tagContent = input.slice(i + 1, closeIndex).trim();

        if (tagContent.startsWith("color=")) {
          const color = tagContent.replace("color=", "").replace(/['"]/g, "");
          const prev = stack[stack.length - 1];
          stack.push({ ...prev, color });
          i = closeIndex + 1;
          continue;
        }

        if (tagContent === "/color") {
          if (stack.length > 1) stack.pop();
          i = closeIndex + 1;
          continue;
        }

        if (tagContent.startsWith("size=")) {
          const sizeValue = parseFloat(tagContent.replace("size=", "").replace(/['"]/g, "")) || 1;
          const prev = stack[stack.length - 1];
          stack.push({ ...prev, scale: sizeValue });
          i = closeIndex + 1;
          continue;
        }

        if (tagContent === "/size") {
          if (stack.length > 1) stack.pop();
          i = closeIndex + 1;
          continue;
        }

        if (tagContent.startsWith("font=")) {
          const fontValue = tagContent.replace("font=", "").replace(/['"]/g, "");
          const prev = stack[stack.length - 1];
          let fontClass = "";

          if (fontValue === "serif") fontClass = "font-serif";
          if (fontValue === "sans") fontClass = "font-sans";

          stack.push({ ...prev, fontClass });
          i = closeIndex + 1;
          continue;
        }

        if (tagContent === "/font") {
          if (stack.length > 1) stack.pop();
          i = closeIndex + 1;
          continue;
        }
      }
    }

    const style = stack[stack.length - 1];
    tokens.push({
      char: input[i],
      color: style.color,
      scale: style.scale,
      fontClass: style.fontClass
    });
    i += 1;
  }

  return tokens;
}

init();
