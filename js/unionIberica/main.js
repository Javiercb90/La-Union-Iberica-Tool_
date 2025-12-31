// ================================
// main.js
// ================================

// Evita envíos duplicados de estadísticas
window.__LUI_STATS_SENT__ = window.__LUI_STATS_SENT__ || false;

function start() {
  console.log('[START] Ejecutando start()');

  eliminarVistaVersionMovilMateriales();
  mostrarMaterialesImperio();

  if (isEmpirePage()) {
    console.log('[START] Página Imperio');
    guardarMaterialesImperio();

  } else if (isPaginaEstadisticas() || isAlliancePage() || isAllianceMemberList()) {
    console.log('[START] Página Alianza o Estadísticas');

    // ✅ Solo guardamos alianza cuando estamos en la página de alianza (donde sí sale el nombre)
    if (isAlliancePage()) {
      try { detectAndStoreAlliance(); } catch (e) { console.warn('[LUI] detectAndStoreAlliance error', e); }
    }

    panelUnionIberica();

    // ===== ESTADÍSTICAS =====
    if (isPaginaEstadisticas()) {
      console.log('[START] Página Estadísticas detectada');

      setTimeout(() => {
        console.log('[STATS] Timeout ejecutado');

        const table = findStatsTable();
        console.log('[STATS] Tabla encontrada:', table);

        if (!table) {
          console.warn('[STATS] Tabla NO encontrada');
          return;
        }

        table.addEventListener('click', detectarTarjetaJugador, true);
        console.log('[STATS] Listener de click añadido a la tabla');

        const jugadores = parseStatsTable(table);
        console.log('[STATS] estadísticas universo:', jugadores);

        // ⛔ Evitar reenviar players
        if (!window.__LUI_STATS_SENT__) {
          console.log('[STATS] Enviando estadísticas (players) por primera vez');
          enviarEstadisticas(jugadores, 'players');
          window.__LUI_STATS_SENT__ = true;
        } else {
          console.log('[STATS] Estadísticas ya enviadas, skip');
        }

        // ✅ El automático puede ejecutarse siempre
        extraerPopUpsDeJugadoresEnCola(jugadores);
      }, 1000);

    } else if (isAllianceMemberList()) {
      console.log('[START] Página miembros alianza');

      const members = parseAllianceTable();
      enviarMiembros(members);
    }
  }
}
