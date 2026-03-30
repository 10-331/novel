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
  // 必要に応じて追加
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

function renderLine() {
  while (index < script.length && script[index] && script[index].disabled === true) {
    index++;
  }

  if (index >= script.length) {
    el.nameMain.textContent = "";
    el.nameSub.textContent = "";
    el.text.textContent = "";
    el.next.classList.remove("is-ready");
    renderCharacters([]);
    showEndChoice();
    return;
  }

  el.next.classList.remove("is-ready");

  const line = script[index];

  if (line.bg) {
    currentBg = line.bg;
  }

  if (line.chars !== undefined) {
    currentChars = line.chars;
  }

  el.bg.src = `./assets/images/bg/${currentBg}`;
  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  const parsed = Array.isArray(currentChars)
    ? currentChars.map(parseCharacter)
    : [];

  renderCharacters(parsed);
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
    x: 0
  };

  for (const p of parts.slice(1)) {
    if (
      p === "left" ||
      p === "right" ||
      p === "center" ||
      p === "single" ||
      p === "far-left" ||
      p === "far-right"
    ) {
      data.position = p;
      continue;
    }

    if (p.startsWith("x=")) {
      const n = Number(p.replace("x=", ""));
      data.x = Number.isFinite(n) ? n : 0;
      continue;
    }

    if (p === "hide") {
      data.visible = false;
      continue;
    }

    // front/back/scale/y/bottom などは無視
  }

  return data;
}

function renderCharacters(chars) {
  const visible = chars.filter(c => c && c.visible !== false && c.src);
  const hasExplicitPosition = visible.some(c => c.position);

  el.chars.forEach((img) => {
    img.className = "char hidden";
    img.style.display = "none";
    img.style.left = "";
    img.style.bottom = "";
    img.style.transform = "translateX(-50%)";
  });

  if (visible.length === 0) return;

  if (hasExplicitPosition) {
    visible.forEach((c, i) => {
      const img = el.chars[i];
      if (!img) return;

      img.src = c.src;
      img.style.display = "block";
      img.classList.add("char");

      const left = getPositionLeftValue(c.position || "center");
      img.style.left = `calc(${left}% + ${c.x}px)`;
      img.style.bottom = "52px";
      img.style.transform = "translateX(-50%)";
      img.classList.remove("hidden");
    });
    return;
  }

  const slots = getAutoSlots(visible.length);

  visible.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    img.src = c.src;
    img.style.display = "block";
    img.classList.add("char");

    const left = getPositionLeftValue(slots[i]);
    img.style.left = `calc(${left}% + ${c.x}px)`;
    img.style.bottom = "52px";
    img.style.transform = "translateX(-50%)";
    img.classList.remove("hidden");
  });
}

function getAutoSlots(count) {
  if (count <= 0) return [];
  if (count === 1) return ["single"];
  if (count === 2) return ["left", "right"];
  if (count === 3) return ["left", "center", "right"];
  return ["far-left", "left", "right", "far-right"];
}

function getPositionLeftValue(position) {
  switch (position) {
    case "single":
      return 50;
    case "far-left":
      return 14;
    case "left":
      return 32;
    case "center":
      return 50;
    case "right":
      return 68;
    case "far-right":
      return 86;
    default:
      return 50;
  }
}

function wrapOneLine(rawLine, limit = 30) {
  if (!rawLine) return [""];

  const result = [];
  let current = "";

  for (const char of rawLine) {
    current += char;
    if (current.length >= limit) {
      result.push(current);
      current = "";
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function wrapTextLines(lines, limit = 30) {
  const wrappedLines = [];

  for (const rawLine of lines) {
    const chunks = wrapOneLine(String(rawLine || ""), limit);
    wrappedLines.push(...chunks);
  }

  return wrappedLines.join("\n");
}

function startTyping(lines) {
  clearTimeout(typingTimer);

  el.text.textContent = "";
  el.next.classList.remove("is-ready");

  const full = wrapTextLines(lines, 30);
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
    typingTimer = setTimeout(step, 26);
  }

  step();
}

function setupMenu() {
  if (!el.menuBtn || !el.menuPanel) return;

  el.menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    el.menuBtn.classList.toggle("open", isMenuOpen);
    el.menuPanel.classList.toggle("hidden", !isMenuOpen);
  });

  el.menuPanel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  el.backBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (index > 0) {
      index--;
      renderLine();
    }
    isMenuOpen = false;
    el.menuBtn.classList.remove("open");
    el.menuPanel.classList.add("hidden");
  });

  el.skipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    index = script.length;
    renderLine();
    isMenuOpen = false;
    el.menuBtn.classList.remove("open");
    el.menuPanel.classList.add("hidden");
  });
}

function setupEndChoice() {
  el.continueBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    alert("次の話への遷移先を設定してください");
  });

  el.finishBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    alert("終わりにした後の遷移先を設定してください");
  });

  el.endChoiceOverlay?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

function showEndChoice() {
  isEpisodeEnded = true;
  el.endChoiceOverlay?.classList.remove("hidden");
}

el.stage.addEventListener("click", () => {
  if (isMenuOpen || isEpisodeEnded) {
    return;
  }

  if (isTyping) {
    clearTimeout(typingTimer);
    el.text.textContent = currentFullText;
    isTyping = false;
    el.next.classList.add("is-ready");
    return;
  }

  index++;
  renderLine();
});
