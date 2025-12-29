/*************************************************
 * CLICK EN TABLA DE ESTADÍSTICAS
 *************************************************/

function detectarTarjetaJugador(event) {
  console.log('[CLICK] Click detectado:', event.target);

  const target = event.target.closest('a');
  if (!target) return;

  const onclick = target.getAttribute('onclick');
  if (!onclick || !onclick.includes('Dialog.Playercard')) return;

  const m = onclick.match(/Playercard\(\s*(\d+)/);
  const idJugador = m ? m[1] : '';

  console.log('[CLICK] Playercard detectado ✔');

  esperarAQueCargueLaTarjetaJugador(idJugador)
    .then(jugador => {
      console.log('[MAIN] Jugador extraído:', jugador);
      enviarEstadisticas(jugador, 'player')
    })
    .catch(err => console.error('[MAIN] Error:', err));
}


/*************************************************
 * IFRAME FANCYBOX
 *************************************************/

function esperarAQueCargueLaTarjetaJugador(idJugador) {
  console.log('[OBSERVER] Esperando iframe fancybox');

  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe) return;

      console.log('[OBSERVER] Iframe encontrado ✔');
      observer.disconnect();

      iframe.addEventListener('load', () => {
        console.log('[OBSERVER] Iframe cargado');
        comprobarTarjetaJugadorBienCargada(iframe,idJugador).then(resolve);
      }, { once: true });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}


/*************************************************
 * CONTENIDO DEL IFRAME
 *************************************************/

function comprobarTarjetaJugadorBienCargada(iframe,idJugador) {
  return new Promise(resolve => {
    const doc = iframe.contentDocument;
    if (!doc) {
      console.warn('[IFRAME] Sin contentDocument');
      return;
    }

    console.log('[IFRAME] body:', doc.body);
    encontrarTablaTarjetaJugador(doc, resolve,idJugador);

    const observer = new MutationObserver(() => {
      encontrarTablaTarjetaJugador(doc, resolve,idJugador);
    });

    observer.observe(doc.body, { childList: true, subtree: true });
  });
}


/*************************************************
 * BUSCAR TABLA CORRECTA
 *************************************************/

function encontrarTablaTarjetaJugador(doc, resolve,idJugador) {
  const tablas = Array.from(doc.querySelectorAll('table'));

  console.log(`[SEARCH] Tablas encontradas: ${tablas.length}`);

  for (const tabla of tablas) {
    if (comprobarEstructuraTarjetaJugador(tabla)) {
      console.log('[SEARCH] Tabla playercard encontrada ✔', tabla);
      resolve(extraerDatosTarjetaJugador(tabla,idJugador));
      return;
    }
  }
}


/*************************************************
 * DETECTOR DE TABLA PLAYER CARD
 *************************************************/

function comprobarEstructuraTarjetaJugador(tabla) {
  const texto = tabla.innerText;
  return (
    texto.includes('Usuario') &&
    texto.includes('Planeta') &&
    texto.includes('Puntos')
  );
}


/*************************************************
 * EXTRACCIÓN
 *************************************************/

function extraerDatosTarjetaJugador(tabla,idJugador) {
  console.log('[EXTRACTOR] Extrayendo datos completos');

  const jugador = {
    idJugador: idJugador,
    nombre: '',
    planetaPrincipal: {
      nombre: '',
      coordenadas: ''
    },
    alianza: '',
    puntos: {
      estructuras: null,
      tecnologia: null,
      flotas: null,
      defensas: null,
      total: null
    }
  };

  // Mapeo EXACTO texto tabla -> clave objeto
  const MAP_PUNTOS = {
    'estructuras': 'estructuras',
    'tecnología': 'tecnologia',
    'tecnologia': 'tecnologia',
    'flotas': 'flotas',
    'defensas': 'defensas',
    'total': 'total'
  };

  tabla.querySelectorAll('tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;

    const label = tds[0].innerText.trim().toLowerCase();

    // === DATOS BÁSICOS ===
    if (label === 'usuario') {
      jugador.nombre = tds[1].innerText.trim();
      return;
    }

    if (label === 'planeta principal') {
      jugador.planetaPrincipal.nombre =
        tds[1].childNodes[0]?.textContent.trim() || '';

      jugador.planetaPrincipal.coordenadas =
        tds[1].querySelector('a')?.innerText.trim() || '';
      return;
    }

    if (label === 'alianza') {
      jugador.alianza = tds[1].innerText.trim();
      return;
    }

    // === PUNTOS ===
    if (tds.length === 5) {
      const tipoTexto = tds[1].innerText.trim().toLowerCase();
      const clave = MAP_PUNTOS[tipoTexto];

      if (!clave) {
        console.warn('[EXTRACTOR] Tipo de puntos desconocido:', tipoTexto);
        return;
      }

      jugador.puntos[clave] = {
        puntos: limpiarNumero(tds[2].innerText),
        porcentaje: tds[3].innerText.trim(),
        rango: tds[4].innerText.trim()
      };
    }
  });

  console.log('[EXTRACTOR] Jugador final:', jugador);
  return jugador;
}



