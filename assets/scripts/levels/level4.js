// ../assets/scripts/levels/level4.js
window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(4, "../index-simples.html");

  // ===== Estado =====
  let hasUV = false;
  let uvOn = false;
  let solved = false;

  const SYMBOLS = ["TRI", "CIR", "SQR", "X"];
  const symbolToDigit = {};

  // O terminal deve pedir os 4 símbolos (sem ordem por sequência).
  // Estes símbolos correspondem aos inputs do HTML (term-slot-0..3).
  const TERMINAL_SLOT_SYMBOLS = ["TRI", "X", "CIR", "SQR"];

  // ===== UI =====
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");

  const overlay = document.getElementById("code-overlay");
  const codeMsg = document.getElementById("code-msg");
  const orderText = document.getElementById("code-order-text");
  const btnConfirm = document.getElementById("code-confirm");
  const btnClose = document.getElementById("code-close");

  const jumpscare = document.getElementById("jumpscare");
  const jumpscareText = document.getElementById("jumpscare-text");

  // ===== SFX =====
  function playSfx(id, volume = 0.8) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      el.volume = volume;
      el.play();
    } catch {}
  }

  function setMsg(text, color = "white", ms = 0, resetText = "") {
    if (!msgDiv) return;
    msgDiv.textContent = text;
    msgDiv.style.color = color;
    if (ms > 0) {
      setTimeout(() => {
        msgDiv.textContent = resetText || msgDiv.textContent;
        msgDiv.style.color = "white";
      }, ms);
    }
  }

  // ===== Timer =====
  startLevelTimer({
    seconds: 140,
    onTimeout: () => {
      setMsg("⏰ Tempo esgotado! A recomeçar o nível...", "#ff0000");
      setTimeout(() => location.reload(), 1500);
    },
  });

  // ===== Utils =====
  function randDigit() {
    return String(1 + Math.floor(Math.random() * 9));
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== Pistas UV =====
  const clueEls = {}; // { TRI: el, ... }
  const clueOpacity = { TRI: 0, CIR: 0, SQR: 0, X: 0 };

  function setClueOpacity(sym, next) {
    const el = clueEls[sym];
    if (!el) return;

    const v = Math.max(0, Math.min(1, next));
    clueOpacity[sym] = v;

    // só visível com opacidade mínima
    el.setAttribute("visible", v > 0.02 ? "true" : "false");
    el.setAttribute("material", `transparent: true; opacity: ${v}`);
  }

  function hideAllClues() {
    SYMBOLS.forEach((sym) => {
      const el = clueEls[sym];
      clueOpacity[sym] = 0;
      if (!el) return;
      el.setAttribute("visible", "false");
      el.setAttribute("material", "transparent: true; opacity: 0");
    });
  }

  function initCode() {
    const digits = shuffle([
      randDigit(),
      randDigit(),
      randDigit(),
      randDigit(),
    ]);
    SYMBOLS.forEach((s, i) => (symbolToDigit[s] = digits[i]));

    SYMBOLS.forEach((sym) => {
      const el = document.getElementById(`uv-${sym}`);
      if (!el) return;

      clueEls[sym] = el;

      el.setAttribute("value", `${sym}:${symbolToDigit[sym]}`);

      // blindagem (nunca aparece sem UV)
      el.setAttribute("visible", "false");
      el.setAttribute("material", "transparent: true; opacity: 0");

      // opcional: melhora nitidez (se suportar)
      try {
        el.setAttribute("shader", "msdf");
      } catch {}
    });

    if (orderText) {
      orderText.textContent =
        "Sem ordem: preenche o dígito de cada símbolo (TRI, X, CIR, SQR).";
    }
  }

  initCode();

  // ===== UV Light / Feixe =====
  const uvSpot = document.getElementById("uv-spot");

  function applyUVVisuals() {
    // Mantém isto consistente com o teu HTML atual (mais alcance)
    if (uvSpot) {
      uvSpot.setAttribute("intensity", uvOn ? "4.2" : "0");
      uvSpot.setAttribute("distance", "24");
      uvSpot.setAttribute("decay", "0.6");
      uvSpot.setAttribute("angle", "22");
      uvSpot.setAttribute("penumbra", "0.35");
    }
    if (!uvOn) hideAllClues();
  }

  function toggleUV() {
    if (!hasUV) {
      playSfx("sfx-hmm-reflexion", 0.7);
      setMsg(
        "❌ Precisas de apanhar a lanterna UV.",
        "#ff4444",
        1200,
        "Encontra a lanterna UV."
      );
      return;
    }

    uvOn = !uvOn;
    applyUVVisuals();
    playSfx("sfx-keys", 0.45);

    if (uvOn) {
      setMsg(
        "🟣 UV ligada — passa o feixe por cima das marcas.",
        "#d39bff",
        1400,
        "Aponta às paredes para revelar o código."
      );
    } else {
      setMsg("UV desligada.", "#cccccc", 900, "Procura a solução.");
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "u") toggleUV();
  });

  // ===== Revelar por “passar o feixe” =====
  const REVEAL_RADIUS = 0.6; // mais fácil com o teu cenário
  const FADE_IN = 0.25;
  const FADE_OUT = 0.16;

  const cursor = document.querySelector("a-cursor");

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function getWorldPos(el) {
    // Evita crash se THREE ainda não estiver pronto
    if (!el || !el.object3D || !window.THREE) return null;
    return el.object3D.getWorldPosition(new THREE.Vector3());
  }

  let lastTick = 0;
  function tickUV() {
    requestAnimationFrame(tickUV);

    const now = performance.now();
    if (now - lastTick < 33) return; // ~30fps
    lastTick = now;

    if (!uvOn) return;

    const rc = cursor?.components?.raycaster;
    if (!rc) return;

    const hits = rc.intersections || [];
    const hit = hits[0];

    // Se não bate em nada: fade out
    if (!hit || !hit.point) {
      SYMBOLS.forEach((sym) =>
        setClueOpacity(sym, clueOpacity[sym] - FADE_OUT)
      );
      return;
    }

    // Não revelar se estás a apontar para um interactable (terminal, drawer, etc.)
    const targetEl = hit.object?.el;
    if (targetEl && targetEl.classList?.contains("interactable")) {
      SYMBOLS.forEach((sym) =>
        setClueOpacity(sym, clueOpacity[sym] - FADE_OUT)
      );
      return;
    }

    const p = hit.point;

    // texto mais próximo do ponto do feixe
    let bestSym = null;
    let bestD = Infinity;

    for (const sym of SYMBOLS) {
      const el = clueEls[sym];
      const wp = getWorldPos(el);
      if (!wp) continue;

      const d = dist(p, wp);
      if (d < bestD) {
        bestD = d;
        bestSym = sym;
      }
    }

    if (bestSym && bestD <= REVEAL_RADIUS) {
      SYMBOLS.forEach((sym) => {
        if (sym === bestSym) setClueOpacity(sym, clueOpacity[sym] + FADE_IN);
        else setClueOpacity(sym, clueOpacity[sym] - FADE_OUT);
      });
    } else {
      SYMBOLS.forEach((sym) =>
        setClueOpacity(sym, clueOpacity[sym] - FADE_OUT)
      );
    }
  }

  hideAllClues();
  tickUV();

  // ===== Overlay do terminal =====
  function openCodeOverlay() {
    if (!overlay) return;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");

    if (codeMsg) {
      codeMsg.textContent = "";
      codeMsg.style.color = "#e8e8e8";
    }

    const first = document.getElementById("term-slot-0");
    if (first) first.focus();
  }

  function closeCodeOverlay() {
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
  }

  function readSlot(i) {
    const v = (document.getElementById(`term-slot-${i}`)?.value || "").trim();
    if (!v) return null;
    if (!/^\d$/.test(v)) return null;
    return v;
  }

  function clearSlots() {
    [0, 1, 2, 3].forEach((i) => {
      const el = document.getElementById(`term-slot-${i}`);
      if (el) el.value = "";
    });
  }

  function validateCode() {
    const slots = [0, 1, 2, 3].map(readSlot);

    if (slots.some((v) => v === null)) {
      playSfx("sfx-hmm-reflexion", 0.75);
      if (codeMsg) {
        codeMsg.style.color = "#ffdddd";
        codeMsg.textContent = "Preenche os 4 dígitos (1–9).";
      }
      return false;
    }

    const expected = TERMINAL_SLOT_SYMBOLS.map((sym) => symbolToDigit[sym]);
    const ok = slots.every((v, i) => v === expected[i]);

    if (!ok) {
      playSfx("sfx-door-locked", 0.85);
      clearSlots();

      if (codeMsg) {
        codeMsg.style.color = "#ff4444";
        codeMsg.textContent = "✗ Errado. Confere os 4 símbolos e tenta outra vez.";
      }

      setMsg(
        "❌ Código errado. Volta a ver os símbolos com UV.",
        "#ff4444",
        1600,
        "Aponta às paredes com UV e abre o terminal."
      );
      return false;
    }

    solved = true;
    playSfx("sfx-door-open", 0.75);

    if (codeMsg) {
      codeMsg.style.color = "#00ff00";
      codeMsg.textContent = "✓ Acesso concedido. Porta destrancada.";
    }

    const door = document.getElementById("door");
    if (door) door.classList.add("unlocked");

    setMsg("✅ Porta destrancada! Vai à porta.", "#00ff00");
    return true;
  }

  if (btnConfirm) {
    btnConfirm.addEventListener("click", () => {
      const ok = validateCode();
      if (ok) setTimeout(closeCodeOverlay, 650);
    });
  }
  if (btnClose) btnClose.addEventListener("click", closeCodeOverlay);

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCodeOverlay();
    });
  }

  // UX: 1 dígito -> avança para o próximo (bom em mobile)
  ["term-slot-0", "term-slot-1", "term-slot-2", "term-slot-3"].forEach(
    (id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener("input", () => {
        el.value = (el.value || "").replace(/\D/g, "").slice(0, 1);
        if (el.value && idx < 3) {
          document.getElementById(`term-slot-${idx + 1}`)?.focus();
        }
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const ok = validateCode();
          if (ok) setTimeout(closeCodeOverlay, 650);
        }
        // backspace vazio -> volta atrás
        if (e.key === "Backspace" && !el.value && idx > 0) {
          document.getElementById(`term-slot-${idx - 1}`)?.focus();
        }
      });
    }
  );

  // ===== Componentes A-Frame =====

  // 1) Gaveta abre e mostra lanterna
  if (!AFRAME.components["drawer-open-level4"]) {
    AFRAME.registerComponent("drawer-open-level4", {
      init: function () {
        this.opened = false;
        this.el.addEventListener("click", () => {
          if (this.opened) return;
          this.opened = true;

          playSfx("sfx-drawer-open", 0.75);

          const pos = this.el.getAttribute("position") || { x: 0, y: 0, z: 0 };
          this.el.setAttribute("animation__open", {
            property: "position",
            to: `${pos.x} ${pos.y} ${pos.z + 0.28}`,
            dur: 650,
            easing: "easeOutQuad",
          });

          const uv = document.getElementById("uv-flashlight");
          if (uv) {
            uv.setAttribute("visible", "true");
            uv.setAttribute("animation__pop", {
              property: "position",
              from: "0.18 0.72 0.12",
              to: "0.18 0.78 0.55",
              dur: 650,
              easing: "easeOutBack",
            });
          }

          setMsg(
            "👀 A gaveta abriu... algo brilha lá dentro.",
            "#ffffaa",
            1400,
            "Procura a lanterna UV."
          );
        });
      },
    });
  }

  // 2) Apanhar lanterna UV
  if (!AFRAME.components["uv-pickup-level4"]) {
    AFRAME.registerComponent("uv-pickup-level4", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (hasUV) return;
          hasUV = true;

          this.el.setAttribute("visible", "false");
          playSfx("sfx-find-lighter", 0.8);

          setMsg(
            "✅ Apanhaste a lanterna UV! (U para ligar/desligar)",
            "#00ff00",
            2200,
            "Liga a UV e passa o feixe nas marcas."
          );
        });
      },
    });
  }

  // 3) Pedestal alterna UV
  if (!AFRAME.components["uv-toggle-pedestal"]) {
    AFRAME.registerComponent("uv-toggle-pedestal", {
      init: function () {
        this.el.addEventListener("click", () => toggleUV());
      },
    });
  }

  // 4) Terminal abre overlay
  if (!AFRAME.components["terminal-open-level4"]) {
    AFRAME.registerComponent("terminal-open-level4", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (!hasUV) {
            playSfx("sfx-hmm-reflexion", 0.75);
            setMsg(
              "❌ Falta-te algo para ler as pistas...",
              "#ff4444",
              1400,
              "Procura a lanterna UV."
            );
            return;
          }
          openCodeOverlay();
          setMsg(
            "⌨️ Insere o código por ordem de símbolos.",
            "#00ff00",
            1200,
            "Usa as pistas UV para obter os dígitos."
          );
        });
      },
    });
  }

  // 5) Porta final + jumpscare
  if (!AFRAME.components["door-system-level4"]) {
    AFRAME.registerComponent("door-system-level4", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (!solved) {
            playSfx("sfx-door-locked", 0.85);
            setMsg(
              "❌ Porta trancada. Resolve o terminal.",
              "#ff4444",
              1400,
              "Liga a UV, encontra dígitos, abre o terminal."
            );
            return;
          }

          const pivot = document.getElementById("doorPivot");
          if (pivot) {
            pivot.setAttribute("animation__open", {
              property: "rotation",
              to: "0 -110 0",
              dur: 900,
              easing: "easeOutQuad",
            });
          }

          setTimeout(() => {
            if (jumpscare) {
              jumpscare.style.display = "flex";
              jumpscare.classList.add("on");
            }
            playSfx("sfx-wakeup", 1.0);

            setTimeout(() => {
              if (jumpscareText)
                jumpscareText.textContent = "🎉 TERMINASTE O JOGO!";
            }, 700);

            setTimeout(() => {
              stopLevelTimer();
              resetProgress();
              window.location.href = "../index-simples.html";
            }, 1900);
          }, 550);
        });
      },
    });
  }

  // ===== Bind =====
  document.getElementById("uv-drawer")?.setAttribute("drawer-open-level4", "");
  document
    .getElementById("uv-flashlight")
    ?.setAttribute("uv-pickup-level4", "");
  document
    .getElementById("uv-pedestal")
    ?.setAttribute("uv-toggle-pedestal", "");
  document.getElementById("terminal")?.setAttribute("terminal-open-level4", "");
  if (doorEl) doorEl.setAttribute("door-system-level4", "");

  // estado inicial
  applyUVVisuals();
  setMsg("Encontra a lanterna UV. Esta sala não perdoa.", "white");
});
