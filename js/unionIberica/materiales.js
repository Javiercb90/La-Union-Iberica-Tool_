function mostrarMaterialesImperio() {
  const metal = localStorage.getItem("ui_total_metal");
  const crystal = localStorage.getItem("ui_total_crystal");
  const deut = localStorage.getItem("ui_total_deuterium");

  if (!metal && !crystal && !deut) return;

  document.querySelectorAll(".recursosPlanetas").forEach(e => e.remove());

  const render = (id, value) => {
    const el = document.getElementById(id);
    if (!el || !value) return;

    const nuevo = document.createElement("div");
    nuevo.style.color = "yellow";
    nuevo.className = "recursosPlanetas";
    nuevo.textContent = value;
    el.insertAdjacentElement("beforebegin", nuevo);
  };

  render("current_metal", metal);
  render("current_crystal", crystal);
  render("current_deuterium", deut);
}

function guardarMaterialesImperio() {
  const totalMetal = getXPathText('/html/body/div[2]/content/table[1]/tbody/tr[11]/td[2]/text()');
  const totalCrystal = getXPathText('/html/body/div[2]/content/table[1]/tbody/tr[12]/td[2]/text()');
  const totalDeut = getXPathText('/html/body/div[2]/content/table[1]/tbody/tr[13]/td[2]/text()');

  localStorage.setItem("ui_total_metal", totalMetal);
  localStorage.setItem("ui_total_crystal", totalCrystal);
  localStorage.setItem("ui_total_deuterium", totalDeut);

  mostrarMaterialesImperio();
}

function eliminarVistaVersionMovilMateriales() {
  const safe = (fn, label) => {
    try { fn(); }
    catch (e) {
      console.warn('[MATERIALES] Fallo en', label);
    }
  };

  // METAL
  safe(() => {
    getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[1]/a/img')?.remove();
    getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[1]/a/div[3]')?.remove();

    const desk = getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[1]/a/div[2]');
    if (!desk) return;

    desk.classList.remove("movil", "no-mobile");
    desk.classList.add("general");
  }, 'metal');

  // CRISTAL
  safe(() => {
    getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[2]/a/img')?.remove();
    getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[2]/a/div[3]')?.remove();

    const desk = getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[2]/a/div[2]');
    if (!desk) return;

    desk.classList.remove("no-mobile");
    desk.classList.add("general");
  }, 'cristal');

  // DEUTERIO
  safe(() => {
    getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[3]/a/img')?.remove();
    getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[3]/a/div[3]')?.remove();

    const desk = getNodeByXPath('/html/body/div[2]/header/div/div[3]/div[3]/a/div[2]');
    if (!desk) return;

    desk.classList.remove("no-mobile");
    desk.classList.add("general");
  }, 'deuterio');
}

function cerosConvertidosEnFlamencasBailando() {
  document.querySelectorAll(".recursosPlanetas, .res_max")
    .forEach(e => e.textContent = String(e.textContent).replace(/0/g, "💃"));
}
