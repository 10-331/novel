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
  parseCharacter,
  wait,
  token,
  getToken
}) {
  if (!Array.isArray(motions) || motions.length === 0) return;

  for (const motion of motions) {
    if (token !== getToken()) return;

    if (!motion || !motion.type) continue;

    switch (motion.type) {
      case "wait":
        await wait(motion.duration || 0);
        break;

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
          parseCharacter,
          wait,
          token,
          getToken
        });
        break;
      }

      case "enter":
        await runEnterMotion({
          motion,
          state,
          renderCharacters,
          parseCharacter,
          wait,
          token,
          getToken
        });
        break;

      case "move":
        await runMoveMotion({
          motion,
          state,
          renderCharacters,
          wait,
          token,
          getToken
        });
        break;

      case "exit":
        await runExitMotion({
          motion,
          state,
          renderCharacters,
          wait,
          token,
          getToken
        });
        break;

      default:
        console.warn(`Unknown motion type: ${motion.type}`);
        break;
    }
  }
}

async function runEnterMotion({
  motion,
  state,
  renderCharacters,
  parseCharacter,
  wait,
  token,
  getToken
}) {
  const targets = Array.isArray(motion.targets) ? motion.targets : [];
  const fadeIds = [];

  for (const target of targets) {
    if (!target?.id) continue;

    const parts = [target.id];

    if (target.to) parts.push(target.to);
    if (target.x !== undefined) parts.push(`x=${target.x}`);
    if (target.y !== undefined) parts.push(`y=${target.y}`);

    const parsed = parseCharacter(parts.join(":"));
    setCharacter(state, parsed);
    fadeIds.push(target.id);
  }

  renderCharacters(getVisibleCharacters(state), { fadeIds });

  await wait(motion.duration || 1000);
  if (token !== getToken()) return;
}

async function runMoveMotion({
  motion,
  state,
  renderCharacters,
  wait,
  token,
  getToken
}) {
  const targets = Array.isArray(motion.targets) ? motion.targets : [];

  for (const target of targets) {
    if (!target?.id) continue;

    const current = getCharacter(state, target.id);
    if (!current) continue;

    setCharacter(state, {
      ...current,
      position: target.to ?? current.position,
      x: target.x ?? current.x,
      y: target.y ?? current.y,
      visible: true
    });
  }

  renderCharacters(getVisibleCharacters(state));
  await wait(motion.duration || 500);
  if (token !== getToken()) return;
}

async function runExitMotion({
  motion,
  state,
  renderCharacters,
  wait,
  token,
  getToken
}) {
  const ids = Array.isArray(motion.targets) ? motion.targets : [];

  renderCharacters(getVisibleCharacters(state), { exitIds: ids });
  await wait(motion.duration || 700);
  if (token !== getToken()) return;

  for (const id of ids) {
    removeCharacter(state, id);
  }

  renderCharacters(getVisibleCharacters(state));
}
