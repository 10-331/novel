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
  const res = await fetch("./assets/data/ep01.json");
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

/**
 * chars の略記は読むが、表示上は front/back/x/y/scale/bottom を無視する。
 * つまり、今の JSON にそれらが残っていても横並び固定にする。
 */
function parseCharacter(entry) {
  const parts = entry.split(":").map(v => v.trim()).filter(Boolean);
  const id = parts[0];

  return {
    id,
    src: CHARACTER_SOURCES[id] || "",
    visible: true
  };
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

/**
 * text 配列で意図的に分けた行は維持しつつ、
 * 各行だけ「最大30文字程度」を上限に折り返す。
 */
function wrapTextLines(lines, limit = 30) {
  const wrappedLines = [];

  for (const rawLine of lines) {
    if (!rawLine) {
      wrappedLines.push("");
      continue;
    }

    let current = "";

    for (const char of rawLine) {
      current += char;

      if (current.length >= limit) {
        wrappedLines.push(current);
        current = "";
      }
    }

    if (current) {
      wrappedLines.push(current);
    }
  }

  return wrappedLines.join("\n");
}

function startTyping(lines) {
  clearTimeout(typingTimer);

  el.text.textContent = "";
  el.next.style.opacity = 0;

  const full = wrapTextLines(lines, 30);
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


const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const menuClose = document.getElementById("menuClose");

if (menuBtn && menuPanel) {
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuPanel.classList.remove("hidden");
  });
}

if (menuClose && menuPanel) {
  menuClose.addEventListener("click", (e) => {
    e.stopPropagation();
    menuPanel.classList.add("hidden");
  });
}


if(line.disabled) {
  next(); // または return だけでもOK
  return;
}
