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

  bgA: document.getElementById("bgA"),
  bgB: document.getElementById("bgB"),

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

let activeBg = "A";

function changeBackground(src) {
  const next = activeBg === "A" ? el.bgB : el.bgA;
  const current = activeBg === "A" ? el.bgA : el.bgB;

  next.src = src;
  next.classList.remove("active");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add("active");
      current.classList.remove("active");
    });
  });

  activeBg = activeBg === "A" ? "B" : "A";
}

const characterState = createCharacterState();

let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

let currentBg = "placeholder.jpg";
let prevBg = null;
let isFlashbackActive = false;
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
    updateOrientation();
    setupMenu();
    setupEndChoice();

    el.stage?.classList.add("is-ready");
    await renderLine();

  } catch (err) {
    console.error(err);
    alert("シナリオの読み込みに失敗しました");
  }
});

window.addEventListener("resize", () => {
  fitStage();
  updateOrientation();
});

function fitStage() {
  const vw = el.viewport.clientWidth;
  const vh = el.viewport.clientHeight;
  const scale = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT);
  el.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function updateOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  el.overlay.classList.toggle("show", isPortrait);
}

function setFlashbackMode(isOn) {
  el.stageGradient.classList.toggle("white", isOn);
  el.stageGradient.classList.toggle("black", !isOn);

  el.nameRow.classList.toggle("is-flashback", isOn);
  el.textRow.classList.toggle("is-flashback", isOn);
  el.text.classList.toggle("is-flashback", isOn);
  el.nameMain.classList.toggle("is-flashback", isOn);

  // ★サブは色変えない（要件）
}

async function renderLine() {
  const token = ++lineRenderToken;

  clearTimeout(typingTimer);
  isTyping = false;
  el.text.textContent = "";
  el.nameMain.textContent = "";
  el.nameSub.textContent = "";
  el.next.classList.remove("is-ready");

  if (index >= script.length) {
    clearCharacters(characterState);
    renderCharacters([]);
    showEndChoice();
    return;
  }

  const line = script[index];

  if (line.bg) currentBg = line.bg;

  if (!isFlashbackActive) {
    changeBackground(`./assets/images/bg/${currentBg}`);
  }

  if (Array.isArray(line.motions) && line.motions.length > 0) {
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

    if (token !== lineRenderToken) return;

  } else if (Array.isArray(line.chars)) {
    clearCharacters(characterState);

    const parsed = line.chars.map(parseCharacter);
    parsed.forEach((c) => {
      if (c.visible !== false) {
        setCharacter(characterState, c);
      }
    });

    renderCharacters(getVisibleCharacters(characterState));
  }

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  startTyping(Array.isArray(line.text) ? line.text : [line.text || ""]);
}

function parseCharacter(entry) {
  const parts = String(entry).split(":");
  const id = parts[0];

  return {
    id,
    src: CHARACTER_SOURCES[id],
    position: parts[1] || "center",
    x: 0,
    y: 0,
    scale: 1,
    visible: true
  };
}

function renderCharacters(chars) {
  Object.values(charMap).forEach((img) => {
    img.style.display = "none";
  });

  chars.forEach((c) => {
    const img = charMap[c.id];
    if (!img) return;

    img.src = c.src;
    img.style.display = "block";
    img.style.left = `${getPositionLeftValue(c.position)}%`;
    img.style.bottom = `${CHARACTER_BOTTOM}px`;

    img.classList.remove("fade-in", "fade-out");
    img.style.opacity = "0";

    requestAnimationFrame(() => {
      img.classList.add("fade-in");
      img.style.opacity = "";
    });
  });
}

function moveCharacters(chars) {
  chars.forEach((c) => {
    const img = charMap[c.id];
    if (!img) return;

    img.classList.remove("fade-in", "fade-out");
    img.style.left = `${getPositionLeftValue(c.position)}%`;
  });
}

function getPositionLeftValue(position) {
  switch (position) {
    case "left": return 30;
    case "center": return 50;
    case "right": return 70;
    default: return 50;
  }
}

function startTyping(lines) {
  clearTimeout(typingTimer);
  el.text.textContent = "";

  const full = lines.join("\n");
  currentFullText = full;

  let i = 0;
  isTyping = true;

  function step() {
    if (i >= full.length) {
      isTyping = false;
      el.next.classList.add("is-ready");
      return;
    }

    el.text.textContent += full[i];
    i++;
    typingTimer = setTimeout(step, 35);
  }

  step();
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function playFlashback(bgName) {
  flashOverlay.classList.add("active");
  await wait(300);

  prevBg = currentBg;
  isFlashbackActive = true;

  changeBackground(`./assets/images/bg/${bgName}`);
  setFlashbackMode(true);

  flashFrame.classList.add("active");
  flashOverlay.classList.remove("active");
}

async function endFlashback() {
  flashOverlay.classList.add("active");
  await wait(300);

  isFlashbackActive = false;

  changeBackground(`./assets/images/bg/${prevBg || currentBg}`);
  setFlashbackMode(false);

  flashFrame.classList.remove("active");
  flashOverlay.classList.remove("active");
}

function setupMenu() {}

function setupEndChoice() {}

function showEndChoice() {}

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

async function loadScript() {
  const res = await fetch("./assets/data/ep01.json");
  script = await res.json();
}