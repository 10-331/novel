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

const EPISODE_FILES = [
  "./assets/data/ep01.json",
  "./assets/data/ep02.json"
];

const EPISODE_TITLES = [
  { num: "第一話", sub: "タイトル" },
  { num: "第二話", sub: "タイトル" }
];

function setupMenu(){
  el.menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    el.menuPanel.classList.toggle("hidden");
  });

  el.menuPanel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    el.menuPanel.classList.add("hidden");
  });

  // 戻る
  el.backBtn.addEventListener("click", () => {
    el.menuPanel.classList.add("hidden");
  });

  // スキップ（次の話へ）
  el.skipBtn.addEventListener("click", async () => {
    el.menuPanel.classList.add("hidden");
    await skipToNextEpisode();
  });
}

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

  episodeOverlay: document.getElementById("episodeTitleOverlay"),
  episodeNumber: document.getElementById("episodeNumber"),
  episodeSubtitle: document.getElementById("episodeSubtitle"),

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

const imageCache = new Map();
const characterState = createCharacterState();

let currentEpisode = 0;
let script = [];
let index = 0;

let isTyping = false;
let typingTimer = null;
let currentFullText = "";

let currentBg = "placeholder.jpg";
let prevBg = null;
let currentDisplayedBg = "";
let activeBg = "A";

let isFlashbackActive = false;
let isMotionPlaying = false;
let isOrientationReady = false;

let isMenuOpen = false;
let isEpisodeEnded = false;
let isEpisodeTransitioning = false;
let isWaitingEpisodeOverlay = false;

let skipAdvanceUntil = 0;
let lineRenderToken = 0;

const flashOverlay = document.getElementById("flashOverlay");
const flashFrame = document.getElementById("flashFrame");

function showEpisodeTitle(epIndex) {
  const data = EPISODE_TITLES[epIndex] || { num: "", sub: "" };

  if (!el.episodeOverlay) return;

  el.episodeNumber.textContent = data.num;
  el.episodeSubtitle.textContent = data.sub;

  isWaitingEpisodeOverlay = true;

  el.episodeOverlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    el.episodeOverlay.classList.add("show");
  });
}

function hideEpisodeTitle() {
  if (!el.episodeOverlay) return;

  el.episodeOverlay.classList.remove("show");

  setTimeout(() => {
    el.episodeOverlay.classList.add("hidden");
  }, 400);
}

function setupEpisodeOverlay() {
  if (!el.episodeOverlay) return;

el.skipBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();

  isMenuOpen = false;
  el.menuBtn.classList.remove("open");
  el.menuPanel.classList.add("hidden");

  await goToNextEpisodeOrEnd();
});

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

function changeBackground(src, immediate = false) {
  if (!el.bgA || !el.bgB) return;
  if (!src) return;

  const current = activeBg === "A" ? el.bgA : el.bgB;
  const next = activeBg === "A" ? el.bgB : el.bgA;

  if (!currentDisplayedBg) {
    currentDisplayedBg = src;
    current.src = src;
    current.classList.add("active");
    next.classList.remove("active");
    return;
  }

  if (currentDisplayedBg === src) {
    current.classList.add("active");
    next.classList.remove("active");
    return;
  }

  next.src = src;
  currentDisplayedBg = src;

  if (immediate) {
    next.classList.add("active");
    current.classList.remove("active");
    activeBg = activeBg === "A" ? "B" : "A";
    return;
  }

  next.classList.remove("active");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add("active");
      current.classList.remove("active");
      activeBg = activeBg === "A" ? "B" : "A";
    });
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await preloadCharacterImages();
    await loadEpisode(currentEpisode);
    fitStage();
    updateOrientation();
    setupMenu();
    setupEndChoice();
    setupEpisodeOverlay();

    if (window.innerHeight > window.innerWidth) {
      return;
    }

    await startGame();
  } catch (err) {
    console.error(err);
    alert("シナリオの読み込みに失敗しました");
  }
});

window.addEventListener("resize", () => {
  fitStage();
  updateOrientation();

  if (!isOrientationReady && window.innerWidth > window.innerHeight) {
    startGame();
  }
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    fitStage();
    updateOrientation();

    if (!isOrientationReady && window.innerWidth > window.innerHeight) {
      startGame();
    }
  }, 200);
});

async function startGame() {
  if (isOrientationReady) return;
  isOrientationReady = true;

  const firstLine = script[0];
  if (firstLine?.bg) {
    currentBg = firstLine.bg;
  }

  setFlashbackMode(false);
  changeBackground(`./assets/images/bg/${currentBg}`, true);

  el.stage?.classList.add("is-ready");
  showEpisodeTitle(currentEpisode);
}

async function loadEpisode(episodeIndex) {
  const file = EPISODE_FILES[episodeIndex];
  if (!file) {
    throw new Error(`Episode file not found: ${episodeIndex}`);
  }

  const res = await fetch(file);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  script = await res.json();
  currentEpisode = episodeIndex;
  index = 0;

  clearTimeout(typingTimer);
  isTyping = false;
  currentFullText = "";

  currentBg = script[0]?.bg || "placeholder.jpg";
  prevBg = null;
  isFlashbackActive = false;
  isEpisodeEnded = false;
  isEpisodeTransitioning = false;
  skipAdvanceUntil = 0;
  lineRenderToken++;

  clearCharacters(characterState);
  renderCharacters([]);
  setFlashbackMode(false);

  el.text.textContent = "";
  el.nameMain.textContent = "";
  el.nameSub.textContent = "";
  el.next.classList.remove("is-ready");
  el.endChoiceOverlay?.classList.add("hidden");

  changeBackground(`./assets/images/bg/${currentBg}`, true);
}

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
  if (el.bgA) el.bgA.classList.toggle("flashback", isOn);
  if (el.bgB) el.bgB.classList.toggle("flashback", isOn);

  if (el.stageGradient) {
    el.stageGradient.classList.toggle("white", isOn);
    el.stageGradient.classList.toggle("black", !isOn);
  }

  if (el.nameRow) el.nameRow.classList.toggle("is-flashback", isOn);
  if (el.lineImage) el.lineImage.classList.toggle("is-flashback", isOn);
  if (el.textRow) el.textRow.classList.toggle("is-flashback", isOn);
  if (el.text) el.text.classList.toggle("is-flashback", isOn);
  if (el.nameMain) el.nameMain.classList.toggle("is-flashback", isOn);
  if (el.nameSub) el.nameSub.classList.toggle("is-flashback", isOn);
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

  [el.nameRow, el.lineImage, el.textRow].forEach((node) => {
    if (!node) return;
    node.classList.remove("ui-fade-in");
  });

  if (index >= script.length) {
    await goToNextEpisodeOrEnd();
    return;
  }

  const line = script[index];

  if (line.bg) currentBg = line.bg;

  if (!isFlashbackActive) {
    changeBackground(`./assets/images/bg/${currentBg}`);
  }

  const hadCharactersBefore = getVisibleCharacters(characterState).length > 0;
  let usedMotions = false;

  if (Array.isArray(line.motions) && line.motions.length > 0) {
    usedMotions = true;
    isMotionPlaying = true;

    try {
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
    } finally {
      isMotionPlaying = false;
    }

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

  const shouldFadeUi = usedMotions && !hadCharactersBefore;

  el.nameMain.textContent = line.speaker || "";
  el.nameSub.textContent = line.speakerSub || "";

  if (shouldFadeUi) {
    [el.nameRow, el.lineImage, el.textRow].forEach((node) => {
      if (!node) return;
      node.classList.remove("ui-fade-in");
      void node.offsetWidth;
      node.classList.add("ui-fade-in");
    });
  }

  startTyping(Array.isArray(line.text) ? line.text : [line.text || ""]);
}

async function goToNextEpisodeOrEnd() {
  if (isEpisodeTransitioning) return;
  isEpisodeTransitioning = true;

  clearTimeout(typingTimer);
  isTyping = false;
  el.next.classList.remove("is-ready");

  const nextEpisode = currentEpisode + 1;

  if (nextEpisode < EPISODE_FILES.length) {
    await loadEpisode(nextEpisode);
    showEpisodeTitle(nextEpisode);
    return;
  }

  clearCharacters(characterState);
  renderCharacters([]);
  showEndChoice();
}

function parseCharacter(entry) {
  const parts = String(entry).split(":").map((v) => v.trim()).filter(Boolean);
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
    if (["left", "right", "center", "single", "far-left", "far-right"].includes(p)) {
      data.position = p;
    } else if (p.startsWith("x=")) {
      data.x = Number(p.replace("x=", "")) || 0;
    } else if (p.startsWith("y=")) {
      data.y = Number(p.replace("y=", "")) || 0;
    } else if (p.startsWith("scale=")) {
      data.scale = Number(p.replace("scale=", "")) || 1;
    } else if (p === "hide") {
      data.visible = false;
    }
  }

  return data;
}

function renderCharacters(chars, options = {}) {
  const { fadeIds = [], exitIds = [] } = options;

  const visible = chars.filter((c) => c && c.visible !== false && c.src);
  const hasExplicitPosition = visible.some((c) => c.position);
  const slots = hasExplicitPosition ? [] : getAutoSlots(visible.length);

  Object.entries(charMap).forEach(([id, img]) => {
    if (!img) return;

    const isStillUsed = visible.some((c) => c.id === id);

    if (!isStillUsed && !exitIds.includes(id)) {
      img.style.display = "none";
      img.classList.add("hidden");
      img.classList.remove("fade-in", "fade-out");
      img.style.opacity = "";
    }
  });

  visible.forEach((c, i) => {
    const img = charMap[c.id];
    if (!img) return;

    const pos = hasExplicitPosition ? (c.position || "center") : slots[i];

    img.src = c.src;
    img.style.display = "block";

    const left = getPositionLeftValue(pos);
    img.style.left = `calc(${left}% + ${c.x}px)`;
    img.style.bottom = `${CHARACTER_BOTTOM + (c.y || 0)}px`;
    img.style.setProperty("--char-scale", c.scale || 1);

    img.classList.remove("hidden");
    img.style.setProperty("--char-fade-duration", "1000ms");

    if (fadeIds.includes(c.id)) {
      img.classList.remove("fade-in", "fade-out");
      img.style.opacity = "0";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          img.classList.add("fade-in");
          img.style.opacity = "";
        });
      });
    } else if (!exitIds.includes(c.id)) {
      img.classList.remove("fade-in", "fade-out");
      img.style.opacity = "";
    }

    if (exitIds.includes(c.id)) {
      img.classList.remove("fade-in", "fade-out");
      void img.offsetWidth;
      img.classList.add("fade-out");
    }
  });
}

function moveCharacters(chars) {
  const visible = chars.filter((c) => c && c.visible !== false && c.src);
  const hasExplicitPosition = visible.some((c) => c.position);
  const slots = hasExplicitPosition ? [] : getAutoSlots(visible.length);

  visible.forEach((c, i) => {
    const img = charMap[c.id];
    if (!img) return;

    const pos = hasExplicitPosition ? (c.position || "center") : slots[i];
    const left = getPositionLeftValue(pos);

    img.classList.remove("fade-in", "fade-out");
    img.style.opacity = "";
    img.style.display = "block";
    img.src = c.src;
    img.style.left = `calc(${left}% + ${c.x}px)`;
    img.style.bottom = `${CHARACTER_BOTTOM + (c.y || 0)}px`;
    img.style.setProperty("--char-scale", c.scale || 1);
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
    case "single": return 50;
    case "far-left": return 14;
    case "left": return 37;
    case "center": return 50;
    case "right": return 65;
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

    el.text.textContent += full[i];
    i++;
    typingTimer = setTimeout(step, 35);
  }

  step();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupMenu() {
  if (!el.menuBtn || !el.menuPanel) return;

  el.menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    el.menuBtn.classList.toggle("open", isMenuOpen);
    el.menuPanel.classList.toggle("hidden", !isMenuOpen);
  });

  el.menuPanel?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  el.backBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();

    if (index > 0) {
      index--;
      clearCharacters(characterState);
      currentBg = "placeholder.jpg";
      prevBg = null;
      isFlashbackActive = false;
      setFlashbackMode(false);
      lineRenderToken++;

      const targetIndex = index;
      index = 0;
      isEpisodeEnded = false;

      while (index < targetIndex) {
        await renderLineWithoutTyping();
        index++;
      }

      await renderLine();
    }

    isMenuOpen = false;
    el.menuBtn.classList.remove("open");
    el.menuPanel.classList.add("hidden");
  });

  el.skipBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    index = script.length;
    await renderLine();
    isMenuOpen = false;
    el.menuBtn.classList.remove("open");
    el.menuPanel.classList.add("hidden");
  });
}

async function renderLineWithoutTyping() {
  const token = ++lineRenderToken;

  if (index >= script.length) return;

  const line = script[index];

  if (line.bg) currentBg = line.bg;

  if (!isFlashbackActive) {
    changeBackground(`./assets/images/bg/${currentBg}`);
  }

  if (Array.isArray(line.motions) && line.motions.length > 0) {
    isMotionPlaying = true;

    try {
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
    } finally {
      isMotionPlaying = false;
    }

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
}

function setupEndChoice() {
  el.continueBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    el.endChoiceOverlay?.classList.add("hidden");
    isEpisodeEnded = false;
  });

  el.finishBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    el.endChoiceOverlay?.classList.add("hidden");
    isEpisodeEnded = true;
  });

  el.endChoiceOverlay?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

function showEndChoice() {
  isEpisodeEnded = true;
  el.endChoiceOverlay?.classList.remove("hidden");
}

el.stage.addEventListener("click", async () => {
  if (
    !isOrientationReady ||
    isMenuOpen ||
    isEpisodeEnded ||
    isMotionPlaying ||
    isEpisodeTransitioning ||
    isWaitingEpisodeOverlay
  ) return;

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
  await renderLine();
});

async function playFlashback(bgName) {
  if (!flashOverlay || !flashFrame) return;

  flashOverlay.classList.add("active");
  await wait(300);

  prevBg = currentBg;
  isFlashbackActive = true;

  setFlashbackMode(true);
  changeBackground(`./assets/images/bg/${bgName}`);
  flashFrame.classList.add("active");

  flashOverlay.classList.remove("active");
  await wait(300);
}

async function endFlashback() {
  if (!flashOverlay || !flashFrame) return;

  flashOverlay.classList.add("active");
  await wait(300);

  isFlashbackActive = false;
  setFlashbackMode(false);
  changeBackground(`./assets/images/bg/${prevBg || currentBg}`);
  flashFrame.classList.remove("active");

  flashOverlay.classList.remove("active");
  await wait(300);
}
