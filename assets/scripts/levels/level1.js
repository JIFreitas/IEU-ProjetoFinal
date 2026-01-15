window.addEventListener("DOMContentLoaded", () => {
  // Estado do nível: número de chaves apanhadas
  let keysFound = 0;

  // Referências a elementos UI/A-Frame usados ao longo do nível
  const keysSpan = document.getElementById("keys");
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");
  const doorPivotEl = document.getElementById("doorPivot");
  const doorTextEl = document.getElementById("door-text");
  const doorTextBgEl = document.getElementById("door-text-bg");

  // SFX (áudio) já presente no HTML
  const sfxKey = document.getElementById("sfx-key");
  const sfxDoorOpen = document.getElementById("sfx-door-open");
  const sfxDoorLocked = document.getElementById("sfx-door-locked");
  const sfxDrawerOpen = document.getElementById("sfx-drawer-open");
  const sfxBoxOpen = document.getElementById("sfx-box-open");
  const sfxWakeup = document.getElementById("sfx-wakeup");

  /**
   * Helper para mensagens do nível (HUD):
   * - `msToReset`: se > 0, ao fim desse tempo volta a cor para branco.
   * - `resetText`: se fornecido, substitui o texto no reset.
   */
  function setMsg(
    text,
    { color = "white", fontSize = "18px", msToReset = 0, resetText = "" } = {}
  ) {
    if (!msgDiv) return;

    msgDiv.textContent = text;
    msgDiv.style.color = color;
    msgDiv.style.fontSize = fontSize;

    if (msToReset > 0) {
      window.setTimeout(() => {
        if (resetText) msgDiv.textContent = resetText;
        msgDiv.style.color = "white";
      }, msToReset);
    }
  }

  /**
   * Reprodução de SFX:
   * - repõe o áudio no início
   * - ignora falhas típicas de autoplay/permissões
   */
  function playSfx(audioEl) {
    if (!audioEl) return;

    try {
      audioEl.currentTime = 0;
    } catch {
      // Alguns browsers podem bloquear/impedir reset de currentTime em certos estados.
    }

    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  /**
   * Mostra por instantes o texto de "porta trancada" (elementos A-Frame).
   */
  function showDoorLockedText() {
    doorTextEl?.setAttribute("visible", "true");
    doorTextBgEl?.setAttribute("visible", "true");

    window.setTimeout(() => {
      doorTextEl?.setAttribute("visible", "false");
      doorTextBgEl?.setAttribute("visible", "false");
    }, 1200);
  }

  // ---------- Visuals (texturas procedurais + intro) ----------
  const scene = document.querySelector("a-scene");

  // Clamp [0..1] para trabalhar com canais RGB normalizados
  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  /**
   * Adiciona ruído simples a um canvas (efeito “grão”).
   * Nota: mexe diretamente nos canais de cor; alpha mantém-se.
   */
  function drawNoise(ctx, w, h, amount = 0.18) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() * 2 - 1) * 255 * amount;
      d[i] = clamp01((d[i] + n) / 255) * 255;
      d[i + 1] = clamp01((d[i + 1] + n) / 255) * 255;
      d[i + 2] = clamp01((d[i + 2] + n) / 255) * 255;
    }

    ctx.putImageData(img, 0, 0);
  }

  /**
   * Textura do chão: tábuas verticais com juntas, riscos e vinheta.
   */
  function buildFloorTexture(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#2a1a11";
    ctx.fillRect(0, 0, w, h);

    const plankW = 18;
    for (let x = 0; x < w; x += plankW) {
      const alt = (x / plankW) % 2;
      ctx.fillStyle = alt ? "#331f13" : "#2a190f";
      ctx.fillRect(x, 0, plankW, h);

      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + plankW - 1, 0);
      ctx.lineTo(x + plankW - 1, h);
      ctx.stroke();

      ctx.strokeStyle = "rgba(120, 80, 40, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const yy = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(x + 2, yy);
        ctx.lineTo(x + plankW - 2, yy + (Math.random() * 10 - 5));
        ctx.stroke();
      }

      for (let i = 0; i < 2; i++) {
        const cx = x + Math.random() * plankW;
        const cy = Math.random() * h;
        const rr = 6 + Math.random() * 14;
        const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, rr);
        grd.addColorStop(0, "rgba(0,0,0,0.12)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      40,
      w / 2,
      h / 2,
      w * 0.75
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    drawNoise(ctx, w, h, 0.14);
  }

  /**
   * Textura do teto: padrão de placas + manchas de humidade.
   */
  function buildCeilingTexture(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#3a332d";
    ctx.fillRect(0, 0, w, h);

    const tile = 32;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const alt = (x / tile + y / tile) % 2;
        ctx.fillStyle = alt ? "#3f3731" : "#332c27";
        ctx.fillRect(x, y, tile, tile);
      }
    }

    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;

    for (let x = 0; x <= w; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    for (let i = 0; i < 18; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const rr = 18 + Math.random() * 42;
      const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, rr);
      grd.addColorStop(0, "rgba(0,0,0,0.28)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    drawNoise(ctx, w, h, 0.12);
  }

  /**
   * Textura da parede: variação de reboco + fissuras horizontais.
   */
  function buildWallTexture(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#5a3b29";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 320; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 2 + Math.random() * 10;
      const a = 0.02 + Math.random() * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let y = 18; y < h; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() * 4 - 2));
      ctx.stroke();
    }

    drawNoise(ctx, w, h, 0.12);
  }

  /**
   * Textura de madeira: veios verticais + nós.
   */
  function buildWoodTexture(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#6a3f22";
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < w; x += 2) {
      const t = x / w;
      const wave = Math.sin(t * Math.PI * 6) * 10;
      const c = 50 + Math.floor(30 * Math.sin(t * Math.PI * 2 + 0.7));
      ctx.strokeStyle = `rgba(${c}, ${c - 12}, ${c - 24}, 0.22)`;
      ctx.beginPath();
      ctx.moveTo(x + wave * 0.05, 0);
      ctx.lineTo(x + wave * 0.05, h);
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const rr = 18 + Math.random() * 30;
      const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, rr);
      grd.addColorStop(0, "rgba(0,0,0,0.22)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    drawNoise(ctx, w, h, 0.1);
  }

  /**
   * Aplica as texturas aos materiais A-Frame.
   * Deve correr após o `a-scene` estar carregado, para garantir que os assets existem.
   */
  function applyProceduralTextures() {
    const floorCanvas = document.getElementById("tex-floor");
    const wallCanvas = document.getElementById("tex-wall");
    const woodCanvas = document.getElementById("tex-wood");
    const ceilingCanvas = document.getElementById("tex-ceiling");

    buildFloorTexture(floorCanvas);
    buildWallTexture(wallCanvas);
    buildWoodTexture(woodCanvas);
    buildCeilingTexture(ceilingCanvas);

    document
      .getElementById("floor")
      ?.setAttribute(
        "material",
        "shader: standard; src: #tex-floor; repeat: 7 7; roughness: 0.98; metalness: 0"
      );

    document
      .getElementById("ceiling")
      ?.setAttribute(
        "material",
        "shader: standard; src: #tex-ceiling; repeat: 5 5; roughness: 1; metalness: 0.02"
      );

    document.querySelectorAll(".wall").forEach((wallEl) => {
      wallEl.setAttribute(
        "material",
        "shader: standard; src: #tex-wall; repeat: 3 1; roughness: 0.95; metalness: 0"
      );
    });

    // Madeira em objetos específicos para consistência visual (porta/móveis)
    const woodTargets = [
      "#dresser",
      "#drawer1",
      "#boxBase",
      "#boxLid",
      "#pictureFrame1",
    ];

    woodTargets.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;

      el.setAttribute(
        "material",
        "shader: standard; src: #tex-wood; repeat: 1 1; roughness: 0.85; metalness: 0.05"
      );
    });
  }

  /**
   * O timer só começa após a intro (para não penalizar o jogador no ecrã inicial).
   */
  function startLevelTimerNow() {
    startLevelTimer({
      seconds: 90,
      onTimeout: () => {
        setMsg("⏰ Tempo esgotado! A recomeçar o nível...", {
          color: "#ff0000",
          msToReset: 0,
        });
        setTimeout(() => location.reload(), 1500);
      },
    });
  }

  /**
   * Intro “piscar de olhos”:
   * - bloqueia temporariamente controlos
   * - aguarda o primeiro gesto do jogador (clicar/tecla/toque) para permitir som
   * - anima a câmara e só depois inicia o timer
   */
  function runIntroBlink() {
    const overlay = document.getElementById("intro-overlay");
    if (!overlay) {
      startLevelTimerNow();
      return;
    }

    const cam = document.getElementById("player-camera");
    const rig = document.getElementById("rig");

    const originalMovementControls = rig
      ? rig.getAttribute("movement-controls")
      : null;

    // Congela controlos durante a intro (sem pausar a cena para a animação funcionar)
    if (rig) rig.removeAttribute("movement-controls");
    if (cam)
      cam.setAttribute("look-controls", {
        enabled: false,
        pointerLockEnabled: false,
      });

    // Começa a olhar para o chão (efeito de “acordar”)
    cam?.setAttribute("rotation", "-60 0 0");

    // Estado inicial: overlay ativo e à espera do gesto do jogador
    overlay.style.display = "block";
    overlay.classList.remove("play");
    overlay.classList.add("wait");

    let started = false;
    const start = () => {
      if (started) return;
      started = true;

      overlay.classList.remove("wait");
      overlay.classList.add("play");

      // Som do “acordar” ao primeiro gesto (evita bloqueios de autoplay)
      playSfx(sfxWakeup);

      // Anima para olhar em frente (porta)
      cam?.setAttribute("animation__wakeup", {
        property: "rotation",
        to: "0 0 0",
        dur: 950,
        easing: "easeOutCubic",
      });

      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("keydown", start, true);
      window.removeEventListener("touchstart", start, true);

      // No fim: esconder overlay, reativar controlos e iniciar timer
      window.setTimeout(() => {
        overlay.classList.remove("play");
        overlay.style.display = "none";

        cam?.setAttribute("look-controls", {
          enabled: true,
          pointerLockEnabled: false,
        });

        if (rig && originalMovementControls) {
          rig.setAttribute("movement-controls", originalMovementControls);
        }

        startLevelTimerNow();
      }, 2600);
    };

    // capture=true para apanhar o primeiro gesto o mais cedo possível
    window.addEventListener("pointerdown", start, true);
    window.addEventListener("keydown", start, true);
    window.addEventListener("touchstart", start, true);
  }

  // Aplicar materiais apenas quando a cena estiver carregada
  if (scene?.hasLoaded) {
    applyProceduralTextures();
    runIntroBlink();
  } else if (scene) {
    scene.addEventListener(
      "loaded",
      () => {
        applyProceduralTextures();
        runIntroBlink();
      },
      { once: true }
    );
  } else {
    applyProceduralTextures();
    runIntroBlink();
  }

  /**
   * Revela uma chave (torna-a visível) e, opcionalmente, mostra uma mensagem.
   */
  function revealKey(keyId, message) {
    document.getElementById(keyId)?.setAttribute("visible", "true");

    if (message) {
      setMsg(message, { color: "#ffaa00", fontSize: "18px" });
    }
  }

  // ---------- Componentes A-Frame ----------
  // Chaves: apanhar e atualizar progresso
  if (!AFRAME.components["key-pickup"]) {
    AFRAME.registerComponent("key-pickup", {
      init: function () {
        this.picked = false;

        this.el.addEventListener("click", () => {
          if (this.picked) return;

          // Se estiver invisível, não apanha (ex.: ainda não foi revelada)
          if (this.el.getAttribute("visible") === false) return;

          this.picked = true;
          keysFound++;

          if (keysSpan) keysSpan.textContent = String(keysFound);
          playSfx(sfxKey);

          this.el.setAttribute("visible", "false");
          setMsg(`Chave apanhada! (${keysFound}/3)`, {
            color: "#00ff00",
            fontSize: "18px",
          });

          if (keysFound === 3) {
            setTimeout(() => {
              setMsg("Tens as 3 chaves! Agora abre a porta!", {
                color: "#00ff00",
              });
              doorEl?.classList.add("unlocked");
            }, 600);
            return;
          }

          setTimeout(() => {
            setMsg("Continua a procurar...", { color: "white" });
          }, 1200);
        });
      },
    });
  }

  // Gaveta: abre e revela a key1
  if (!AFRAME.components["drawer-open"]) {
    AFRAME.registerComponent("drawer-open", {
      init: function () {
        this.opened = false;

        this.el.addEventListener("click", () => {
          if (this.opened) return;
          this.opened = true;

          playSfx(sfxDrawerOpen);

          this.el.setAttribute("animation", {
            property: "position",
            to: "3.9 0.55 2.45",
            dur: 650,
            easing: "easeOutQuad",
          });

          revealKey("key1", "A gaveta abriu... está aqui uma chave!");
        });
      },
    });
  }

  // Caixa: abre tampa e revela a key2
  if (!AFRAME.components["box-open"]) {
    AFRAME.registerComponent("box-open", {
      init: function () {
        this.opened = false;

        this.el.addEventListener("click", () => {
          if (this.opened) return;
          this.opened = true;

          playSfx(sfxBoxOpen);

          this.el.setAttribute("animation", {
            property: "rotation",
            to: "-80 0 0",
            dur: 700,
            easing: "easeOutQuad",
          });

          revealKey("key2", "Abriste a caixa... há uma chave lá dentro!");
        });
      },
    });
  }

  // Quadro: desliza e revela a key3
  if (!AFRAME.components["picture-slide"]) {
    AFRAME.registerComponent("picture-slide", {
      init: function () {
        this.moved = false;

        this.el.addEventListener("click", () => {
          if (this.moved) return;
          this.moved = true;

          playSfx(sfxDrawerOpen);

          this.el.setAttribute("animation", {
            property: "position",
            to: "3.0 2 -6.85",
            dur: 700,
            easing: "easeOutQuad",
          });

          revealKey("key3", "🖼️ O quadro mexeu... estava uma chave escondida!");
        });
      },
    });
  }

  // Porta: só abre quando tiveres as 3 chaves
  if (!AFRAME.components["door-system"]) {
    AFRAME.registerComponent("door-system", {
      init: function () {
        this.opened = false;

        this.el.addEventListener("click", () => {
          if (this.opened) return;

          if (keysFound === 3) {
            this.opened = true;

            setMsg("🚪 Porta destrancada! A avançar...", {
              color: "#00ff00",
              fontSize: "24px",
            });

            doorTextEl?.setAttribute("visible", "false");
            doorTextBgEl?.setAttribute("visible", "false");

            playSfx(sfxDoorOpen);

            const doorToAnimate = doorPivotEl || this.el;
            doorToAnimate.setAttribute("animation", {
              property: "rotation",
              to: "0 -95 0",
              dur: 850,
              easing: "easeOutQuad",
            });

            setTimeout(() => {
              stopLevelTimer();
              unlockLevel(2);
              window.location.href = "nivel2-simples.html";
            }, 1800);
            return;
          }

          playSfx(sfxDoorLocked);
          showDoorLockedText();

          setMsg(`Faltam ${3 - keysFound} chaves.`, {
            color: "#ff0000",
            fontSize: "18px",
          });

          setTimeout(() => {
            setMsg("Continua a procurar...", { color: "white" });
          }, 1200);
        });
      },
    });
  }

  // ---------- Bind de componentes ----------
  document
    .querySelectorAll(".key")
    .forEach((k) => k.setAttribute("key-pickup", ""));

  document.getElementById("drawer1")?.setAttribute("drawer-open", "");
  document.getElementById("boxLid")?.setAttribute("box-open", "");
  document.getElementById("picture1")?.setAttribute("picture-slide", "");
  doorEl?.setAttribute("door-system", "");
});
