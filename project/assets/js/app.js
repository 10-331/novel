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
  while (index < script.length && script[index]?.disabled === true) {
    index++;
  }

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
 * 略記ルール
 * "rakuro"
 * "rakuro:left"
 * "rakuro:right:x=20"
 * "aya:center"
 *
 * 無視するもの:
 * front / back / scale / y / bottom
 */
function parseCharacter(entry) {
  const parts = entry.split(":").map(v => v.trim()).filter(Boolean);
  const id = parts[0];

  const data = {
    id,
    src: CHARACTER_SOURCES[id] || "",
    visible: true,
    position: null,
    x: 0
  };

  parts.slice(1).forEach(p => {
    // 明示位置指定
    if (
      p === "left" ||
      p === "right" ||
      p === "center" ||
      p === "single" ||
      p === "far-left" ||
      p === "far-right"
    ) {
      data.position = p;
      return;
    }

    // 微調整
    if (p.startsWith("x=")) {
      data.x = Number(p.replace("x=", "")) || 0;
      return;
    }

    // 非表示
    if (p === "hide") {
      data.visible = false;
      return;
    }

    // front/back 等は仕様上無視
  });

  return data;
}

function renderCharacters(chars) {
  const visible = chars.filter(c => c && c.visible !== false && c.src);

  // 明示位置が1人でもあるなら、その指定を優先
  const hasExplicitPosition = visible.some(c => c.position);

  el.chars.forEach((img, i) => {
    img.className = "char hidden";
    img.style.display = "none";
    img.style.removeProperty("left");
    img.style.removeProperty("bottom");
    img.style.removeProperty("transform");
  });

  if (hasExplicitPosition) {
    visible.forEach((c, i) => {
      const img = el.chars[i];
      if (!img) return;

      img.src = c.src;
      img.style.display = "block";

      const left = getPositionLeftValue(c.position || "center");
      img.classList.add("char");
      img.style.left = `calc(${left}% + ${c.x}px)`;
      img.style.bottom = "52px";
      img.style.transform = "translateX(-50%)";

      img.classList.remove("hidden");
    });

    return;
  }

  // 明示位置がない場合のみ、人数ベースの自動配置
  const slots = getAutoSlots(visible.length);

  visible.forEach((c, i) => {
    const img = el.chars[i];
    if (!img) return;

    img.src = c.src;
    img.style.display = "block";

    const left = getPositionLeftValue(slots[i]);
    img.classList.add("char");
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
  if (position === "single") return 50;
  if (position === "far-left") return 14;
  if (position === "left") return 32;
  if (position === "center") return 50;
  if (position === "right") return 68;
  if (position === "far-right") return 86;
  return 50;
}

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
  renderLine();
});
