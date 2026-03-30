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

const CHARACTER_SOURCES = {
  aya: "./assets/images/chars/aya.png",
  rakuro: "./assets/images/chars/rakuro.png"
};

const imageCache = new Map();

async function preloadCharacterImages() {
  const entries = Object.entries(CHARACTER_SOURCES);

  await Promise.all(
    entries.map(([id, src]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;

        const done = () => {
          imageCache.set(id, src);
          resolve();
        };

        img.onload = async () => {
          try {
            if (img.decode) await img.decode();
          } catch {}
          done();
        };

        img.onerror = done;
      });
    })
  );
}

const characterState = createCharacterState();

let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

let currentBg = "placeholder.jpg";

let isMenuOpen = false;
let isEpisodeEnded = false;

let skipAdvanceUntil = 0;
let lineRenderToken = 0;

window.addEventListener("DOMContentLoaded", async () => {
  await preloadCharacterImages();
  await loadScript();
  fitStage();
  updateOrientation();
  setupMenu();
  setupEndChoice();
  await renderLine();
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

async function loadScript() {
  const res = await fetch("./assets/data/ep01.json");
  script = await res.json();
}

async function renderLine() {
  const token = ++lineRenderToken;

  clearTimeout(typingTimer);
  isTyping = false;
  el.text.textContent = "";
  el.nameMain.textContent = "";
  el.nameSub.textContent = "";
  el.next.classList.remove("is-ready");

  if (index >= script.length) return;

  const line = script[index];

  if (line.bg) currentBg = line.bg;
  el.bg.src = `./assets/images/bg/${currentBg}`;

  if (Array.isArray(line.motions)) {
    await runMotions({
      motions: line.motions,
      state: characterState,
      renderCharacters,
      moveCharacters,
      parseCharacter,
      wait,
      token,
      getToken: () => lineRenderToken
    });
  }

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  startTyping(Array.isArray(line.text) ? line.text : [line.text || ""]);
}

function parseCharacter(entry) {
  const parts = entry.split(":");
  const id = parts[0];

  const data = {
    id,
    src: CHARACTER_SOURCES[id],
    visible: true,
    position: null,
    x: 0,
    y: 0,
    scale: 1
  };

  for (const p of parts.slice(1)) {
    if (p.startsWith("scale=")) {
      data.scale = Number(p.replace("scale=", ""));
    } else if (p === "left" || p === "right" || p === "center") {
      data.position = p;
    }
  }

  return data;
}

function renderCharacters(chars, options = {}) {
  const { fadeIds = [] } = options;

  el.chars.forEach(img => {
    img.style.display = "none";
    img.style.removeProperty("--char-scale");
  });

  chars.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    img.src = c.src;
    img.style.display = "block";

    img.style.left = "50%";
    img.style.bottom = `${CHARACTER_BOTTOM}px`;

    img.style.setProperty("--char-scale", c.scale || 1);

    if (fadeIds.includes(c.id)) {
      img.style.opacity = "0";
      requestAnimationFrame(() => {
        img.style.opacity = "1";
      });
    }
  });
}

function moveCharacters(chars) {
  chars.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    img.style.setProperty("--char-scale", c.scale || 1);
  });
}

function startTyping(lines) {
  clearTimeout(typingTimer);

  const full = lines.join("\n");
  currentFullText = full;

  let i = 0;
  isTyping = true;
  el.text.textContent = "";

  function step() {
    if (i >= full.length) {
      isTyping = false;
      el.next.classList.add("is-ready");
      return;
    }

    el.text.textContent += full[i++];
    typingTimer = setTimeout(step, 30);
  }

  step();
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function setupMenu() {
  el.menuBtn.addEventListener("click", () => {
    el.menuPanel.classList.toggle("hidden");
  });
}

function setupEndChoice() {}

el.stage.addEventListener("click", async () => {
  if (isTyping) {
    el.text.textContent = currentFullText;
    isTyping = false;
    return;
  }

  index++;
  await renderLine();
});
