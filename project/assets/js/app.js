import {
  createCharacterState,
  getVisibleCharacters,
  clearCharacters,
  setCharacter
} from "./characterState.js";
import { runMotions } from "./motionRunner.js";

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;
const CHARACTER_BOTTOM = -28;

const el = {
  viewport: document.getElementById("gameViewport"),
  stage: document.getElementById("stage"),
  stageGradient: document.getElementById("stageGradient"),
  bg: document.getElementById("bg"),
  nameMain: document.getElementById("nameMain"),
  nameSub: document.getElementById("nameSub"),
  text: document.getElementById("text"),
  next: document.getElementById("nextIndicator"),
  overlay: document.getElementById("orientationOverlay"),

  nameRow: document.querySelector(".name-row"),
  lineImage: document.querySelector(".dialogue-line-image"),
  textRow: document.querySelector(".text-row"),

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

const charMap = {
  rakuro: el.chars[0],
  aya: el.chars[1],
  ten: el.chars[2],
  kuguri: el.chars[3]
};

const CHARACTER_SOURCES = {
  aya: "./assets/images/chars/aya.png",
  rakuro: "./assets/images/chars/rakuro.png",
  ten: "./assets/images/chars/ten.png",
  kuguri: "./assets/images/chars/kuguri.png"
};

const characterState = createCharacterState();

let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

let currentBg = "placeholder.jpg";
let currentChars = [];
let prevBg = null;
let isFlashbackActive = false;
let hasInitialRenderCompleted = false;
let isMotionPlaying = false;

let isMenuOpen = false;
let isEpisodeEnded = false;

let skipAdvanceUntil = 0;
let lineRenderToken = 0;

const flashOverlay = document.getElementById("flashOverlay");
const flashFrame = document.getElementById("flashFrame");

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadScript();
    fitStage();
    setupMenu();
    setupEndChoice();
    await renderLine();

    hasInitialRenderCompleted = true;
    el.stage?.classList.add("is-ready");
  } catch (err) {
    console.error(err);
    alert("シナリオの読み込みに失敗しました");
  }
});

async function loadScript() {
  const res = await fetch("./assets/data/ep01.json");
  script = await res.json();
}

function fitStage() {
  const vw = el.viewport.clientWidth;
  const vh = el.viewport.clientHeight;
  const scale = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT);
  el.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

async function renderLine() {
  const token = ++lineRenderToken;

  clearTimeout(typingTimer);
  isTyping = false;
  el.next.classList.remove("is-ready");
  el.text.textContent = "";
  el.nameMain.textContent = "";
  el.nameSub.textContent = "";

  if (index >= script.length) {
    clearCharacters(characterState);
    renderCharacters([]);
    return;
  }

  const line = script[index];

  if (line.bg) currentBg = line.bg;

  if (!isFlashbackActive) {
    el.bg.src = `./assets/images/bg/${currentBg}`;
  }

  if (Array.isArray(line.motions)) {
    isMotionPlaying = true;

    await runMotions({
      motions: line.motions,
      state: characterState,
      renderCharacters,
      moveCharacters,
      parseCharacter,
      wait,
      token,
      getToken: () => lineRenderToken,
      playFlashback,
      endFlashback
    });

    isMotionPlaying = false;
  }

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  startTyping(line.text || []);
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
    y: 0,
    scale: 1
  };

  for (const p of parts.slice(1)) {
    if (["left", "right", "center"].includes(p)) {
      data.position = p;
    } else if (p.startsWith("scale=")) {
      data.scale = Number(p.replace("scale=", "")) || 1;
    }
  }

  return data;
}

function renderCharacters(chars, options = {}) {
  const { fadeIds = [], exitIds = [] } = options;

  Object.values(charMap).forEach((img) => {
    img.className = "char hidden";
    img.style.display = "none";
  });

  chars.forEach((c) => {
    const img = charMap[c.id];
    if (!img) return;

    img.src = c.src;
    img.style.display = "block";
    img.style.left = `${getPositionLeftValue(c.position)}%`;
    img.style.bottom = `${CHARACTER_BOTTOM}px`;
    img.style.setProperty("--char-scale", c.scale || 1);

    img.classList.remove("hidden", "fade-in", "fade-out");

    // ★ここだけ変更（時間統一＋分岐復元）
    img.style.setProperty("--char-fade-duration", "1000ms");

    if (fadeIds.includes(c.id)) {
      img.style.opacity = "0";
      requestAnimationFrame(() => {
        img.classList.add("fade-in");
        img.style.opacity = "";
      });
    }

    if (exitIds.includes(c.id)) {
      img.classList.add("fade-out");
    }
  });
}

function moveCharacters(chars) {
  chars.forEach((c) => {
    const img = charMap[c.id];
    if (!img) return;

    img.style.left = `${getPositionLeftValue(c.position)}%`;
  });
}

function getPositionLeftValue(pos) {
  switch (pos) {
    case "left": return 30;
    case "center": return 50;
    case "right": return 70;
    default: return 50;
  }
}

function startTyping(lines) {
  const full = Array.isArray(lines) ? lines.join("\n") : lines;
  currentFullText = full;
  let i = 0;
  isTyping = true;

  function step() {
    if (i >= full.length) {
      isTyping = false;
      el.next.classList.add("is-ready");
      return;
    }
    el.text.textContent += full[i++];
    typingTimer = setTimeout(step, 35);
  }

  step();
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

el.stage.addEventListener("click", async () => {
  if (isMenuOpen || isEpisodeEnded || isMotionPlaying) return;

  if (isTyping) {
    clearTimeout(typingTimer);
    el.text.textContent = currentFullText;
    isTyping = false;
    el.next.classList.add("is-ready");
    return;
  }

  index++;
  await renderLine();
});

async function playFlashback(bgName) {
  flashOverlay.classList.add("active");
  await wait(300);

  prevBg = currentBg;
  isFlashbackActive = true;

  el.bg.src = `./assets/images/bg/${bgName}`;
  flashFrame.classList.add("active");

  flashOverlay.classList.remove("active");
}

async function endFlashback() {
  flashOverlay.classList.add("active");
  await wait(300);

  isFlashbackActive = false;
  el.bg.src = `./assets/images/bg/${prevBg}`;
  flashFrame.classList.remove("active");

  flashOverlay.classList.remove("active");
}

function setupMenu(){}
function setupEndChoice(){}