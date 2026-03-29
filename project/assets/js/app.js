// ==========================
// 要素取得
// ==========================
const el = {
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

// ==========================
// キャラ画像定義（存在する分だけ書け）
// ==========================
const CHARACTER_SOURCES = {
  aya: "./assets/images/chars/aya.png",
  rakuro: "./assets/images/chars/rakuro.png"
  // 必要に応じて追加
};

// ==========================
// 状態管理
// ==========================
let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

// ==========================
// 初期化
// ==========================
window.addEventListener("DOMContentLoaded", async () => {
  await loadScript();
  updateOrientation();
  renderLine();
});

window.addEventListener("resize", updateOrientation);

// ==========================
// JSON読み込み
// ==========================
async function loadScript() {
  const res = await fetch("./assets/data/ep01.json");
  script = await res.json();
}

// ==========================
// 画面向き制御（必要なら使え）
// ==========================
function updateOrientation() {
  if (!el.overlay) return;

  if (window.innerHeight > window.innerWidth) {
    el.overlay.classList.add("show");
  } else {
    el.overlay.classList.remove("show");
  }
}

// ==========================
// 行描画
// ==========================
function renderLine() {
  const line = script[index];
  if (!line) return;

  // 背景
  if (line.bg) {
    el.bg.src = `./assets/images/bg/${line.bg}`;
  }

  // 名前
  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  // キャラ
  const parsed = (line.chars || []).map(parseCharacter);
  renderCharacters(parsed);

  // テキスト
  startTyping(line.text || []);
}

// ==========================
// キャラ解析
// ==========================
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
    if (p === "front" || p === "back") {
      data.motion.depth = p;
      return;
    }
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

// ==========================
// キャラ描画（最大4人）
// ==========================
function renderCharacters(chars) {
  const visible = chars.filter(c => c && c.visible !== false && c.src);
  const slots = getSlots(visible.length);

  el.chars.forEach((img, i) => {
    const c = visible[i];

    img.className = "char hidden";
    img.style.display = "none";
    img.style.removeProperty("--char-scale");

    if (!c) return;

    img.src = c.src;
    img.style.display = "block";

    const slot = slots[i];
    if (slot) img.classList.add(slot);

    const motion = c.motion || {};

    // 縦位置
    const baseBottom = c.bottom ?? 0;
    img.style.bottom = `${baseBottom + (motion.y ?? 0)}px`;

    // スケール
    if (typeof motion.scale === "number") {
      img.style.setProperty("--char-scale", motion.scale);
    }

    // 前後
    if (motion.depth === "front") {
      img.classList.add("motion-front");
    } else if (motion.depth === "back") {
      img.classList.add("motion-back");
    }

    // 横位置
    const baseLeft = getSlotLeftValue(slot);
    const offsetX = motion.x ?? 0;
    img.style.left = `calc(${baseLeft}% + ${offsetX}px)`;

    img.classList.remove("hidden");
  });
}

// ==========================
// スロット
// ==========================
function getSlots(count) {
  if (count <= 0) return [];
  if (count === 1) return ["slot-single"];
  if (count === 2) return ["slot-left", "slot-right"];
  if (count === 3) return ["slot-left", "slot-center", "slot-right"];
  return ["slot-far-left", "slot-left", "slot-right", "slot-far-right"];
}

function getSlotLeftValue(slot) {
  if (slot === "slot-single") return 50;
  if (slot === "slot-far-left") return 20;
  if (slot === "slot-left") return 38;
  if (slot === "slot-center") return 50;
  if (slot === "slot-right") return 62;
  if (slot === "slot-far-right") return 80;
  return 50;
}

// ==========================
// タイプライター
// ==========================
function startTyping(lines) {
  clearTimeout(typingTimer);

  el.text.innerHTML = "";
  el.next.style.opacity = 0;

  const full = lines.join("<br>");
  currentFullText = full.replace(/<[^>]+>/g, "");

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
    typingTimer = setTimeout(step, 28);
  }

  step();
}

// ==========================
// 入力
// ==========================
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
