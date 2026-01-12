window.addEventListener("DOMContentLoaded", () => {
  let keysFound = 0;
  const keysSpan = document.getElementById("keys");
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");

  startLevelTimer({
    seconds: 90,
    onTimeout: () => {
      msgDiv.textContent = "⏰ Tempo esgotado! A recomeçar o nível...";
      msgDiv.style.color = "#ff0000";
      setTimeout(() => location.reload(), 1500);
    },
  });

  // Evita erro se o componente já existir (boas práticas)
  if (!AFRAME.components["key-pickup"]) {
    AFRAME.registerComponent("key-pickup", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (this.picked) return;

          this.picked = true;
          keysFound++;
          keysSpan.textContent = keysFound;

          this.el.setAttribute("visible", "false");

          msgDiv.textContent = `Chave coletada! (${keysFound}/3)`;
          msgDiv.style.color = "#00ff00";

          if (keysFound === 3) {
            setTimeout(() => {
              msgDiv.textContent = "PORTA ABERTA! Clique nela!";
              document.getElementById("door").classList.add("unlocked");
            }, 500);
          } else {
            setTimeout(() => {
              msgDiv.textContent = "Encontre as outras chaves!";
              msgDiv.style.color = "white";
            }, 2000);
          }
        });
      },
    });
  }

  if (!AFRAME.components["door-system"]) {
    AFRAME.registerComponent("door-system", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (keysFound === 3) {
            msgDiv.textContent = "NÍVEL CONCLUÍDO! Parabéns!";
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
              // Estamos na pasta pages/, por isso basta o nome do ficheiro
              window.location.href = "nivel2-simples.html";
            }, 2000);
          } else {
            msgDiv.textContent = `Você precisa de ${3 - keysFound} chaves!`;
            msgDiv.style.color = "#ff0000";
            setTimeout(() => {
              msgDiv.textContent = "Encontre as chaves!";
              msgDiv.style.color = "white";
            }, 2000);
          }
        });
      },
    });
  }

  // Ativar componentes nos elementos
  document
    .querySelectorAll(".key")
    .forEach((key) => key.setAttribute("key-pickup", ""));

  if (doorEl) doorEl.setAttribute("door-system", "");
});
