// ===== Progresso / Storage =====
const GAME_KEYS = {
  unlockedLevel: "unlockedLevel",
};

function getUnlockedLevel() {
  const raw = localStorage.getItem(GAME_KEYS.unlockedLevel);
  const n = parseInt(raw || "1", 10);
  return Number.isNaN(n) ? 1 : n;
}

function setUnlockedLevel(level) {
  localStorage.setItem(GAME_KEYS.unlockedLevel, String(level));
}

function unlockLevel(level) {
  const current = getUnlockedLevel();
  if (level > current) setUnlockedLevel(level);
}

function isUnlockedLevel(level) {
  return getUnlockedLevel() >= level;
}

function resetProgress() {
  setUnlockedLevel(1);
}

// ===== Guard (protege páginas) =====
function requireUnlockedLevel(requiredLevel, redirectPath) {
  const unlocked = getUnlockedLevel();
  if (unlocked < requiredLevel) window.location.href = redirectPath;
}

// expor no window para poderes chamar no HTML
window.getUnlockedLevel = getUnlockedLevel;
window.setUnlockedLevel = setUnlockedLevel;
window.unlockLevel = unlockLevel;
window.isUnlockedLevel = isUnlockedLevel;
window.resetProgress = resetProgress;
window.requireUnlockedLevel = requireUnlockedLevel;