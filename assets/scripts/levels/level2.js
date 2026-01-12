window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(2, "../index-simples.html");

  let candlesLit = 0;
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

  if (!AFRAME.components["candle-light"]) {
    AFRAME.registerComponent("candle-light", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (this.lit) return;

          const order = parseInt(this.el.getAttribute("data-order"), 10);

          if (order === candlesLit + 1) {
            this.lit = true;
            candlesLit++;
            candlesSpan.textContent = candlesLit;

            const flameId = "flame" + order;
            const flameEl = document.getElementById(flameId);
            if (flameEl) flameEl.setAttribute("visible", "true");

            const light = document.createElement("a-light");
            light.setAttribute("type", "point");
            light.setAttribute("intensity", "0.8");
            light.setAttribute("color", "#ff6600");
            light.setAttribute("distance", "3");
            this.el.parentElement.appendChild(light);

            msgDiv.textContent = `Vela ${order} acesa! ✓`;
            msgDiv.style.color = "#00ff00";

            if (candlesLit === 4) {
              setTimeout(() => {
                msgDiv.textContent = "TODAS ACESAS! Clique na porta!";
                document.getElementById("door").classList.add("unlocked");
              }, 1000);
            } else {
              setTimeout(() => {
                msgDiv.textContent = `Acenda a vela ${candlesLit + 1}`;
                msgDiv.style.color = "white";
              }, 1500);
            }
          } else {
            msgDiv.textContent = "ERRADO! Acenda na ordem: 1→2→3→4";
            msgDiv.style.color = "#ff0000";
            setTimeout(() => location.reload(), 2000);
          }
        });
      },
    });
  }

  if (!AFRAME.components["door-system-level2"]) {
    AFRAME.registerComponent("door-system-level2", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (candlesLit === 4) {
            msgDiv.textContent = "NÍVEL 2 CONCLUÍDO!";
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
            msgDiv.textContent = "Acenda todas as 4 velas primeiro!";
            msgDiv.style.color = "#ff0000";
          }
        });
      },
    });
  }

  document
    .querySelectorAll(".candle")
    .forEach((candle) => candle.setAttribute("candle-light", ""));

  if (doorEl) doorEl.setAttribute("door-system-level2", "");
});
