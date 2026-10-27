/* ============================================================
   CONCEPTO DEL REVISOR · INFORME DE REVISIÓN (27/10/2026)

   Pieza común de SUPERVISIÓN y CONTRATACIÓN (mismo archivo en las dos).

   · El revisor que NO decide deja su concepto: VISTO BUENO (sugiere
     aprobar) o CON INCONSISTENCIA (sugiere devolver). La cuenta no cambia
     de estado.
   · Con el concepto guardado, el teléfono pide DE FONDO el INFORME DE
     REVISIÓN (PDF de una hoja, ruta revisionInforme). El revisor no espera:
     sale un aviso cuando está listo. Si cerró la app antes, lo arma quien
     decide al abrir la cuenta (y como red, el reloj del CORE).
   · El informe viaja por su ID; se ve en el visor del kit por el backend
     (revisionDocumento). Es interno: nunca se le envía al contratista.
   · Quien decide ve arriba de TOMAR DECISIÓN el resumen del revisor y el
     botón a su informe.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var EN_CAMINO = {};   /* un solo pedido de informe por cuenta y app */

  function sugiere(c) { return c && (c.sugiere || (K.norm(c.tipo) === 'VISTO BUENO' ? 'APROBAR' : 'DEVOLVER')); }
  function esAprobar(c) { return sugiere(c) === 'APROBAR'; }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function llave(cu, app) { return (app || '') + '|' + cu.fila + '|' + cu.idContrato + '|' + cu.informe; }

  /* el texto corto de lo que sugiere */
  function etiqueta(c) {
    return esAprobar(c) ? 'Visto bueno · sugiere aprobar' : 'Con inconsistencia · sugiere devolver';
  }

  /* ── el visor del informe ─────────────────────────────────── */
  function ver(c, cu, leer) {
    if (!c || !c.informe || !c.informe.id || !K.piezas.visor) return;
    K.piezas.visor.abrir([{
      titulo: 'Informe de revisión · cuenta ' + cu.informe + ' · ' + nombre(c.por),
      tipo: 'pdf',
      cargar: function () {
        /* es interno y no tiene enlace público: va directo por el backend (sin intentar Drive) */
        return leer('revisionDocumento', { fila: cu.fila, id: cu.idContrato, informe: cu.informe, archivo: c.informe.id });
      }
    }], { indice: 0 });
  }

  /* ── pedir el informe de fondo (no bloquea a nadie) ───────── */
  function asegurar(c, cu, op) {
    op = op || {};
    if (!c || !c.informePendiente || c.informe) return Promise.resolve(c);
    var k = llave(cu, c.app);
    if (EN_CAMINO[k]) return EN_CAMINO[k].then(function (cc) { if (op.alListo && cc && cc.informe) op.alListo(cc); return cc; });
    var datos = { fila: cu.fila, id: cu.idContrato, informe: cu.informe };
    /* ojo: 'app' es la app del viaje (el kit la pone); el informe de OTRA app va en 'revisor' */
    if (op.app) datos.revisor = op.app;
    var t0 = Date.now();
    EN_CAMINO[k] = K.pedir('revisionInforme', datos, { ms: 90000 }).then(function (r) {
      delete EN_CAMINO[k];
      if (r && r.informe && r.informe.id) {
        c.informe = r.informe;
        c.informePendiente = false;
        try { if (K.medir) K.medir('pantalla', 'informeRevision', Date.now() - t0); } catch (e) {}
        if (op.alListo) op.alListo(c);
      }
      return c;
    }, function (e) {
      delete EN_CAMINO[k];
      if (op.avisarError) K.aviso('El informe de revisión no se pudo armar ahora: ' + ((e && e.message) || 'sin conexión') + '. Se vuelve a intentar solo.', 'aviso', 7000);
      return c;
    });
    return EN_CAMINO[k];
  }

  /* ── la tarjeta del concepto (detalle y TOMAR DECISIÓN) ───── */
  function tarjeta(c, cu, leer, op) {
    op = op || {};
    var ok = esAprobar(c);
    var t = K.nodo('<div class="kit-tarjeta rv-aviso ' + (ok ? 'rv-aviso--ok' : 'rv-aviso--malo') + ' cpt">' + K.icono(ok ? 'check' : 'aviso', 18) +
      '<div class="cpt__c"><p class="cpt__t"><b></b></p><p class="cpt__q"></p><p class="cpt__n"></p><div class="cpt__a"></div></div></div>');
    t.querySelector('.cpt__t b').textContent = (op.titulo ? op.titulo + ' · ' : '') + etiqueta(c);
    t.querySelector('.cpt__q').textContent = nombre(c.por) + ' · ' + (c.fecha || '');
    var n = t.querySelector('.cpt__n');
    if (c.nota) n.textContent = c.nota; else n.remove();
    if (c.sugerencias && op.conSugerencias) {
      var s = K.nodo('<p class="cpt__s"><b>Sugerencias para la próxima cuenta:</b> <span></span></p>');
      s.querySelector('span').textContent = c.sugerencias;
      t.querySelector('.cpt__c').insertBefore(s, t.querySelector('.cpt__a'));
    }
    var zona = t.querySelector('.cpt__a');
    function pintarBoton() {
      zona.innerHTML = '';
      if (c.informe && c.informe.id) {
        var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano cpt__ver">' + K.icono('pdf', 15) + ' Informe de revisión</button>');
        b.addEventListener('click', function () { K.vibrar(6); ver(c, cu, leer); });
        zona.appendChild(b);
      } else {
        zona.appendChild(K.nodo('<span class="cpt__prep"><i class="cpt__punto" aria-hidden="true"></i> Informe de revisión en preparación…</span>'));
      }
    }
    pintarBoton();
    if (c.informePendiente && op.armar !== false) {
      asegurar(c, cu, { app: op.app, alListo: function () { if (t.isConnected) pintarBoton(); } });
    }
    return t;
  }

  window.CONCEPTO = { sugiere: sugiere, esAprobar: esAprobar, etiqueta: etiqueta, ver: ver, asegurar: asegurar, tarjeta: tarjeta };
}());
