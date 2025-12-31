// ================================
// marketplace.js - Convertidor ratio Marketplace (pr0game)
// - Lee el ratio de referencia de los inputs del propio Marketplace
// - Calcula conversiones entre Metal/Cristal/Deuterio
// - Aplica descuento/markup configurable (±25%)
// ================================
(() => {
  "use strict";

  // Ejecutar solo en marketplace
  const qs = new URLSearchParams(location.search);
  const page = (qs.get("page") || "").toLowerCase();
  if (page !== "marketplace") return;

  const RES = {
    metal: { key: "metal", label: "Metal", css: "metal", icon: "./styles/theme/nova/images/metal.gif" },
    crystal: { key: "crystal", label: "Cristal", css: "crystal", icon: "./styles/theme/nova/images/crystal.gif" },
    deuterium: { key: "deuterium", label: "Deuterio", css: "deut", icon: "./styles/theme/nova/images/deuterium.gif" },
  };

  function clamp(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function parseLocaleNumber(s) {
    if (s == null) return NaN;
    const cleaned = String(s)
      .replace(/\u00A0/g, " ")
      .replace(/[^\d.,\s-]/g, "")
      .trim()
      .replace(/\s+/g, "");

    // pr0game suele usar "." miles y "," decimales, pero aquí ratios suelen venir con "."
    // convertimos "3,3" -> "3.3"
    const normalized = cleaned.includes(",") && !cleaned.includes(".")
      ? cleaned.replace(",", ".")
      : cleaned;

    const noThousands = normalized.replace(/\.(?=\d{3}(\D|$))/g, ""); // quita miles tipo 12.345
    const n = Number(noThousands);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatInt(n) {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function getReferenceRatio() {
    // Inputs que salen en tu HTML:
    // name="ratio-metal" value="3.3"
    // name="ratio-cristal" value="0.7"
    // name="ratio-deuterium" value="1"
    const m = document.querySelector('input[name="ratio-metal"]');
    const c = document.querySelector('input[name="ratio-cristal"]');
    const d = document.querySelector('input[name="ratio-deuterium"]');

    const rm = parseLocaleNumber(m?.value);
    const rc = parseLocaleNumber(c?.value);
    const rd = parseLocaleNumber(d?.value);

    // fallback por si no existen
    return {
      metal: Number.isFinite(rm) ? rm : 3.3,
      crystal: Number.isFinite(rc) ? rc : 0.7,
      deuterium: Number.isFinite(rd) ? rd : 1,
    };
  }

  /**
   * Conversión usando ratio de referencia:
   * ratio = {metal:3.3, crystal:0.7, deuterium:1}
   * valor_base = amount_from * ratio[from]
   * amount_to  = valor_base / ratio[to]
   *
   * Ajuste (%) (±25):
   * - Si pct = +10 => "descuento": recibes 10% MENOS (más favorable al otro)
   * - Si pct = -10 => "markup": recibes 10% MÁS (más favorable a ti)
   */
  function convert(amountFrom, fromKey, toKey, pct) {
  const ratio = getReferenceRatio();
  const a = Number(amountFrom);
  if (!Number.isFinite(a) || a <= 0) return { ok: false, msg: "Cantidad inválida" };
  if (!ratio[fromKey] || !ratio[toKey]) return { ok: false, msg: "Recursos inválidos" };

  const p = clamp(pct, -25, 25);

  // ✅ CORRECTO: ratio[x] = cantidad del recurso x por 1 unidad de valor
  // valor = cantidad_entregada / ratio[recurso_entregado]
  const valueUnits = a / ratio[fromKey];

  // cantidad_recibida = valor * ratio[recurso_recibido]
  let amountTo = valueUnits * ratio[toKey];

  // Ajuste sobre lo que recibes
  amountTo = amountTo * (1 - (p / 100));

  return {
    ok: true,
    ratio,
    amountFrom: a,
    fromKey,
    toKey,
    pct: p,
    amountTo,
    baseValue: valueUnits, // ahora sí son "unidades de valor"
  };
}


  function ensurePanel() {
    if (document.getElementById("lui-market-panel")) return;

    const panel = document.createElement("div");
    panel.id = "lui-market-panel";
    Object.assign(panel.style, {
      position: "fixed",
      right: "18px",
      top: "140px",
      width: "320px",
      zIndex: 1000000,
      background: "rgba(0,0,0,0.88)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "12px",
      padding: "12px",
      fontFamily: "Arial",
      fontSize: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    });

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:700;font-size:13px;">🧮 Convertidor Marketplace</div>
        <div id="lui-market-close" title="Cerrar"
             style="cursor:pointer;border:1px solid rgba(255,255,255,0.2);border-radius:9px;padding:2px 8px;">✕</div>
      </div>

      <div style="opacity:.85;margin-bottom:8px;">
        Usa el ratio de referencia del juego (Metal : Cristal : Deut).
      </div>

      <div style="display:grid;grid-template-columns: 1fr 1fr; gap:8px; align-items:end;">
        <div>
          <div style="opacity:.75;margin-bottom:4px;">Entrego</div>
          <select id="lui-from" style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:white;">
            <option value="metal">Metal</option>
            <option value="crystal">Cristal</option>
            <option value="deuterium">Deuterio</option>
          </select>
        </div>
        <div>
          <div style="opacity:.75;margin-bottom:4px;">Recibo</div>
          <select id="lui-to" style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:white;">
            <option value="metal">Metal</option>
            <option value="crystal">Cristal</option>
            <option value="deuterium" selected>Deuterio</option>
          </select>
        </div>

        <div style="grid-column:1 / span 2;">
          <div style="opacity:.75;margin-bottom:4px;">Cantidad que entrego</div>
          <input id="lui-amount" type="text" placeholder="ej: 80.000"
                 style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:white;" />
        </div>

        <div style="grid-column:1 / span 2;">
          <div style="opacity:.75;margin-bottom:4px;">Descuento/markup (±25%)</div>
          <input id="lui-pct" type="number" min="-25" max="25" step="1" value="0"
                 style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:white;" />
          <div style="opacity:.65;margin-top:4px;line-height:1.2;">
            +10 = recibes 10% menos (más “barato” para el otro).<br>
            -10 = recibes 10% más (mejor para ti).
          </div>
        </div>

        <div style="grid-column:1 / span 2; display:flex; gap:8px; margin-top:6px;">
          <button id="lui-calc" style="flex:1;padding:7px;border-radius:8px;border:0;cursor:pointer;background:#2e7d32;color:white;">Calcular</button>
          <button id="lui-swap" style="width:88px;padding:7px;border-radius:8px;border:0;cursor:pointer;background:#1565c0;color:white;">↔</button>
        </div>

        <div style="grid-column:1 / span 2;margin-top:10px;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px;">
          <div style="opacity:.75;">Resultado</div>
          <div id="lui-out" style="margin-top:4px;font-weight:700;font-size:13px;">—</div>
          <div id="lui-out2" style="margin-top:3px;opacity:.7;font-size:11px;">—</div>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button id="lui-copy" style="flex:1;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#6d4c41;color:white;">Copiar</button>
            <button id="lui-refresh" style="width:110px;padding:6px;border-radius:8px;border:0;cursor:pointer;background:#5d4037;color:white;">Leer ratio</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // handlers
    panel.querySelector("#lui-market-close").addEventListener("click", () => panel.remove());

    panel.querySelector("#lui-swap").addEventListener("click", () => {
      const from = panel.querySelector("#lui-from");
      const to = panel.querySelector("#lui-to");
      const tmp = from.value;
      from.value = to.value;
      to.value = tmp;
      doCalc();
    });

    panel.querySelector("#lui-refresh").addEventListener("click", () => doCalc(true));
    panel.querySelector("#lui-calc").addEventListener("click", () => doCalc());

    panel.querySelector("#lui-copy").addEventListener("click", async () => {
      const txt = panel.querySelector("#lui-out")?.textContent || "";
      if (!txt || txt === "—") return;
      try {
        await navigator.clipboard.writeText(txt);
        flash(panel.querySelector("#lui-copy"), "✅ Copiado");
      } catch {
        flash(panel.querySelector("#lui-copy"), "❌ No se pudo copiar");
      }
    });

    // calcular al escribir
    panel.querySelector("#lui-amount").addEventListener("input", () => doCalc());
    panel.querySelector("#lui-pct").addEventListener("input", () => doCalc());
    panel.querySelector("#lui-from").addEventListener("change", () => doCalc());
    panel.querySelector("#lui-to").addEventListener("change", () => doCalc());

    // primera pinta
    doCalc(true);
  }

  function flash(btn, msg) {
    const old = btn.textContent;
    btn.textContent = msg;
    setTimeout(() => (btn.textContent = old), 900);
  }

  function doCalc(forceReadRatio = false) {
    const panel = document.getElementById("lui-market-panel");
    if (!panel) return;

    const fromKey = panel.querySelector("#lui-from").value;
    const toKey = panel.querySelector("#lui-to").value;

    // cantidad acepta "80.000", "80000", "80 000"
    const rawAmount = panel.querySelector("#lui-amount").value;
    const amount = parseLocaleNumber(rawAmount);

    const pct = Number(panel.querySelector("#lui-pct").value || 0);

    const out = panel.querySelector("#lui-out");
    const out2 = panel.querySelector("#lui-out2");

    const r = convert(amount, fromKey, toKey, pct);
    if (!r.ok) {
      out.textContent = "—";
      out2.textContent = forceReadRatio ? ratioLine() : (r.msg || "—");
      return;
    }

    const fromLabel = RES[fromKey].label;
    const toLabel = RES[toKey].label;

    const receive = r.amountTo;

    out.textContent = `Entrego ${formatInt(r.amountFrom)} ${fromLabel} → Recibo ${formatInt(receive)} ${toLabel}`;
    out2.textContent =
      `${ratioLine(r.ratio)} | Ajuste: ${r.pct}%`;

    function ratioLine(rr = getReferenceRatio()) {
      const m = rr.metal, c = rr.crystal, d = rr.deuterium;
      return `Ratio ref: ${m} : ${c} : ${d}`;
    }
  }

  // DOM ready
  function start() {
    ensurePanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
