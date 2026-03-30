import {
  setCharacter,
  removeCharacter,
  getCharacter,
  getVisibleCharacters
} from "./characterState.js";

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

    switch (motion.type) {

      case "enter": {
        const fadeIds = [];

        for (const t of motion.targets) {
          const parsed = parseCharacter(`${t.id}:${t.to}`);
          setCharacter(state, parsed);
          fadeIds.push(t.id);
        }

        renderCharacters(getVisibleCharacters(state), { fadeIds });
        await wait(motion.duration || 800);
        break;
      }

      case "move": {
        for (const t of motion.targets) {
          const current = getCharacter(state, t.id);
          if (!current) continue;

          setCharacter(state, {
            ...current,
            position: t.to
          });
        }

        moveCharacters(getVisibleCharacters(state));
        await wait(motion.duration || 400);
        break;
      }

      case "exit": {
        renderCharacters(getVisibleCharacters(state), {
          exitIds: motion.targets
        });

        await wait(motion.duration || 600);

        motion.targets.forEach(id => removeCharacter(state, id));
        break;
      }

      case "wait":
        await wait(motion.duration || 300);
        break;
    }
  }
}
