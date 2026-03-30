export function createCharacterState() {
  return {
    active: new Map()
  };
}

export function setCharacter(state, char) {
  state.active.set(char.id, { ...char });
}

export function removeCharacter(state, id) {
  state.active.delete(id);
}

export function getCharacter(state, id) {
  return state.active.get(id) || null;
}

export function getVisibleCharacters(state) {
  return Array.from(state.active.values()).filter(c => c && c.visible !== false);
}

export function clearCharacters(state) {
  state.active.clear();
}
