/* ============================================================
   SUPERVISION-FLANDES · INFORME DE CUENTAS DE UN CONTRATISTA (entrega 6.3)

   #/informe/<ID CONTRATO>

   El DESCARGAR INFORME de la app vieja bajaba una hoja de Excel armada
   en el servidor con TODAS las cuentas del DOCUMENTO: a EDILBERTO le
   mezclaba sus tres contratos. Ahora:
     · Se pide por ID CONTRATO (documento + contrato): nunca se mezclan.
     · Antes de descargar se VE: el contrato, las cifras (valor, cobrado,
       pagado, saldo) y cada cuenta con su estado, su orden y su egreso.
     · PDF gerencial por bloques (con o sin las actividades de cada
       obligación) y Excel con las columnas que van a usar también
       CONTABILIDAD y TESORERÍA (pieza kit/informe-cuentas.js).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var DATOS = null;
  var CACHE = {};

  /* F11 · el informe cuesta ~2 s de servidor (las actividades de todas las
     cuentas). Se pinta YA con lo último que se vio de ese contrato
     (K.recordado) y el viaje se hace por detrás: si trae algo distinto, la
     vista se vuelve a pintar sola. */
  function cargar(id, fresco, alNuevo) {
    if (CACHE[id] && !fresco) return Promise.resolve(CACHE[id]);
    var red = O.leer('informeContratista', { idContrato: id }).then(function (d) {
      CACHE[id] = d;
      if (K.recordado) K.recordado.guardar('informe.' + id, d);
      return d;
    });
    var visto = (!fresco && K.recordado) ? K.recordado.leer('informe.' + id) : null;
    if (!visto) return red;
    red.then(function (d) {
      if (alNuevo && JSON.stringify(d.cuentas) + JSON.stringify(d.contrato) !== JSON.stringify(visto.cuentas) + JSON.stringify(visto.contrato)) alNuevo(d);
    }, function () {});
    return Promise.resolve(visto);
  }

  function vista(sub) {
    var id = decodeURIComponent(String(sub || ''));
    var caja = K.nodo('<div class="kit-ancho vista ct-ficha inf"></div>');
    C.app.appendChild(caja);
    DATOS = null;
    if (!id) {
      caja.appendChild(K.nodo('<section class="kit-tarjeta ct-vacio"><p>Elige un contratista y toca <b>Informe</b> en su tarjeta.</p></section>'));
      var ir = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('persona', 16) + ' Ir a mis contratistas</button>');
      ir.addEventListener('click', function () { C.irA('contratistas'); });
      caja.firstChild.appendChild(ir);
      K.piezas.creditos.montar(caja);
      return;
    }
    var ruta = location.hash;
    K.piezas.esqueletos.mientras(caja, cargar(id, false, function (d) {
      /* llegó lo fresco y es distinto: se repinta si la persona sigue aquí */
      if (location.hash === ruta && caja.isConnected) { var y = window.scrollY; DATOS = d; pintar(caja, d); window.scrollTo(0, y); }
    }), { forma: 'texto', cuantos: 8, espera: 'Trayendo las cuentas del contrato' })
      .then(function (d) { DATOS = d; pintar(caja, d); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e, function () { C.app.innerHTML = ''; vista(sub); })); });
  }

  function pintar(caja, d) {
    caja.innerHTML = '';
    var c = d.contrato || {}, IC = K.piezas.informeCuentas, k = IC.cifras(d);
    var foto = '';
    if (window.CONTRATISTAS) window.CONTRATISTAS.todas().some(function (f) { if (K.norm(f.id) === K.norm(c.id)) { foto = f.img || ''; return true; } return false; });

    var cab = K.nodo('<section class="kit-tarjeta ct-ficha__cab"></section>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(c.nombre, { tam: 76, foto: foto }));
    cab.appendChild(K.nodo('<div class="ct-ficha__quien"><h2>' + K.esc(O.nombre(c.nombre)) + '</h2>' +
      '<p>CC/NIT ' + K.esc(c.doc) + ' · Contrato ' + K.esc(c.contrato) + '</p>' +
      '<div class="ct-t__marcas"><span class="kit-pastilla ' + (c.estado === 'ACTIVO' ? 'kit-pastilla--ok' : 'kit-pastilla--aviso') + '" aria-pressed="true">' + K.esc(c.estado || '') + '</span>' +
      (c.tramo ? '<span class="ct-marca">' + K.esc(c.tramo) + '</span>' : '') + (c.cedido ? '<span class="ct-marca ct-marca--ced">CEDIDO</span>' : '') + '</div></div>'));
    caja.appendChild(cab);

    var cif = K.nodo('<section class="kit-tarjeta rp-resumen inf-cifras"></section>');
    cif.appendChild(K.nodo('<div class="ct-cifras">' +
      '<div class="ct-cifra"><b>' + K.esc(K.pesos(k.valor)) + '</b><span>Valor del contrato</span></div>' +
      '<div class="ct-cifra"><b>' + K.esc(K.pesos(k.cobrado)) + '</b><span>Cobrado · ' + k.cuentas + (k.total ? ' de ' + k.total : '') + ' cuentas</span></div>' +
      '<div class="ct-cifra rp-cifra--ok"><b>' + K.esc(K.pesos(k.pagado)) + '</b><span>Pagado · ' + k.pagadas + '</span></div>' +
      '<div class="ct-cifra"><b>' + K.esc(K.pesos(k.saldo)) + '</b><span>Saldo por ejecutar</span></div></div>'));
    cif.appendChild(K.nodo('<div class="ct-plazo"><p class="ct-plazo__t"><span>Ejecución</span><b>' + k.avance + '% cobrado</b></p>' +
      '<div class="ct-plazo__barra" role="img" aria-label="' + k.avance + ' por ciento cobrado"><i style="width:' + Math.min(100, k.avance) + '%"></i></div></div>'));
    caja.appendChild(cif);

    /* descargas */
    var baj = K.nodo('<section class="kit-tarjeta inf-bajar"><h3 class="grupo__t">Descargar el informe</h3>' +
      '<label class="inf-act"><input type="checkbox"> <span>Incluir en el PDF las actividades de cada obligación</span></label>' +
      '<div class="rp-bajar">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 16) + ' PDF (informe)</button>' +
      '<button type="button" class="kit-btn kit-btn--plano" data-f="xlsx">' + K.icono('hoja', 16) + ' Excel (todas las columnas)</button></div>' +
      '<p class="formulario__nota">El PDF es un informe para leer, por bloques. El Excel trae una fila por cuenta con todas las columnas (las mismas de Contabilidad y Tesorería).</p></section>');
    var chk = baj.querySelector('input');
    baj.querySelectorAll('button').forEach(function (b) {
      b.disabled = !(d.cuentas || []).length;
      b.addEventListener('click', function () {
        if (b.disabled) return;
        b.disabled = true; b.classList.add('kit-ocupado');
        var p = b.getAttribute('data-f') === 'pdf' ? IC.aPDF(d, { actividades: chk.checked }) : IC.aExcel(d);
        Promise.resolve(p).then(function (r) {
          K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
        }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
          .then(function () { b.disabled = false; b.classList.remove('kit-ocupado'); });
      });
    });
    caja.appendChild(baj);

    /* las cuentas */
    var g = K.nodo('<section class="kit-tarjeta grupo inf-cuentas"><h3 class="grupo__t">Cuentas (' + (d.cuentas || []).length + ')</h3></section>');
    if (!(d.cuentas || []).length) g.appendChild(K.nodo('<p class="formulario__nota">Este contrato todavía no tiene cuentas.</p>'));
    (d.cuentas || []).slice().reverse().forEach(function (x) {
      var t = IC.tono(x.estado);
      var fila = K.nodo('<article class="rp-fila inf-fila' + (t === 'malo' ? ' rp-fila--dev' : '') + '"></article>');
      fila.appendChild(K.nodo('<div class="rp-fila__f"><b>' + x.informe + '</b><small>de ' + (x.total || '?') + '</small></div>'));
      var cc = K.nodo('<div class="rp-fila__c"></div>');
      cc.appendChild(K.nodo('<p class="rp-fila__n">' + K.esc(K.pesos(x.cobro)) + (x.desde ? ' <small>· ' + K.esc(O.fecha(x.desde)) + ' al ' + K.esc(O.fecha(x.hasta)) + '</small>' : '') + '</p>'));
      cc.appendChild(K.nodo('<p class="rp-fila__d">' + (x.radicada ? 'Radicada ' + K.esc(O.fecha(x.radicada)) : 'Sin radicar') +
        ' · saldo después ' + K.esc(K.pesos(x.nuevo)) + (x.planilla ? ' · planilla ' + K.esc(x.planilla) : '') + '</p>'));
      var pago = [];
      if (x.orden) pago.push('Orden ' + x.orden + (x.fechaOrden ? ' (' + O.fecha(x.fechaOrden) + ')' : ''));
      if (x.egreso) pago.push('Egreso ' + x.egreso + (x.fechaEgreso ? ' (' + O.fecha(x.fechaEgreso) + ')' : ''));
      if (pago.length) cc.appendChild(K.nodo('<p class="rp-fila__r">' + K.icono('moneda', 12) + ' ' + K.esc(pago.join(' · ')) + '</p>'));
      if (x.observaciones && t === 'malo') { var mo = K.nodo('<p class="rp-fila__m"></p>'); mo.textContent = x.observaciones; cc.appendChild(mo); }
      var docs = K.nodo('<div class="inf-docs"></div>');
      if (x.informeSup) docs.appendChild(K.nodo('<a class="ins-accion" href="' + K.esc(x.informeSup) + '" target="_blank" rel="noopener">' + K.icono('pdf', 14) + ' Informe de supervisión</a>'));
      if (x.acta) docs.appendChild(K.nodo('<a class="ins-accion" href="' + K.esc(x.acta) + '" target="_blank" rel="noopener">' + K.icono('documento', 14) + ' Acta de cumplimiento</a>'));
      if (docs.children.length) cc.appendChild(docs);
      fila.appendChild(cc);
      fila.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' + (t === 'ok' ? 'of-estado--ok' : (t === 'malo' ? 'of-estado--malo' : 'of-estado--abierto')) + '">' + K.esc(x.estado) + '</span>'));
      g.appendChild(fila);
    });
    caja.appendChild(g);

    if ((c.obligaciones || []).length) {
      var ob = K.nodo('<details class="kit-tarjeta grupo ct-obl"><summary class="grupo__t">Obligaciones del contrato (' + c.obligaciones.length + ')</summary></details>');
      c.obligaciones.forEach(function (o) {
        ob.appendChild(K.nodo('<div class="obl-lista__i"><span class="obl-lista__n">' + o.n + '</span><span class="obl-lista__t">' + K.esc(o.texto) + '</span></div>'));
      });
      caja.appendChild(ob);
    }
    K.piezas.creditos.montar(caja);
  }

  window.INFORME = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    olvidar: function () { DATOS = null; CACHE = {}; },
    _datos: function () { return DATOS; }
  };
}());
