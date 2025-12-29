// ================================
// extraerInfoPopUpJugadorAutomatico.js
// ================================

(function () {
  "use strict";

  // ---- Config ----
  const START_DELAY_MS = 5000;       // espera antes de empezar (mínimo 5s)
  const BETWEEN_MS = 2400;           // pausa entre jugadores
  const POPUP_LOAD_TIMEOUT = 20000;  // timeout total para sacar playercard
  const CLOSE_TIMEOUT = 6000;        // timeout esperando cierre popup
  const DEBUG = true;

  // ---- Estado cola ----
  let queue = [];
  let running = false;

  // =========================================================
  // API pública: la llamas desde main.js:
  // extraerPopUpsDeJugadoresEnCola(jugadores)
  // =========================================================
  window.extraerPopUpsDeJugadoresEnCola = function (jugadores) {
    try {
      if (!Array.isArray(jugadores) || jugadores.length === 0) {
        log("[AUTO] Lista vacía, nada que hacer");
        return;
      }

      // normaliza ids + nombre (nombre es CLAVE para validar popup correcto)
      const items = jugadores
        .map(j => ({
          idJugador: String(j.idJugador ?? "").trim(),
          nombre: String(j.nombre ?? "").trim()
        }))
        .filter(x => x.idJugador);

      if (items.length === 0) {
        log("[AUTO] No hay idJugador válidos");
        return;
      }

      // Encola (sin duplicar por id)
      const seen = new Set(queue.map(x => x.idJugador));
      for (const it of items) {
        if (!seen.has(it.idJugador)) {
          queue.push(it);
          seen.add(it.idJugador);
        }
      }

      if (!running) {
        running = true;
        log("[AUTO] Cola iniciada ✔", { len: queue.length });

        setTimeout(() => {
          runQueue_().finally(() => {
            running = false;
            log("[AUTO] Cola finalizada ✔");
          });
        }, START_DELAY_MS);
      } else {
        log("[AUTO] Cola ya en ejecución, añadidos items", { len: queue.length });
      }
    } catch (e) {
      console.error("[AUTO] Error al encolar:", e);
    }
  };

  // =========================================================
  // CORE: procesa cola
  // =========================================================
  async function runQueue_() {
    while (queue.length > 0) {
      const item = queue.shift();
      const idJugador = item.idJugador;
      const nombreEsperado = item.nombre;

      try {
        log(`[AUTO] (${idJugador}) => ${nombreEsperado || "sin-nombre"} | preparando...`);

        // 1) Cierra popup anterior (si queda abierto) y espera que cierre
        cerrarPopup_();
        await esperarCierrePopup_(CLOSE_TIMEOUT);

        // 2) Abre popup por click real
        log(`[AUTO] (${idJugador}) abriendo popup...`);
        const opened = abrirPlayercardClick_(idJugador);
        if (!opened) {
          console.warn("[AUTO] No pude abrir popup (no encontré link) id=", idJugador);
          await sleep_(BETWEEN_MS);
          continue;
        }

        // 3) Espera y extrae, validando que sea el jugador correcto
        const jugador = await esperarYExtraerJugador_(idJugador, nombreEsperado);

        if (jugador) {
          log("[AUTO] Jugador extraído OK:", jugador);

          // 4) Enviamos a AppScript con tu función existente
          if (typeof window.enviarEstadisticas === "function") {
            window.enviarEstadisticas(jugador, "player");
          } else {
            console.warn("[AUTO] enviarEstadisticas() no existe en window");
          }
        } else {
          console.warn("[AUTO] No se pudo extraer jugador (timeout o mismatch), id=", idJugador);
        }

      } catch (err) {
        console.error("[AUTO] Error procesando jugador", idJugador, err);
      } finally {
        // Cierra popup para pasar al siguiente
        cerrarPopup_();
        await esperarCierrePopup_(CLOSE_TIMEOUT);
        await sleep_(BETWEEN_MS);
      }
    }
  }

  // =========================================================
  // 1) Abrir playercard haciendo click en el <a onclick=...>
  // =========================================================
  function abrirPlayercardClick_(idJugador) {
    const idNum = Number(idJugador);
    if (!Number.isFinite(idNum)) return false;

    // intentamos selector directo
    let a = document.querySelector(`a[onclick*="Dialog.Playercard(${idNum},"]`);

    // fallback: regex en todos los <a>
    if (!a) {
      const all = Array.from(document.querySelectorAll('a[onclick*="Dialog.Playercard"]'));
      const re = new RegExp(`Dialog\\.Playercard\\(\\s*${idNum}\\s*,`);
      a = all.find(x => re.test(x.getAttribute("onclick") || ""));
    }

    if (!a) return false;

    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }

  // =========================================================
  // 2) Esperar popup correcto + extraer tabla playercard
  // =========================================================
  async function esperarYExtraerJugador_(idJugador, nombreEsperado) {
    const t0 = Date.now();

    while (Date.now() - t0 < POPUP_LOAD_TIMEOUT) {
      const iframe = encontrarIframePopup_();
      if (!iframe) {
        await sleep_(250);
        continue;
      }

      const doc = await intentarContentDocument_(iframe);
      if (!doc) {
        await sleep_(250);
        continue;
      }

      const tabla = encontrarTablaPlayercard_(doc);
      if (!tabla) {
        await sleep_(250);
        continue;
      }

      const jugador = extraerDatosTarjetaJugador_(tabla, idJugador);

      // VALIDACIÓN: evita enviar datos del popup anterior
      // Si tienes nombreEsperado, lo usamos para asegurar 100%
      if (nombreEsperado) {
        const extraido = (jugador?.nombre || "").trim().toLowerCase();
        const esperado = nombreEsperado.trim().toLowerCase();

        // si aún no coincide, seguimos esperando a que el popup actualice
        if (extraido && extraido !== esperado) {
          log(`[AUTO] mismatch popup: esperado="${nombreEsperado}" extraído="${jugador.nombre}" -> esperando...`);
          await sleep_(350);
          continue;
        }
      }

      // Si no hay nombreEsperado, al menos exigimos que haya "usuario"
      if (!jugador?.nombre) {
        await sleep_(250);
        continue;
      }

      return jugador;
    }

    return null;
  }

  // =========================================================
  // IFRAME: localizar iframe del popup (no el primero que exista)
  // =========================================================
  function encontrarIframePopup_() {
    // Fancybox/overlay típicos (prioridad)
    const candidates = [
      "div.fancybox-overlay iframe",
      "div.fancybox-wrap iframe",
      "div#fancybox-wrap iframe",
      "div#fancybox-content iframe",
      "div.ui-dialog iframe",
      "iframe"
    ];

    for (const sel of candidates) {
      const iframes = Array.from(document.querySelectorAll(sel));
      // elige el primero visible/usable
      const good = iframes.find(ifr => {
        const r = ifr.getBoundingClientRect();
        return r.width > 50 && r.height > 50;
      });
      if (good) return good;
    }
    return null;
  }

  async function intentarContentDocument_(iframe) {
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body) return doc;
    } catch (_) {}
    return null;
  }

  function encontrarTablaPlayercard_(doc) {
    const tablas = Array.from(doc.querySelectorAll("table"));
    return tablas.find(esTablaPlayercard_);
  }

  function esTablaPlayercard_(tabla) {
    const texto = (tabla.innerText || "");
    return texto.includes("Usuario") && texto.includes("Planeta") && texto.includes("Puntos");
  }

  // =========================================================
  // 3) Extractor (igual a tu manual, pero interno)
  // =========================================================
  function extraerDatosTarjetaJugador_(tabla, idJugador) {
    const jugador = {
      idJugador: String(idJugador),
      nombre: "",
      planetaPrincipal: { nombre: "", coordenadas: "" },
      alianza: "",
      puntos: {
        estructuras: null,
        tecnologia: null,
        flotas: null,
        defensas: null,
        total: null
      }
    };

    const MAP_PUNTOS = {
      "estructuras": "estructuras",
      "tecnología": "tecnologia",
      "tecnologia": "tecnologia",
      "flotas": "flotas",
      "defensas": "defensas",
      "total": "total"
    };

    tabla.querySelectorAll("tr").forEach(tr => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) return;

      const label = (tds[0].innerText || "").trim().toLowerCase();

      if (label === "usuario") {
        jugador.nombre = (tds[1].innerText || "").trim();
        return;
      }

      if (label === "planeta principal") {
        jugador.planetaPrincipal.nombre =
          (tds[1].childNodes[0]?.textContent || "").trim();

        jugador.planetaPrincipal.coordenadas =
          (tds[1].querySelector("a")?.innerText || "").trim();
        return;
      }

      if (label === "alianza") {
        jugador.alianza = (tds[1].innerText || "").trim();
        return;
      }

      // puntos: filas con 5 columnas
      if (tds.length === 5) {
        const tipoTexto = (tds[1].innerText || "").trim().toLowerCase();
        const clave = MAP_PUNTOS[tipoTexto];
        if (!clave) return;

        jugador.puntos[clave] = {
          puntos: limpiarNumeroSafe_(tds[2].innerText),
          porcentaje: (tds[3].innerText || "").trim(),
          rango: (tds[4].innerText || "").trim()
        };
      }
    });

    return jugador;
  }

  function limpiarNumeroSafe_(txt) {
    if (typeof window.limpiarNumero === "function") return window.limpiarNumero(txt);
    const n = Number(String(txt || "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  // =========================================================
  // 4) Cerrar popup y esperar cierre
  // =========================================================
  function cerrarPopup_() {
    try {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } catch (_) {}
  }

  async function esperarCierrePopup_(timeoutMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const iframe = encontrarIframePopup_();
      if (!iframe) return true; // no hay iframe => cerrado
      await sleep_(200);
    }
    return false;
  }

  function sleep_(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function log(...args) {
    if (DEBUG) console.log(...args);
  }

})();
