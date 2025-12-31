// ================================
// expediciones.js (PEH) - FIX chrome.storage undefined
// ================================
(() => {
  "use strict";

  // ✅ Congelamos referencia real a la API de extensión.
  // Si algún otro script pisa "chrome", aquí seguimos teniendo la buena.
  const EXT_CHROME = globalThis.chrome;

  const UNI = "uni6";
  const STORAGE_KEYS = {
    TOP1: "peh_top1",
    EXPO: "peh_expo_finds",
    EXPO_STATS: "peh_expo_stats",
    EXPOCAP: "peh_expocap"
  };

  const qs = new URLSearchParams(location.search);
  const page = (qs.get("page") || "").toLowerCase();
  const category = qs.get("category"); // ✅ importante para filtrar expediciones

  // -------------------------
  // Utils
  // -------------------------
  const nowIso = () => new Date().toISOString();
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function parseLocaleNumber(s) {
    if (!s) return NaN;
    const cleaned = String(s)
      .replace(/\u00A0/g, " ")
      .replace(/[^\d.,\s]/g, "")
      .trim()
      .replace(/\s+/g, "");
    const noThousands = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const n = Number(noThousands);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatInt(n) {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  const formatNumber = formatInt;

  function isMessagesPage() {
    return page === "messages";
  }

  function safeText(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function toast(msg, ok = true) {
    let t = document.getElementById("peh-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "peh-toast";
      Object.assign(t.style, {
        position: "fixed",
        right: "20px",
        bottom: "90px",
        zIndex: 1000000,
        padding: "8px 10px",
        borderRadius: "8px",
        fontFamily: "Arial",
        fontSize: "12px",
        background: "rgba(0,0,0,0.88)",
        color: "#fff",
        border: ok ? "1px solid rgb(46,125,50)" : "1px solid rgb(198,40,40)",
        maxWidth: "360px",
        whiteSpace: "pre-wrap",
        display: "none"
      });
      document.body.appendChild(t);
    }
    t.style.display = "block";
    t.textContent = msg;
    setTimeout(() => { t.style.display = "none"; }, 2500);
  }

  // ✅ storage wrappers: chrome.storage.local si existe; si no, localStorage JSON
  function storageGet(keys) {
    return new Promise((resolve) => {
      const local = globalThis.chrome?.storage?.local;
      if (local) {
        local.get(keys, resolve);
        return;
      }

      // --- fallback localStorage ---
      const out = {};
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) {
        const raw = localStorage.getItem(k);
        try { out[k] = raw ? JSON.parse(raw) : undefined; }
        catch { out[k] = raw; }
      }
      resolve(out);
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      const local = globalThis.chrome?.storage?.local;
      if (local) {
        local.set(obj, resolve);
        return;
      }

      // --- fallback localStorage ---
      for (const [k, v] of Object.entries(obj || {})) {
        try { localStorage.setItem(k, JSON.stringify(v)); }
        catch { /* ignore quota */ }
      }
      resolve();
    });
  }

  // -------------------------
  // 1) Estadísticas: guardar Top1
  // -------------------------
  async function captureTop1FromStatistics() {
    const tables = Array.from(document.querySelectorAll("table.table519"));
    if (!tables.length) return;

    const target = tables.find(t => {
      const ths = Array.from(t.querySelectorAll("th")).map(th => safeText(th).toLowerCase());
      return ths.includes("posición") && ths.includes("jugador") && ths.includes("puntos");
    });
    if (!target) return;

    const rows = Array.from(target.querySelectorAll("tr"));
    if (rows.length < 2) return;

    const tds = rows[1].querySelectorAll("td");
    if (tds.length < 5) return;

    const pos = parseLocaleNumber(safeText(tds[0]));
    const player = safeText(tds[1]);
    const alliance = safeText(tds[3]);
    const points = parseLocaleNumber(safeText(tds[4]));

    if (!Number.isFinite(points)) return;

    const payload = { pos: pos || 1, player, alliance, points, uni: UNI, capturedAt: nowIso() };
    await storageSet({ [STORAGE_KEYS.TOP1]: payload });
    toast(`✅ Top 1 guardado: ${player} (${formatInt(points)} pts)`);
  }

  // -------------------------
  // 2) Mensajes: extraer botín real de expediciones
  // -------------------------
  async function captureExpeditionFindsFromMessages() {
    // ✅ Solo en mensajes
    if (!isMessagesPage()) return { added: 0, total: 0 };

    // ✅ SOLO expediciones reales: category=15 (según tu HTML)
    if (String(category || "") !== "15") return { added: 0, total: 0 };

    const parseMessageDate = (s) => {
      if (!s) return null;
      const months = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 };
      const m = String(s).match(/(\d{1,2})\.\s*([A-Za-zÁÉÍÓÚÑáéíóúñ]{3})\s*(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/);
      if (!m) return null;
      const mon = months[m[2]];
      if (mon === undefined) return null;
      return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), parseInt(m[4], 10), parseInt(m[5], 10), parseInt(m[6], 10));
    };

    const toInt = (txt) => {
      if (!txt) return 0;
      const cleaned = String(txt).replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
      const n = Math.floor(Number(cleaned) || 0);
      return Number.isFinite(n) ? n : 0;
    };

    const extractLootFromText = (text) => {
      const loot = { metal: 0, crystal: 0, deut: 0 };
      const t = String(text || "");
      const re = /([\d\.\,]+)\s*(Metal|Cristal|Deut[eé]rio)\s*fueron\s*minados/gi;
      let mm;
      while ((mm = re.exec(t)) !== null) {
        const amount = toInt(mm[1]);
        const res = (mm[2] || "").toLowerCase();
        if (res.includes("metal")) loot.metal += amount;
        else if (res.includes("crist")) loot.crystal += amount;
        else loot.deut += amount;
      }
      return loot;
    };

    const extractLootFromBattleReportNode = (node) => {
      const loot = { metal: 0, crystal: 0, deut: 0 };
      if (!node) return loot;
      const mEl = node.querySelector(".raportSteal.element901");
      const cEl = node.querySelector(".raportSteal.element902");
      const dEl = node.querySelector(".raportSteal.element903");
      if (mEl) loot.metal += toInt(mEl.textContent);
      if (cEl) loot.crystal += toInt(cEl.textContent);
      if (dEl) loot.deut += toInt(dEl.textContent);
      return loot;
    };

    const extractShipsFromText = (text) => {
      const ships = [];
      const t = String(text || "");
      const idx = t.indexOf("Se encontraron las siguientes embarcaciones");
      if (idx === -1) return ships;

      const after = t.slice(idx);
      const lines = after.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      for (const line of lines) {
        if (/Entrada del diario/i.test(line)) break;
        if (/Se encontraron las siguientes embarcaciones/i.test(line)) continue;
        const m = line.match(/^(.+?):\s*([\d\.\,]+)$/);
        if (m) ships.push({ name: m[1].trim(), qty: toInt(m[2]) });
      }
      return ships;
    };

    const store = await storageGet([STORAGE_KEYS.EXPO]);
    const arr = Array.isArray(store[STORAGE_KEYS.EXPO]) ? store[STORAGE_KEYS.EXPO] : [];
    const knownIds = new Set(arr.map(x => String(x.id)));

    let added = 0;
    const messageItems = Array.from(document.querySelectorAll(".messages-container .message-item[id^='message_']"));

    for (const el of messageItems) {
      const idMatch = (el.id || "").match(/^message_(\d+)/);
      if (!idMatch) continue;

      const msgId = idMatch[1];
      if (knownIds.has(String(msgId))) continue;

      // ✅ Según tu HTML: el "tipo/categoría" está en .message-actions span (texto azul)
      const typeLabel = el.querySelector(".message-actions span")?.textContent?.trim() || "";
      if (typeLabel !== "Informes de expediciones") continue;

      // ✅ Según tu HTML: el asunto real del mensaje es .message-subject
      const subject = el.querySelector(".message-subject")?.textContent?.trim() || "";
      if (subject !== "Reporte de expedición") continue;

      const dateStr = el.querySelector(".message-date")?.textContent?.trim() || "";
      const msgDate = parseMessageDate(dateStr);

      const contentEl = el.querySelector(".message-content");
      const contentText = contentEl ? contentEl.innerText : "";

      const loot1 = extractLootFromText(contentText);
      const loot2 = extractLootFromBattleReportNode(contentEl);
      const ships = extractShipsFromText(contentText);

      const item = {
        id: String(msgId),
        ts: msgDate ? msgDate.getTime() : Date.now(),
        date: dateStr,
        type: typeLabel,     // ✅ guardo también el tipo para depurar
        subject: subject,
        loot: {
          metal: loot1.metal + loot2.metal,
          crystal: loot1.crystal + loot2.crystal,
          deut: loot1.deut + loot2.deut
        },
        ships
      };

      arr.unshift(item);
      knownIds.add(String(msgId));
      added++;
    }

    const maxItems = 800;
    if (arr.length > maxItems) arr.length = maxItems;

    // Stats globales
    let totalLoot = { metal: 0, crystal: 0, deut: 0 };
    let totalWithLoot = 0;

    for (const it of arr) {
      if (it.loot) {
        totalLoot.metal += it.loot.metal || 0;
        totalLoot.crystal += it.loot.crystal || 0;
        totalLoot.deut += it.loot.deut || 0;
        if ((it.loot.metal || it.loot.crystal || it.loot.deut)) totalWithLoot++;
      }
    }

    // Stats 24h
    const now = Date.now();
    const limit24h = now - 24 * 60 * 60 * 1000;
    let last24hCount = 0;
    let last24hLoot = { metal: 0, crystal: 0, deut: 0 };

    for (const it of arr) {
      if ((it.ts || 0) >= limit24h) {
        last24hCount++;
        last24hLoot.metal += it.loot?.metal || 0;
        last24hLoot.crystal += it.loot?.crystal || 0;
        last24hLoot.deut += it.loot?.deut || 0;
      }
    }

    const stats = {
      updatedAt: nowIso(),
      totalMessages: arr.length,
      totalWithLoot,
      totalLoot,
      last24hCount,
      last24hLoot
    };

    await storageSet({ [STORAGE_KEYS.EXPO]: arr, [STORAGE_KEYS.EXPO_STATS]: stats });

    return { added, total: arr.length, stats };
  }

  // -------------------------
  // 3) Expocap: leer cap si aparece texto
  // -------------------------
  async function captureExpocapIfPresent() {
    const el = document.getElementById("expocount");
    let cap = null;

    if (el) {
      const attr = el.getAttribute("expocap");
      if (attr) cap = parseNumLikeGame(attr);

      if (!Number.isFinite(cap)) {
        const txt = (el.textContent || "").match(/\/\s*([\d\.,\s]+)/);
        if (txt) cap = parseNumLikeGame(txt[1]);
      }
    }

    if (!Number.isFinite(cap)) return;
    if (cap <= 0) return;

    await storageSet({ [STORAGE_KEYS.EXPOCAP]: { cap, capturedAt: nowIso(), uni: UNI } });
  }

  // -------------------------
  // 4) UI en Base de Flota (fleetTable)
  // -------------------------
  function createPanel() {
    if (document.getElementById("peh-panel")) return;

    const wrap = document.createElement("div");
    wrap.id = "peh-panel";
    Object.assign(wrap.style, {
      position: "fixed",
      right: "18px",
      top: "110px",
      width: "320px",
      zIndex: 999999,
      background: "rgba(0,0,0,0.88)",
      color: "white",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "12px",
      padding: "12px",
      fontFamily: "Arial",
      fontSize: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
    });

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:700;font-size:14px;">Expedition Helper</div>
        <div id="peh-close" title="Cerrar" style="cursor:pointer;border:1px solid rgba(255,255,255,0.2);border-radius:9px;padding:2px 8px;">✕</div>
      </div>

      <div style="display:grid;grid-template-columns: 1fr; gap:8px;">
        <div style="border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px;">
          <div style="opacity:0.8;">Botín real (Mensajes expedición)</div>
          <div id="peh-expo-stats" style="margin-top:3px;font-size:13px;font-weight:700;">—</div>
          <div id="peh-expo-last" style="margin-top:2px;opacity:0.7;font-size:11px;">—</div>
        </div>

        <div style="border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px;">
          <div style="opacity:0.8;">Expedición (Cap + puntos actuales)</div>
          <div id="peh-exp-live" style="margin-top:3px;font-size:13px;font-weight:700;">—</div>
          <div id="peh-exp-live-meta" style="margin-top:2px;opacity:0.7;font-size:11px;">—</div>

          <div style="margin-top:8px;display:flex;gap:8px;">
            <button id="peh-fill" style="flex:1;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#1565c0;color:white;">Rellenar hasta cap</button>
            <button id="peh-clearships" style="flex:1;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#5d4037;color:white;">Vaciar naves</button>
          </div>

          <div style="margin-top:8px;display:flex;gap:8px;">
            <button id="peh-open-msg" style="flex:1;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#6d4c41;color:white;">Ir a Mensajes</button>
            <button id="peh-refresh" style="flex:1;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#2e7d32;color:white;">Refrescar</button>
          </div>

          <div style="margin-top:8px;display:flex;gap:8px;">
            <button id="peh-clear" style="flex:1;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#c62828;color:white;">Vaciar botines</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    wrap.querySelector("#peh-close").addEventListener("click", () => wrap.remove());
    wrap.querySelector("#peh-open-msg").addEventListener("click", () => location.href = `game.php?page=messages&category=15`);
    wrap.querySelector("#peh-refresh").addEventListener("click", () => renderPanel());
    wrap.querySelector("#peh-fill").addEventListener("click", () => fillFleetToCap());
    wrap.querySelector("#peh-clearships").addEventListener("click", () => clearShipInputs());
    wrap.querySelector("#peh-clear").addEventListener("click", async () => {
      await storageSet({
        [STORAGE_KEYS.EXPO]: [],
        [STORAGE_KEYS.EXPO_STATS]: {
          updatedAt: nowIso(),
          totalMessages: 0,
          totalWithLoot: 0,
          totalLoot: { metal: 0, crystal: 0, deut: 0 },
          last24hCount: 0,
          last24hLoot: { metal: 0, crystal: 0, deut: 0 }
        }
      });
      toast("🧹 Botines vaciados");
      renderPanel();
    });
  }

  async function renderPanel() {
    const root = document.getElementById("peh-panel");
    if (!root) return;

    const store = await storageGet([STORAGE_KEYS.EXPO_STATS, STORAGE_KEYS.EXPOCAP]);
    const expoStats = store[STORAGE_KEYS.EXPO_STATS];
    const capObj = store[STORAGE_KEYS.EXPOCAP];

    const elExpo = document.getElementById("peh-expo-stats");
    const elExpoLast = document.getElementById("peh-expo-last");

    if (expoStats && typeof expoStats === "object") {
      const last = expoStats.last24hLoot || { metal: 0, crystal: 0, deut: 0 };
      const total = expoStats.totalLoot || { metal: 0, crystal: 0, deut: 0 };

      elExpo.textContent =
        `Mensajes: ${expoStats.totalMessages ?? 0} | Con botín: ${expoStats.totalWithLoot ?? 0}\n` +
        `Total botín: M ${formatNumber(total.metal)} | C ${formatNumber(total.crystal)} | D ${formatNumber(total.deut)}\n` +
        `Últimas 24h (${expoStats.last24hCount ?? 0}): M ${formatNumber(last.metal)} | C ${formatNumber(last.crystal)} | D ${formatNumber(last.deut)}`;

      elExpoLast.textContent = expoStats.updatedAt ? `Actualizado: ${expoStats.updatedAt}` : "";
    } else {
      elExpo.textContent = "—";
      elExpoLast.textContent = "";
    }

    const live = getLiveExpInfo();
    const elLive = document.getElementById("peh-exp-live");
    const elLiveMeta = document.getElementById("peh-exp-live-meta");

    const cap = (live.cap ?? capObj?.cap);
    if (elLive) {
      if (Number.isFinite(live.cur) && Number.isFinite(cap)) {
        elLive.textContent = `Exp: ${formatInt(live.cur)} / ${formatInt(cap)}`;
      } else if (Number.isFinite(cap)) {
        elLive.textContent = `Cap: ${formatInt(cap)} (sin lectura de Exp)`;
      } else {
        elLive.textContent = "—";
      }
    }
    if (elLiveMeta) {
      const cargo = Number.isFinite(live.cargo) ? `Carga: ${formatInt(live.cargo)}` : "";
      const hint = (page === "fleetTable") ? "(usa el formulario de 'Nueva misión')" : "";
      elLiveMeta.textContent = [cargo, hint].filter(Boolean).join(" ");
    }

    const hasShipInputs = Boolean(document.querySelector("input[id^='ship'][id$='_input']"));
    const btnFill = document.getElementById("peh-fill");
    const btnClearShips = document.getElementById("peh-clearships");
    if (btnFill) btnFill.disabled = !hasShipInputs;
    if (btnClearShips) btnClearShips.disabled = !hasShipInputs;
  }

  // -------------------------
  // Router / FleetStep1 helpers
  // -------------------------
  const FALLBACK_EXP_VALUES = {
    202: 20, 203: 60, 204: 20, 205: 50, 206: 135,
    207: 300, 208: 150, 209: 80, 210: 5, 211: 375,
    212: 10, 213: 550, 214: 45000, 215: 350, 222: 210,
    225: 40, 227: 200,
  };

  function parseNumLikeGame(s) {
    if (!s) return NaN;
    const clean = String(s).replace(/[^0-9]/g, "");
    return clean ? Number(clean) : NaN;
  }

  function getLiveExpInfo() {
    const el = document.getElementById("expocount");
    const cargoEl = document.getElementById("cargospace");

    let cap = null;
    let cur = null;
    let cargo = null;

    if (el) {
      const capAttr = el.getAttribute("expocap");
      if (capAttr) {
        const n = Number(capAttr);
        if (Number.isFinite(n)) cap = n;
      }

      const t = (el.textContent || "").trim();
      const m = t.match(/Exp\s*:?\s*([0-9.,\s]+)\s*\/\s*([0-9.,\s]+)/i);
      if (m) {
        const a = parseNumLikeGame(m[1]);
        const b = parseNumLikeGame(m[2]);
        if (Number.isFinite(a)) cur = a;
        if (Number.isFinite(b)) cap = b;
      } else {
        const a = parseNumLikeGame(t);
        if (Number.isFinite(a)) cur = a;
      }
    }

    if (cargoEl) {
      const m = (cargoEl.textContent || "").match(/(\d[0-9.,\s]*)/);
      if (m) {
        const n = parseNumLikeGame(m[1]);
        if (Number.isFinite(n)) cargo = n;
      }
    }

    return { cur, cap, cargo };
  }

  function getExpValuesMap() {
    const fromPage = typeof window.exp_values === "object" && window.exp_values;
    return fromPage && Object.keys(fromPage).length ? fromPage : FALLBACK_EXP_VALUES;
  }

  function getShipInputs() {
    const inputs = Array.from(document.querySelectorAll('input[id^="ship"][id$="_input"]'));
    const expValues = getExpValuesMap();

    return inputs
      .map((inp) => {
        const m = inp.id.match(/^ship(\d+)_input$/);
        if (!m) return null;
        const shipId = Number(m[1]);
        const exp = Number(expValues[shipId] ?? 0);
        if (!Number.isFinite(shipId) || !Number.isFinite(exp) || exp <= 0) return null;

        const availEl = document.getElementById(`ship${shipId}_value`);
        const avail = availEl ? parseNumLikeGame(availEl.textContent) : NaN;
        const availSafe = Number.isFinite(avail) ? avail : 0;
        const cur = parseNumLikeGame(inp.value);
        const curSafe = Number.isFinite(cur) ? cur : 0;
        return { shipId, exp, avail: availSafe, cur: curSafe, input: inp };
      })
      .filter(Boolean);
  }

  function triggerInput(el) {
    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch { }
  }

  function clearShipInputs() {
    const ships = getShipInputs();
    for (const s of ships) {
      s.input.value = 0;
      triggerInput(s.input);
    }
  }

  function fillFleetToCap() {
    const live = getLiveExpInfo();
    const cap = live.cap;
    if (!Number.isFinite(cap) || cap <= 0) return;

    const ships = getShipInputs();
    if (!ships.length) return;

    // 🔍 Asegurar 1 sonda de espionaje (210) ANTES del reparto
    const probe = ships.find(s => s.shipId === 210);
    let addedProbe = false;
    if (probe && (probe.avail > probe.cur)) {
      probe.input.value = probe.cur + 1;
      triggerInput(probe.input);
      addedProbe = true;
    }

    // Preferir cargos primero: Gran Carguero (203) y luego Pequeño (202)
    const PREFERRED_ORDER = [203, 202];
    ships.sort((a, b) => {
      const ia = PREFERRED_ORDER.indexOf(a.shipId);
      const ib = PREFERRED_ORDER.indexOf(b.shipId);

      const pa = ia === -1 ? 999 : ia;
      const pb = ib === -1 ? 999 : ib;

      if (pa !== pb) return pa - pb;
      return b.exp - a.exp;
    });

    let curExp = Number.isFinite(live.cur) ? live.cur : 0;

    // Si hemos añadido sonda, su exp cuenta para el cap
    if (addedProbe && probe) {
      curExp += probe.exp;
    }

    let remaining = cap - curExp;
    if (remaining <= 0) return;

    for (const s of ships) {
      if (remaining <= 0) break;

      // evita volver a tocar la sonda (ya hemos puesto 1)
      if (s.shipId === 210) continue;

      const free = Math.max(0, s.avail - s.cur);
      if (!free) continue;

      const take = Math.min(free, Math.floor(remaining / s.exp));
      if (take <= 0) continue;

      const next = s.cur + take;
      s.input.value = next;
      triggerInput(s.input);

      remaining -= take * s.exp;
    }
  }

  // -------------------------
  // Main
  // -------------------------
  async function main() {
    try {
      if (page === "statistics") {
        await sleep(400);
        await captureTop1FromStatistics();
      }
      if (page === "messages") {
        await sleep(500);
        const r = await captureExpeditionFindsFromMessages();
        if (r && r.added) toast(`✅ Botines capturados: +${r.added} (total ${r.total}).`);
      }
      if (page === "fleettable" || page === "fleetstep1") {
        await sleep(200);
        await captureExpocapIfPresent();
      }
      if (page === "fleettable") {
        createPanel();
        await renderPanel();
      }
    } catch (e) {
      console.warn("[PEH] error", e);
      toast("❌ Error en Expedition Helper (mira consola)", false);
    }
  }

  main();
})();
