import {
  createCharacterState,
  getVisibleCharacters,
  clearCharacters,
  setCharacter
} from "./characterState.js";
import { runMotions } from "./motionRunner.js";

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;

const EPISODE_FILES = [
  "./assets/data/ep01.json",
  "./assets/data/ep02.json"
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
  newsBalloon: document.getElementById("newsBalloon"),
  newsText: document.getElementById("newsText"),
  dialogueArea: document.querySelector(".dialogue-area"),
  blackoutOverlay: document.getElementById("blackoutOverlay"),
  menuBtn: document.getElementById("menuBtn"),
  menuPanel: document.getElementById("menuPanel")
};

let script = [];
let currentIndex = 0;
let isAnimating = false;

async function init() {
  const res = await fetch(EPISODE_FILES[0]);
  script = await res.json();

  window.addEventListener("resize", handleResize);
  handleResize();

  el.stage.classList.add("is-ready");

  el.viewport.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (isAnimating) return;
    nextStep();
  });

  updateStep();
}

function handleResize() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scale = Math.min(winW / BASE_WIDTH, winH / BASE_HEIGHT);
  el.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
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

  if (data.bg) {
    el.bgA.src = `./assets/images/bg/${data.bg}`;
    el.bgA.classList.add("active");
  }

  if (data.motions) {
    await runMotions(data.motions, el);
  }

  updateDialogue(data);
  isAnimating = false;
}

function updateDialogue(data) {
  const isNews = data.speaker === "ニュースキャスター";

  if (isNews) {
    el.dialogueArea.classList.add("hidden");
    el.newsBalloon.classList.remove("hidden");

    const fullText = Array.isArray(data.text) ? data.text.join("\n") : data.text;
    el.newsText.innerText = fullText;
  } else {
    el.newsBalloon.classList.add("hidden");
    el.dialogueArea.classList.remove("hidden");

    el.nameMain.innerText = data.speaker || "";
    el.nameSub.innerText = data.speakerSub || "";

    const fullText = Array.isArray(data.text) ? data.text.join("\n") : data.text;
    el.text.innerText = fullText;
    
    if (fullText.includes("[inner]")) {
      el.text.innerHTML = fullText.replace(/\[inner\]/g, '<span class="inner-voice">') + "</span>";
    }
  }
}

init();
