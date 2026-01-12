window.addEventListener("DOMContentLoaded", () => {
  requireUnlockedLevel(3, "../index-simples.html");

  // --- Estado ---
  let cluesFound = 0;

  // Código correto (mantive o teu)
  const correctCode = "3719";

  // Guardar os dígitos por POSIÇÃO (1..4)
  // Ex.: slotDigits[0] = "3" (1º dígito)
  const slotDigits = ["_", "_", "_", "_"];

  // --- UI ---
  const cluesSpan = document.getElementById("clues");
  const msgDiv = document.getElementById("msg");
  const terminalSlotsText = document.getElementById("terminal-slots-text");
  const terminalStatusText = document.getElementById("terminal-status-text");

  startLevelTimer({
    seconds: 150,
    onTimeout: () => {
      msgDiv.textContent = "⏰ Tempo esgotado! A recomeçar o nível...";
      msgDiv.style.color = "#ff0000";
      setTimeout(() => location.reload(), 1500);
    },
  });

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

  function updateTerminalSlots() {
    // Mostra algo tipo: 3 7 _ 9
    terminalSlotsText.setAttribute("value", slotDigits.join(" "));
  }

  function allSlotsFilled() {
    return slotDigits.every((d) => d !== "_");
  }

  // --- Pistas (papéis) ---
  // Cada pista tem:
  // data-pos="1..4"  (posição do dígito)
  // data-digit="0..9"
  if (!AFRAME.components["clue-paper"]) {
    AFRAME.registerComponent("clue-paper", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (this.found) return;

          const digit = this.el.getAttribute("data-digit");
          const pos = parseInt(this.el.getAttribute("data-pos"), 10);

          if (!digit || !pos || pos < 1 || pos > 4) {
            setMsg("⚠️ Pista inválida (data-digit/data-pos).", "#ff0000");
            return;
          }

          this.found = true;

          // Preenche slot
          slotDigits[pos - 1] = digit;
          cluesFound++;
          cluesSpan.textContent = cluesFound;

          // Feedback visual na pista (vira verde e troca texto)
          const t = this.el.querySelector("a-text");
          if (t) {
            t.setAttribute("value", `✓ ${pos}º: ${digit}`);
            t.setAttribute("color", "#00ff00");
          }
          this.el.setAttribute("material", "color", "#1b3a1b");

          updateTerminalSlots();

          setMsg(
            `📄 Encontraste o ${pos}º dígito!`,
            "#00ff00",
            1200,
            "Procura as restantes pistas."
          );

          // Se já tens 4 pistas, destranca terminal
          if (cluesFound === 4 && allSlotsFilled()) {
            setTimeout(() => {
              const terminal = document.getElementById("terminal");
              terminal.classList.add("unlocked");

              terminalStatusText.setAttribute(
                "value",
                "TERMINAL\n[CLIQUE AQUI]"
              );
              terminalStatusText.setAttribute("color", "#ffff00");

              setMsg("✅ Tens os 4 dígitos! Vai ao terminal.", "#ffff00");
            }, 600);
          }
        });
      },
    });
  }

  // --- Terminal ---
  if (!AFRAME.components["terminal-system-level3"]) {
    AFRAME.registerComponent("terminal-system-level3", {
      init: function () {
        this.el.addEventListener("click", () => {
          if (allSlotsFilled()) {
            document.getElementById("code-input").style.display = "block";
            const input = document.getElementById("code");

            // Preenche automaticamente com o que o jogador descobriu (mais “escape room”)
            input.value = slotDigits.join("");
            input.focus();

            setMsg("⌨️ Confirma o código no terminal.", "#00ff00");
          } else {
            setMsg(
              "❌ Terminal trancado! Encontra as 4 pistas primeiro.",
              "#ff0000",
              1500,
              "Procura pistas na sala."
            );
          }
        });
      },
    });
  }

  // --- Verificar Código ---
  window.checkCode = function () {
    const input = document.getElementById("code").value.trim();
    const codeMsg = document.getElementById("code-msg");

    if (input === correctCode) {
      codeMsg.innerHTML =
        '<h2 style="color: #00ff00;">✓ CÓDIGO CORRETO!</h2><p>PARABÉNS! VOCÊ ESCAPOU!</p>';

      setTimeout(() => {
        stopLevelTimer();
        alert("🎉 VOCÊ COMPLETOU TODOS OS NÍVEIS! 🎉");
        resetProgress();
        window.location.href = "../index-simples.html";
      }, 1500);
    } else {
      codeMsg.innerHTML =
        '<p style="color: #ff0000;">✗ Código errado! Tenta novamente.</p>';
      document.getElementById("code").value = "";
    }
  };

  document.getElementById("code").addEventListener("keypress", (e) => {
    if (e.key === "Enter") window.checkCode();
  });

  // --- Ativar componentes ---
  document.querySelectorAll(".clue").forEach((el) => {
    el.setAttribute("clue-paper", "");
  });

  document.querySelectorAll(".clue a-plane").forEach((plane) => {
    plane.setAttribute("clue-paper", "");
  });

  document
    .getElementById("terminal")
    .setAttribute("terminal-system-level3", "");
});
