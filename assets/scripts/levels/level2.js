window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(2, "../index-simples.html");

  // --- Estado do nível ---
  let candlesLit = 0;
  let hasLighter = false;

  // Ordem mais "engraçada" (não é 1-2-3-4) -> refere-se aos NÚMEROS das velas
  const REQUIRED_SEQUENCE = [2, 4, 1, 3];

  // --- UI ---
  const candlesSpan = document.getElementById("candles");
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");

  startLevelTimer({
    seconds: 120,
    onTimeout: () => {
      msgDiv.textContent = "⏰ Tempo esgotado! A recomeçar o nível...";
      msgDiv.style.color = "#ff0000";
      setTimeout(() => location.reload(), 1500);
    },
  });

  function setMsg(text, color = "white", msToReset = 0, resetText = null) {
    msgDiv.textContent = text;
    msgDiv.style.color = color;

    if (msToReset > 0) {
      setTimeout(() => {
        msgDiv.textContent = resetText ?? text;
        msgDiv.style.color = "white";
      }, msToReset);
    }
  }

  // --- Isqueiro (apanhar) ---
  if (!AFRAME.components["lighter-pickup"]) {
    AFRAME.registerComponent("lighter-pickup", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (hasLighter) return;

          hasLighter = true;
          this.el.setAttribute("visible", "false");

          setMsg(
            "✅ Apanhaste o isqueiro! Agora podes acender velas.",
            "#00ff00",
            2000,
            "Segue a pista do quadro."
          );
        });
      },
    });
  }

  // --- Quadro (revelar ordem) ---
  if (!AFRAME.components["board-hint"]) {
    AFRAME.registerComponent("board-hint", {
      init: function () {
        this.el.addEventListener("click", () => {
          const orderTextEl = document.getElementById("order-text");
          if (!orderTextEl) {
            setMsg(
              "⚠️ Erro: texto do quadro não encontrado (order-text).",
              "#ff0000"
            );
            return;
          }

          // Mostra a ordem durante 7s
          orderTextEl.setAttribute("visible", "true");
          setMsg(
            "📜 Pista revelada no quadro!",
            "#ffff00",
            2000,
            "Segue a pista do quadro."
          );
        });
      },
    });
  }

  // --- Velas (acender com validação) ---
  if (!AFRAME.components["candle-light-seq"]) {
    AFRAME.registerComponent("candle-light-seq", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (this.lit) return;

          if (!hasLighter) {
            setMsg(
              "❌ Precisas do isqueiro para acender velas!",
              "#ff0000",
              2000,
              "Procura o isqueiro primeiro."
            );
            return;
          }

          // Número da vela (1..4) vem do data-order do HTML
          const candleNumber = parseInt(this.el.getAttribute("data-order"), 10);
          const expectedNumber = REQUIRED_SEQUENCE[candlesLit];

          // Valida ordem
          if (candleNumber !== expectedNumber) {
            setMsg(
              `❌ Ordem errada! Estavas a tentar acender a vela ${candleNumber}.`,
              "#ff0000"
            );
            setTimeout(() => location.reload(), 1800);
            return;
          }

          // Acertou
          this.lit = true;
          candlesLit++;
          candlesSpan.textContent = candlesLit;

          const flameId = "flame" + candleNumber;
          const flameEl = document.getElementById(flameId);
          if (flameEl) flameEl.setAttribute("visible", "true");

          // Luz extra junto à vela
          const light = document.createElement("a-light");
          light.setAttribute("type", "point");
          light.setAttribute("intensity", "0.8");
          light.setAttribute("color", "#ff6600");
          light.setAttribute("distance", "3");
          this.el.parentElement.appendChild(light);

          setMsg(`✅ Vela ${candleNumber} acesa!`, "#00ff00");

          if (candlesLit === 4) {
            setTimeout(() => {
              setMsg(
                "🔥 Todas acesas! A porta está destrancada — clica nela!",
                "#00ff00"
              );
              const door = document.getElementById("door");
              if (door) door.classList.add("unlocked");
            }, 600);
          } else {
            setTimeout(() => {
              setMsg("Boa! Continua a seguir a pista do quadro.", "white");
            }, 1200);
          }
        });
      },
    });
  }

  // --- Porta ---
  if (!AFRAME.components["door-system-level2"]) {
    AFRAME.registerComponent("door-system-level2", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (candlesLit === 4) {
            setMsg("✅ NÍVEL 2 CONCLUÍDO!", "#00ff00");
            msgDiv.style.fontSize = "24px";

            this.el.setAttribute("animation", {
              property: "position",
              to: "0 5 -15",
              dur: 1000,
            });

            setTimeout(() => {
              stopLevelTimer();
              unlockLevel(3);
              window.location.href = "nivel3-simples.html";
            }, 2000);
          } else {
            setMsg(
              "❌ Ainda faltam velas. Segue a pista do quadro.",
              "#ff0000",
              2000,
              "Segue a pista do quadro."
            );
          }
        });
      },
    });
  }

  // --- Ativar componentes nos elementos ---
  document
    .querySelectorAll(".candle")
    .forEach((c) => c.setAttribute("candle-light-seq", ""));

  const lighterEl = document.getElementById("lighter");
  if (lighterEl) lighterEl.setAttribute("lighter-pickup", "");

  // Ativa o componente no entity e também na placa (a-plane)
  const boardEl = document.getElementById("order-board");
  if (boardEl) boardEl.setAttribute("board-hint", "");

  const boardPlane = document.querySelector("#order-board a-plane");
  if (boardPlane) boardPlane.setAttribute("board-hint", "");

  if (doorEl) doorEl.setAttribute("door-system-level2", "");

  // Mensagem inicial
  setMsg("Procura o isqueiro e segue a pista do quadro.", "white");
});
