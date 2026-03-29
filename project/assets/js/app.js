const STORY_PATH = "./stories/ep01.json";
const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;

const BG_BASE_PATH = "./assets/images/bg/";
const CHARACTER_SOURCES = {
  aya: "./assets/images/chars/aya.png",
  rakuro: "./assets/images/chars/rakuro.png",
   // ten: "./assets/images/chars/ten.png",
   // renga: "./assets/images/chars/kuguri.png"
};

const state = {
  story: [],
  index: 0,
  isTyping: false,
  isLineComplete: false,
  isAutoSkip: false,
  typeSpeed: 24,
  typingTimer: null,
  tokens: [],
  currentTokenIndex: 0,
  sceneState: {
    bg: "placeholder.jpg",
    chars: [],
    speaker: "",
    speakerSub: ""
  }
};

const el = {
  gameViewport: document.getElementById("gameViewport"),
  gameStage: document.getElementById("gameStage"),
  orientationOverlay: document.getElementById("orientationOverlay"),
  bgImage: document.getElementById("bgImage"),
  chars: [
chars: [
  document.getElementById("char1"),
  document.getElementById("char2"),
  document.getElementById("char3"),
  document.getElementById("char4")
],
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.story = await res.json();

    bindEvents();
    fitStage();
    updateOrientationOverlay();
    renderLine();
  } catch (error) {
    console.error("ストーリー読込失敗:", error);
    if (el.dialogueText) {
      el.dialogueText.textContent = "ストーリーの読み込みに失敗しました。";
    }
  }
}

function bindEvents() {
  window.addEventListener("resize", () => {
    fitStage();
    updateOrientationOverlay();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      fitStage();
      updateOrientationOverlay();
    }, 250);
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
    state.sceneState = {
      bg: "placeholder.jpg",
      chars: [],
      speaker: "",
      speakerSub: ""
    };
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
  if (!vw || !vh) return;

  const scale = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT);
  el.gameStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function updateOrientationOverlay() {
  if (!el.orientationOverlay) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  el.orientationOverlay.classList.toggle("show", isPortrait);
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

  const rawLine = state.story[state.index];
  if (!rawLine) return;

  const line = normalizeLine(rawLine);

  applyScene(line);
  applySpeaker(line);

  const normalizedText = normalizeText(line.text);
  state.tokens = tokenizeRichText(normalizedText);
  state.currentTokenIndex = 0;
  state.isTyping = true;
  state.isLineComplete = false;

  el.dialogueText.innerHTML = "";
  el.nextBtn.classList.add("hidden");

  typeNextToken();
}

function normalizeLine(rawLine) {
  const line = { ...rawLine };

  if (line.bg == null) {
    line.bg = state.sceneState.bg;
  } else {
    state.sceneState.bg = line.bg;
  }

  if (line.chars == null) {
    line.chars = state.sceneState.chars;
  } else {
    state.sceneState.chars = structuredCloneSafe(line.chars);
  }

  if (line.speaker == null) {
    line.speaker = state.sceneState.speaker;
  } else {
    state.sceneState.speaker = line.speaker;
  }

  if (line.speakerSub == null) {
    line.speakerSub = state.sceneState.speakerSub;
  } else {
    state.sceneState.speakerSub = line.speakerSub;
  }

  return line;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyScene(line) {
  if (line.bg) {
    el.bgImage.src = resolveBgPath(line.bg);
  }

  const parsedCharacters = parseChars(line.chars || []);
  renderCharacters(parsedCharacters);
}

function resolveBgPath(bg) {
  if (bg.startsWith("./") || bg.startsWith("../") || bg.startsWith("http")) {
    return bg;
  }
  return `${BG_BASE_PATH}${bg}`;
}

function parseChars(chars) {
  return chars.map((entry) => {
    if (typeof entry === "string") {
      return parseCharacterShort(entry);
    }
    return parseCharacterObject(entry);
  });
}

function parseCharacterShort(entry) {
  const parts = entry.split(":").map(v => v.trim()).filter(Boolean);
  const id = parts[0];

  const result = {
    id,
    src: CHARACTER_SOURCES[id] || "",
    visible: true,
    bottom: 0,
    motion: {}
  };

  parts.slice(1).forEach(part => {
    if (part === "front" || part === "back") {
      result.motion.depth = part;
      return;
    }
    if (part.startsWith("scale=")) {
      result.motion.scale = Number(part.replace("scale=", ""));
      return;
    }
    if (part.startsWith("x=")) {
      result.motion.x = Number(part.replace("x=", ""));
      return;
    }
    if (part.startsWith("y=")) {
      result.motion.y = Number(part.replace("y=", ""));
      return;
    }
    if (part.startsWith("bottom=")) {
      result.bottom = Number(part.replace("bottom=", ""));
      return;
    }
    if (part === "hide") {
      result.visible = false;
    }
  });

  return result;
}

  parts.slice(1).forEach(part => {
    if (part === "front" || part === "back") {
      result.motion.depth = part;
      return;
    }
    if (part === "pop" || part === "float") {
      result.motion.effect = part;
      return;
    }
    if (part.startsWith("scale=")) {
      result.motion.scale = Number(part.replace("scale=", ""));
      return;
    }
    if (part.startsWith("x=")) {
      result.motion.x = Number(part.replace("x=", ""));
      return;
    }
    if (part.startsWith("y=")) {
      result.motion.y = Number(part.replace("y=", ""));
      return;
    }
    if (part.startsWith("bottom=")) {
      result.bottom = Number(part.replace("bottom=", ""));
    }
  });

  return result;
}

function parseCharacterObject(entry) {
  const id = entry.id;
  return {
    id,
    src: entry.src || CHARACTER_SOURCES[id] || "",
    visible: entry.visible !== false,
    bottom: entry.bottom ?? 0,
    motion: {
      ...(entry.motion || {})
    }
  };
}

function renderCharacters(characters) {
  const visibleCharacters = characters.filter(c => c && c.visible !== false && c.src);
  const slots = getSlots(visibleCharacters.length);

  el.chars.forEach((img, index) => {
    const data = visibleCharacters[index];

    img.className = "char hidden";
    img.style.removeProperty("--char-scale");
    img.style.removeProperty("left");
    img.style.removeProperty("bottom");
    img.style.display = "none";

    if (!data) return;

    img.src = data.src;
    img.style.display = "block";

    const slotClass = slots[index];
    if (slotClass) img.classList.add(slotClass);

    const baseBottom = data.bottom ?? 0;
    const motion = data.motion || {};

    img.style.bottom = `${baseBottom + (motion.y ?? 0)}px`;

    if (typeof motion.scale === "number") {
      img.style.setProperty("--char-scale", motion.scale);
    }

    if (motion.depth === "front") {
      img.classList.add("motion-front");
    } else if (motion.depth === "back") {
      img.classList.add("motion-back");
    }

    const baseLeft = getSlotLeftValue(slotClass);
    const offsetX = motion.x ?? 0;
    img.style.left = `calc(${baseLeft}% + ${offsetX}px)`;

    img.classList.remove("hidden");
  });
}

function getSlots(count) {
  if (count <= 0) return [];
  if (count === 1) return ["slot-single"];
  if (count === 2) return ["slot-left", "slot-right"];
  if (count === 3) return ["slot-left", "slot-center", "slot-right"];
  return ["slot-far-left", "slot-left", "slot-right", "slot-far-right"];
}

function getSlotLeftValue(slotClass) {
  if (slotClass === "slot-single") return 50;
  if (slotClass === "slot-far-left") return 20;
  if (slotClass === "slot-left") return 38;
  if (slotClass === "slot-center") return 50;
  if (slotClass === "slot-right") return 62;
  if (slotClass === "slot-far-right") return 80;
  return 50;
}

function applySpeaker(line) {
  el.speakerJa.textContent = line.speaker || "";
  el.speakerEn.textContent = line.speakerSub || "";
}

function normalizeText(text) {
  if (Array.isArray(text)) {
    return text.join("\n");
  }
  return text || "";
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
      if (state.isLineComplete) {
        proceedToNext();
      }
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
