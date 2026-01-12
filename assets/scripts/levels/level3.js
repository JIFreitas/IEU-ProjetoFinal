window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(3, "../index-simples.html");

  let cluesFound = 0;
  let code = "";
  const correctCode = "3719";

  const cluesSpan = document.getElementById("clues");
  const msgDiv = document.getElementById("msg");

  startLevelTimer({
    seconds: 150,
    onTimeout: () => {
      msgDiv.textContent = "⏰ Tempo esgotado! A recomeçar o nível...";
      msgDiv.style.color = "#ff0000";
      setTimeout(() => location.reload(), 1500);
    },
  });

  AFRAME.registerComponent("clue-finder", {
    init: function () {
      this.el.addEventListener("click", () => {
        if (this.found) return;

        this.found = true;
        cluesFound++;
        cluesSpan.textContent = cluesFound;

        const digit = this.el.getAttribute("data-digit");
        code += digit;

        const parent = this.el.parentElement;
        const text = parent.querySelector("a-text");
        text.setAttribute("value", digit);
        text.setAttribute("color", "#00ff00");

        msgDiv.textContent = `Pista encontrada: ${digit}`;
        msgDiv.style.color = "#00ff00";

        if (cluesFound === 4) {
          setTimeout(() => {
            msgDiv.textContent = "TODAS AS PISTAS! Clique no terminal!";
            msgDiv.style.fontSize = "24px";

            document.getElementById("terminal").classList.add("unlocked");
            document
              .querySelector("#terminal a-text")
              .setAttribute("value", "TERMINAL\n[CLIQUE AQUI]");
            document
              .querySelector("#terminal a-text")
              .setAttribute("color", "#ffff00");
          }, 1000);
        } else {
          setTimeout(() => {
            msgDiv.textContent = `${4 - cluesFound} pistas restantes`;
            msgDiv.style.color = "white";
          }, 2000);
        }
      });
    },
  });

  AFRAME.registerComponent("terminal-system", {
    init: function () {
      this.el.addEventListener("click", () => {
        if (cluesFound === 4) {
          document.getElementById("code-input").style.display = "block";
          document.getElementById("code").focus();
        } else {
          msgDiv.textContent = "Terminal trancado! Encontre todas as pistas!";
          msgDiv.style.color = "#ff0000";
          setTimeout(() => {
            msgDiv.textContent = `Pistas: ${cluesFound}/4`;
            msgDiv.style.color = "white";
          }, 2000);
        }
      });
    },
  });

  window.checkCode = function () {
    const input = document.getElementById("code").value;
    const codeMsg = document.getElementById("code-msg");

    if (input === correctCode) {
      codeMsg.innerHTML =
        '<h2 style="color: #00ff00;">✓ CÓDIGO CORRETO!</h2><p>PARABÉNS! VOCÊ ESCAPOU!</p>';

      setTimeout(() => {
        stopLevelTimer();
        alert("🎉 VOCÊ COMPLETOU TODOS OS NÍVEIS! 🎉");
        resetProgress();
        window.location.href = "../index-simples.html";
      }, 2000);
    } else {
      codeMsg.innerHTML =
        '<p style="color: #ff0000;">✗ Código errado! Tente novamente.</p>';
      document.getElementById("code").value = "";
    }
  };

  document.getElementById("code").addEventListener("keypress", (e) => {
    if (e.key === "Enter") window.checkCode();
  });

  document
    .querySelectorAll(".clue")
    .forEach((clue) => clue.setAttribute("clue-finder", ""));
  document.getElementById("terminal").setAttribute("terminal-system", "");
});
