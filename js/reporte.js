/* ============================================================
   SUPERVISION-FLANDES · REPORTE DE SUPERVISIÓN (entrega 6.3)

   Todas las cuentas radicadas de tu supervisión (sin borradores ni
   ingresadas), de la radicación al pago: en qué va cada una, cuánto se
   cobró, cuánto se pagó, orden de pago y egreso.

   Carga única (patrón de BD Predial): UNA llamada trae todo y filtrar por
   rango, etapa, secretaría o contratista pasa en el teléfono. El CORE
   guarda la lista en caché mientras ningún estado cambie, así que abrirla
   otra vez no vuelve a leer la hoja.

   Descargas con el exportador del kit:
     · Excel: una fila por cuenta, todas las columnas.
     · PDF: informe gerencial por bloques, agrupado por contratista, con
       las cifras arriba (regla de Oss del 23/09: el PDF NO es la tabla).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'reporte.filtro.v1';

  /* las etapas de una cuenta, en el orden en que las vive */
  var ETAPAS = [
    { valor: 'sup', texto: 'En supervisión', estados: ['REPORTADA', 'PLAN DE PAGOS'], tono: 'aviso' },
    { valor: 'con', texto: 'En Contratación', estados: ['REVISADA POR SUPERVISOR', 'APROBADA'] },
    { valor: 'cor', texto: 'Devueltas o incompletas', estados: ['DEVUELTA', 'INCOMPLETA'], tono: 'malo' },
    { valor: 'pag', texto: 'En pago', estados: ['CERRADA', 'ORDEN DE PAGO', 'EGRESO'] },
    { valor: 'ok', texto: 'Pagadas', estados: ['PAGADA'], tono: 'ok' }
  ];
  function etapaDe(estado) {
    for (var i = 0; i < ETAPAS.length; i++) if (ETAPAS[i].estados.indexOf(estado) >= 0) return ETAPAS[i];
    return { valor: 'otro', texto: 'Otro estado' };
  }

  var DATA = null;
  var HORA = null;
  var CARGANDO = null;
  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    var r = rango(g.atajo || 'anio');
    return { atajo: g.atajo || 'anio', desde: g.atajo === 'otro' ? g.desde : r.desde, hasta: g.atajo === 'otro' ? g.hasta : r.hasta,
             etapa: g.etapa || '', sec: g.sec || '', busca: '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, { atajo: F.atajo, desde: F.desde, hasta: F.hasta, etapa: F.etapa, sec: F.sec }); }

  function rango(atajo) {
    var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    var d = new Date(hoy), h = new Date(hoy);
    if (atajo === 'mes') d.setDate(1);
    else if (atajo === 'mesPasado') { d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 12); h = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 12); }
    else if (atajo === 'anio') d = new Date(hoy.getFullYear(), 0, 1, 12);
    else if (atajo === 'todo') return { desde: '', hasta: '' };
    return { desde: O.isoDe(d), hasta: O.isoDe(h) };
  }

  function recibir(d) {
    var campos = (d && d.campos) || [];
    DATA = ((d && d.filas) || []).map(function (a) {
      var o = {};
      campos.forEach(function (c, i) { o[c] = a[i]; });
      o.etapa = etapaDe(o.estado).valor;
      o._t = K.norm([o.nombre, o.doc, o.contrato, o.sec, o.estado, o.orden, o.egreso, o.id].join(' '));
      return o;
    });
    HORA = new Date();
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('reporte', { fresco: !!fresco }).then(function (d) { CARGANDO = null; recibir(d); return DATA; },
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
    if (F.desde && x.radicada < F.desde) return false;
    if (F.hasta && x.radicada > F.hasta) return false;
    if (!sin.etapa && F.etapa && x.etapa !== F.etapa) return false;
    if (!sin.sec && F.sec && x.sec !== F.sec) return false;
    return coincide(x._t, F.busca);
  }
  function filtradas() { return (DATA || []).filter(function (x) { return pasa(x); }); }

  function textoRango() {
    if (!F.desde && !F.hasta) return 'Todo el historial';
    return 'Radicadas del ' + (F.desde ? O.fecha(F.desde) : 'inicio') + ' al ' + (F.hasta ? O.fecha(F.hasta) : 'hoy');
  }

  function sumas(filas) {
    var s = { cobro: 0, pagado: 0, pendiente: 0, gente: {} };
    filas.forEach(function (x) {
      var v = Number(x.cobro) || 0;
      s.cobro += v;
      if (x.etapa === 'ok') s.pagado += v; else s.pendiente += v;
      s.gente[x.id] = 1;
    });
    s.contratos = Object.keys(s.gente).length;
    return s;
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of rp"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'hoja', 'REPORTE DE SUPERVISIÓN',
      'Todas las cuentas de tu supervisión, de la radicación al pago. Elige el rango, filtra por etapa y descárgalo en PDF o Excel.');

    var zR = K.nodo('<section class="kit-tarjeta rp-rango"></section>');
    var zAt = K.nodo('<div></div>');
    zR.appendChild(zAt);
    var fechas = K.nodo('<div class="rp-fechas">' +
      '<label><span>Desde</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Desde"></label>' +
      '<label><span>Hasta</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Hasta"></label></div>');
    zR.appendChild(fechas);
    caja.appendChild(zR);
    var iD = fechas.querySelectorAll('input')[0], iH = fechas.querySelectorAll('input')[1];

    var b = O.barra({
      placeholder: 'Contratista, documento, contrato, orden o egreso', valor: F.busca,
      alBuscar: function (q) { F.busca = q; VER = 50; pintar(); },
      alRefrescar: function () { return cargar(true).then(pintar); }
    });
    caja.appendChild(b.caja);
    var zE = K.nodo('<div></div>'), zS = K.nodo('<div></div>');
    caja.appendChild(zE); caja.appendChild(zS);

    var resumen = K.nodo('<section class="kit-tarjeta rp-resumen"></section>');
    caja.appendChild(resumen);
    var descargas = K.nodo('<div class="rp-bajar">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 16) + ' Descargar PDF</button>' +
      '<button type="button" class="kit-btn kit-btn--plano" data-f="xlsx">' + K.icono('hoja', 16) + ' Descargar Excel</button></div>');
    caja.appendChild(descargas);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var lista = K.nodo('<div class="rp-lista"></div>');
    caja.appendChild(lista);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);
    var VER = 50;
    mas.addEventListener('click', function () { VER += 100; pintarLista(); });

    var pAt = K.piezas.pastillas.montar(zAt, {
      etiqueta: 'Rango', valor: F.atajo,
      opciones: [{ valor: 'mes', texto: 'Este mes' }, { valor: 'mesPasado', texto: 'Mes pasado' }, { valor: 'anio', texto: 'Este año' },
                 { valor: 'todo', texto: 'Todo' }, { valor: 'otro', texto: 'Otro rango' }],
      alCambiar: function (v) {
        F.atajo = v;
        if (v !== 'otro') { var r = rango(v); F.desde = r.desde; F.hasta = r.hasta; ponerFechas(); }
        guardarFiltro(); VER = 50; pintar();
      }
    });
    function ponerFechas() { iD.value = F.desde || ''; iH.value = F.hasta || ''; }
    if (K.piezas.fechas) K.piezas.fechas.montar(fechas);
    ponerFechas();
    [iD, iH].forEach(function (inp) {
      inp.addEventListener('change', function () {
        F.desde = iD.value || ''; F.hasta = iH.value || '';
        if (F.desde && F.hasta && F.desde > F.hasta) { var x = F.desde; F.desde = F.hasta; F.hasta = x; ponerFechas(); }
        F.atajo = 'otro'; pAt.poner('otro'); guardarFiltro(); VER = 50; pintar();
      });
    });

    var pE = K.piezas.pastillas.montar(zE, {
      etiqueta: 'Etapa', valor: F.etapa,
      opciones: [{ valor: '', texto: 'Todas' }].concat(ETAPAS.map(function (e) { return { valor: e.valor, texto: e.texto, tono: e.tono }; })),
      alCambiar: function (v) { F.etapa = v; guardarFiltro(); VER = 50; pintar(); }
    });
    var pS = K.piezas.pastillas.montar(zS, { etiqueta: 'Secretaría', valor: F.sec, opciones: [{ valor: '', texto: 'Todas las secretarías' }],
      alCambiar: function (v) { F.sec = v; guardarFiltro(); VER = 50; pintar(); } });

    function repintarPastillas() {
      var bE = DATA.filter(function (x) { return pasa(x, { etapa: true }); });
      var cE = { '': bE.length };
      ETAPAS.forEach(function (e) { cE[e.valor] = bE.filter(function (x) { return x.etapa === e.valor; }).length; });
      pE.conteos(cE); O.marcar(zE, F.etapa);
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
      var s = sumas(filas);
      resumen.innerHTML = '';
      resumen.appendChild(K.nodo('<p class="rp-resumen__rango">' + K.icono('reloj', 14) + ' ' + K.esc(textoRango()) + '</p>'));
      resumen.appendChild(K.nodo('<div class="ct-cifras">' +
        '<div class="ct-cifra"><b>' + K.numero(filas.length) + '</b><span>Cuentas</span></div>' +
        '<div class="ct-cifra"><b>' + K.numero(s.contratos) + '</b><span>Contratos</span></div>' +
        '<div class="ct-cifra rp-cifra--ok"><b>' + K.esc(K.pesos(s.pagado)) + '</b><span>Pagado</span></div>' +
        '<div class="ct-cifra"><b>' + K.esc(K.pesos(s.pendiente)) + '</b><span>En trámite</span></div></div>'));
      if (!filas.length) return;
      resumen.appendChild(K.nodo('<p class="ct-resumen__t">Por etapa</p>'));
      var z = K.nodo('<div class="ct-barras"></div>');
      var max = 1;
      var cuenta = ETAPAS.map(function (e) { var n = filas.filter(function (x) { return x.etapa === e.valor; }).length; if (n > max) max = n; return { e: e, n: n }; });
      cuenta.forEach(function (c) {
        if (!c.n) return;
        var fila = K.nodo('<button type="button" class="ct-barra">' +
          '<span class="ct-barra__n">' + K.esc(c.e.texto) + '</span>' +
          '<span class="ct-barra__v"><i style="width:' + Math.max(4, Math.round(c.n * 100 / max)) + '%"></i></span>' +
          '<b>' + c.n + '</b></button>');
        fila.addEventListener('click', function () { F.etapa = c.e.valor; guardarFiltro(); VER = 50; pintar(); });
        z.appendChild(fila);
      });
      resumen.appendChild(z);
    }

    function fila(x) {
      var e = etapaDe(x.estado);
      var r = K.nodo('<article class="rp-fila' + (x.etapa === 'cor' ? ' rp-fila--dev' : '') + '"></article>');
      r.appendChild(K.nodo('<div class="rp-fila__f"><b>' + K.esc(O.fecha(x.radicada).slice(0, 5) || '—') + '</b><small>' + K.esc(String(x.radicada || '').slice(0, 4)) + '</small></div>'));
      var c = K.nodo('<div class="rp-fila__c"></div>');
      c.appendChild(K.nodo('<p class="rp-fila__n">' + K.esc(O.nombre(x.nombre)) + '</p>'));
      c.appendChild(K.nodo('<p class="rp-fila__d">Contrato ' + K.esc(x.contrato || '—') + ' · cuenta ' + K.esc(x.informe || '?') + ' de ' + K.esc(x.total || '?') +
        ' · ' + K.esc(K.pesos(x.cobro)) + (x.desde ? ' · ' + K.esc(O.fecha(x.desde)) + ' al ' + K.esc(O.fecha(x.hasta)) : '') + '</p>'));
      var pago = [];
      if (x.orden) pago.push('Orden ' + x.orden + (x.fOrden ? ' (' + O.fecha(x.fOrden) + ')' : ''));
      if (x.egreso) pago.push('Egreso ' + x.egreso + (x.fEgreso ? ' (' + O.fecha(x.fEgreso) + ')' : ''));
      if (pago.length) c.appendChild(K.nodo('<p class="rp-fila__r">' + K.icono('moneda', 12) + ' ' + K.esc(pago.join(' · ')) + '</p>'));
      if (x.motivo) { var mo = K.nodo('<p class="rp-fila__m"></p>'); mo.textContent = x.motivo; c.appendChild(mo); }
      r.appendChild(c);
      r.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' +
        (e.tono === 'ok' ? 'of-estado--ok' : (e.tono === 'malo' ? 'of-estado--malo' : 'of-estado--abierto')) + '">' + K.esc(x.estado) + '</span>'));
      if (C.puede && C.puede('descargarInforme')) {
        r.style.cursor = 'pointer';
        r.title = 'Ver el informe de cuentas de este contrato';
        r.addEventListener('click', function () { C.irA('informe/' + encodeURIComponent(x.id)); });
      }
      return r;
    }

    function pintarLista() {
      var filas = filtradas();
      lista.innerHTML = '';
      mas.hidden = true;
      if (!DATA.length) { lista.appendChild(O.vacio('Todavía no hay cuentas radicadas en tu supervisión.')); return; }
      if (!filas.length) {
        lista.appendChild(O.vacio('No hay cuentas con estos filtros (' + textoRango().toLowerCase() + ').', function () {
          F.etapa = ''; F.sec = ''; F.busca = ''; b.inp.value = ''; guardarFiltro(); pintar();
        }));
        return;
      }
      filas.slice(0, VER).forEach(function (x) { lista.appendChild(fila(x)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(100, filas.length - VER) + ' más de ' + K.numero(filas.length - VER); }
    }

    function pintar() {
      if (!DATA) return;
      repintarPastillas();
      var filas = filtradas();
      pintarResumen(filas);
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'cuenta' : 'cuentas') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      descargas.querySelectorAll('button').forEach(function (x) { x.disabled = !filas.length; });
      pintarLista();
    }

    descargas.querySelectorAll('button').forEach(function (x) {
      x.addEventListener('click', function () { bajar(x.getAttribute('data-f'), x); });
    });

    K.piezas.esqueletos.mientras(lista, cargar(false), { forma: 'tarjetas', cuantos: 4, espera: 'Armando el reporte' })
      .then(pintar)['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ descargar ══════════════ */

  var COLS = [
    { campo: function (x) { return O.fecha(x.radicada); }, titulo: 'Radicada' },
    { campo: 'estado', titulo: 'Estado' },
    { campo: 'nombre', titulo: 'Contratista' },
    { campo: 'contrato', titulo: 'Contrato' },
    { campo: function (x) { return (x.informe || '?') + ' de ' + (x.total || '?'); }, titulo: 'Cuenta' },
    { campo: function (x) { return x.desde ? O.fecha(x.desde) + ' al ' + O.fecha(x.hasta) : ''; }, titulo: 'Periodo' },
    { campo: 'cobro', titulo: 'Cobro', tipo: 'pesos' },
    { campo: 'nuevo', titulo: 'Saldo después', tipo: 'pesos' },
    { campo: function (x) { return O.fecha(x.revisada); }, titulo: 'Revisada' },
    { campo: function (x) { return x.orden ? x.orden + (x.fOrden ? ' · ' + O.fecha(x.fOrden) : '') : ''; }, titulo: 'Orden de pago' },
    { campo: function (x) { return x.egreso ? x.egreso + (x.fEgreso ? ' · ' + O.fecha(x.fEgreso) : '') : ''; }, titulo: 'Egreso' },
    { campo: function (x) { return x.decidio ? O.nombre(x.decidio) : ''; }, titulo: 'Decidió en Supervisión' },
    { campo: 'motivo', titulo: 'Motivo de la devolución', largo: true }
  ];
  var COLS_XLS = [
    { campo: 'id', titulo: 'ID contrato' }, { campo: 'doc', titulo: 'Documento' }, { campo: 'nombre', titulo: 'Contratista' },
    { campo: 'contrato', titulo: 'Contrato' }, { campo: 'sec', titulo: 'Secretaría' }, { campo: 'sup', titulo: 'Supervisor' },
    { campo: 'informe', titulo: 'N° informe', tipo: 'numero' }, { campo: 'total', titulo: 'Total informes', tipo: 'numero' },
    { campo: 'estado', titulo: 'Estado' }, { campo: function (x) { return etapaDe(x.estado).texto; }, titulo: 'Etapa' },
    { campo: 'radicada', titulo: 'Fecha radicación', tipo: 'fecha' }, { campo: 'desde', titulo: 'Periodo desde', tipo: 'fecha' },
    { campo: 'hasta', titulo: 'Periodo hasta', tipo: 'fecha' }, { campo: 'saldo', titulo: 'Saldo anterior', tipo: 'pesos' },
    { campo: 'cobro', titulo: 'Cobro', tipo: 'pesos' }, { campo: 'nuevo', titulo: 'Nuevo saldo', tipo: 'pesos' },
    { campo: 'revisada', titulo: 'Fecha revisión', tipo: 'fecha' }, { campo: 'decidio', titulo: 'Decidió en Supervisión' },
    { campo: 'orden', titulo: 'N° orden de pago' }, { campo: 'fOrden', titulo: 'Fecha orden de pago', tipo: 'fecha' },
    { campo: 'egreso', titulo: 'N° egreso' }, { campo: 'fEgreso', titulo: 'Fecha egreso', tipo: 'fecha' },
    { campo: function (x) { return x.informeSup ? 'SI' : 'NO'; }, titulo: 'Informe de supervisión' },
    { campo: function (x) { return x.acta ? 'SI' : 'NO'; }, titulo: 'Acta de cumplimiento' },
    { campo: 'motivo', titulo: 'Motivo de la devolución' }
  ];

  function informe(filas) {
    var s = sumas(filas);
    var t = [textoRango(), K.numero(filas.length) + ' cuentas de ' + K.numero(s.contratos) + ' contratos'];
    if (F.etapa) t.push(etapaDe(ETAPAS.filter(function (e) { return e.valor === F.etapa; })[0].estados[0]).texto);
    if (F.sec) t.push(O.titulo(F.sec));
    if (F.busca) t.push('búsqueda: ' + F.busca);
    return {
      subtitulo: t.join(' · '),
      bloque: {
        titulo: function (x) { return 'Cuenta ' + (x.informe || '?') + ' de ' + (x.total || '?') + ' · ' + K.pesos(x.cobro); },
        sub: function (x) { return 'Contrato ' + (x.contrato || '?') + ' · radicada el ' + O.fecha(x.radicada); },
        marca: function (x) { return x.estado; },
        tono: function (x) { var e = etapaDe(x.estado); return e.tono || (e.valor === 'pag' ? 'info' : ''); },
        omitir: ['Radicada', 'Estado', 'Contratista', 'Contrato', 'Cuenta', 'Cobro']
      },
      grupo: function (x) { return O.nombre(x.nombre) + ' · contrato ' + (x.contrato || '?'); },
      resumen: [
        { etiqueta: 'Cuentas', valor: K.numero(filas.length) },
        { etiqueta: 'Cobrado', valor: K.pesos(s.cobro) },
        { etiqueta: 'Pagado', valor: K.pesos(s.pagado), tono: 'ok' },
        { etiqueta: 'En trámite', valor: K.pesos(s.pendiente), tono: 'aviso' }
      ]
    };
  }

  function bajar(formato, boton) {
    if (!K.piezas.exportar) { K.aviso('La descarga no está disponible en esta versión.', 'aviso'); return; }
    var filas = filtradas().slice().sort(function (a, c) {
      return String(a.nombre).localeCompare(String(c.nombre), 'es') || String(a.contrato).localeCompare(String(c.contrato)) || a.informe - c.informe;
    });
    if (!filas.length) return;
    var nombre = 'Reporte de Supervisión ' + (F.desde ? O.fecha(F.desde).replace(/\//g, '-') : '') + (F.hasta && F.hasta !== F.desde ? ' a ' + O.fecha(F.hasta).replace(/\//g, '-') : '');
    boton.disabled = true; boton.classList.add('kit-ocupado');
    var p = formato === 'pdf' ? K.piezas.exportar.aPDF(nombre.trim(), COLS, filas, informe(filas)) : K.piezas.exportar.aExcel(nombre.trim(), COLS_XLS, filas);
    Promise.resolve(p).then(function (r) {
      K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
    }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
      .then(function () { boton.disabled = false; boton.classList.remove('kit-ocupado'); });
  }

  window.REPORTE = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATA = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; },
    _filtradas: filtradas,
    _rango: textoRango,
    _informe: informe,
    _etapaDe: etapaDe
  };
}());
