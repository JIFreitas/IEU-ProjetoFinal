// ---------- Settings ----------
const SETTINGS_KEYS = {
  musicEnabled: "musicEnabled",
  musicVolume: "musicVolume",
};

function getMusicEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.musicEnabled) !== "false";
}

function setMusicEnabled(val) {
  localStorage.setItem(SETTINGS_KEYS.musicEnabled, String(val));
}

function getMusicVolume() {
  return parseInt(localStorage.getItem(SETTINGS_KEYS.musicVolume) || "40", 10);
}

function setMusicVolume(val) {
  localStorage.setItem(SETTINGS_KEYS.musicVolume, String(val));
}

// ---------- Clamp component ----------
if (window.AFRAME) {
  AFRAME.registerComponent("clamp-bounds", {
    schema: {
      minX: { type: "number" },
      maxX: { type: "number" },
      minZ: { type: "number" },
      maxZ: { type: "number" },
      margin: { type: "number", default: 0.15 },
    },
    tock: function () {
      const d = this.data;
      const p = this.el.getAttribute("position");
      if (!p) return;

      const x = Math.min(d.maxX - d.margin, Math.max(d.minX + d.margin, p.x));
      const z = Math.min(d.maxZ - d.margin, Math.max(d.minZ + d.margin, p.z));

      if (x !== p.x || z !== p.z) {
        this.el.setAttribute("position", { x, y: p.y, z });
      }
    },
  });
}

// ---------- Pause + Music runtime state ----------
let __isPaused = false;
let __musicPlaying = false;

function getBgMusicEl() {
  return document.getElementById("bg-music") || null;
}

function applyMusicSettingsToUI() {
  const toggle = document.getElementById("music-toggle");
  const slider = document.getElementById("volume-control");
  const display = document.getElementById("vol-display");

  const enabled = getMusicEnabled();
  const vol = getMusicVolume();

  if (toggle) toggle.classList.toggle("active", enabled);
  if (slider) slider.value = String(vol);
  if (display) display.textContent = `${vol}%`;
}

function applyMusicSettingsToAudio() {
  const music = getBgMusicEl();
  if (!music) return;

  const enabled = getMusicEnabled();
  const vol = getMusicVolume();

  music.volume = vol / 100;

  if (enabled && !__isPaused) {
    music
      .play()
      .then(() => {
        __musicPlaying = true;
      })
      .catch(() => {
        // browsers bloqueiam autoplay; ok
      });
  } else {
    music.pause();
    __musicPlaying = false;
  }
}

// ---------- Global functions used by buttons ----------
window.resumeGame = function () {
  __isPaused = false;

  const menu = document.getElementById("pause-menu");
  if (menu) menu.style.display = "none";

  const scene = document.querySelector("a-scene");
  if (scene) scene.play();

  applyMusicSettingsToAudio();
};

window.togglePauseMusic = function () {
  const next = !getMusicEnabled();
  setMusicEnabled(next);
  applyMusicSettingsToUI();
  applyMusicSettingsToAudio();
};

window.toggleMusic = function () {
  const next = !getMusicEnabled();
  setMusicEnabled(next);

  const btn = document.getElementById("music-control");
  if (btn) btn.style.display = getMusicEnabled() ? "none" : "block";

  applyMusicSettingsToUI();
  applyMusicSettingsToAudio();
};

window.updatePauseVolume = function (value) {
  const v = parseInt(value, 10);
  if (Number.isNaN(v)) return;

  setMusicVolume(v);

  const display = document.getElementById("vol-display");
  if (display) display.textContent = `${v}%`;

  const music = getBgMusicEl();
  if (music) music.volume = v / 100;
};

// ---------- ESC handler ----------
function togglePause() {
  const menu = document.getElementById("pause-menu");
  if (!menu) return; // se a página não tiver pause-menu, ignora

  __isPaused = !__isPaused;
  menu.style.display = __isPaused ? "block" : "none";

  const scene = document.querySelector("a-scene");
  if (scene) {
    if (__isPaused) scene.pause();
    else scene.play();
  }

  // música segue o estado
  const music = getBgMusicEl();
  if (music) {
    if (__isPaused && __musicPlaying) music.pause();
    else applyMusicSettingsToAudio();
  }
}

function disableCameraWASD() {
  const cam = document.querySelector("a-camera");
  if (cam) cam.setAttribute("wasd-controls", "enabled: false");
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  // 1) garantir que não há movimento duplo
  disableCameraWASD();

  // 2) aplicar settings a UI e áudio (se existir)
  applyMusicSettingsToUI();
  applyMusicSettingsToAudio();

  // 3) ESC para pausa (se houver menu)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const codeInput = document.getElementById("code-input");
      const isCodeOpen = codeInput && codeInput.style.display === "block";
      if (!isCodeOpen) togglePause();
    }
  });
});
