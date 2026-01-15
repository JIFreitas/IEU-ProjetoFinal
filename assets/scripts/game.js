// ===== Progresso / Storage =====
const GAME_KEYS = {
  unlockedLevel: "unlockedLevel",
};

function getUnlockedLevel() {
  const storedValue = localStorage.getItem(GAME_KEYS.unlockedLevel);
  const parsedLevel = parseInt(storedValue || "1", 10);
  return Number.isNaN(parsedLevel) ? 1 : parsedLevel;
}

function setUnlockedLevel(level) {
  localStorage.setItem(GAME_KEYS.unlockedLevel, String(level));
}

function unlockLevel(level) {
  const currentUnlockedLevel = getUnlockedLevel();
  if (level > currentUnlockedLevel) setUnlockedLevel(level);
}

function isUnlockedLevel(level) {
  return getUnlockedLevel() >= level;
}

function resetProgress() {
  setUnlockedLevel(1);
}

// ===== Guard (protege páginas) =====
function requireUnlockedLevel(requiredLevel, redirectPath) {
  const currentUnlockedLevel = getUnlockedLevel();
  if (currentUnlockedLevel < requiredLevel) window.location.href = redirectPath;
}

// Expor no window para chamar no HTML
window.getUnlockedLevel = getUnlockedLevel;
window.setUnlockedLevel = setUnlockedLevel;
window.unlockLevel = unlockLevel;
window.isUnlockedLevel = isUnlockedLevel;
window.resetProgress = resetProgress;
window.requireUnlockedLevel = requireUnlockedLevel;