// =========================
// GET: leer tabla desde WebApp
// =========================
// =========================
// Panel flotante
// =========================
function panelUnionIberica() {
  // elimina panel viejo (evita “zombies” tras recargar extensión)
  const old = document.getElementById("alliance-fixed-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.id = "alliance-fixed-panel";

  // Aplicar al inicio
  aplicarEstilosResponsivos(panel);

  // Actualizar si el usuario gira el móvil o cambia el tamaño de ventana
  window.addEventListener("resize", () => aplicarEstilosResponsivos(panel));

  panel.innerHTML = `
    <div style="position:relative; margin-bottom:8px; font-weight:bold; text-align:center;">
      LA UNIÓN IBÉRICA
      <div id="close-panel"
        style="position:absolute; top:-10px; right:-10px; background:#d32f2f; color:white; font-weight:bold;
                width:20px; height:20px; display:flex; justify-content:center; align-items:center;
                border-radius:50%; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
        ✕
      </div>
    </div>

    <button id="extract-btn"
      style="width:100%; padding:6px; background:#1e88e5; color:white; border:none; border-radius:4px; cursor:pointer; margin-bottom:6px;">
      ${isAlliancePage() || isAllianceMemberList() ? 'Cargar Info Alianza' : 'Cargar Info Universo'}
    </button>

    <div id="extract-output"
      style="margin-top:4px; max-height:300px; overflow:auto; background:black; padding:6px; border-radius:4px; font-size:10px;">
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("close-panel").addEventListener("click", () => panel.remove());
  document.getElementById("extract-btn").addEventListener("click", obtenerTabla);
}

function obtenerTabla() {

  let WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzmIVtJIrCC8m8Q7BQ-UitE7Kl2G7Q4MzRvpAsNPJmoOz-5SxrtikzN6WlE_IW4v_iNaA/exec";

  const output = document.getElementById("extract-output");
  if (output) output.textContent = "Cargando datos...";

  // Si has recargado extensión, evita crash
  if (!chrome?.runtime?.id) {
    if (output) output.textContent = "Extensión recargada: pulsa F5 en la página.";
    return;
  }

  if (isAlliancePage()) {
    WEBAPP_URL = WEBAPP_URL + `?dato=${encodeURIComponent('alianza')}`;
  } else if (isPaginaEstadisticas()) {
    WEBAPP_URL = WEBAPP_URL + `?dato=${encodeURIComponent('estadisticas')}`;
  }

  chrome.runtime.sendMessage(
    { action: "xhttp", method: "GET", url: WEBAPP_URL },
    function (response) {
      const text = response?.responseText || "";
      if (!text) {
        if (output) output.textContent = "Respuesta vacía del WebApp.";
        return;
      }

      // Si viene HTML, es error/login/redirect
      if (text.trim().startsWith("<")) {
        if (output) output.textContent = text + "WebApp devolvió HTML (error). Abre /exec en el navegador para ver el fallo.";
        return;
      }

      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (output) output.textContent = "Respuesta no es JSON: " + text.slice(0, 150);
        return;
      }

      if (!data.ok) {
        if (output) output.textContent = "WebApp error: " + (data.error || "desconocido");
        return;
      }

      const rows = data.rows || [];
      if (!rows.length) {
        if (output) output.textContent = "No hay datos.";
        return;
      }

      let fechaAnterior = (rows[0].fechaAnterior || "").replace("T", " ").slice(0, 19);
      let fechaActual = (rows[0].fechaActual || "").replace("T", " ").slice(0, 19);

      let html = `
        <p>Del ${fechaAnterior} al ${fechaActual}</p>
        <table id="tabla-puntos" style="width:100%; border-collapse:collapse; font-size:10px; text-align: center;">
          <thead>
            <tr>
            ${isPaginaEstadisticas() ? 
            '<th data-title="Posicion" style="cursor:pointer; text-align:center;">Posicion</th>' : ""}
              <th data-title="Jugador" style="cursor:pointer; text-align: center;">Jugador</th>
              <th data-title="Puntos" style="cursor:pointer; text-align:center;">Puntos</th>
              <th data-title="Dif Puntos" style="cursor:pointer; text-align:center;">Dif Puntos</th>
              ${isPaginaEstadisticas() ? 
              '<th data-title="Alianza" style="cursor:pointer; text-align:center;">Alianza</th>' : ""}
              <th data-title="Coords" style="cursor:pointer; text-align:center;">Coords</th>
            </tr>
          </thead>
          <tbody>
      `;

      rows.forEach((r) => {
        const coords = r.coords || "";
        let coordsLink = coords;

        if (coords.includes(":")) {
          const [g, s, p] = coords.split(":");
          const urlGaleria = `https://pr0game.com/uni6/game.php?page=galaxy&galaxy=${g}&system=${s}&position=${p}`;
          coordsLink = `<a href="${urlGaleria}" target="_blank" style="color:#4fc3f7;">${coords}</a>`;
        }

        const diff = Number(r.diferencia);
        let bgColor = "#fff2cc";
        if (diff >= 10) bgColor = "#c6efce";
        if (diff < 10) bgColor = "#ffc7ce";

        html += `
          <tr>
            ${isPaginaEstadisticas() 
          ?`<td style="color:${bgColor}; ">${r.position || ""}</td>` : ''}
            <td style="color:${bgColor};">${r.name || ""}</td>
            <td style="color:${bgColor}; white-space: nowrap;">${r.puntosTexto || ""}</td>
            <td style="color:${bgColor};  text-align:center;">${r.diferencia || ""}</td>
            ${isPaginaEstadisticas() 
          ?`<td style="color:${bgColor}; padding:auto;">${r.alianza || ""}</td>` : ''}
            <td style="color:${bgColor}; ">${coordsLink}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      if (output) output.innerHTML = html;

      const tabla = document.getElementById("tabla-puntos");
      const ths = tabla.querySelectorAll("th");
      ths[0].addEventListener("click", () => sortTable(tabla, 0, isPaginaEstadisticas(), ths));
      ths[1].addEventListener("click", () => sortTable(tabla, 1, false, ths));
      ths[2].addEventListener("click", () => sortTable(tabla, 2, !isPaginaEstadisticas(), ths));
      ths[3].addEventListener("click", () => sortTable(tabla, 3, isPaginaEstadisticas(), ths));
      ths[4].addEventListener("click", () => sortTable(tabla, 4, false, ths));
      ths[5].addEventListener("click", () => sortTable(tabla, 5, false, ths));
    }
  );
}