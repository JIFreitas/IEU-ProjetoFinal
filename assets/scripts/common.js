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
let isPaused = false;
let isMusicPlaying = false;

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

  if (enabled && !isPaused) {
    music
      .play()
      .then(() => {
        isMusicPlaying = true;
      })
      .catch(() => {
        // Browsers podem bloquear autoplay; ok.
      });
  } else {
    music.pause();
    isMusicPlaying = false;
  }
}

// ---------- Global functions used by buttons ----------
window.resumeGame = function () {
  isPaused = false;

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
  if (!menu) return; 

  isPaused = !isPaused;
  menu.style.display = isPaused ? "block" : "none";

  const scene = document.querySelector("a-scene");
  if (scene) {
    if (isPaused) scene.pause();
    else scene.play();
  }

  // música segue o estado
  const music = getBgMusicEl();
  if (music) {
    if (isPaused && isMusicPlaying) music.pause();
    else applyMusicSettingsToAudio();
  }

  if (window.__levelTimer && typeof window.__levelTimer.render === "function") {
    window.__levelTimer.render();
  }
}

function disableCameraWASD() {
  const cam = document.querySelector("a-camera");
  if (cam) cam.setAttribute("wasd-controls", "enabled: false");
}

// ---------- Timer (por nível) ----------
(function () {
  const state = {
    running: false,
    remainingMs: 0,
    lastTick: 0,
    intervalId: null,
    onTimeout: null,
    displayEl: null,

    // (para o vermelho + topo)
    timerTopEl: null,
    warningAt: 20,
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    const totalSeconds = Math.max(0, Math.ceil(state.remainingMs / 1000));
    const mm = pad2(Math.floor(totalSeconds / 60));
    const ss = pad2(totalSeconds % 60);

    if (state.displayEl) state.displayEl.textContent = `${mm}:${ss}`;

    // vermelho quando faltam <= warningAt (por defeito 20s)
    if (state.timerTopEl) {
      state.timerTopEl.classList.toggle(
        "warning",
        totalSeconds <= state.warningAt
      );
    }
  }

  function stop() {
    state.running = false;
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  function tick() {
    if (!state.running) return;

    // Se estiver pausado, congela o relógio
    if (isPaused) {
      state.lastTick = performance.now();
      return;
    }

    const now = performance.now();
    const dt = now - state.lastTick;
    state.lastTick = now;

    state.remainingMs -= dt;

    if (state.remainingMs <= 0) {
      state.remainingMs = 0;
      render();
      stop();
      if (typeof state.onTimeout === "function") state.onTimeout();
      return;
    }

    render();
  }

  // API pública
  window.startLevelTimer = function ({
    seconds,
    displayId = "timer-text", 
    onTimeout,
    warningAt = 20,
  }) {
    if (typeof seconds !== "number" || seconds <= 0) return;

    stop();

    state.displayEl =
      document.getElementById(displayId) ||
      document.getElementById("timer-text") ||
      null;
    state.timerTopEl = document.getElementById("timer-top") || null;

    state.onTimeout = onTimeout;
    state.warningAt = warningAt;

    state.remainingMs = seconds * 1000;
    state.lastTick = performance.now();
    state.running = true;

    render();
    state.intervalId = setInterval(tick, 250);
  };

  window.stopLevelTimer = function () {
    stop();
  };

  // para debug/controlo
  window.__levelTimer = {
    render,
    stop,
    get remainingMs() {
      return state.remainingMs;
    },
  };

  // segurança: ao sair da página, parar
  window.addEventListener("beforeunload", () => {
    stop();
  });
})();

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
