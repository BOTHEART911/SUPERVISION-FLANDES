/* ============================================================
   SUPERVISION-FLANDES · INFORMES FIRMADOS (entrega 6.3)

   La hoja FIRMAS: cada informe de supervisión que firmaste, con su ID de
   firma (el del QR del informe), el contratista, la cuenta y los saldos.

   Qué cambia frente a la app vieja (SUPERVISIÓN FIRMADOS)
     · Antes: una lista de texto y DESCARGAR FIRMAS, que armaba una hoja
       temporal en el servidor y esperaba 12 s para borrarla.
     · Ahora: tarjetas con la cara del contratista, el PDF del informe (y
       el acta de cumplimiento si es la última cuenta) en el visor, sin
       permisos de Drive; rango de fechas, secretaría y búsqueda en el
       teléfono; cifras arriba; Excel (una fila por firma) y PDF por
       bloques agrupado por mes.

   Qué ve cada quien lo decide el CORE (SUPERVISION.firmados): el
   supervisor, lo que ÉL firmó; el REVISOR, lo del supervisor o la
   secretaría a la que está atado.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'firmados.filtro.v1';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var DATA = null;     /* [obj] */
  var HORA = null;
  var CARGANDO = null;
  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return { atajo: g.atajo || 'anio', sec: g.sec || '', busca: '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, { atajo: F.atajo, sec: F.sec }); }

  function rango(atajo) {
    var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    if (atajo === 'mes') return { desde: O.isoDe(new Date(hoy.getFullYear(), hoy.getMonth(), 1, 12)), hasta: O.isoDe(hoy) };
    if (atajo === 'mesPasado') return { desde: O.isoDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 12)), hasta: O.isoDe(new Date(hoy.getFullYear(), hoy.getMonth(), 0, 12)) };
    if (atajo === 'anio') return { desde: O.isoDe(new Date(hoy.getFullYear(), 0, 1, 12)), hasta: O.isoDe(hoy) };
    return { desde: '', hasta: '' };
  }

  function recibir(d) {
    var campos = (d && d.campos) || [];
    DATA = ((d && d.filas) || []).map(function (a) {
      var o = {};
      campos.forEach(function (c, i) { o[c] = a[i]; });
      o._t = K.norm([o.nombre, o.doc, o.contrato, o.idFirma, o.sec, o.firmo].join(' '));
      return o;
    });
    HORA = new Date();
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('firmados').then(function (d) { CARGANDO = null; recibir(d); return DATA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function coincide(t, q) {
    q = K.norm(q || '');
    if (!q) return true;
    var p = q.split(' ').filter(Boolean);
    for (var i = 0; i < p.length; i++) if (t.indexOf(p[i]) < 0) return false;
    return true;
  }

  function pasa(x, sin) {
    sin = sin || {};
    var r = rango(F.atajo);
    if (!sin.rango && r.desde && (x.fecha < r.desde || x.fecha > r.hasta)) return false;
    if (!sin.sec && F.sec && x.sec !== F.sec) return false;
    return coincide(x._t, F.busca);
  }
  function filtradas() { return (DATA || []).filter(function (x) { return pasa(x); }); }

  function textoRango() {
    return { mes: 'Este mes', mesPasado: 'El mes pasado', anio: 'Este año', todo: 'Todo el historial' }[F.atajo] || '';
  }
  function mesDe(iso) {
    var m = /^(\d{4})-(\d{2})/.exec(iso || '');
    return m ? MESES[+m[2] - 1].charAt(0).toUpperCase() + MESES[+m[2] - 1].slice(1) + ' de ' + m[1] : 'Sin fecha';
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of rp sf"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'lapiz', 'INFORMES FIRMADOS',
      'Cada informe de supervisión que se firmó en tu supervisión, con su PDF (y el acta de cumplimiento en la última cuenta). Filtra por fecha y descárgalos en PDF o Excel.');

    var b = O.barra({
      placeholder: 'Contratista, documento, contrato o ID de firma', valor: F.busca,
      alBuscar: function (q) { F.busca = q; VER = 40; pintar(); },
      alRefrescar: function () { return cargar(true).then(pintar); }
    });
    caja.appendChild(b.caja);
    var zR = K.nodo('<div></div>'), zS = K.nodo('<div></div>');
    caja.appendChild(zR); caja.appendChild(zS);
    var resumen = K.nodo('<section class="kit-tarjeta rp-resumen"></section>');
    caja.appendChild(resumen);
    var descargas = K.nodo('<div class="rp-bajar">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 16) + ' Descargar PDF</button>' +
      '<button type="button" class="kit-btn kit-btn--plano" data-f="xlsx">' + K.icono('hoja', 16) + ' Descargar Excel</button></div>');
    caja.appendChild(descargas);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var lista = K.nodo('<div class="kit-rejilla ct-lista"></div>');
    caja.appendChild(lista);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);
    var VER = 40;
    mas.addEventListener('click', function () { VER += 40; pintarLista(); });

    var pR = K.piezas.pastillas.montar(zR, {
      etiqueta: 'Firmados', valor: F.atajo,
      opciones: [{ valor: 'mes', texto: 'Este mes' }, { valor: 'mesPasado', texto: 'Mes pasado' }, { valor: 'anio', texto: 'Este año' }, { valor: 'todo', texto: 'Todo' }],
      alCambiar: function (v) { F.atajo = v; guardarFiltro(); VER = 40; pintar(); }
    });
    var pS = K.piezas.pastillas.montar(zS, {
      etiqueta: 'Secretaría', valor: F.sec, opciones: [{ valor: '', texto: 'Todas las secretarías' }],
      alCambiar: function (v) { F.sec = v; guardarFiltro(); VER = 40; pintar(); }
    });

    function repintarPastillas() {
      var bR = DATA.filter(function (x) { return pasa(x, { rango: true }); });
      var cR = {};
      ['mes', 'mesPasado', 'anio', 'todo'].forEach(function (a) {
        var r = rango(a);
        cR[a] = bR.filter(function (x) { return !r.desde || (x.fecha >= r.desde && x.fecha <= r.hasta); }).length;
      });
      pR.conteos(cR); O.marcar(zR, F.atajo);
      var bS = DATA.filter(function (x) { return pasa(x, { sec: true }); });
      var m = {};
      bS.forEach(function (x) { if (x.sec) m[x.sec] = (m[x.sec] || 0) + 1; });
      var ks = Object.keys(m).sort(function (a, c) { return a.localeCompare(c, 'es'); });
      var cS = { '': bS.length };
      ks.forEach(function (k) { cS[k] = m[k]; });
      pS.opciones([{ valor: '', texto: 'Todas las secretarías' }].concat(ks.map(function (k) { return { valor: k, texto: O.titulo(k) }; })));
      pS.conteos(cS); O.marcar(zS, F.sec);
      zS.hidden = ks.length <= 1 && !F.sec;
    }

    function pintarResumen(filas) {
      var cobro = 0, gente = {}, actas = 0, pdf = 0;
      filas.forEach(function (x) { cobro += Number(x.cobro) || 0; gente[x.id] = 1; if (x.tActa) actas++; if (x.tInforme) pdf++; });
      resumen.innerHTML = '';
      resumen.appendChild(K.nodo('<p class="rp-resumen__rango">' + K.icono('reloj', 14) + ' ' + K.esc(textoRango()) + '</p>'));
      resumen.appendChild(K.nodo('<div class="ct-cifras">' +
        '<div class="ct-cifra"><b>' + K.numero(filas.length) + '</b><span>Informes firmados</span></div>' +
        '<div class="ct-cifra"><b>' + K.numero(Object.keys(gente).length) + '</b><span>Contratos</span></div>' +
        '<div class="ct-cifra rp-cifra--ok"><b>' + K.esc(K.pesos(cobro)) + '</b><span>Cobro certificado</span></div>' +
        '<div class="ct-cifra"><b>' + K.numero(actas) + '</b><span>Con acta final</span></div></div>'));
      if (filas.length && pdf < filas.length) {
        resumen.appendChild(K.nodo('<p class="formulario__nota rp-origen">' + K.icono('info', 13) + ' ' + K.numero(filas.length - pdf) +
          ' firmas no tienen el PDF enlazado en la cuenta (firmas viejas de la app anterior o cuentas que ya no están en la hoja).</p>'));
      }
    }

    function tarjeta(x) {
      var t = K.nodo('<article class="kit-tarjeta ct-t sf-t"></article>');
      var cab = K.nodo('<div class="ct-t__cab"></div>');
      if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(x.nombre, { tam: 44, foto: x.img || '' }));
      cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(O.nombre(x.nombre)) + '</h3>' +
        '<p class="ct-t__doc">Contrato ' + K.esc(x.contrato || '—') + ' · cuenta ' + K.esc(x.informe || '?') + '</p></div>'));
      if (x.estado) cab.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' +
        (x.estado === 'PAGADA' ? 'of-estado--ok' : 'of-estado--abierto') + '">' + K.esc(x.estado) + '</span>'));
      t.appendChild(cab);
      t.appendChild(K.nodo('<dl class="ct-t__datos">' +
        '<div><dt>Firmado</dt><dd>' + K.esc(O.fecha(x.fecha)) + (x.hora ? ' <small>' + K.esc(x.hora) + '</small>' : '') + '</dd></div>' +
        '<div><dt>ID de firma</dt><dd>' + K.esc(x.idFirma) + '</dd></div>' +
        '<div><dt>Cobro</dt><dd>' + K.esc(K.pesos(x.cobro)) + '</dd></div>' +
        '<div><dt>Saldo después</dt><dd>' + K.esc(K.pesos(x.saldo)) + '</dd></div>' +
        (x.radicada ? '<div><dt>Radicada</dt><dd>' + K.esc(O.fecha(x.radicada)) + '</dd></div>' : '') +
        (C.alcance && C.alcance().tipo !== 'SUPERVISOR' ? '<div><dt>Firmó</dt><dd>' + K.esc(O.nombre(x.firmo)) + '</dd></div>' : '') +
        '</dl>'));
      var a = K.nodo('<div class="ct-acc"></div>');
      var docs = [];
      if (x.tInforme) docs.push({ titulo: 'Informe de supervisión · ' + O.nombre(x.nombre) + ' · cuenta ' + x.informe, t: x.tInforme, nombre: 'INFORME_SUPERVISION_C' + x.informe + '_' + x.contrato + '.pdf' });
      if (x.tActa) docs.push({ titulo: 'Acta de cumplimiento · ' + O.nombre(x.nombre), t: x.tActa, nombre: 'ACTA_CUMPLIMIENTO_C' + x.informe + '_' + x.contrato + '.pdf' });
      if (docs.length) {
        var ver = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('pdf', 16) + ' Ver informe</button>');
        ver.addEventListener('click', function () { K.vibrar(8); O.verDocs(docs, 0); });
        a.appendChild(ver);
        if (x.tActa) {
          var ac = K.nodo('<button type="button" class="ins-accion">' + K.icono('documento', 16) + ' Acta final</button>');
          ac.addEventListener('click', function () { K.vibrar(8); O.verDocs(docs, 1); });
          a.appendChild(ac);
        }
      } else {
        a.appendChild(K.nodo('<p class="formulario__nota sf-sinpdf">Sin PDF enlazado en la cuenta.</p>'));
      }
      t.appendChild(a);
      return t;
    }

    function pintarLista() {
      var filas = filtradas();
      lista.innerHTML = '';
      mas.hidden = true;
      if (!DATA.length) { lista.appendChild(O.vacio('Todavía no hay informes firmados en tu supervisión.')); return; }
      if (!filas.length) {
        lista.appendChild(O.vacio('No hay informes firmados con estos filtros en ' + textoRango().toLowerCase() + '.', function () {
          F.atajo = 'todo'; F.sec = ''; F.busca = ''; b.inp.value = ''; pR.poner('todo'); guardarFiltro(); pintar();
        }));
        return;
      }
      filas.slice(0, VER).forEach(function (x) { lista.appendChild(tarjeta(x)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(40, filas.length - VER) + ' más de ' + K.numero(filas.length - VER); }
    }

    function pintar() {
      if (!DATA) return;
      repintarPastillas();
      var filas = filtradas();
      pintarResumen(filas);
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'informe' : 'informes') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      descargas.querySelectorAll('button').forEach(function (x) { x.disabled = !filas.length; });
      pintarLista();
    }

    descargas.querySelectorAll('button').forEach(function (x) {
      x.addEventListener('click', function () { bajar(x.getAttribute('data-f'), x); });
    });

    K.piezas.esqueletos.mientras(lista, cargar(false), { forma: 'tarjetas', cuantos: 4, espera: 'Trayendo tus informes firmados' })
      .then(pintar)['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ descargar ══════════════ */

  var COLS = [
    { campo: 'idFirma', titulo: 'ID de firma' },
    { campo: function (x) { return O.fecha(x.fecha) + (x.hora ? ' ' + x.hora : ''); }, titulo: 'Firmado' },
    { campo: 'nombre', titulo: 'Contratista' },
    { campo: 'doc', titulo: 'Documento' },
    { campo: 'contrato', titulo: 'Contrato' },
    { campo: 'informe', titulo: 'Cuenta' },
    { campo: function (x) { return O.fecha(x.radicada); }, titulo: 'Radicada' },
    { campo: 'actual', titulo: 'Saldo antes', tipo: 'pesos' },
    { campo: 'cobro', titulo: 'Cobro', tipo: 'pesos' },
    { campo: 'saldo', titulo: 'Saldo después', tipo: 'pesos' },
    { campo: 'estado', titulo: 'Estado de la cuenta' },
    { campo: 'firmo', titulo: 'Supervisor que firmó' },
    { campo: 'sec', titulo: 'Secretaría' }
  ];
  var COLS_XLS = COLS.concat([{ campo: 'id', titulo: 'ID contrato' }]);

  function informe(filas) {
    var cobro = 0;
    filas.forEach(function (x) { cobro += Number(x.cobro) || 0; });
    return {
      subtitulo: textoRango() + ' · ' + K.numero(filas.length) + ' informes firmados' + (F.sec ? ' · ' + O.titulo(F.sec) : '') + (F.busca ? ' · búsqueda: ' + F.busca : ''),
      bloque: {
        titulo: function (x) { return O.nombre(x.nombre); },
        sub: function (x) { return 'Contrato ' + (x.contrato || '?') + ' · cuenta ' + (x.informe || '?') + ' · firmado el ' + O.fecha(x.fecha) + (x.hora ? ' ' + x.hora : ''); },
        marca: function (x) { return x.idFirma; },
        tono: function (x) { return x.estado === 'PAGADA' ? 'ok' : 'info'; },
        omitir: ['Firmado', 'Contratista', 'Contrato', 'Cuenta', 'ID de firma']
      },
      grupo: function (x) { return mesDe(x.fecha); },
      resumen: [
        { etiqueta: 'Informes firmados', valor: K.numero(filas.length) },
        { etiqueta: 'Cobro certificado', valor: K.pesos(cobro), tono: 'ok' },
        { etiqueta: 'Con acta final', valor: K.numero(filas.filter(function (x) { return x.tActa; }).length) }
      ]
    };
  }

  function bajar(formato, boton) {
    if (!K.piezas.exportar) { K.aviso('La descarga no está disponible en esta versión.', 'aviso'); return; }
    var filas = filtradas();
    if (!filas.length) return;
    var nombre = 'Informes de supervisión firmados · ' + textoRango();
    boton.disabled = true; boton.classList.add('kit-ocupado');
    var p = formato === 'pdf' ? K.piezas.exportar.aPDF(nombre, COLS, filas, informe(filas)) : K.piezas.exportar.aExcel(nombre, COLS_XLS, filas);
    Promise.resolve(p).then(function (r) {
      K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
    }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
      .then(function () { boton.disabled = false; boton.classList.remove('kit-ocupado'); });
  }

  window.FIRMADOS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATA = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; },
    _filtradas: filtradas,
    _rango: textoRango,
    _informe: informe
  };
}());
