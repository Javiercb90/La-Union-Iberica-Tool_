// js/unionIberica/control_estadisticas.js
  // Normaliza texto: lower + sin acentos + trim
  function norm_(s) {
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // ✅ FIX: autoClose ahora es parámetro (por defecto true)
  function toast(msg, ok = true, autoClose = true) {
    let t = document.getElementById("lui-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "lui-toast";
      Object.assign(t.style, {
        position: "fixed",
        bottom: "90px",
        right: "20px",
        zIndex: "1000000",
        padding: "8px 10px",
        borderRadius: "6px",
        fontFamily: "Arial",
        fontSize: "11px",
        background: "rgba(0,0,0,0.85)",
        color: "white",
        border: "1px solid #555",
        maxWidth: "340px",
        whiteSpace: "pre-wrap"
      });
      document.body.appendChild(t);
    }

    t.textContent = msg;
    t.style.borderColor = ok ? "#2e7d32" : "#c62828";
    t.style.display = "block";

    // ✅ evita timers “zombies”
    if (t._timer) clearTimeout(t._timer);

    if (autoClose) {
      t._timer = setTimeout(() => {
        t.style.display = "none";
      }, 4000);
    }
  }

  function findStatsTable() {
    const tables = Array.from(document.querySelectorAll("table.table519"));
    for (const tb of tables) {
      const ths = Array.from(tb.querySelectorAll("tr th")).map(x => norm_(x.textContent));
      const ok =
        ths.includes("posicion") && // ✅ con o sin tilde
        ths.includes("jugador") &&
        ths.includes("alianza") &&
        ths.includes("puntos");
      if (ok) return tb;
    }
    return null;
  }

  function parseStatsTable(table) {
    const ths = Array.from(table.querySelectorAll("tr th")).map(th => norm_(th.innerText));
    // índices por cabecera (robusto)
    let idxPos = ths.indexOf("posicion");
    let idxJugador = ths.indexOf("jugador");
    let idxAlianza = ths.indexOf("alianza");
    let idxPuntos = ths.indexOf("puntos");

    if (idxJugador === -1 || idxPuntos === -1) return [];

    if (idxPos === -1) idxPos = 0;
    if (idxAlianza === -1) idxAlianza = idxJugador + 1;

    const rows = Array.from(table.querySelectorAll("tr"))
      .filter(tr => tr.querySelectorAll("td").length > idxPuntos);

    const out = [];

    for (const tr of rows) {
      const tds = tr.querySelectorAll("td");
      if (tds.length <= idxPuntos) continue;

      const link = tds[idxJugador]?.querySelector('a[onclick*="Playercard"]');
      const m = link?.getAttribute("onclick")?.match(/Playercard\((\d+)/);
      const idJugador = m ? Number(m[1]) : '';

      const top = (tds[idxPos]?.innerText || "").trim();

      const nombre = (tds[idxJugador]?.innerText || "")
        .replace(/\s+/g, " ")
        .trim();

      const alianza = (tds[idxAlianza]?.innerText || "")
        .replace(/\s+/g, " ")
        .trim() || "-";

      const puntosTxt = (tds[idxPuntos]?.innerText || "").trim();
      const puntos = Number(puntosTxt.replace(/[^\d]/g, "")) || 0;

      if (!idJugador || idJugador == "") continue;

      out.push({ top, idJugador, nombre, alianza, puntos });
    }
    console.log ('OUT:' + JSON.stringify(out));

    return out;9
  }

  function enviarEstadisticas(payload, parametro) {
    
    let WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzmIVtJIrCC8m8Q7BQ-UitE7Kl2G7Q4MzRvpAsNPJmoOz-5SxrtikzN6WlE_IW4v_iNaA/exec";
    
    // ✅ Persistente hasta respuesta
    toast("⏳ Enviando estadísticas a Google Sheets...", true, false);
    
    let sendData;
    sendData = `kind=${parametro}&payload=` + encodeURIComponent(JSON.stringify(payload))

    chrome.runtime.sendMessage(
      {
        action: "xhttp",
        method: "POST",
        url: WEBAPP_URL,
        data: sendData
      },
      function (res) {
        if (!res) return toast("❌ Sin respuesta del service worker", false, true);

        const status = res.status || 0;
        const text = res.responseText || "";
        console.log("[LUI STATS] WebApp response:", text);

        if (status && status !== 200) return toast(`❌ HTTP ${status}\n${text.slice(0, 160)}`, false, true);
        if (!text) return toast("❌ Respuesta vacía del WebApp", false, true);
        if (text.trim().startsWith("<") || text.includes("<html")) return toast("❌ WebApp devolvió HTML (error).", false, true);

        let json;
        try { json = JSON.parse(text); }
        catch { return toast("❌ No se ha recibido respuesta del Appscript \n" + text.slice(0, 160), false, true); }
        console.log(json.msg);
        toast(json.msg, true, true);
        window.__lui_stats_sent = true; // ✅ evita reenvío

      }
    );
  }
