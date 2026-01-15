window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(3, "../index-simples.html");

  let solved = false;
  let terminalOrder = ["red", "blue", "green", "yellow"];

  const COLOR_META = {
    red: { name: "Vermelho", hex: "#c0392b" },
    blue: { name: "Azul", hex: "#2980b9" },
    green: { name: "Verde", hex: "#27ae60" },
    yellow: { name: "Amarelo", hex: "#f1c40f" },
  };

  const msgDiv = document.getElementById("msg");
  const terminalStateSpan = document.getElementById("terminal-state");
  const terminalStatusText = document.getElementById("terminal-status-text");
  const terminalOverlay = document.getElementById("terminal-overlay");
  const terminalMsg = document.getElementById("terminal-msg");
  const terminalOrderText = document.getElementById("terminal-order-text");
  const btnConfirm = document.getElementById("terminal-confirm");
  const btnClose = document.getElementById("terminal-close");
  const doorEl = document.getElementById("door");
  const doorTextEl = document.getElementById("door-text");
  const doorTextBgEl = document.getElementById("door-text-bg");

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

  startLevelTimer({
    seconds: 150,
    onTimeout: () => {
      setMsg("⏰ Tempo esgotado! A recomeçar o nível...", "#ff0000");
      setTimeout(() => location.reload(), 1500);
    },
  });

  function playSfx(id, volume = 0.75) {
    const el = document.getElementById(id);
    if (!el) return;

    try {
      el.pause();
      el.currentTime = 0;
      el.volume = volume;
      el.play();
    } catch {
      // Ignorar restrições de autoplay.
    }
  }

  function showDoorLockedText() {
    doorTextEl?.setAttribute("visible", "true");
    doorTextBgEl?.setAttribute("visible", "true");

    setTimeout(() => {
      doorTextEl?.setAttribute("visible", "false");
      doorTextBgEl?.setAttribute("visible", "false");
    }, 1400);
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * A ordem do terminal é aleatória por nível.
   * Os slots (esq → dir) correspondem a esta ordem.
   */
  function initTerminalOrder() {
    terminalOrder = shuffleInPlace(["red", "blue", "green", "yellow"]);

    const terminalEl = document.getElementById("terminal");
    if (terminalEl) terminalEl.dataset.order = terminalOrder.join(",");

    document.querySelectorAll(".terminal-swatch").forEach((el) => {
      const slot = parseInt(el.getAttribute("data-slot"), 10);
      const colorKey = terminalOrder[slot];
      const hex = COLOR_META[colorKey]?.hex;
      if (hex) el.setAttribute("material", `color: ${hex}`);
    });

    document
      .querySelectorAll("#terminal-overlay .swatch[data-slot]")
      .forEach((el) => {
        const slot = parseInt(el.getAttribute("data-slot"), 10);
        const colorKey = terminalOrder[slot];
        const hex = COLOR_META[colorKey]?.hex;
        if (hex) el.style.background = hex;
      });

    if (terminalOrderText) {
      terminalOrderText.textContent =
        "Ordem atual: " +
        terminalOrder.map((c) => COLOR_META[c]?.name || c).join(" → ");
    }
  }

  function openTerminal() {
    if (!terminalOverlay) return;

    terminalOverlay.style.display = "flex";
    terminalOverlay.setAttribute("aria-hidden", "false");
    if (terminalMsg) terminalMsg.textContent = "";

    setMsg(
      "⌨️ Insere as contagens por cor.",
      "#00ff00",
      1200,
      "Conta os objetos por cor e insere no terminal (esq → dir)."
    );

    document.getElementById("term-slot-0")?.focus();
  }

  function closeTerminal() {
    if (!terminalOverlay) return;
    terminalOverlay.style.display = "none";
    terminalOverlay.setAttribute("aria-hidden", "true");
  }

  function parseNum(id) {
    const v = (document.getElementById(id)?.value || "").trim();
    if (!v) return null;

    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }

  function getCounts() {
    const colors = ["red", "blue", "green", "yellow"];
    const counts = {};
    for (const color of colors) {
      counts[color] = document.querySelectorAll(
        `.countable[data-color="${color}"]`
      ).length;
    }
    return counts;
  }

  function validateTerminal() {
    const counts = getCounts();
    const slots = [0, 1, 2, 3].map((i) => parseNum(`term-slot-${i}`));

    const missingSlots = slots
      .map((v, i) => (v === null ? i : -1))
      .filter((i) => i !== -1);

    if (missingSlots.length > 0) {
      playSfx("sfx-hmm-reflexion", 0.7);
      if (terminalMsg) {
        terminalMsg.style.color = "#ffdddd";
        terminalMsg.textContent = "Preenche todas as cores com números.";
      }
      return false;
    }

    const ok = slots.every((v, i) => {
      const colorKey = terminalOrder[i];
      return v === counts[colorKey];
    });

    if (!ok) {
      playSfx("sfx-hmm-reflexion", 0.7);
      if (terminalMsg) {
        terminalMsg.style.color = "#ff4444";
        terminalMsg.textContent = "✗ Errado. Volta a contar com calma.";
      }

      setMsg(
        "❌ Código errado. Tenta novamente.",
        "#ff4444",
        1200,
        "Conta os objetos por cor e insere no terminal (esq → dir)."
      );
      return false;
    }

    solved = true;
    unlockLevel(4);

    if (terminalMsg) {
      terminalMsg.style.color = "#00ff00";
      terminalMsg.textContent = "✓ Acesso concedido! Porta destrancada.";
    }

    if (terminalStateSpan) terminalStateSpan.textContent = "DESTRANCADO";
    if (terminalStatusText) {
      terminalStatusText.setAttribute("value", "TERMINAL\n[OK]");
      terminalStatusText.setAttribute("color", "#ffff00");
    }

    document.getElementById("door")?.classList.add("unlocked");
    setMsg("✅ Porta destrancada! Vai à porta.", "#00ff00");
    return true;
  }

  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Texturas procedurais (mantidas no próprio nível, sem dependências externas)
  function drawWallTexture() {
    const canvas = document.getElementById("tex-wall");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#6a5a4c";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 8000; i++) {
      const x = (rand(i * 13.37) * w) | 0;
      const y = (rand(i * 99.11) * h) | 0;
      const a = 0.03 + rand(i * 7.7) * 0.06;
      ctx.fillStyle = `rgba(20, 15, 10, ${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function drawCeilingTexture() {
    const canvas = document.getElementById("tex-ceiling");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 9000; i++) {
      const x = (rand(i * 5.17) * w) | 0;
      const y = (rand(i * 71.9) * h) | 0;
      const a = 0.02 + rand(i * 3.33) * 0.05;
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function drawWoodTexture() {
    const canvas = document.getElementById("tex-wood");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#6a3a1d";
    ctx.fillRect(0, 0, w, h);

    const plankCount = 6;
    const plankW = w / plankCount;

    for (let p = 0; p < plankCount; p++) {
      const x0 = p * plankW;
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand(p * 2.1) * 0.06})`;
      ctx.fillRect(x0, 0, 2, h);

      for (let y = 0; y < h; y++) {
        const wobble = (Math.sin(y * 0.06 + p) + Math.sin(y * 0.013)) * 0.5;
        ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.max(0, wobble) * 0.02})`;
        ctx.fillRect(x0, y, plankW, 1);
      }
    }
  }

  function drawFloorTexture() {
    const canvas = document.getElementById("tex-floor");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#2f2a24";
    ctx.fillRect(0, 0, w, h);

    const tile = 64;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const n = rand(x * 0.13 + y * 0.71);
        const c = 40 + ((n * 16) | 0);
        ctx.fillStyle = `rgb(${c}, ${c - 4}, ${c - 10})`;
        ctx.fillRect(x, y, tile, tile);
      }
    }

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;

    for (let i = 0; i <= w; i += tile) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, h);
      ctx.stroke();
    }

    for (let i = 0; i <= h; i += tile) {
      ctx.beginPath();
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(w, i + 0.5);
      ctx.stroke();
    }
  }

  function applyTextures() {
    drawWallTexture();
    drawCeilingTexture();
    drawWoodTexture();
    drawFloorTexture();

    const floor = document.getElementById("floor");
    if (floor) {
      floor.setAttribute(
        "material",
        "shader: standard; src: #tex-floor; repeat: 6 6; roughness: 1; metalness: 0; color: #d5d1c9"
      );
    }

    const ceiling = document.getElementById("ceiling");
    if (ceiling) {
      ceiling.setAttribute(
        "material",
        "shader: standard; src: #tex-ceiling; repeat: 6 6; roughness: 1; metalness: 0; color: #d0cfc8"
      );
    }

    document.querySelectorAll(".wall").forEach((wallEl) => {
      wallEl.setAttribute(
        "material",
        "shader: standard; src: #tex-wall; repeat: 6 2; roughness: 1; metalness: 0; color: #c9c2b8"
      );
    });
  }

  if (!AFRAME.components["terminal-system-level3-colors"]) {
    AFRAME.registerComponent("terminal-system-level3-colors", {
      init: function () {
        this.el.addEventListener("click", openTerminal);
      },
    });
  }

  if (!AFRAME.components["door-system-level3"]) {
    AFRAME.registerComponent("door-system-level3", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (!solved) {
            playSfx("sfx-door-locked", 0.75);
            showDoorLockedText();
            setMsg(
              "❌ Porta trancada. Resolve o terminal.",
              "#ff4444",
              1400,
              "Conta os objetos por cor e insere no terminal (esq → dir)."
            );
            return;
          }

          playSfx("sfx-door-open", 0.75);

          const pivot = document.getElementById("doorPivot");
          if (pivot) {
            pivot.setAttribute("animation__open", {
              property: "rotation",
              to: "0 -105 0",
              dur: 900,
              easing: "easeOutQuad",
            });
          }

          setMsg("✅ ESCAPASTE!", "#00ff00");
          setTimeout(() => {
            stopLevelTimer();
            setUnlockedLevel(4);
            window.location.href = "nivel4-simples.html";
          }, 1600);
        });
      },
    });
  }

  const terminalEl = document.getElementById("terminal");
  terminalEl?.setAttribute("terminal-system-level3-colors", "");
  doorEl?.setAttribute("door-system-level3", "");

  btnClose?.addEventListener("click", closeTerminal);

  terminalOverlay?.addEventListener("click", (e) => {
    if (e.target === terminalOverlay) closeTerminal();
  });

  btnConfirm?.addEventListener("click", () => {
    if (validateTerminal()) setTimeout(closeTerminal, 700);
  });

  ["term-slot-0", "term-slot-1", "term-slot-2", "term-slot-3"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        if (validateTerminal()) setTimeout(closeTerminal, 700);
      }
    });
  });

  const sceneEl = document.querySelector("a-scene");
  if (sceneEl) {
    const run = () => applyTextures();
    if (sceneEl.hasLoaded) run();
    else sceneEl.addEventListener("loaded", run, { once: true });
  }

  if (terminalStateSpan) terminalStateSpan.textContent = "TRANCADO";
  terminalStatusText?.setAttribute("value", "TERMINAL\n[CLIQUE]");
  setMsg("Conta os objetos por cor e insere no terminal (esq → dir).", "white");

  initTerminalOrder();
});
