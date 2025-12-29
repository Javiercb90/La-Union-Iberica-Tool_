// =========================
// Ordenación tabla
// =========================
function sortTable(table, colIndex, isNumeric, ths) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const th = ths[colIndex];
  const asc = th.getAttribute("data-sort") !== "asc";

  rows.sort((a, b) => {
      
    let x = a.children[colIndex].innerText.trim();
    let y = b.children[colIndex].innerText.trim();

    if (isAlliancePage() || isAllianceMemberList()){ 

      // Puntos: soporta "old → new"
      if (colIndex === 1) {
        const nx = Number((x.split("→")[1] || x).replace(/\D/g, "")) || 0;
        const ny = Number((y.split("→")[1] || y).replace(/\D/g, "")) || 0;
        return asc ? nx - ny : ny - nx;

      }
    
      // Coords: ordenar por sistema (parte central g:s:p)
      if (colIndex === 3) {
        const px = x.split(":");
        const py = y.split(":");
        const sx = Number(px[1]) || 0;
        const sy = Number(py[1]) || 0;
        return asc ? sx - sy : sy - sx;
      }

      if (isNumeric) {
        x = Number(x.replace(/\./g, "")) || 0;
        y = Number(y.replace(/\./g, "")) || 0;
        return asc ? x - y : y - x;
      }
    
    } else if (isPaginaEstadisticas()){

      // Puntos: soporta "old → new"
      if (colIndex === 2) {
        const nx = Number((x.split("→")[1] || x).replace(/\D/g, "")) || 0;
        const ny = Number((y.split("→")[1] || y).replace(/\D/g, "")) || 0;
        return asc ? nx - ny : ny - nx;
      }
    
      // Coords: ordenar por sistema (parte central g:s:p)
      if (colIndex === 5) {
        const px = x.split(":");
        const py = y.split(":");
        const sx = Number(px[1]) || 0;
        const sy = Number(py[1]) || 0;
        return asc ? sx - sy : sy - sx;
      }

      if (isNumeric) {
        x = Number(x.replace(/\./g, "")) || 0;
        y = Number(y.replace(/\./g, "")) || 0;
        return asc ? x - y : y - x;
      }

    }

    return asc ? x.localeCompare(y) : y.localeCompare(x);

  });

  ths.forEach((th) => (th.textContent = th.getAttribute("data-title")));
  const title = th.getAttribute("data-title");
  th.textContent = asc ? `${title} ↑` : `${title} ↓`;
  th.setAttribute("data-sort", asc ? "asc" : "desc");

  rows.forEach((r) => tbody.appendChild(r));
}

// =========================
// POST: enviar miembros al WebApp
// =========================
function enviarMiembros(members) {
  let WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzmIVtJIrCC8m8Q7BQ-UitE7Kl2G7Q4MzRvpAsNPJmoOz-5SxrtikzN6WlE_IW4v_iNaA/exec";

  toast("Enviando miembros a Google Sheet...");

  chrome.runtime.sendMessage(
    {
      action: "xhttp",
      method: "POST",
      url: WEBAPP_URL,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      data: "kind=members&payload=" + encodeURIComponent(JSON.stringify(members))
    },
    function (res) {
      if (!res) {
        toast("❌ Sin respuesta del service worker", false);
        return;
      }

      if (res.status !== 200) {
        toast(`❌ HTTP ${res.status} ${res.statusText}\n${(res.responseText || "").slice(0, 120)}`, false);
        return;
      }

      const text = res.responseText || "";
      if (text.trim().startsWith("<")) {
        toast("❌ WebApp devolvió HTML (error).", false);
        return;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        toast("❌ Respuesta no JSON:\n" + text.slice(0, 120), false);
        return;
      }

      if (json.ok) toast("✅ Enviado OK (" + members.length + " miembros)");
      else toast("❌ WebApp: " + (json.error || "error"), false);
    }
  );
}

// =========================
// Parse tabla miembros
// =========================
function parseAllianceTable() {
  const table = document.querySelector("#memberList");
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll("tr")).filter((r) => !r.querySelector("th"));
  const members = [];

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) continue;

    const name = cells[1].textContent.trim();
    const cargo = cells[3]?.textContent.trim() || "";
    const points = Number(cells[4]?.textContent.replace(/\./g, "").trim() || 0);
    const coords = cells[5]?.textContent.trim() || "";
    const lastConnection = cells[cells.length - 1].textContent.trim();

    members.push({ name, points, cargo, coords, lastConnection });
  }

  return members;
}

   


