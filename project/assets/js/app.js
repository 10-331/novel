const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;

const el = {
  viewport: document.getElementById("gameViewport"),
  stage: document.getElementById("stage"),
  bg: document.getElementById("bg"),
  nameMain: document.getElementById("nameMain"),
  nameSub: document.getElementById("nameSub"),
  text: document.getElementById("text"),
  next: document.getElementById("nextIndicator"),
  overlay: document.getElementById("orientationOverlay"),

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
  // 必要に応じて追加
};

let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

// 行ごとの状態保持
let currentBg = "placeholder.jpg";
let currentChars = [];

window.addEventListener("DOMContentLoaded", async () => {
  await loadScript();
  fitStage();
  updateOrientation();
  renderLine();
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
  const res = await fetch("./stories/ep01.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

function renderLine() {
  const line = script[index];
  if (!line) return;

  if (line.bg) {
    currentBg = line.bg;
  }

  if (line.chars !== undefined) {
    currentChars = line.chars;
  }

  el.bg.src = `./assets/images/bg/${currentBg}`;

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  const parsed = (currentChars || []).map(parseCharacter);
  renderCharacters(parsed);

  startTyping(line.text || []);
}

function parseCharacter(entry) {
  const parts = entry.split(":").map(v => v.trim()).filter(Boolean);
  const id = parts[0];

  const data = {
    id,
    src: CHARACTER_SOURCES[id] || "",
    visible: true,
    bottom: 0,
    motion: {}
  };

  parts.slice(1).forEach(p => {
    if (p.startsWith("scale=")) {
      data.motion.scale = Number(p.replace("scale=", ""));
      return;
    }
    if (p.startsWith("x=")) {
      data.motion.x = Number(p.replace("x=", ""));
      return;
    }
    if (p.startsWith("y=")) {
      data.motion.y = Number(p.replace("y=", ""));
      return;
    }
    if (p.startsWith("bottom=")) {
      data.bottom = Number(p.replace("bottom=", ""));
      return;
    }
    if (p === "hide") {
      data.visible = false;
    }
  });

  return data;
}

function renderCharacters(chars) {
  const visible = chars.filter(c => c && c.visible !== false && c.src);
  const slots = getSlots(visible.length);

  el.chars.forEach((img, i) => {
    const c = visible[i];

    img.className = "char hidden";
    img.style.display = "none";
    img.style.removeProperty("--char-scale");
    img.style.removeProperty("left");
    img.style.removeProperty("bottom");

    if (!c) return;

    img.src = c.src;
    img.style.display = "block";

    const slot = slots[i];
    if (slot) img.classList.add(slot);

    const motion = c.motion || {};
    const baseBottom = c.bottom ?? 0;

    img.style.bottom = `${52 + baseBottom + (motion.y ?? 0)}px`;

    if (typeof motion.scale === "number") {
      img.style.setProperty("--char-scale", motion.scale);
    }

    const baseLeft = getSlotLeftValue(slot);
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

function getSlotLeftValue(slot) {
  if (slot === "slot-single") return 50;
  if (slot === "slot-far-left") return 14;
  if (slot === "slot-left") return 32;
  if (slot === "slot-center") return 50;
  if (slot === "slot-right") return 68;
  if (slot === "slot-far-right") return 86;
  return 50;
}

function startTyping(lines) {
  clearTimeout(typingTimer);

  el.text.textContent = "";
  el.next.style.opacity = 0;

  const full = lines.join("\n");
  currentFullText = full;

  let i = 0;
  isTyping = true;

  function step() {
    if (i >= currentFullText.length) {
      isTyping = false;
      el.next.style.opacity = 1;
      return;
    }

    el.text.textContent += currentFullText[i];
    i++;
    typingTimer = setTimeout(step, 26);
  }

  step();
}

el.stage.addEventListener("click", () => {
  if (isTyping) {
    clearTimeout(typingTimer);
    el.text.textContent = currentFullText;
    isTyping = false;
    el.next.style.opacity = 1;
    return;
  }

  index++;
  if (index >= script.length) return;

  renderLine();
});
