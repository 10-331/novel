import {
  setCharacter,
  removeCharacter,
  getCharacter,
  getVisibleCharacters
} from "./characterState.js";
import { MOTION_PRESETS } from "./motionPresets.js";

export async function runMotions({
  motions,
  state,
  renderCharacters,
  moveCharacters,
  parseCharacter,
  wait,
  token,
  getToken
}) {
  for (const motion of motions) {
    if (token !== getToken()) return;
    if (!motion || !motion.type) continue;

    switch (motion.type) {
      case "preset": {
        const presetFn = MOTION_PRESETS[motion.name];
        if (!presetFn) {
          console.warn(`Unknown motion preset: ${motion.name}`);
          break;
        }

        const expanded = presetFn(motion.params || {});
        await runMotions({
          motions: expanded,
          state,
          renderCharacters,
          moveCharacters,
          parseCharacter,
          wait,
          token,
          getToken
        });
        break;
      }

      case "enter": {
        const fadeIds = [];

        for (const t of motion.targets || []) {
          const parts = [t.id, t.to || "center"];

          if (t.x !== undefined) parts.push(`x=${t.x}`);
          if (t.y !== undefined) parts.push(`y=${t.y}`);
          if (t.scale !== undefined) parts.push(`scale=${t.scale}`);

          const parsed = parseCharacter(parts.join(":"));
          setCharacter(state, parsed);
          fadeIds.push(t.id);
        }

        renderCharacters(getVisibleCharacters(state), { fadeIds });
        await wait(motion.duration || 800);
        break;
      }

      case "move": {
        for (const t of motion.targets || []) {
          const current = getCharacter(state, t.id);
          if (!current) continue;

          setCharacter(state, {
            ...current,
            position: t.to ?? current.position,
            x: t.x ?? current.x,
            y: t.y ?? current.y,
            scale: t.scale ?? current.scale
          });
        }

        moveCharacters(getVisibleCharacters(state));
        await wait(motion.duration || 400);
        break;
      }

      case "exit": {
        renderCharacters(getVisibleCharacters(state), {
          exitIds: motion.targets || []
        });

        await wait(motion.duration || 600);

        for (const id of motion.targets || []) {
          removeCharacter(state, id);
        }
        break;
      }

      case "wait":
        await wait(motion.duration || 300);
        break;

      default:
        console.warn(`Unknown motion type: ${motion.type}`);
        break;
    }
  }
}

case "flashback":
  await playFlashback(motion.bg);
  break;

case "flashbackEnd":
  await endFlashback();
  break;
