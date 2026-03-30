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

  nameRow: document.querySelector(".name-row"),
  lineImage: document.querySelector(".dialogue-line-image"),
  textRow: document.querySelector(".text-row"),

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

const characterState = createCharacterState();

let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

let currentBg = "placeholder.jpg";
let lineRenderToken = 0;

window.addEventListener("DOMContentLoaded", async () => {
  await loadScript();
  fitStage();
  renderLine();
});

window.addEventListener("resize", fitStage);

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
  el.text.textContent = "";
  el.next.classList.remove("is-ready");

  if (index >= script.length) return;

  const line = script[index];

  if (line.bg) currentBg = line.bg;
  el.bg.src = `./assets/images/bg/${currentBg}`;

  let usedMotion = false;

  if (Array.isArray(line.motions)) {
    usedMotion = true;

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

    if (token !== lineRenderToken) return;
  }

  // UIフェード
  const shouldFade = usedMotion;

  [el.nameRow, el.lineImage, el.textRow].forEach(node => {
    node.classList.remove("ui-fade-in");
    void node.offsetWidth;
  });

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  if (shouldFade) {
    [el.nameRow, el.lineImage, el.textRow].forEach(node => {
      node.classList.add("ui-fade-in");
    });
  }

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
    y: 0
  };

  for (const p of parts.slice(1)) {
    if (["left", "right", "center", "single"].includes(p)) data.position = p;
  }

  return data;
}

/* ===== 通常描画（フェード含む） ===== */
function renderCharacters(chars, options = {}) {
  const { fadeIds = [], exitIds = [] } = options;

  const visible = chars.filter(c => c && c.visible !== false);

  visible.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    img.src = c.src;
    img.style.display = "block";

    const left = getLeft(c.position);
    img.style.left = `${left}%`;
    img.style.bottom = `${CHARACTER_BOTTOM}px`;

    img.classList.remove("hidden", "fade-in", "fade-out");

    if (fadeIds.includes(c.id)) {
      void img.offsetWidth;
      img.classList.add("fade-in");
    }

    if (exitIds.includes(c.id)) {
      void img.offsetWidth;
      img.classList.add("fade-out");
    }
  });
}

/* ===== 移動専用（消さない） ===== */
function moveCharacters(chars) {
  const visible = chars.filter(c => c && c.visible !== false);

  visible.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    const left = getLeft(c.position);

    img.style.left = `${left}%`;
    img.style.bottom = `${CHARACTER_BOTTOM}px`;
  });
}

function getLeft(pos) {
  switch (pos) {
    case "left": return 30;
    case "right": return 70;
    case "center": return 50;
    default: return 50;
  }
}

function startTyping(lines) {
  const text = lines.join("\n");
  currentFullText = text;

  let i = 0;
  isTyping = true;

  function step() {
    if (i >= text.length) {
      isTyping = false;
      el.next.classList.add("is-ready");
      return;
    }

    el.text.textContent += text[i++];
    typingTimer = setTimeout(step, 30);
  }

  step();
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

el.stage.addEventListener("click", () => {
  if (isTyping) {
    clearTimeout(typingTimer);
    el.text.textContent = currentFullText;
    isTyping = false;
    return;
  }

  index++;
  renderLine();
});
