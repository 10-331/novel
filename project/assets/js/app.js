const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;
const CHARACTER_BOTTOM = -28;
const CHARACTER_FADE_DURATION = 1000;

const el = {
  viewport: document.getElementById("gameViewport"),
  stage: document.getElementById("stage"),
  bg: document.getElementById("bg"),
  nameMain: document.getElementById("nameMain"),
  nameSub: document.getElementById("nameSub"),
  text: document.getElementById("text"),
  next: document.getElementById("nextIndicator"),
  overlay: document.getElementById("orientationOverlay"),

  menuBtn: document.getElementById("menuBtn"),
  menuPanel: document.getElementById("menuPanel"),
  backBtn: document.getElementById("backBtn"),
  skipBtn: document.getElementById("skipBtn"),

  endChoiceOverlay: document.getElementById("endChoiceOverlay"),
  continueBtn: document.getElementById("continueBtn"),
  finishBtn: document.getElementById("finishBtn"),

  chars: [
    document.getElementById("char1"),
    document.getElementById("char2"),
    document.getElementById("char3"),
    document.getElementById("char4")
  ]
};

const CHARACTER_SOURCES = {
  aya: "./assets/images/chars/aya.png",
  rakuro: "./assets/images/chars/rakuro.png"
};

let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

let currentBg = "placeholder.jpg";
let currentChars = [];

let isMenuOpen = false;
let isEpisodeEnded = false;

let skipAdvanceUntil = 0;
let prevVisibleCharKeys = [];
let lineRenderToken = 0;

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadScript();
    fitStage();
    updateOrientation();
    setupMenu();
    setupEndChoice();
    renderLine();
  } catch (err) {
    console.error(err);
    alert("シナリオの読み込みに失敗しました");
  }
});

window.addEventListener("resize", () => {
  fitStage();
  updateOrientation();
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    fitStage();
    updateOrientation();
  }, 200);
});

async function loadScript() {
  const res = await fetch("./assets/data/ep01.json");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  script = await res.json();
}

function fitStage() {
  if (!el.viewport || !el.stage) return;

  const vw = el.viewport.clientWidth;
  const vh = el.viewport.clientHeight;
  if (!vw || !vh) return;

  const scale = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT);
  el.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function updateOrientation() {
  if (!el.overlay) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  el.overlay.classList.toggle("show", isPortrait);
}

async function renderLine() {
  const token = ++lineRenderToken;

  while (index < script.length && script[index]?.disabled === true) {
    index++;
  }

  clearTimeout(typingTimer);
  isTyping = false;
  el.next.classList.remove("is-ready");
  el.text.textContent = "";
  el.nameMain.textContent = "";
  el.nameSub.textContent = "";

  if (index >= script.length) {
    renderCharacters([]);
    showEndChoice();
    return;
  }

  const line = script[index];

  if (line.bg) currentBg = line.bg;
  if (line.chars !== undefined) currentChars = line.chars;

  el.bg.src = `./assets/images/bg/${currentBg}`;

  const parsed = Array.isArray(currentChars)
    ? currentChars.map(parseCharacter)
    : [];

  const hasNewCharacter = renderCharacters(parsed);

  if (hasNewCharacter) {
    await wait(CHARACTER_FADE_DURATION);
    if (token !== lineRenderToken) return;
  }

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";
  startTyping(Array.isArray(line.text) ? line.text : [line.text || ""]);
}

function parseCharacter(entry) {
  const parts = String(entry).split(":").map(v => v.trim()).filter(Boolean);
  const id = parts[0];

  const data = {
    id,
    src: CHARACTER_SOURCES[id] || "",
    visible: true,
    position: null,
    x: 0,
    y: 0
  };

  for (const p of parts.slice(1)) {
    if (["left","right","center","single","far-left","far-right"].includes(p)) {
      data.position = p;
    } else if (p.startsWith("x=")) {
      data.x = Number(p.replace("x=", "")) || 0;
    } else if (p.startsWith("y=")) {
      data.y = Number(p.replace("y=", "")) || 0;
    } else if (p === "hide") {
      data.visible = false;
    }
  }

  return data;
}

function renderCharacters(chars) {
  const visible = chars.filter(c => c && c.visible !== false && c.src);
  const hasExplicitPosition = visible.some(c => c.position);
  const slots = hasExplicitPosition ? [] : getAutoSlots(visible.length);

  const currentKeys = visible.map(c => c.id);

  let hasNewCharacter = false;

  el.chars.forEach(img => {
    img.className = "char hidden";
    img.style.display = "none";
  });

  if (visible.length === 0) {
    prevVisibleCharKeys = [];
    return false;
  }

  visible.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    const pos = hasExplicitPosition ? (c.position || "center") : slots[i];
    const key = c.id;
    const isNew = !prevVisibleCharKeys.includes(key);

    if (isNew) hasNewCharacter = true;

    img.src = c.src;
    img.style.display = "block";

    const left = getPositionLeftValue(pos);
    img.style.left = `calc(${left}% + ${c.x}px)`;
    img.style.bottom = `${CHARACTER_BOTTOM + (c.y || 0)}px`;
    img.style.transform = "translateX(-50%)";

    img.classList.remove("hidden");

    if (isNew) {
      img.classList.remove("fade-in");
      void img.offsetWidth;
      img.classList.add("fade-in");
    }
  });

  prevVisibleCharKeys = currentKeys;
  return hasNewCharacter;
}

function getAutoSlots(count) {
  if (count === 1) return ["single"];
  if (count === 2) return ["left","right"];
  if (count === 3) return ["left","center","right"];
  return ["far-left","left","right","far-right"];
}

function getPositionLeftValue(position) {
  switch (position) {
    case "single": return 50;
    case "far-left": return 14;
    case "left": return 32;
    case "center": return 50;
    case "right": return 68;
    case "far-right": return 86;
    default: return 50;
  }
}

function startTyping(lines) {
  clearTimeout(typingTimer);
  el.text.textContent = "";
  el.next.classList.remove("is-ready");

  const full = lines.join("\n");
  currentFullText = full;

  let i = 0;
  isTyping = true;

  function step() {
    if (i >= currentFullText.length) {
      isTyping = false;
      el.next.classList.add("is-ready");
      return;
    }

    el.text.textContent += currentFullText[i];
    i++;
    typingTimer = setTimeout(step, 30);
  }

  step();
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function setupMenu() {
  el.menuBtn.addEventListener("click", e => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    el.menuPanel.classList.toggle("hidden", !isMenuOpen);
  });
}

function setupEndChoice() {}

function showEndChoice() {
  isEpisodeEnded = true;
}

el.stage.addEventListener("click", () => {
  if (isMenuOpen || isEpisodeEnded) return;

  const now = Date.now();
  if (now < skipAdvanceUntil) return;

  if (isTyping) {
    clearTimeout(typingTimer);
    el.text.textContent = currentFullText;
    isTyping = false;
    el.next.classList.add("is-ready");
    skipAdvanceUntil = now + 220;
    return;
  }

  index++;
  renderLine();
});
