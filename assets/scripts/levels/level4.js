window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(4, "../index-simples.html");

  // ===== Estado =====
  let hasUV = false;
  let uvOn = false;
  let solved = false;

  // mapa símbolo -> dígito (gerado no arranque)
  // símbolos: TRI, CIR, SQR, X
  const SYMBOLS = ["TRI", "CIR", "SQR", "X"];
  const symbolToDigit = {};

  // Ordem pedida no terminal (random)
  let terminalOrder = [];

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
    msgDiv.textContent = text;
    msgDiv.style.color = color;
    if (ms > 0) {
      setTimeout(() => {
        msgDiv.textContent = resetText || msgDiv.textContent;
        msgDiv.style.color = "white";
      }, ms);
    }
  }

  // ===== Timer (final: mais apertado) =====
  startLevelTimer({
    seconds: 140,
    onTimeout: () => {
      setMsg("⏰ Tempo esgotado! A recomeçar o nível...", "#ff0000");
      setTimeout(() => location.reload(), 1500);
    },
  });

  // ===== Geração de código =====
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

  function initCode() {
    // 4 dígitos aleatórios, um por símbolo
    const digits = shuffle([
      randDigit(),
      randDigit(),
      randDigit(),
      randDigit(),
    ]);
    SYMBOLS.forEach((s, i) => (symbolToDigit[s] = digits[i]));

    // colocar no mundo (textos UV)
    SYMBOLS.forEach((sym) => {
      const el = document.getElementById(`uv-${sym}`);
      if (!el) return;
      el.setAttribute("value", `${sym}:${symbolToDigit[sym]}`);
      el.setAttribute("visible", "false"); // só aparece com UV ligada
    });

    // ordem pedida no terminal (random)
    terminalOrder = shuffle(SYMBOLS);

    if (orderText) {
      orderText.textContent = "Ordem no terminal: " + terminalOrder.join(" → ");
    }
  }

  initCode();

  // ===== UV toggle =====
  function applyUV() {
    // mostra/esconde textos UV
    SYMBOLS.forEach((sym) => {
      const el = document.getElementById(`uv-${sym}`);
      if (!el) return;
      el.setAttribute("visible", uvOn ? "true" : "false");
    });

    // mudar luz do ambiente (efeito “UV”)
    const uvLight = document.getElementById("uv-light");
    if (uvLight) uvLight.setAttribute("intensity", uvOn ? "0.85" : "0.0");

    const normalLight = document.getElementById("normal-light");
    if (normalLight)
      normalLight.setAttribute("intensity", uvOn ? "0.12" : "0.55");

    if (uvOn)
      setMsg(
        "🟣 UV ligada — procura inscrições nas paredes.",
        "#d39bff",
        1400,
        "Procura inscrições UV e abre o terminal."
      );
    else setMsg("UV desligada.", "#cccccc", 900, "Procura a solução.");
  }

  function toggleUV() {
    if (!hasUV) return;
    uvOn = !uvOn;
    applyUV();
    playSfx("sfx-keys", 0.45); // clique/feedback
  }

  // tecla rápida (opcional) — não interfere com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "f") toggleUV();
  });

  // ===== Terminal overlay =====
  function openCodeOverlay() {
    if (!overlay) return;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    if (codeMsg) {
      codeMsg.textContent = "";
      codeMsg.style.color = "#e8e8e8";
    }
    const first = document.getElementById("code-slot-0");
    if (first) first.focus();
  }

  function closeCodeOverlay() {
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
  }

  function readSlot(i) {
    const v = (document.getElementById(`code-slot-${i}`)?.value || "").trim();
    if (!v) return null;
    if (!/^\d$/.test(v)) return null;
    return v;
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

    // compara pela ordem pedida
    const expected = terminalOrder.map((sym) => symbolToDigit[sym]);
    const ok = slots.every((v, i) => v === expected[i]);

    if (!ok) {
      playSfx("sfx-door-locked", 0.85);

      // pequena punição “profissional”: apaga inputs e baralha a ordem do terminal
      [0, 1, 2, 3].forEach((i) => {
        const el = document.getElementById(`code-slot-${i}`);
        if (el) el.value = "";
      });
      terminalOrder = shuffle(SYMBOLS);
      if (orderText)
        orderText.textContent =
          "Ordem no terminal: " + terminalOrder.join(" → ");

      if (codeMsg) {
        codeMsg.style.color = "#ff4444";
        codeMsg.textContent = "✗ Errado. A ordem do terminal mudou...";
      }
      setMsg(
        "❌ Código errado. A ordem mudou — tens de perceber os símbolos.",
        "#ff4444",
        1600,
        "Procura inscrições UV e abre o terminal."
      );
      return false;
    }

    // sucesso
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

  if (btnConfirm)
    btnConfirm.addEventListener("click", () => {
      const ok = validateCode();
      if (ok) setTimeout(closeCodeOverlay, 650);
    });

  if (btnClose) btnClose.addEventListener("click", closeCodeOverlay);

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCodeOverlay();
    });
  }

  ["code-slot-0", "code-slot-1", "code-slot-2", "code-slot-3"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const ok = validateCode();
        if (ok) setTimeout(closeCodeOverlay, 650);
      }
    });
  });

  // ===== Componentes A-Frame =====

  // 1) Gaveta que revela a lanterna UV
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

  // 2) Apanhar lanterna UV (e permitir toggle)
  if (!AFRAME.components["uv-pickup-level4"]) {
    AFRAME.registerComponent("uv-pickup-level4", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (hasUV) return;

          hasUV = true;
          this.el.setAttribute("visible", "false");
          playSfx("sfx-find-lighter", 0.8);

          setMsg(
            "✅ Apanhaste a lanterna UV! (Tecla F ou clica no pedestal para ligar)",
            "#00ff00",
            2200,
            "Liga a UV e procura inscrições."
          );
        });
      },
    });
  }

  // 3) Pedestal/interruptor para ligar/desligar UV
  if (!AFRAME.components["uv-toggle-pedestal"]) {
    AFRAME.registerComponent("uv-toggle-pedestal", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (!hasUV) {
            playSfx("sfx-hmm-reflexion", 0.75);
            setMsg(
              "❌ Precisas da lanterna UV primeiro.",
              "#ff4444",
              1400,
              "Procura a lanterna."
            );
            return;
          }
          toggleUV();
        });
      },
    });
  }

  // 4) Terminal para abrir overlay
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

          // abre porta (visual)
          const pivot = document.getElementById("doorPivot");
          if (pivot) {
            pivot.setAttribute("animation__open", {
              property: "rotation",
              to: "0 -110 0",
              dur: 900,
              easing: "easeOutQuad",
            });
          }

          // jumpscare + fim
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

  // ===== Bind a elementos =====
  const drawer = document.getElementById("uv-drawer");
  if (drawer) drawer.setAttribute("drawer-open-level4", "");

  const uvFlash = document.getElementById("uv-flashlight");
  if (uvFlash) uvFlash.setAttribute("uv-pickup-level4", "");

  const uvPedestal = document.getElementById("uv-pedestal");
  if (uvPedestal) uvPedestal.setAttribute("uv-toggle-pedestal", "");

  const terminal = document.getElementById("terminal");
  if (terminal) terminal.setAttribute("terminal-open-level4", "");

  if (doorEl) doorEl.setAttribute("door-system-level4", "");

  // estado inicial de luz
  applyUV();
  setMsg("Encontra a lanterna UV. Esta sala não perdoa.", "white");
});
