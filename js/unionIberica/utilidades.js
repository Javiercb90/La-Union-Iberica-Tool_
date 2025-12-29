// =========================
  // Toast pequeño
  // =========================
  function toast(msg, ok = true) {
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
    clearTimeout(t._timer);
    t._timer = setTimeout(() => (t.style.display = "none"), 4000);
  }

function getPlayerName() {
  try {
    const xpath = "/html/body/div[2]/header/div/div[1]/div[2]/a/b";

    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );

    const node = result.singleNodeValue;
    if (!node) return "Jugador desconocido";

    return (node.textContent || "").trim();
  } catch {
    return "Jugador desconocido";
  }
}

function getXPathText(xpath) {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.STRING_TYPE,
    null
  );
  return result.stringValue.trim();
}

function getNodeByXPath(xpath, root = document) {
  return document.evaluate(
    xpath,
    root,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

function aplicarEstilosResponsivos(panel) {
  const esMovil = window.innerWidth <= 768; // Punto de ruptura estándar

  const estilosBase = {
    position: "fixed",
    bottom: esMovil ? "10px" : "20px", // Menos margen en móviles
    right: esMovil ? "5%" : "20px",    // Centrado lateral en móviles
    width: esMovil ? "90%" : "40%",   // Casi todo el ancho en móviles
    background: "rgba(0,0,0,0.85)",
    color: "white",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #555",
    zIndex: "999999",
    fontFamily: "Arial",
    fontSize: esMovil ? "12px" : "10px" // Texto algo más grande en móvil para lectura
  };

  Object.assign(panel.style, estilosBase);
}

function limpiarNumero(txt) {
  return Number(txt.replace(/\./g, '').replace(',', '.'));
}