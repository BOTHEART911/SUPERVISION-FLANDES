/* ============================================================
   MIS REGISTROS · "¿dónde descargo lo que hice?" (06/10/2026)
   El mismo archivo vive en CONTRATACION-FLANDES y SUPERVISION-FLANDES.

   Lo que la persona HIZO en la app, con fecha y hora, para descargarlo en
   Excel (una fila por registro) o en PDF membretado (un bloque por
   registro, agrupado por tipo). Cada quien ve lo suyo; el DEV o ADMIN
   escoge a la persona.

     CONTRATACIÓN  cuentas aprobadas y devueltas · ingresos · adiciones ·
                   cesiones · suspensiones · correcciones y otrosíes
     SUPERVISIÓN   cuentas aprobadas, devueltas e incompletas · planes de
                   pago aceptados · informes de supervisión y actas de
                   cumplimiento firmados · vistos buenos e inconsistencias

   Rendimiento (reglas 12 y 13)
     · UN viaje ('misRegistros') por persona y por sesión. Filtrar, buscar,
       contar y descargar pasa en el teléfono.
     · Pinta AL INSTANTE lo último que se vio (memoria local de la vista) y
       lo pone al día de fondo. Refrescar lo pide de nuevo.
     · La lectura es de fondo y se corta si la persona sale de la vista.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'misregistros.filtro.v1';
  var MEMO_K = 'misregistros.datos.v1';

  var DATA = null, META = null, HORA = null, CARGANDO = null, PERSONA = '';
  var MEDIDAS = [];   /* tiempos de pantalla de esta sesión (MISREGISTROS._medidas() en la consola) */
  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    var r = rango(g.atajo || 'anio');
    return { atajo: g.atajo || 'anio', desde: g.atajo === 'otro' ? g.desde : r.desde, hasta: g.atajo === 'otro' ? g.hasta : r.hasta,
             tipo: g.tipo || '', busca: '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, { atajo: F.atajo, desde: F.desde, hasta: F.hasta, tipo: F.tipo }); }

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
    META = { todas: !!(d && d.todas), yo: (d && d.yo) || '', persona: (d && d.persona) || '', personas: (d && d.personas) || [],
             sello: (d && d.sello) || '' };
    DATA = ((d && d.filas) || []).map(function (a) {
      var o = {};
      campos.forEach(function (c, i) { o[c] = a[i]; });
      o._t = K.norm([o.tipo, o.nombre, o.contrato, o.informe, o.sec, o.detalle, o.id].join(' '));
      return o;
    });
    HORA = new Date();
  }

  /* lo último que se vio, para pintar sin esperar (solo de la propia persona) */
  function memoLeer() {
    try { var m = K.guardar.leer(MEMO_K, null); return m && m.d && m.d.filas ? m : null; } catch (e) { return null; }
  }
  function memoGuardar(d) {
    if (PERSONA) return;
    try { K.guardar.escribir(MEMO_K, { d: d, t: Date.now() }); } catch (e) { /* sin espacio: no pasa nada */ }
  }

  function cargar(fresco, persona) {
    persona = persona === undefined ? PERSONA : persona;
    if (DATA && !fresco && persona === PERSONA) return Promise.resolve(DATA);
    if (CARGANDO && !fresco && persona === PERSONA) return CARGANDO;
    var pide = persona;
    CARGANDO = O.leer('misRegistros', pide ? { persona: pide } : {}, 0, { fondo: true }).then(function (d) {
      CARGANDO = null;
      PERSONA = pide;
      recibir(d);
      memoGuardar(d);
      return DATA;
    }, function (e) { CARGANDO = null; throw e; });
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
    if (F.desde && (!x.fecha || x.fecha < F.desde)) return false;
    if (F.hasta && (!x.fecha || x.fecha > F.hasta)) return false;
    if (!sin.tipo && F.tipo && x.tipo !== F.tipo) return false;
    return coincide(x._t, F.busca);
  }
  function filtradas() { return (DATA || []).filter(function (x) { return pasa(x); }); }

  function textoRango() {
    if (!F.desde && !F.hasta) return 'Todos los registros';
    return 'Del ' + (F.desde ? O.fecha(F.desde) : 'inicio') + ' al ' + (F.hasta ? O.fecha(F.hasta) : 'hoy');
  }
  function quien() { return O.nombre(META && (META.persona || META.yo)) || ''; }

  function tono(t) {
    t = String(t || '');
    if (/devuelta|inconsistencia|incompleta/i.test(t)) return 'malo';
    if (/aprobada|visto bueno|aceptado|firmad/i.test(t)) return 'ok';
    return 'info';
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of rp rg mr"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'descargar', 'MIS REGISTROS',
      'Todo lo que has hecho en la app, con fecha y hora. Escoge el periodo y descárgalo en PDF o Excel.');

    var zP = K.nodo('<div hidden></div>');
    caja.appendChild(zP);

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
      placeholder: 'Contratista, contrato, cuenta, secretaría o detalle', valor: F.busca,
      alBuscar: function (q) { F.busca = q; VER = 50; pintar(); },
      alRefrescar: function () { return cargar(true).then(pintar); }
    });
    caja.appendChild(b.caja);
    var zT = K.nodo('<div></div>');
    caja.appendChild(zT);

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
      etiqueta: 'Periodo', valor: F.atajo,
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

    var pT = K.piezas.pastillas.montar(zT, { etiqueta: 'Qué hice', valor: F.tipo, opciones: [{ valor: '', texto: 'Todo' }],
      alCambiar: function (v) { F.tipo = v; guardarFiltro(); VER = 50; pintar(); } });

    /* DEV / ADMIN: la persona (cambiarla es UN viaje nuevo: cada quien trae solo lo suyo) */
    var pP = K.piezas.pastillas.montar(zP, { etiqueta: 'Persona', valor: '', opciones: [{ valor: '', texto: 'Yo' }],
      alCambiar: function (v) {
        if (v === PERSONA) return;
        lista.innerHTML = '';
        K.piezas.esqueletos.mientras(lista, cargar(true, v), { forma: 'tarjetas', cuantos: 4, espera: 'Trayendo los registros de ' + (v ? O.nombre(v) : 'tu usuario') })
          .then(pintar)['catch'](function (e) { lista.appendChild(C.errorCaja(e)); });
      } });

    function repintarPastillas() {
      if (META.todas) {
        zP.hidden = false;
        var ops = [{ valor: '', texto: 'Yo' }].concat(META.personas.map(function (p) { return { valor: p.nombre, texto: O.nombre(p.nombre) }; }));
        var cP = {};
        META.personas.forEach(function (p) { cP[p.nombre] = p.n; });
        pP.opciones(ops); pP.conteos(cP); O.marcar(zP, PERSONA);
      } else zP.hidden = true;
      var bT = DATA.filter(function (x) { return pasa(x, { tipo: true }); });
      var m = {};
      bT.forEach(function (x) { m[x.tipo] = (m[x.tipo] || 0) + 1; });
      var ts = Object.keys(m).sort(function (a, c) { return a.localeCompare(c, 'es'); });
      var cT = { '': bT.length };
      ts.forEach(function (k) { cT[k] = m[k]; });
      if (F.tipo && !m[F.tipo]) { ts.push(F.tipo); cT[F.tipo] = 0; }
      pT.opciones([{ valor: '', texto: 'Todo' }].concat(ts.map(function (k) { return { valor: k, texto: k }; })));
      pT.conteos(cT); O.marcar(zT, F.tipo);
    }

    function pintarResumen(filas) {
      resumen.innerHTML = '';
      resumen.appendChild(K.nodo('<p class="rp-resumen__rango">' + K.icono('reloj', 14) + ' ' + K.esc(textoRango()) +
        (quien() ? ' · ' + K.esc(quien()) : '') + '</p>'));
      var m = {};
      filas.forEach(function (x) { m[x.tipo] = (m[x.tipo] || 0) + 1; });
      var ks = Object.keys(m).sort(function (a, c) { return m[c] - m[a]; }).slice(0, 3);
      resumen.appendChild(K.nodo('<div class="ct-cifras">' +
        '<div class="ct-cifra"><b>' + K.numero(filas.length) + '</b><span>Registros</span></div>' +
        ks.map(function (k) { return '<div class="ct-cifra rp-cifra--' + (tono(k) === 'malo' ? 'malo' : 'ok') + '"><b>' + K.numero(m[k]) + '</b><span>' + K.esc(k) + '</span></div>'; }).join('') +
        '</div>'));
    }

    function fila(x) {
      var r = K.nodo('<article class="rp-fila' + (tono(x.tipo) === 'malo' ? ' rp-fila--dev' : '') + '"></article>');
      r.appendChild(K.nodo('<div class="rp-fila__f"><b>' + K.esc(O.fecha(x.fecha).slice(0, 5) || '—') + '</b><small>' +
        K.esc(String(x.fecha || '').slice(0, 4)) + (x.hora ? ' · ' + K.esc(x.hora) : '') + '</small></div>'));
      var c = K.nodo('<div class="rp-fila__c"></div>');
      c.appendChild(K.nodo('<p class="rp-fila__n">' + K.esc(O.nombre(x.nombre) || 'Contrato ' + (x.contrato || '—')) + '</p>'));
      c.appendChild(K.nodo('<p class="rp-fila__d">' + ['Contrato ' + (x.contrato || '—'), x.informe ? 'cuenta ' + x.informe : '', x.sec ? O.titulo(x.sec) : '']
        .filter(Boolean).map(K.esc).join(' · ') + '</p>'));
      if (x.detalle) c.appendChild(K.nodo('<p class="rp-fila__m">' + K.esc(x.detalle) + '</p>'));
      r.appendChild(c);
      var der = K.nodo('<div class="rg-der"></div>');
      der.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' + (tono(x.tipo) === 'ok' ? 'of-estado--ok' : 'of-estado--abierto') + '">' + K.esc(x.tipo) + '</span>'));
      r.appendChild(der);
      return r;
    }

    function pintarLista() {
      var filas = filtradas();
      lista.innerHTML = '';
      mas.hidden = true;
      if (!DATA.length) { lista.appendChild(O.vacio(PERSONA ? 'Esa persona todavía no tiene registros en esta app.' : 'Todavía no tienes registros en esta app.')); return; }
      if (!filas.length) {
        lista.appendChild(O.vacio('No hay registros con estos filtros (' + textoRango().toLowerCase() + ').', function () {
          F.tipo = ''; F.busca = ''; b.inp.value = ''; F.atajo = 'todo'; F.desde = ''; F.hasta = ''; pAt.poner('todo'); ponerFechas(); guardarFiltro(); pintar();
        }));
        return;
      }
      filas.slice(0, VER).forEach(function (x) { lista.appendChild(fila(x)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(100, filas.length - VER) + ' más de ' + K.numero(filas.length - VER); }
    }

    function pintar() {
      if (!DATA || !caja.isConnected) return;
      repintarPastillas();
      var filas = filtradas();
      pintarResumen(filas);
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'registro' : 'registros') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      descargas.querySelectorAll('button').forEach(function (x) { x.disabled = !filas.length; });
      pintarLista();
    }

    descargas.querySelectorAll('button').forEach(function (x) {
      x.addEventListener('click', function () { bajar(x.getAttribute('data-f'), x); });
    });

    /* cabecera antes que datos: si ya se vio, se pinta YA y se pone al día de fondo */
    var memo = !DATA && !PERSONA ? memoLeer() : null;
    var t0 = Date.now();
    if (memo) { recibir(memo.d); HORA = new Date(memo.t); pintar(); MEDIDAS.push({ que: 'pinta (memoria local)', ms: Date.now() - t0 }); }
    var trae = cargar(!!memo);
    (memo ? trae : K.piezas.esqueletos.mientras(lista, trae, { forma: 'tarjetas', cuantos: 4, espera: 'Trayendo tus registros' }))
      .then(function () { MEDIDAS.push({ que: memo ? 'al día de fondo' : 'vista con datos', ms: Date.now() - t0, filas: (DATA || []).length }); pintar(); })
      ['catch'](function (e) { if (!memo) caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ descargar ══════════════ */

  var COLS = [
    { campo: function (x) { return O.fecha(x.fecha) + (x.hora ? ' ' + x.hora : ''); }, titulo: 'Fecha' },
    { campo: 'tipo', titulo: 'Qué hizo' },
    { campo: function (x) { return O.nombre(x.nombre); }, titulo: 'Contratista' },
    { campo: 'contrato', titulo: 'Contrato' },
    { campo: 'informe', titulo: 'Cuenta' },
    { campo: function (x) { return O.titulo(x.sec); }, titulo: 'Secretaría' },
    { campo: function (x) { return O.nombre(x.quien); }, titulo: 'Quién' },
    { campo: 'detalle', titulo: 'Detalle', largo: true }
  ];
  var COLS_XLS = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' }, { campo: 'hora', titulo: 'Hora' }, { campo: 'tipo', titulo: 'Qué hizo' },
    { campo: 'quien', titulo: 'Quién' }, { campo: 'nombre', titulo: 'Contratista' }, { campo: 'contrato', titulo: 'Contrato' },
    { campo: 'informe', titulo: 'Cuenta' }, { campo: 'sec', titulo: 'Secretaría' }, { campo: 'id', titulo: 'ID contrato' },
    { campo: 'detalle', titulo: 'Detalle' }
  ];

  function informe(filas) {
    var m = {};
    filas.forEach(function (x) { m[x.tipo] = (m[x.tipo] || 0) + 1; });
    var t = [textoRango(), K.numero(filas.length) + ' registros'];
    if (quien()) t.push(quien());
    if (F.tipo) t.push(F.tipo);
    if (F.busca) t.push('búsqueda: ' + F.busca);
    return {
      subtitulo: t.join(' · '),
      bloque: {
        titulo: function (x) { return x.tipo + ' · ' + (O.nombre(x.nombre) || 'contrato ' + (x.contrato || '?')); },
        sub: function (x) { return O.fecha(x.fecha) + (x.hora ? ' ' + x.hora : '') + ' · contrato ' + (x.contrato || '?') + (x.informe ? ' · cuenta ' + x.informe : ''); },
        marca: function (x) { return x.tipo; },
        tono: function (x) { return tono(x.tipo) === 'malo' ? 'malo' : 'ok'; },
        omitir: ['Fecha', 'Qué hizo', 'Contratista', 'Contrato', 'Cuenta', 'Quién']
      },
      grupo: function (x) { return x.tipo; },
      resumen: [{ etiqueta: 'Registros', valor: K.numero(filas.length) }].concat(Object.keys(m).sort(function (a, c) { return m[c] - m[a]; }).slice(0, 3)
        .map(function (k) { return { etiqueta: k, valor: K.numero(m[k]), tono: tono(k) === 'malo' ? 'aviso' : 'ok' }; }))
    };
  }

  function bajar(formato, boton) {
    if (!K.piezas.exportar) { K.aviso('La descarga no está disponible en esta versión.', 'aviso'); return; }
    var filas = filtradas().slice().sort(function (a, c) {
      return String(a.tipo).localeCompare(String(c.tipo), 'es') || String(a.fecha + a.hora).localeCompare(String(c.fecha + c.hora));
    });
    if (!filas.length) return;
    /* Mis registros Contratacion YESICA ALFARO 01-01-2026 a 06-10-2026 */
    var rango = (F.desde ? O.fecha(F.desde).replace(/\//g, '-') : '') + (F.hasta && F.hasta !== F.desde ? ' a ' + O.fecha(F.hasta).replace(/\//g, '-') : '');
    var nombre = ['Mis registros', C.nombreApp || '', quien(), rango].filter(Boolean).join(' ');
    boton.disabled = true; boton.classList.add('kit-ocupado');
    var p = formato === 'pdf' ? K.piezas.exportar.aPDF(nombre, COLS, filas, informe(filas)) : K.piezas.exportar.aExcel(nombre, COLS_XLS, filas);
    Promise.resolve(p).then(function (r) {
      K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
    }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
      .then(function () { boton.disabled = false; boton.classList.remove('kit-ocupado'); });
  }

  window.MISREGISTROS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () {
      DATA = null; META = null; CARGANDO = null; PERSONA = '';
      K.guardar.borrar(FILTRO_K); K.guardar.borrar(MEMO_K); F = leerFiltro();
    },
    _datos: function () { return DATA; },
    _meta: function () { return META; },
    _filtradas: filtradas,
    _informe: informe,
    _filtro: function () { return F; },
    _medidas: function () { return MEDIDAS.slice(); }
  };
}());
