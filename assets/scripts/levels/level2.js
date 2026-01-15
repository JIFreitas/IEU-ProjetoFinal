window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(2, "../index-simples.html");

  // Estado do nível
  let candlesLit = 0;
  let hasLighter = false;

  // Elementos UI (HUD / mensagens / porta)
  const candlesSpan = document.getElementById("candles");
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");
  const doorTextEl = document.getElementById("door-text");
  const doorTextBgEl = document.getElementById("door-text-bg");

  /**
   * Mensagens do nível:
   * - `msToReset`: se > 0, volta à cor branca após esse tempo.
   * - `resetText`: se fornecido (string não vazia), substitui o texto no reset.
   *   Caso contrário, não altera o texto (evita sobrescrever mensagens mais recentes).
   */
  function setMsg(text, color = "white", msToReset = 0, resetText = "") {
    if (!msgDiv) return;

    msgDiv.textContent = text;
    msgDiv.style.color = color;

    if (msToReset > 0) {
      setTimeout(() => {
        if (resetText) msgDiv.textContent = resetText;
        msgDiv.style.color = "white";
      }, msToReset);
    }
  }

  function playSfx(id, volume = 0.7) {
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

  // Velas: ordem baseada nas datas (mais antiga -> mais recente)
  const candleEls = Array.from(document.querySelectorAll(".candle"));
  const requiredCandleOrder = candleEls
    .map((el) => {
      const dateStr = el.getAttribute("data-date");
      const date = dateStr ? new Date(dateStr) : new Date("2100-01-01");
      return { el, date };
    })
    .sort((a, b) => a.date - b.date)
    .map((x) => x.el);

  /**
   * Mapear candleN -> flameN para ligar/desligar chamas sem procurar IDs repetidamente.
   * (Assume IDs no formato candle1..candle4 e flame1..flame4.)
   */
  const flamesByCandleId = new Map();
  for (const candleEl of candleEls) {
    const match = candleEl.id?.match(/^candle(\d+)$/);
    if (!match) continue;

    const num = match[1];
    const flameEl = document.getElementById(`flame${num}`);
    if (flameEl) flamesByCandleId.set(candleEl.id, flameEl);
  }

  // Timer do nível
  startLevelTimer({
    seconds: 120,
    onTimeout: () => {
      setMsg("⏰ Tempo esgotado! A recomeçar o nível...", "#ff0000");
      setTimeout(() => location.reload(), 1500);
    },
  });

  /**
   * Reset total do puzzle:
   * - contagem e estado interno das velas (component.lit)
   * - chamas visuais
   * - luzes criadas dinamicamente
   * - porta volta ao estado trancado (classe)
   */
  function resetCandles() {
    candlesLit = 0;
    if (candlesSpan) candlesSpan.textContent = "0";

    document.querySelectorAll(".candle").forEach((c) => {
      const comp = c.components["candle-light-date-level2"];
      if (comp) comp.lit = false;
    });

    flamesByCandleId.forEach((flameEl) => {
      flameEl.setAttribute("visible", "false");
    });

    document.querySelectorAll(".candle-flame-light").forEach((l) => l.remove());

    document.getElementById("door")?.classList.remove("unlocked");
  }

  // ---------- Texturas procedurais (canvas) ----------
  // Mantidas no nível para dar variedade sem assets externos.
  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

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

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let y = 0; y < h; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
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
      const base = 0.85 + rand(p * 12.3) * 0.25;

      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand(p * 2.1) * 0.06})`;
      ctx.fillRect(x0, 0, 2, h);

      for (let y = 0; y < h; y++) {
        const t = y / h;
        const wobble = (Math.sin(y * 0.06 + p) + Math.sin(y * 0.013)) * 0.5;
        const shade = 18 * (base - 0.9) + wobble;

        ctx.fillStyle = `rgba(255, 220, 170, ${0.06 + t * 0.02})`;
        ctx.fillRect(x0 + plankW * 0.2, y, plankW * 0.6, 1);

        ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.max(0, shade) * 0.0015})`;
        ctx.fillRect(x0, y, plankW, 1);
      }
    }

    for (let k = 0; k < 14; k++) {
      const cx = rand(k * 19.19) * w;
      const cy = rand(k * 31.11) * h;
      const r = 18 + rand(k * 7.7) * 42;

      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const rr = r * (0.35 + rand((k + 1) * (i + 3)) * 0.8);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(x, y, 2, 2);
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

    for (let i = 0; i < 9000; i++) {
      const x = (rand(i * 17.7) * w) | 0;
      const y = (rand(i * 1.73) * h) | 0;
      ctx.fillStyle = `rgba(255,255,255,${0.015 + rand(i * 2.2) * 0.03})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function applyTextures() {
    drawWallTexture();
    drawCeilingTexture();
    drawWoodTexture();
    drawFloorTexture();

    const floor = document.getElementById("floor");
    floor?.setAttribute(
      "material",
      "shader: standard; src: #tex-floor; repeat: 4 18; roughness: 1; metalness: 0; color: #d5d1c9"
    );

    const ceiling = document.getElementById("ceiling");
    ceiling?.setAttribute(
      "material",
      "shader: standard; src: #tex-ceiling; repeat: 4 18; roughness: 1; metalness: 0; color: #d0cfc8"
    );

    document.querySelectorAll(".wall").forEach((wallEl) => {
      wallEl.setAttribute(
        "material",
        "shader: standard; src: #tex-wall; repeat: 6 3; roughness: 1; metalness: 0; color: #c9c2b8"
      );
    });
  }

  // ---------- Componentes A-Frame ----------
  if (!AFRAME.components["drawer-open-level2"]) {
    AFRAME.registerComponent("drawer-open-level2", {
      init: function () {
        this.opened = false;

        this.el.addEventListener("click", () => {
          if (this.opened) return;
          this.opened = true;

          playSfx("sfx-drawer-open", 0.7);

          // Anima a gaveta (desloca no eixo Z)
          const pos = this.el.getAttribute("position");
          const x = pos?.x ?? 0;
          const y = pos?.y ?? 0;
          const z = pos?.z ?? 0;

          this.el.setAttribute("animation__open", {
            property: "position",
            to: `${x} ${y} ${z + 0.25}`,
            dur: 650,
            easing: "easeOutQuad",
          });

          // Revela o isqueiro num ponto visível (fora do “bloco” do armário)
          const lighterEl = document.getElementById("lighter");
          if (lighterEl) {
            lighterEl.setAttribute("visible", "true");
            lighterEl.setAttribute("position", "0.22 0.78 0.55");

            lighterEl.setAttribute("animation__pop", {
              property: "position",
              from: "0.22 0.72 0.20",
              to: "0.22 0.78 0.55",
              dur: 650,
              easing: "easeOutBack",
            });

            lighterEl.setAttribute(
              "animation__spin",
              "property: rotation; to: 0 360 0; loop: true; dur: 2000"
            );
          }

          setMsg(
            "Abriste a gaveta...",
            "#ffffaa",
            1400,
            "Encontra o isqueiro e acende por ordem."
          );
        });
      },
    });
  }

  if (!AFRAME.components["lighter-pickup-level2"]) {
    AFRAME.registerComponent("lighter-pickup-level2", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (hasLighter) return;

          hasLighter = true;
          this.el.setAttribute("visible", "false");

          playSfx("sfx-find-lighter", 0.75);

          setMsg(
            "✅ Apanhaste o isqueiro! Agora podes acender velas.",
            "#00ff00",
            2000,
            "Acende as velas por ordem (data mais antiga → mais recente)."
          );
        });
      },
    });
  }

  if (!AFRAME.components["candle-light-date-level2"]) {
    AFRAME.registerComponent("candle-light-date-level2", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (this.lit) return;

          if (!hasLighter) {
            playSfx("sfx-hmm-reflexion", 0.75);
            setMsg(
              "❌ Precisas do isqueiro para acender velas!",
              "#ff0000",
              2000,
              "Procura o isqueiro primeiro."
            );
            return;
          }

          const expectedEl = requiredCandleOrder[candlesLit];
          if (!expectedEl) {
            setMsg("Erro interno: ordem das velas inválida.", "#ff0000");
            return;
          }

          // Regra do puzzle: datas (mais antiga -> mais recente)
          if (this.el !== expectedEl) {
            playSfx("sfx-hmm-reflexion", 0.7);
            setMsg(
              "❌ Ordem errada! Tens de seguir as datas (antiga → recente).",
              "#ff0000"
            );

            setTimeout(() => {
              resetCandles();
              setMsg("Tenta novamente: antiga → recente.", "white");
            }, 1200);
            return;
          }

          // Acerto: marca vela como acesa, atualiza HUD e efeitos
          this.lit = true;
          candlesLit++;

          if (candlesSpan) candlesSpan.textContent = String(candlesLit);
          playSfx("sfx-light-candle", 0.75);

          const flameEl = flamesByCandleId.get(this.el.id);
          flameEl?.setAttribute("visible", "true");

          // Luz extra local para dar efeito de chama
          const light = document.createElement("a-light");
          light.classList.add("candle-flame-light");
          light.setAttribute("type", "point");
          light.setAttribute("intensity", "0.8");
          light.setAttribute("color", "#ff6600");
          light.setAttribute("distance", "3");
          this.el.parentElement?.appendChild(light);

          setMsg("✅ Vela acesa!", "#00ff00");

          if (candlesLit === 4) {
            setTimeout(() => {
              setMsg(
                "🔥 Ordem correta! A porta está destrancada — clica nela!",
                "#00ff00"
              );
              document.getElementById("door")?.classList.add("unlocked");
            }, 600);
            return;
          }

          setTimeout(() => {
            setMsg("Boa! Continua (antiga → recente).", "white");
          }, 1200);
        });
      },
    });
  }

  if (!AFRAME.components["door-system-level2"]) {
    AFRAME.registerComponent("door-system-level2", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (candlesLit === 4) {
            setMsg("✅ NÍVEL 2 CONCLUÍDO!", "#00ff00");
            if (msgDiv) msgDiv.style.fontSize = "24px";

            playSfx("sfx-door-open", 0.75);

            const pivot = document.getElementById("doorPivot");
            pivot?.setAttribute("animation__open", {
              property: "rotation",
              to: "0 -105 0",
              dur: 900,
              easing: "easeOutQuad",
            });

            setTimeout(() => {
              stopLevelTimer();
              unlockLevel(3);
              window.location.href = "nivel3-simples.html";
            }, 2000);
            return;
          }

          playSfx("sfx-door-locked", 0.75);
          showDoorLockedText();
          setMsg(
            "❌ Ainda faltam velas. Segue as datas (antiga → recente).",
            "#ff0000",
            2000,
            "Encontra o isqueiro e acende por ordem (data mais antiga → mais recente)."
          );
        });
      },
    });
  }

  // ---------- Bind de componentes ----------
  document
    .querySelectorAll(".candle")
    .forEach((c) => c.setAttribute("candle-light-date-level2", ""));

  document
    .getElementById("lighter-drawer")
    ?.setAttribute("drawer-open-level2", "");
  document.getElementById("lighter")?.setAttribute("lighter-pickup-level2", "");
  doorEl?.setAttribute("door-system-level2", "");

  const sceneEl = document.querySelector("a-scene");
  if (sceneEl) {
    const run = () => applyTextures();
    if (sceneEl.hasLoaded) run();
    else sceneEl.addEventListener("loaded", run, { once: true });
  }

  setMsg(
    "Encontra o isqueiro e acende por ordem (data mais antiga → mais recente).",
    "white"
  );
});
