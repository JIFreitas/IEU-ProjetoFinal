window.addEventListener("DOMContentLoaded", () => {
  let keysFound = 0;

  const keysSpan = document.getElementById("keys");
  const msgDiv = document.getElementById("msg");
  const doorEl = document.getElementById("door");
  const doorPivotEl = document.getElementById("doorPivot");
  const doorTextEl = document.getElementById("door-text");
  const doorTextBgEl = document.getElementById("door-text-bg");

  const sfxKey = document.getElementById("sfx-key");
  const sfxDoorOpen = document.getElementById("sfx-door-open");
  const sfxDoorLocked = document.getElementById("sfx-door-locked");
  const sfxDrawerOpen = document.getElementById("sfx-drawer-open");
  const sfxBoxOpen = document.getElementById("sfx-box-open");
  const sfxWakeup = document.getElementById("sfx-wakeup");

  function playSfx(audioEl) {
    if (!audioEl) return;
    try {
      audioEl.currentTime = 0;
    } catch {
      // ignore
    }
    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  function showDoorLockedText() {
    if (doorTextEl) doorTextEl.setAttribute("visible", "true");
    if (doorTextBgEl) doorTextBgEl.setAttribute("visible", "true");

    window.setTimeout(() => {
      if (doorTextEl) doorTextEl.setAttribute("visible", "false");
      if (doorTextBgEl) doorTextBgEl.setAttribute("visible", "false");
    }, 1200);
  }

  // ===== Visuals (texturas + intro) =====
  const scene = document.querySelector("a-scene");

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function drawNoise(ctx, w, h, amount = 0.18) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() * 2 - 1) * 255 * amount;
      d[i] = clamp01((d[i] + n) / 255) * 255;
      d[i + 1] = clamp01((d[i + 1] + n) / 255) * 255;
      d[i + 2] = clamp01((d[i + 2] + n) / 255) * 255;
      // alpha mantém
    }
    ctx.putImageData(img, 0, 0);
  }

  function buildFloorTexture(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#2a1a11";
    ctx.fillRect(0, 0, w, h);

    // tábuas verticais (mais visível)
    const plankW = 18;
    for (let x = 0; x < w; x += plankW) {
      const alt = (x / plankW) % 2;
      ctx.fillStyle = alt ? "#331f13" : "#2a190f";
      ctx.fillRect(x, 0, plankW, h);

      // junção entre tábuas
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + plankW - 1, 0);
      ctx.lineTo(x + plankW - 1, h);
      ctx.stroke();

      // riscos subtis
      ctx.strokeStyle = "rgba(120, 80, 40, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const yy = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(x + 2, yy);
        ctx.lineTo(x + plankW - 2, yy + (Math.random() * 10 - 5));
        ctx.stroke();
      }

      // nós / manchas por placa
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

    // vinheta (bordas mais escuras para profundidade)
    const vignette = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.75);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    drawNoise(ctx, w, h, 0.14);
  }

  function buildCeilingTexture(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    // base mais clara (para não "matar" a luz)
    ctx.fillStyle = "#3a332d";
    ctx.fillRect(0, 0, w, h);

    // padrão de placas (quadrados) para ficar bem diferente do chão
    const tile = 32;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const alt = ((x / tile) + (y / tile)) % 2;
        ctx.fillStyle = alt ? "#3f3731" : "#332c27";
        ctx.fillRect(x, y, tile, tile);
      }
    }

    // linhas das juntas
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

    // manchas/humidade (um pouco mais visível)
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

  function buildWallTexture(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#5a3b29";
    ctx.fillRect(0, 0, w, h);

    // "reboco" / variação
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

    // fissuras / linhas horizontais leves
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

  function buildWoodTexture(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#6a3f22";
    ctx.fillRect(0, 0, w, h);

    // veios verticais
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

    // nós
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

  function applyProceduralTextures() {
    const floorCanvas = document.getElementById("tex-floor");
    const wallCanvas = document.getElementById("tex-wall");
    const woodCanvas = document.getElementById("tex-wood");
    const ceilingCanvas = document.getElementById("tex-ceiling");

    buildFloorTexture(floorCanvas);
    buildWallTexture(wallCanvas);
    buildWoodTexture(woodCanvas);
    buildCeilingTexture(ceilingCanvas);

    const floor = document.getElementById("floor");
    if (floor) {
      floor.setAttribute(
        "material",
        "shader: standard; src: #tex-floor; repeat: 7 7; roughness: 0.98; metalness: 0"
      );
    }

    const ceiling = document.getElementById("ceiling");
    if (ceiling) {
      ceiling.setAttribute(
        "material",
        "shader: standard; src: #tex-ceiling; repeat: 5 5; roughness: 1; metalness: 0.02"
      );
    }

    document.querySelectorAll(".wall").forEach((w) => {
      w.setAttribute(
        "material",
        "shader: standard; src: #tex-wall; repeat: 3 1; roughness: 0.95; metalness: 0"
      );
    });

    // madeira (porta + móveis) para dar mais vida
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

  function startLevelTimerNow() {
    startLevelTimer({
      seconds: 90,
      onTimeout: () => {
        msgDiv.textContent = "Tempo esgotado! A recomeçar o nível...";
        msgDiv.style.color = "#ff0000";
        setTimeout(() => location.reload(), 1500);
      },
    });
  }

  function runIntroBlink() {
    const overlay = document.getElementById("intro-overlay");
    if (!overlay) return;

    const cam = document.getElementById("player-camera");
    const rig = document.getElementById("rig");

    const originalMovementControls = rig ? rig.getAttribute("movement-controls") : null;

    // congela controlos durante a intro (sem pausar a cena, para a animação da câmara funcionar)
    // NOTA: não fazemos spread do getAttribute (pode ser string e dá warnings 21..)
    if (rig) rig.removeAttribute("movement-controls");
    if (cam) cam.setAttribute("look-controls", { enabled: false, pointerLockEnabled: false });

    // começa a olhar para o chão (crosshair no chão)
    if (cam) cam.setAttribute("rotation", "-60 0 0");

    // começa em modo "wait" (clicável) e só faz o piscar após clique
    overlay.style.display = "block";
    overlay.classList.remove("play");
    overlay.classList.add("wait");

    let started = false;
    const start = () => {
      if (started) return;
      started = true;

      overlay.classList.remove("wait");
      overlay.classList.add("play");

      // agora faz sentido: tocamos o som exatamente ao "acordar" (gesto do jogador)
      playSfx(sfxWakeup);

      // puxa a vista para a frente (porta), como se estivesse a levantar a cabeça
      if (cam) {
        cam.setAttribute("animation__wakeup", {
          property: "rotation",
          to: "0 0 0",
          dur: 950,
          easing: "easeOutCubic",
        });
      }

      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("keydown", start, true);
      window.removeEventListener("touchstart", start, true);

      // no fim da animação, esconder e retomar
      window.setTimeout(() => {
        overlay.classList.remove("play");
        overlay.style.display = "none";

        // reativa controlos
        if (cam) cam.setAttribute("look-controls", { enabled: true, pointerLockEnabled: false });
        if (rig && originalMovementControls) rig.setAttribute("movement-controls", originalMovementControls);

        // timer só começa depois da intro (não perdes tempo no ecrã inicial)
        startLevelTimerNow();
      }, 2600);
    };

    // capture=true para apanhar o primeiro gesto o mais cedo possível
    window.addEventListener("pointerdown", start, true);
    window.addEventListener("keydown", start, true);
    window.addEventListener("touchstart", start, true);
  }

  // garante que texturas/materials são aplicados só quando o A-Frame já carregou
  if (scene && scene.hasLoaded) {
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
    // fallback (deverá existir sempre)
    applyProceduralTextures();
    runIntroBlink();
  }

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

          playSfx(sfxKey);

          this.el.setAttribute("visible", "false");

          msgDiv.textContent = `Chave apanhada! (${keysFound}/3)`;
          msgDiv.style.color = "#00ff00";
          msgDiv.style.fontSize = "18px";

          if (keysFound === 3) {
            setTimeout(() => {
              msgDiv.textContent = "Tens as 3 chaves! Agora abre a porta!";
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

          playSfx(sfxDrawerOpen);

          this.el.setAttribute("animation", {
            property: "position",
            to: "3.9 0.55 2.45", // puxa a gaveta para fora
            dur: 650,
            easing: "easeOutQuad",
          });

          revealKey("key1", "A gaveta abriu... está aqui uma chave!");
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

          playSfx(sfxBoxOpen);

          this.el.setAttribute("animation", {
            property: "rotation",
            to: "-80 0 0", // levanta a tampa
            dur: 700,
            easing: "easeOutQuad",
          });

          revealKey("key2", "Abriste a caixa... há uma chave lá dentro!");
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

          // mesmo som da gaveta (como pediste)
          playSfx(sfxDrawerOpen);

          this.el.setAttribute("animation", {
            property: "position",
            to: "3.0 2 -6.85", // desliza na parede de trás (liberta a chave)
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
        this.opened = false;
        this.el.addEventListener("click", () => {
          if (this.opened) return;

          if (keysFound === 3) {
            this.opened = true;

            msgDiv.textContent = "🚪 Porta destrancada! A avançar...";
            msgDiv.style.color = "#00ff00";
            msgDiv.style.fontSize = "24px";

            if (doorTextEl) doorTextEl.setAttribute("visible", "false");
            if (doorTextBgEl) doorTextBgEl.setAttribute("visible", "false");

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
          } else {
            playSfx(sfxDoorLocked);
            showDoorLockedText();

            msgDiv.textContent = `Faltam ${3 - keysFound} chaves.`;
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