export function createCharacterState() {
  return {
    active: new Map(),   // id -> { id, position, x, y, visible, src }
    previousKeys: []
  };
}

export function setCharacter(state, char) {
  state.active.set(char.id, { ...char });
}

export function removeCharacter(state, id) {
  state.active.delete(id);
}

export function getCharacter(state, id) {
  return state.active.get(id);
}

export function getVisibleCharacters(state) {
  return [...state.active.values()].filter(c => c.visible !== false);
}

export function clearCharacters(state) {
  state.active.clear();
}