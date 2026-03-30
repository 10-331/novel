import { MOTION_PRESETS } from "./motionPresets.js";
import { setCharacter, removeCharacter, getCharacter, getVisibleCharacters } from "./characterState.js";

export async function runMotions({
  motions,
  token,
  getToken,
  state,
  renderCharacters,
  parseCharacter,
  wait
}) {
  for (const motion of motions) {
    if (token !== getToken()) return;

    if (motion.type === "wait") {
      await wait(motion.duration || 0);
      continue;
    }

    if (motion.type === "preset") {
      const preset = MOTION_PRESETS[motion.name];
      if (!preset) continue;
      const expanded = preset(motion.params || {});
      await runMotions({ motions: expanded, token, getToken, state, renderCharacters, parseCharacter, wait });
      continue;
    }

    if (motion.type === "enter") {
      for (const target of motion.targets || []) {
        const parsed = parseCharacter(`${target.id}:${target.to || "center"}${target.x ? `:x=${target.x}` : ""}${target.y ? `:y=${target.y}` : ""}`);
        setCharacter(state, parsed);
      }

      renderCharacters(getVisibleCharacters(state), { fadeIds: (motion.targets || []).map(t => t.id) });
      await wait(motion.duration || 1000);
      continue;
    }

    if (motion.type === "move") {
      for (const target of motion.targets || []) {
        const current = getCharacter(state, target.id);
        if (!current) continue;
        setCharacter(state, {
          ...current,
          position: target.to ?? current.position,
          x: target.x ?? current.x,
          y: target.y ?? current.y
        });
      }

      renderCharacters(getVisibleCharacters(state));
      await wait(motion.duration || 500);
      continue;
    }

    if (motion.type === "exit") {
      const ids = motion.targets || [];
      renderCharacters(getVisibleCharacters(state), { exitIds: ids });

      await wait(motion.duration || 700);

      for (const id of ids) {
        removeCharacter(state, id);
      }

      renderCharacters(getVisibleCharacters(state));
    }
  }
}