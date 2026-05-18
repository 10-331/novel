const STORIES_PATH = "./assets/data/stories.json";
const READ_KEY = "novel.readEpisodes.v1";

const mount = document.getElementById("storyMount");

function getReadEpisodes() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
}

function isEpisodeUnlocked(episode, readEpisodes) {
  if (episode.open === true) return true;
  if (!episode.unlockAfter) return true;
  return readEpisodes.includes(episode.unlockAfter);
}

function createEpisodeLink(episode, unlocked, readEpisodes) {
  const a = document.createElement("a");
  a.className = `episode${unlocked ? "" : " locked"}`;
  a.href = unlocked ? `./player.html?episode=${encodeURIComponent(episode.id)}` : "#";

  const main = document.createElement("div");
  main.className = "ep-main";

  const title = document.createElement("div");
  title.className = "ep-title";
  title.textContent = episode.title || episode.id;

  const sub = document.createElement("div");
  sub.className = "ep-sub";
  sub.textContent = episode.subtitle || episode.mode || "";

  main.append(title, sub);

  const status = document.createElement("div");
  status.className = "ep-status";

  if (!unlocked) {
    status.textContent = "LOCKED";
  } else if (readEpisodes.includes(episode.id)) {
    status.textContent = "READ";
  } else {
    status.textContent = "NEW";
  }

  a.append(main, status);
  return a;
}

function renderStories(data) {
  const readEpisodes = getReadEpisodes();

  mount.innerHTML = "";

  for (const story of data.stories || []) {
    const storyBlock = document.createElement("section");
    storyBlock.className = "story-block";

    const storyTitle = document.createElement("h2");
    storyTitle.className = "story-title";
    storyTitle.textContent = story.title || story.id;

    storyBlock.appendChild(storyTitle);

    for (const chapter of story.chapters || []) {
      const chapterBlock = document.createElement("section");
      chapterBlock.className = "chapter";

      const chapterTitle = document.createElement("h3");
      chapterTitle.className = "chapter-title";
      chapterTitle.textContent = chapter.title || chapter.id;

      const list = document.createElement("div");
      list.className = "episode-list";

      for (const episode of chapter.episodes || []) {
        const unlocked = isEpisodeUnlocked(episode, readEpisodes);
        list.appendChild(createEpisodeLink(episode, unlocked, readEpisodes));
      }

      chapterBlock.append(chapterTitle, list);
      storyBlock.appendChild(chapterBlock);
    }

    mount.appendChild(storyBlock);
  }
}

async function init() {
  try {
    const res = await fetch(STORIES_PATH);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    renderStories(data);
  } catch (error) {
    console.error(error);
    mount.innerHTML = `<p class="empty">ストーリー情報の読み込みに失敗しました。</p>`;
  }
}

init();
