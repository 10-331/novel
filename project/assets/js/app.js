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
  { num: "壊生カメリア", sub: "1話" },
  { num: "壊生カメリア", sub: "2話" }
];

const el = {
  viewport: document.getElementById("gameViewport"),
  stage: document.getElementById("stage"),
  stageGradient: document.getElementById("stageGradient"),
  bgA: document.getElementById("bgA"),
  bgB: document.getElementById("bgB"),
  nameMain: document.getElementById("nameMain"),
  nameSub: document.getElementById("nameSub"),
  text: document.getElementById("text"),
  nextIndicator: document.getElementById("nextIndicator"),
  blackoutOverlay: document.getElementById("blackoutOverlay"),
  menuBtn: document.getElementById("menuBtn"),
  menuPanel: document.getElementById("menuPanel"),
  dialogueArea: document.getElementById("dialogueArea"),
  newsLayer: document.getElementById("newsLayer"),
  newsText: document.getElementById("newsText"),
  episodeOverlay: document.getElementById("episodeTitleOverlay"),
  episodeNumber: document.getElementById("episodeNumber"),
  episodeSubtitle: document.getElementById("episodeSubtitle")
};

let script = [];
let currentIndex = 0;
let isAnimating = false;

async function init() {
  // エピソード読み込み
  const res = await fetch(EPISODE_FILES[0]);
  script = await res.json();

  // リサイズ設定
  window.addEventListener("resize", handleResize);
  handleResize();

  // 初期表示
  el.stage.classList.add("is-ready");

  // クリックイベント
  el.viewport.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (isAnimating) return;
    nextStep();
  });

  // メニュー制御
  el.menuBtn.addEventListener("click", () => {
    el.menuBtn.classList.toggle("open");
    el.menuPanel.classList.toggle("hidden");
  });

  await showEpisodeTitle(0);
  updateStep();
}

function handleResize() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scale = Math.min(winW / BASE_WIDTH, winH / BASE_HEIGHT);
  el.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

async function showEpisodeTitle(index) {
  const title = EPISODE_TITLES[index];
  el.episodeNumber.innerText = title.num;
  el.episodeSubtitle.innerText = title.sub;
  el.episodeOverlay.classList.add("show");
  
  return new Promise(resolve => {
    const startHandler = () => {
      el.episodeOverlay.classList.remove("show");
      el.episodeOverlay.removeEventListener("click", startHandler);
      setTimeout(resolve, 500);
    };
    el.episodeOverlay.addEventListener("click", startHandler);
  });
}

async function nextStep() {
  if (currentIndex < script.length - 1) {
    currentIndex++;
    await updateStep();
  }
}

async function updateStep() {
  const data = script[currentIndex];
  isAnimating = true;

  // 背景更新
  if (data.bg) {
    el.bgA.src = `./assets/images/bg/${data.bg}`;
    el.bgA.classList.add("active");
  }

  // モーション実行
  if (data.motions) {
    await runMotions(data.motions, el);
  }

  // テキスト更新
  updateDialogue(data);
  isAnimating = false;
}

function updateDialogue(data) {
  const isNews = (data.speaker === "ニュースキャスター");
  const fullText = Array.isArray(data.text) ? data.text.join("\n") : data.text;

  // ニュースと通常ダイアログの切り替え
  if (isNews) {
    el.dialogueArea.classList.add("hidden");
    el.newsLayer.classList.remove("hidden");
    el.newsText.innerText = fullText;
  } else {
    el.newsLayer.classList.add("hidden");
    el.dialogueArea.classList.remove("hidden");

    el.nameMain.innerText = data.speaker || "";
    el.nameSub.innerText = data.speakerSub || "";

    // 回想モードのクラス制御（CSSに対応）
    const isFlashback = document.querySelector('.bg.flashback, .bg.flashback-sepia');
    el.nameMain.classList.toggle("is-flashback", !!isFlashback);
    el.text.classList.toggle("is-flashback", !!isFlashback);

    // [inner] タグの置換
    if (fullText.includes("[inner]")) {
      el.text.innerHTML = fullText.replace(/\[inner\]/g, '<span class="inner-voice">') + "</span>";
    } else {
      el.text.innerText = fullText;
    }
  }
}

init();
