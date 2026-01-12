window.addEventListener("DOMContentLoaded", () => {
  let keysFound = 0;

  const keysSpan = document.getElementById("keys");
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");

  // ===== Timer =====
  startLevelTimer({
    seconds: 90,
    onTimeout: () => {
      msgDiv.textContent = "⏰ Tempo esgotado! A recomeçar o nível...";
      msgDiv.style.color = "#ff0000";
      setTimeout(() => location.reload(), 1500);
    },
  });

  // ===== Utilitário: revelar chaves =====
  function revealKey(keyId, message) {
    const el = document.getElementById(keyId);
    if (el) el.setAttribute("visible", "true");

    if (message) {
      msgDiv.textContent = message;
      msgDiv.style.color = "#ffaa00";
      msgDiv.style.fontSize = "18px";
    }
  }

  // ===== 1) Apanhar chave =====
  if (!AFRAME.components["key-pickup"]) {
    AFRAME.registerComponent("key-pickup", {
      init: function () {
        this.picked = false;

        this.el.addEventListener("click", () => {
          if (this.picked) return;

          // Se estiver invisível, não apanha
          if (this.el.getAttribute("visible") === false) return;

          this.picked = true;
          keysFound++;
          keysSpan.textContent = keysFound;

          this.el.setAttribute("visible", "false");

          msgDiv.textContent = `🔑 Chave apanhada! (${keysFound}/3)`;
          msgDiv.style.color = "#00ff00";
          msgDiv.style.fontSize = "18px";

          if (keysFound === 3) {
            setTimeout(() => {
              msgDiv.textContent = "✅ Tens as 3 chaves! Agora abre a porta!";
              msgDiv.style.color = "#00ff00";
              doorEl?.classList.add("unlocked");
            }, 600);
          } else {
            setTimeout(() => {
              msgDiv.textContent = "Continua a procurar...";
              msgDiv.style.color = "white";
            }, 1200);
          }
        });
      },
    });
  }

  // ===== 2) Gaveta (abre e revela key1) =====
  if (!AFRAME.components["drawer-open"]) {
    AFRAME.registerComponent("drawer-open", {
      init: function () {
        this.opened = false;

        this.el.addEventListener("click", () => {
          if (this.opened) return;
          this.opened = true;

          this.el.setAttribute("animation", {
            property: "position",
            to: "-3 0.55 -2.35", // puxa a gaveta para fora
            dur: 650,
            easing: "easeOutQuad",
          });

          revealKey("key1", "👀 A gaveta abriu... está aqui uma chave!");
        });
      },
    });
  }

  // ===== 3) Caixa (abre tampa e revela key2) =====
  if (!AFRAME.components["box-open"]) {
    AFRAME.registerComponent("box-open", {
      init: function () {
        this.opened = false;

        this.el.addEventListener("click", () => {
          if (this.opened) return;
          this.opened = true;

          this.el.setAttribute("animation", {
            property: "rotation",
            to: "-80 0 0", // levanta a tampa
            dur: 700,
            easing: "easeOutQuad",
          });

          revealKey("key2", "📦 Abriste a caixa... há uma chave lá dentro!");
        });
      },
    });
  }

  // ===== 4) Quadro (desliza e revela key3) =====
  if (!AFRAME.components["picture-slide"]) {
    AFRAME.registerComponent("picture-slide", {
      init: function () {
        this.moved = false;

        this.el.addEventListener("click", () => {
          if (this.moved) return;
          this.moved = true;

          this.el.setAttribute("animation", {
            property: "position",
            to: "1.6 2 -6.85", // desliza para a direita
            dur: 700,
            easing: "easeOutQuad",
          });

          revealKey("key3", "🖼️ O quadro mexeu... estava uma chave escondida!");
        });
      },
    });
  }

  // ===== 5) Porta =====
  if (!AFRAME.components["door-system"]) {
    AFRAME.registerComponent("door-system", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (keysFound === 3) {
            msgDiv.textContent = "🚪 Porta destrancada! A avançar...";
            msgDiv.style.color = "#00ff00";
            msgDiv.style.fontSize = "24px";

            this.el.setAttribute("animation", {
              property: "position",
              to: "0 5 -6.9",
              dur: 1000,
            });

            setTimeout(() => {
              stopLevelTimer();
              unlockLevel(2);
              window.location.href = "nivel2-simples.html";
            }, 1800);
          } else {
            msgDiv.textContent = `❌ Faltam ${3 - keysFound} chaves.`;
            msgDiv.style.color = "#ff0000";
            msgDiv.style.fontSize = "18px";

            setTimeout(() => {
              msgDiv.textContent = "Continua a procurar...";
              msgDiv.style.color = "white";
            }, 1200);
          }
        });
      },
    });
  }

  // ===== Bind componentes =====

  // Chaves
  document.querySelectorAll(".key").forEach((k) => k.setAttribute("key-pickup", ""));

  // Gaveta
  const drawer = document.getElementById("drawer1");
  if (drawer) drawer.setAttribute("drawer-open", "");

  // Tampa da caixa
  const lid = document.getElementById("boxLid");
  if (lid) lid.setAttribute("box-open", "");

  // Quadro
  const picture = document.getElementById("picture1");
  if (picture) picture.setAttribute("picture-slide", "");

  // Porta
  if (doorEl) doorEl.setAttribute("door-system", "");
});