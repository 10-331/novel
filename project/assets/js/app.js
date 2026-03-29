const STORY_PATH = "./stories/ep01.json";

const state = {
  story: [],
  index: 0,
  isTyping: false,
  isLineComplete: false,
  isAutoSkip: false,
  typeSpeed: 28,
  typingTimer: null,
  tokens: [],
  currentTokenIndex: 0
};

const el = {
  bgImage: document.getElementById("bgImage"),
  charLeft: document.getElementById("charLeft"),
  charRight: document.getElementById("charRight"),
  speakerJa: document.getElementById("speakerJa"),
  speakerEn: document.getElementById("speakerEn"),
  dialogueText: document.getElementById("dialogueText"),
  nextBtn: document.getElementById("nextBtn"),
  tapZone: document.getElementById("tapZone"),
  menuBtn: document.getElementById("menuBtn"),
  menuPanel: document.getElementById("menuPanel"),
  menuClose: document.getElementById("menuClose"),
  skipToggle: document.getElementById("skipToggle"),
  speedRange: document.getElementById("speedRange"),
  restartBtn: document.getElementById("restartBtn"),
  skipBanner: document.getElementById("skipBanner"),
  episodeEnd: document.getElementById("episodeEnd"),
  readNextBtn: document.getElementById("readNextBtn"),
  closeStoryBtn: document.getElementById("closeStoryBtn")
};

async function init() {
  try {
    const res = await fetch(STORY_PATH);
    state.story = await res.json();
    bindEvents();
    renderLine();
  } catch (error) {
    console.error("ストーリー読込失敗:", error);
    el.dialogueText.textContent = "ストーリーの読み込みに失敗しました。";
  }
}

function bindEvents() {
  el.tapZone.addEventListener("click", handleTap);
  el.menuBtn.addEventListener("click", () => {
    el.menuPanel.classList.remove("hidden");
  });
  el.menuClose.addEventListener("click", () => {
    el.menuPanel.classList.add("hidden");
  });

  el.skipToggle.addEventListener("change", (e) => {
    state.isAutoSkip = e.target.checked;
    el.skipBanner.classList.toggle("hidden", !state.isAutoSkip);

    if (state.isAutoSkip && state.isLineComplete) {
      proceedToNext();
    }
  });

  el.speedRange.addEventListener("input", (e) => {
    state.typeSpeed = Number(e.target.value);
  });

  el.restartBtn.addEventListener("click", () => {
    clearTyping();
    state.index = 0;
    el.episodeEnd.classList.add("hidden");
    el.menuPanel.classList.add("hidden");
    renderLine();
  });

  el.readNextBtn.addEventListener("click", () => {
    alert("ここは次話読込処理に差し替え。今は試作なのでアラート。");
  });

  el.closeStoryBtn.addEventListener("click", () => {
    el.episodeEnd.classList.add("hidden");
  });
}

function handleTap() {
  if (el.menuPanel && !el.menuPanel.classList.contains("hidden")) return;
  if (el.episodeEnd && !el.episodeEnd.classList.contains("hidden")) return;

  if (state.isTyping) {
    completeCurrentLine();
    return;
  }

  if (state.isLineComplete) {
    proceedToNext();
  }
}

function proceedToNext() {
  state.index += 1;

  if (state.index >= state.story.length) {
    showEpisodeEnd();
    return;
  }

  renderLine();
}

function showEpisodeEnd() {
  clearTyping();
  state.isTyping = false;
  state.isLineComplete = false;
  el.nextBtn.classList.add("hidden");
  el.episodeEnd.classList.remove("hidden");
}

function renderLine() {
  clearTyping();

  const line = state.story[state.index];
  if (!line) return;

  applyScene(line);
  applySpeaker(line);

  state.tokens = tokenizeRichText(line.text || "");
  state.currentTokenIndex = 0;
  state.isTyping = true;
  state.isLineComplete = false;

  el.dialogueText.innerHTML = "";
  el.nextBtn.classList.add("hidden");

  typeNextToken();
}

function applyScene(line) {
  if (line.bg) {
    el.bgImage.src = line.bg;
  }

  const left = line.characters?.find(c => c.position === "left");
  const right = line.characters?.find(c => c.position === "right");

  if (left) {
    el.charLeft.src = left.src;
    el.charLeft.style.display = left.visible === false ? "none" : "block";
  } else {
    el.charLeft.style.display = "none";
  }

  if (right) {
    el.charRight.src = right.src;
    el.charRight.style.display = right.visible === false ? "none" : "block";
  } else {
    el.charRight.style.display = "none";
  }

  el.charLeft.classList.remove("is-active");
  el.charRight.classList.remove("is-active");

  if (line.activeSide === "left") {
    el.charLeft.classList.add("is-active");
  } else if (line.activeSide === "right") {
    el.charRight.classList.add("is-active");
  }
}

function applySpeaker(line) {
  el.speakerJa.textContent = line.speaker || "";
  el.speakerEn.textContent = line.speakerSub || "";
}

function typeNextToken() {
  if (state.currentTokenIndex >= state.tokens.length) {
    finishTyping();
    return;
  }

  const token = state.tokens[state.currentTokenIndex];
  appendToken(token);
  state.currentTokenIndex += 1;

  state.typingTimer = setTimeout(typeNextToken, state.typeSpeed);
}

function appendToken(token) {
  const span = document.createElement("span");
  span.className = `tx ${token.fontClass || ""}`;
  span.textContent = token.char;

  if (token.color) {
    span.style.color = token.color;
  }

  if (token.scale) {
    span.style.fontSize = `${token.scale}em`;
  }

  el.dialogueText.appendChild(span);
}

function completeCurrentLine() {
  clearTyping();
  el.dialogueText.innerHTML = "";

  for (const token of state.tokens) {
    appendToken(token);
  }

  finishTyping();
}

function finishTyping() {
  state.isTyping = false;
  state.isLineComplete = true;
  el.nextBtn.classList.remove("hidden");

  if (state.isAutoSkip) {
    setTimeout(() => {
      if (state.isLineComplete) {
        proceedToNext();
      }
    }, 450);
  }
}

function clearTyping() {
  if (state.typingTimer) {
    clearTimeout(state.typingTimer);
    state.typingTimer = null;
  }
}

function tokenizeRichText(input) {
  const tokens = [];
  const stack = [{
    color: null,
    scale: 1,
    fontClass: ""
  }];

  let i = 0;

  while (i < input.length) {
    if (input[i] === "<") {
      const closeIndex = input.indexOf(">", i);
      if (closeIndex !== -1) {
        const tagContent = input.slice(i + 1, closeIndex).trim();

        if (tagContent.startsWith("color=")) {
          const color = tagContent.replace("color=", "").replace(/['"]/g, "");
          const prev = stack[stack.length - 1];
          stack.push({ ...prev, color });
          i = closeIndex + 1;
          continue;
        }

        if (tagContent === "/color") {
          if (stack.length > 1) stack.pop();
          i = closeIndex + 1;
          continue;
        }

        if (tagContent.startsWith("size=")) {
          const sizeValue = parseFloat(tagContent.replace("size=", "").replace(/['"]/g, "")) || 1;
          const prev = stack[stack.length - 1];
          stack.push({ ...prev, scale: sizeValue });
          i = closeIndex + 1;
          continue;
        }

        if (tagContent === "/size") {
          if (stack.length > 1) stack.pop();
          i = closeIndex + 1;
          continue;
        }

        if (tagContent.startsWith("font=")) {
          const fontValue = tagContent.replace("font=", "").replace(/['"]/g, "");
          const prev = stack[stack.length - 1];
          let fontClass = "";

          if (fontValue === "serif") fontClass = "font-serif";
          if (fontValue === "sans") fontClass = "font-sans";

          stack.push({ ...prev, fontClass });
          i = closeIndex + 1;
          continue;
        }

        if (tagContent === "/font") {
          if (stack.length > 1) stack.pop();
          i = closeIndex + 1;
          continue;
        }
      }
    }

    const style = stack[stack.length - 1];
    tokens.push({
      char: input[i],
      color: style.color,
      scale: style.scale,
      fontClass: style.fontClass
    });
    i += 1;
  }

  return tokens;
}

init();