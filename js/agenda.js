/* ============================================================
   AGENDA DE REVISIÓN · SUPERVISIÓN, CONTRATACIÓN y ADMIN
   (mismo archivo en las tres apps) · 15/10/2026 · vistas 16/10/2026

   Para qué: saber qué días llega cuánto trabajo y de quiénes.
   Los periodos de cada contrato van mes a mes desde su FECHA INICIO,
   así que los contratistas que iniciaron el mismo día presentan juntos
   (un "grupo de corte"). El CORE calcula, hasta el fin del mes siguiente:

     · el fin del periodo de cada cuenta que viene,
     · la ventana para presentarla (hasta el plazo de CUENTAS ATRASADAS),
     · el DÍA PROBABLE: el fin del periodo más lo que esa persona suele
       tardar (mediana de sus cuentas ya radicadas, en días hábiles),
     · y lo que YA LLEGÓ en el mes en curso (fecha de radicación real).

   16/10 · cinco maneras de verla — MES, SEMANA, DÍA, CORTES y LISTA —
   con flechas, "Hoy" y un PDF de lo que se está viendo en cada una.
   Todo sale del mismo viaje ('agenda'): cambiar de vista o de periodo
   no vuelve al servidor. Solo lectura: no cambia nada.

   17/10 · EN ROJO lo que no llegó: si el día probable ya pasó y la cuenta
   no se ha presentado, se queda en su día pintada de rojo (x.atraso = 1);
   si además se le venció el plazo, rojo fuerte (x.atraso = 2: también está
   en CUENTAS ATRASADAS). Con un CORE anterior no hay rojos (no trae atraso).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var D = null;                       /* lo último que llegó del CORE */
  var F = { buscar: '', sup: '', sec: '' };
  var V = { modo: '', ref: null, dia: '', lista: 'vienen' };   /* vista, fecha ancla, día abierto en el mes */
  var MODOS = [['mes', 'Mes'], ['semana', 'Semana'], ['dia', 'Día'], ['cortes', 'Cortes'], ['lista', 'Lista']];
  var zona = null, zCuerpo = null, zNav = null, zModos = null;
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var ESTADO_T = { 'SIN INICIAR': 'Sin iniciar', BORRADOR: 'En borrador', 'EN PROCESO': 'En proceso', INGRESADA: 'Lista sin reportar' };
  var ESTADO_HOY = { REPORTADA: 'Por revisar', 'PLAN DE PAGOS': 'Plan de pagos', 'REVISADA POR SUPERVISOR': 'Por revisar en Contratación' };
  var CDN_PDF = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';   /* la misma del kit */

  function O() { return window.OFICINA; }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function secNombre(s) { return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); }); }
  function aFecha(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  function dmy(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function larga(s) { var d = typeof s === 'string' ? aFecha(s) : s; return d ? DIAS_L[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] : String(s || ''); }
  function corta(s) { var d = typeof s === 'string' ? aFecha(s) : s; return d ? d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) : String(s || ''); }
  function habiles(n) { return n + (n === 1 ? ' día hábil' : ' días hábiles'); }
  function cuentas(n) { return n + (n === 1 ? ' cuenta' : ' cuentas'); }
  function mas(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function lunes(d) { var w = (d.getDay() + 6) % 7; return mas(d, -w); }
  function finde(d) { return d.getDay() === 0 || d.getDay() === 6; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function mesTxt(d) { return MESES[d.getMonth()] + ' ' + d.getFullYear(); }
  function tarde(x) { return +x.atraso > 0; }
  function vencida(x) { return +x.atraso === 2; }
  function txtTarde(x) {
    return vencida(x) ? 'Plazo vencido el ' + corta(x.limite) + ' · está en CUENTAS ATRASADAS'
      : 'No ha llegado · se esperaba el ' + corta(x.probable) + ' · plazo hasta el ' + corta(x.limite);
  }
  function rangoSem(l) { var f = mas(l, 6); return l.getMonth() === f.getMonth() ? l.getDate() + ' al ' + f.getDate() + ' de ' + MESES[f.getMonth()] : corta(l) + ' al ' + corta(f); }

  /* ══════════════ datos ══════════════ */

  function objetos(campos, filas) {
    var ix = {}; (campos || []).forEach(function (k, i) { ix[k] = i; });
    return (filas || []).map(function (r) { var o = {}; Object.keys(ix).forEach(function (k) { o[k] = r[ix[k]]; }); return o; });
  }
  function items() { if (!D) return []; if (!D._obj) D._obj = objetos(D.campos, D.items); return D._obj; }
  /* CORE anterior al 16/10: no trae 'llego' (solo previstas a 30 días) */
  function llegadas() { if (!D || !D.llego) return []; if (!D._lg) D._lg = objetos(D.llego.campos, D.llego.lista); return D._lg; }
  function hoyLista() { return D && D.hoy ? objetos(D.hoy.campos, D.hoy.lista) : []; }
  function hoy() { return aFecha(D.fecha); }
  function desde() { return aFecha(D.desde) || hoy(); }
  function hasta() { return aFecha(D.hasta); }

  function pasa(x) {
    var q = K.norm(F.buscar);
    if (F.sup && K.norm(x.sup) !== F.sup) return false;
    if (F.sec && K.norm(x.sec) !== F.sec) return false;
    if (q && K.norm([x.nombre, x.id, x.contrato, x.sup, x.sec].join(' ')).indexOf(q) < 0) return false;
    return true;
  }
  function filtradas() { return items().filter(pasa); }
  function llegadasF() { return llegadas().filter(pasa); }

  /** Lo de cada día: previstas por día probable y llegadas por fecha real. */
  function porDia() {
    var m = {};
    function de(k) { return m[k] || (m[k] = { vienen: [], llego: [] }); }
    filtradas().forEach(function (x) { de(x.probable).vienen.push(x); });
    llegadasF().forEach(function (x) { de(x.fecha).llego.push(x); });
    Object.keys(m).forEach(function (k) {
      m[k].vienen.sort(function (a, b) { return (+b.atraso || 0) - (+a.atraso || 0) || (a.nombre < b.nombre ? -1 : 1); });
      m[k].llego.sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; });
    });
    return m;
  }
  function vacioDia() { return { vienen: [], llego: [] }; }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct ag"></div>');
    C.app.appendChild(caja);
    O().cabecera(caja, 'calendario', 'AGENDA DE REVISIÓN',
      'Qué días te llega cuánto trabajo y de quiénes. Los contratistas que iniciaron el mismo día cortan su periodo juntos; ' +
      'el <b>día probable</b> es el fin del periodo más lo que cada uno suele tardar en presentar. Solo consulta: no cambia nada.');
    zona = K.nodo('<div class="ag-zona"></div>');
    caja.appendChild(zona);
    K.piezas.creditos.montar(caja);
    if (D) { pintar(); return; }
    var p = traer(false);
    K.piezas.esqueletos.mientras(zona, p, { forma: 'ficha', cuantos: 3, espera: 'Armando tu agenda' })
      .then(function () { pintar(); }, function (e) { zona.appendChild(C.errorCaja(e)); });
  }

  function traer(fresco) {
    return K.pedir('agenda', fresco ? { fresco: true } : {}, { ms: 60000 }).then(function (d) { D = d; return d; });
  }

  function modoGuardado() {
    var m = K.guardar.leer('agenda.modo.' + (C.modo || ''), 'mes');
    return MODOS.some(function (x) { return x[0] === m; }) ? m : 'mes';
  }

  function pintar() {
    if (!zona || !D) return;
    if (!V.modo) V.modo = modoGuardado();
    if (!V.ref) V.ref = hoy();
    zona.innerHTML = '';
    var b = O().barra({ placeholder: 'Buscar por nombre o contrato', valor: F.buscar,
      alBuscar: function (t) { F.buscar = t; cuerpo(); },
      alRefrescar: function () { return traer(true).then(pintar); } });
    zona.appendChild(b.caja);
    zona.appendChild(cifras());
    zona.appendChild(bandeja());
    pastillas();

    var barra = K.nodo('<section class="kit-tarjeta ag-barra"></section>');
    zModos = K.nodo('<div class="ag-modos" role="tablist" aria-label="Cómo ver la agenda"></div>');
    MODOS.forEach(function (m) {
      var bt = K.nodo('<button type="button" role="tab" class="ag-modo"></button>');
      bt.textContent = m[1]; bt.setAttribute('data-modo', m[0]);
      bt.addEventListener('click', function () { cambiarModo(m[0]); });
      zModos.appendChild(bt);
    });
    barra.appendChild(zModos);
    var fila = K.nodo('<div class="ag-fila"></div>');
    zNav = K.nodo('<div class="ag-nav"></div>');
    fila.appendChild(zNav);
    var acc = K.nodo('<div class="ag-acc"></div>');
    var bP = K.nodo('<button type="button" class="kit-btn kit-btn--plano ag-imp">' + K.icono('pdf', 16) + ' Imprimir</button>');
    var bX = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('hoja', 16) + ' Excel</button>');
    bP.addEventListener('click', function () { imprimir(bP); });
    bX.addEventListener('click', excel);
    acc.appendChild(bP); acc.appendChild(bX);
    fila.appendChild(acc);
    barra.appendChild(fila);
    zona.appendChild(barra);

    zCuerpo = K.nodo('<div class="ag-cuerpo"></div>');
    zona.appendChild(zCuerpo);
    if (D.sinDatos) zona.appendChild(K.nodo('<p class="formulario__nota ag-nota">' + K.icono('aviso', 14) + ' ' + D.sinDatos +
      (D.sinDatos === 1 ? ' contrato activo no tiene' : ' contratos activos no tienen') + ' FECHA INICIO, FECHA FINAL o TOTAL DE INFORMES: no entran en la agenda hasta completarlos.</p>'));
    cuerpo();
  }

  function cambiarModo(m) {
    V.modo = m; V.dia = '';
    K.guardar.escribir('agenda.modo.' + (C.modo || ''), m);
    cuerpo();
  }

  function cifras() {
    var todas = items(), h = hoy(), en7 = 0, cuenta = {}, max = null, mesSig = mas(new Date(h.getFullYear(), h.getMonth() + 2, 1), -1);
    var rojas = todas.filter(tarde), l = todas.filter(function (x) { return !tarde(x); });
    l.forEach(function (x) {
      var p = aFecha(x.probable);
      if (p && p >= h && (p - h) / 864e5 < 7) en7++;
      cuenta[x.probable] = (cuenta[x.probable] || 0) + 1;
    });
    Object.keys(cuenta).forEach(function (k) { if (!max || cuenta[k] > cuenta[max]) max = k; });
    var c = K.nodo('<div class="kit-tarjeta at-cifras ag-cifras"></div>');
    var lg = llegadas().length;
    [[hoyLista().length, 'En tu bandeja hoy'], [rojas.length, rojas.length === 1 ? 'No ha llegado en su día' : 'No han llegado en su día', 'malo'], [en7, 'Llegan en 7 días'],
     [l.length, 'Por llegar hasta el ' + corta(D.hasta || dmy(mesSig))],
     D.llego ? [lg, 'Ya llegaron en ' + MESES[h.getMonth()]] : [max ? cuenta[max] : 0, max ? 'El día más cargado: ' + corta(max) : 'Sin días cargados']].forEach(function (x) {
      var d = K.nodo('<div class="at-cifra' + (x[2] === 'malo' && x[0] ? ' ag-cifra--malo' : '') + '"><b></b><span></span></div>');
      d.querySelector('b').textContent = K.numero(x[0]); d.querySelector('span').textContent = x[1];
      if (x[2] === 'malo' && x[0]) { d.setAttribute('role', 'button'); d.tabIndex = 0; d.title = 'Ver cuáles'; d.addEventListener('click', function () { V.lista = 'tarde'; cambiarModo('lista'); }); }
      c.appendChild(d);
    });
    var p = K.nodo('<p class="formulario__nota at-corte"></p>');
    p.textContent = (D.alcance || '') + ' · hoy ' + larga(D.fecha) + (max ? ' · día más cargado: ' + larga(max) + ' (' + cuenta[max] + ')' : '') +
      ' · plazo para presentar: ' + habiles(D.dias || 5) + ' · sin historia se toman ' + habiles(D.lagGlobal || 0) + ' (lo usual de todos)' +
      (D.calculado ? ' · calculado ' + String(D.calculado).slice(-8, -3) : '');
    c.appendChild(p);
    return c;
  }

  /** Lo que ya está esperando revisión hoy. */
  function bandeja() {
    var l = hoyLista();
    var s = K.nodo('<section class="kit-tarjeta ag-hoy"><h3 class="grupo__t">' + K.icono('reloj', 16) + ' HOY EN TU BANDEJA</h3></section>');
    if (!l.length) { s.appendChild(K.nodo('<p class="formulario__nota">Nada esperando revisión ahora mismo.</p>')); return s; }
    var n = {};
    l.forEach(function (x) { var k = ESTADO_HOY[x.estado] || x.estado; n[k] = (n[k] || 0) + 1; });
    s.appendChild(K.nodo('<p class="formulario__nota">' + Object.keys(n).map(function (k) { return '<b>' + n[k] + '</b> ' + K.esc(k.toLowerCase()); }).join(' · ') + '</p>'));
    var ul = K.nodo('<div class="ag-hoy__l"></div>');
    l.slice(0, 12).forEach(function (x) {
      var f = K.nodo('<span class="at-chip"></span>');
      f.textContent = nombre(x.nombre) + ' · cuenta ' + x.informe + (x.total ? ' de ' + x.total : '');
      ul.appendChild(f);
    });
    if (l.length > 12) ul.appendChild(K.nodo('<span class="at-chip">… y ' + (l.length - 12) + ' más</span>'));
    s.appendChild(ul);
    return s;
  }

  function pastillas() {
    var l = items().concat(llegadas());
    function grupo(campo, fmt, todos) {
      var n = {};
      l.forEach(function (x) { var k = K.norm(x[campo]); if (!k) return; n[k] = n[k] || { t: fmt(x[campo]), c: 0 }; n[k].c++; });
      var ks = Object.keys(n);
      if (ks.length < 2) return;
      var z = K.nodo('<div class="at-pas"></div>');
      zona.appendChild(z);
      var f = K.piezas.pastillas.montar(z, {
        opciones: [{ valor: '', texto: todos }].concat(ks.sort().map(function (k) { return { valor: k, texto: n[k].t }; })),
        valor: F[campo], envuelve: true,
        alCambiar: function (v) { F[campo] = v; cuerpo(); }
      });
      var cn = { '': l.length }; ks.forEach(function (k) { cn[k] = n[k].c; });
      if (f) f.conteos(cn);
    }
    grupo('sup', nombre, 'Todos los supervisores');
    grupo('sec', secNombre, 'Todas las secretarías');
  }

  /* ══════════════ navegación: ‹ periodo › y Hoy ══════════════ */

  /** El primer y el último día que muestra la vista actual. */
  function rango() {
    var r = V.ref;
    if (V.modo === 'mes') { var a = new Date(r.getFullYear(), r.getMonth(), 1); return [a, mas(new Date(r.getFullYear(), r.getMonth() + 1, 1), -1)]; }
    if (V.modo === 'semana') { var l = lunes(r); return [l, mas(l, 6)]; }
    if (V.modo === 'dia') return [r, r];
    return [desde(), hasta()];
  }
  function etiqueta() {
    var r = rango();
    if (V.modo === 'mes') return cap(mesTxt(r[0]));
    if (V.modo === 'semana') return 'Semana del ' + rangoSem(r[0]);
    if (V.modo === 'dia') return cap(larga(r[0]));
    return 'Del ' + corta(r[0]) + ' al ' + corta(r[1]);
  }
  function mover(paso) {
    var r = V.ref;
    if (V.modo === 'mes') V.ref = new Date(r.getFullYear(), r.getMonth() + paso, 1);
    else if (V.modo === 'semana') V.ref = mas(r, 7 * paso);
    else if (V.modo === 'dia') V.ref = mas(r, paso);
    V.dia = '';
    cuerpo();
  }
  /** Hay algo de la agenda hacia ese lado. */
  function puede(paso) {
    var r = rango();
    return paso < 0 ? r[0] > desde() : r[1] < hasta();
  }

  function pintarNav() {
    zNav.innerHTML = '';
    [].forEach.call(zModos.children, function (b) {
      var on = b.getAttribute('data-modo') === V.modo;
      b.classList.toggle('ag-modo--on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var conFlechas = V.modo === 'mes' || V.modo === 'semana' || V.modo === 'dia';
    if (conFlechas) {
      var a = K.nodo('<button type="button" class="kit-btn kit-btn--plano ag-flecha" aria-label="Anterior">‹</button>');
      a.disabled = !puede(-1); a.addEventListener('click', function () { mover(-1); });
      zNav.appendChild(a);
    }
    var t = K.nodo('<b class="ag-nav__t" aria-live="polite"></b>'); t.textContent = etiqueta();
    zNav.appendChild(t);
    if (conFlechas) {
      var s = K.nodo('<button type="button" class="kit-btn kit-btn--plano ag-flecha" aria-label="Siguiente">›</button>');
      s.disabled = !puede(1); s.addEventListener('click', function () { mover(1); });
      zNav.appendChild(s);
      var h = K.nodo('<button type="button" class="kit-btn kit-btn--plano ag-hoybtn">Hoy</button>');
      h.addEventListener('click', function () { V.ref = hoy(); V.dia = ''; cuerpo(); });
      zNav.appendChild(h);
    }
  }

  function cuerpo() {
    if (!zCuerpo) return;
    pintarNav();
    zCuerpo.innerHTML = '';
    var m = porDia();
    if (V.modo === 'mes') vMes(m);
    else if (V.modo === 'semana') vSemana(m);
    else if (V.modo === 'dia') vDia(m);
    else if (V.modo === 'cortes') vCortes();
    else vLista();
  }

  function fuera(d) { return d < desde() || d > hasta(); }

  /* ══════════════ MES: cuadrícula lunes a domingo ══════════════ */

  function vMes(m) {
    var r = rango(), ini = lunes(r[0]), h = hoy(), max = 1, k;
    for (k in m) if (m.hasOwnProperty(k)) max = Math.max(max, m[k].vienen.length + m[k].llego.length);
    var s = K.nodo('<section class="kit-tarjeta ag-mes" aria-label="Calendario del mes"></section>');
    var cab = K.nodo('<div class="ag-mes__cab"></div>');
    ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].forEach(function (d) { var x = K.nodo('<span></span>'); x.textContent = d; cab.appendChild(x); });
    s.appendChild(cab);
    var g = K.nodo('<div class="ag-mes__g"></div>');
    for (var d = ini; d <= r[1] || d.getDay() !== 1; d = mas(d, 1)) {
      var key = dmy(d), e = m[key] || vacioDia(), n = e.vienen.length, l = e.llego.length, otro = d.getMonth() !== r[0].getMonth();
      var nt = e.vienen.filter(tarde).length;
      var c = K.nodo('<button type="button" class="ag-celda"><span class="ag-celda__d"></span><span class="ag-celda__n"></span><span class="ag-celda__t"></span><span class="ag-celda__l"></span><span class="ag-celda__q"></span></button>');
      if (nt) c.classList.add('ag-celda--tarde');
      if (otro) c.classList.add('ag-celda--otro');
      if (finde(d)) c.classList.add('ag-celda--finde');
      if (+d === +h) c.classList.add('ag-celda--hoy');
      if (fuera(d)) c.classList.add('ag-celda--fuera');
      if (V.dia === key) c.classList.add('ag-celda--sel');
      if (n + l) c.style.setProperty('--ag-int', String(Math.round(((n + l) / max) * 100) / 100));
      c.querySelector('.ag-celda__d').textContent = d.getDate();
      if (n - nt) c.querySelector('.ag-celda__n').textContent = n - nt;
      if (nt) c.querySelector('.ag-celda__t').innerHTML = '<b>' + nt + '</b><em> sin llegar</em>';
      if (l) c.querySelector('.ag-celda__l').innerHTML = '<b>' + l + '</b><em> ' + (l === 1 ? 'llegó' : 'llegaron') + '</em>';
      var q = c.querySelector('.ag-celda__q');
      e.vienen.concat(e.llego).slice(0, 3).forEach(function (x) { var i = K.nodo('<i' + (tarde(x) ? ' class="ag-r"' : '') + '></i>'); i.textContent = nombre(x.nombre).split(' ').slice(0, 2).join(' '); q.appendChild(i); });
      if (n + l > 3) { var mm = K.nodo('<i class="ag-celda__mas"></i>'); mm.textContent = '+' + (n + l - 3); q.appendChild(mm); }
      c.title = larga(d) + ': ' + (nt ? nt + ' sin llegar · ' : '') + (n - nt ? cuentas(n - nt) + ' por llegar' : '') + (n && l ? ' · ' : '') + (l ? l + ' ya llegaron' : '') + (n + l ? '' : 'nada');
      c.setAttribute('aria-label', c.title);
      (function (key, total) {
        c.addEventListener('click', function () { if (!total) return; V.dia = V.dia === key ? '' : key; cuerpo(); });
      })(key, n + l);
      g.appendChild(c);
    }
    s.appendChild(g);
    s.appendChild(K.nodo('<p class="formulario__nota ag-ley"><span class="ag-ley__v"></span> por llegar (día probable) <span class="ag-ley__r"></span> no llegó en su día <span class="ag-ley__l"></span> ya llegaron · los fines de semana van en gris: lo que cae ahí se presenta el siguiente día hábil.</p>'));
    zCuerpo.appendChild(s);
    if (V.dia) {
      var dd = aFecha(V.dia);
      var t = K.nodo('<div class="ag-sel-cab"><h3 class="bloque__t ag-t"></h3></div>');
      t.querySelector('h3').textContent = larga(dd).toUpperCase();
      var ir = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('calendario', 15) + ' Abrir el día</button>');
      ir.addEventListener('click', function () { V.ref = dd; cambiarModo('dia'); });
      t.appendChild(ir);
      zCuerpo.appendChild(t);
      zCuerpo.appendChild(listaDia(m[V.dia] || vacioDia()));
    }
  }

  /* ══════════════ SEMANA: siete columnas ══════════════ */

  function vSemana(m) {
    var r = rango(), h = hoy(), tot = 0, totL = 0, totT = 0;
    var s = K.nodo('<div class="ag-sem"></div>');
    for (var i = 0; i < 7; i++) {
      var d = mas(r[0], i), key = dmy(d), e = m[key] || vacioDia();
      tot += e.vienen.length; totL += e.llego.length; totT += e.vienen.filter(tarde).length;
      var col = K.nodo('<section class="kit-tarjeta ag-sem__dia"><button type="button" class="ag-sem__cab"><b></b><span></span><em></em></button><div class="ag-sem__l"></div></section>');
      if (finde(d)) col.classList.add('ag-sem__dia--finde');
      if (+d === +h) col.classList.add('ag-sem__dia--hoy');
      col.querySelector('.ag-sem__cab b').textContent = cap(DIAS_C[d.getDay()]) + ' ' + d.getDate();
      col.querySelector('.ag-sem__cab span').textContent = MESES[d.getMonth()].slice(0, 3);
      var ntS = e.vienen.filter(tarde).length;
      col.querySelector('.ag-sem__cab em').textContent = [e.vienen.length - ntS ? cuentas(e.vienen.length - ntS) : '', ntS ? ntS + ' sin llegar' : '', e.llego.length ? e.llego.length + (e.llego.length === 1 ? ' llegó' : ' llegaron') : ''].filter(Boolean).join(' · ');
      if (ntS) col.classList.add('ag-sem__dia--tarde');
      (function (d) { col.querySelector('.ag-sem__cab').addEventListener('click', function () { V.ref = d; cambiarModo('dia'); }); })(d);
      var ll = col.querySelector('.ag-sem__l');
      if (fuera(d)) ll.appendChild(K.nodo('<p class="ag-vacio">Fuera de la agenda</p>'));
      else if (!e.vienen.length && !e.llego.length) ll.appendChild(K.nodo('<p class="ag-vacio">—</p>'));
      e.vienen.forEach(function (x) { ll.appendChild(mini(x, false)); });
      e.llego.forEach(function (x) { ll.appendChild(mini(x, true)); });
      s.appendChild(col);
    }
    var p = K.nodo('<p class="formulario__nota ag-tot"></p>');
    p.textContent = 'Esta semana: ' + cuentas(tot - totT) + ' por llegar' + (totT ? ' · ' + totT + ' no llegaron en su día' : '') + (totL ? ' · ' + totL + ' ya llegaron' : '') + '. Toca un día para abrirlo.';
    zCuerpo.appendChild(p);
    zCuerpo.appendChild(s);
  }

  function mini(x, llego) {
    var rojo = !llego && tarde(x);
    var t = K.nodo('<div class="ag-mini' + (llego ? ' ag-mini--llego' : '') + (rojo ? ' ag-mini--tarde' + (vencida(x) ? ' ag-mini--vencida' : '') : '') + '"><b></b><span></span></div>');
    t.querySelector('b').textContent = nombre(x.nombre);
    t.querySelector('span').textContent = 'Cuenta ' + x.informe + ' de ' + x.total + (llego ? ' · llegó · ' + estadoTxt(x.estado)
      : rojo ? (vencida(x) ? ' · plazo vencido' : ' · no ha llegado') : (ESTADO_T[x.estado] ? ' · ' + ESTADO_T[x.estado] : ''));
    return t;
  }
  function estadoTxt(e) { return cap(String(e || '').toLowerCase()); }

  /* ══════════════ DÍA ══════════════ */

  function vDia(m) {
    var key = dmy(V.ref), e = m[key] || vacioDia();
    var cortan = filtradas().filter(function (x) { return x.fin === key; });
    var p = K.nodo('<p class="formulario__nota ag-tot"></p>');
    p.textContent = fuera(V.ref) ? 'Este día queda fuera de la agenda (va del ' + corta(desde()) + ' al ' + corta(hasta()) + ').'
      : ((function () { var t = e.vienen.filter(tarde).length, v = e.vienen.length - t; return (t ? t + (t === 1 ? ' no llegó' : ' no llegaron') + ' en su día · ' : '') + (v ? cuentas(v) + ' por llegar' : 'Nada más por llegar'); })()) + (e.llego.length ? ' · ' + e.llego.length + ' ya llegaron' : '') +
        (cortan.length ? ' · ' + cortan.length + ' cortan periodo este día' : '') + (finde(V.ref) ? ' · fin de semana' : '');
    zCuerpo.appendChild(p);
    zCuerpo.appendChild(listaDia(e));
    if (cortan.length) {
      var c = K.nodo('<details class="kit-tarjeta ag-g"><summary><b class="ag-g__n"></b><span class="ag-g__t">Cortan periodo este día</span></summary><div class="ag-g__l"></div></details>');
      c.querySelector('.ag-g__n').textContent = cortan.length;
      cortan.forEach(function (x) { c.querySelector('.ag-g__l').appendChild(chipCorte(x)); });
      zCuerpo.appendChild(c);
    }
  }

  function listaDia(e) {
    var z = K.nodo('<div class="ag-dia-l"></div>');
    var rojas = e.vienen.filter(tarde), vienen = e.vienen.filter(function (x) { return !tarde(x); });
    if (rojas.length) {
      z.appendChild(titulo('NO LLEGARON EN SU DÍA · ' + rojas.length, 'ag-t--malo'));
      var gr = K.nodo('<div class="kit-rejilla kit-rejilla--auto ag-lista"></div>');
      rojas.forEach(function (x) { gr.appendChild(tarjeta(x)); });
      z.appendChild(gr);
    }
    if (vienen.length) {
      z.appendChild(titulo('POR LLEGAR · ' + vienen.length));
      var g = K.nodo('<div class="kit-rejilla kit-rejilla--auto ag-lista"></div>');
      vienen.forEach(function (x) { g.appendChild(tarjeta(x)); });
      z.appendChild(g);
    }
    if (e.llego.length) {
      z.appendChild(titulo('YA LLEGARON · ' + e.llego.length));
      var g2 = K.nodo('<div class="kit-rejilla kit-rejilla--auto ag-lista"></div>');
      e.llego.forEach(function (x) { g2.appendChild(tarjetaLlego(x)); });
      z.appendChild(g2);
    }
    if (!e.vienen.length && !e.llego.length) z.appendChild(K.nodo('<p class="formulario__nota">Nadie este día' + (F.buscar || F.sup || F.sec ? ' con esos filtros' : '') + '.</p>'));
    return z;
  }
  function titulo(t, cl) { var h = K.nodo('<h3 class="bloque__t ag-t' + (cl ? ' ' + cl : '') + '"></h3>'); h.textContent = t; return h; }
  function chipCorte(x) {
    var f = K.nodo('<span class="at-chip' + (tarde(x) ? ' at-chip--malo' : '') + '"></span>');
    f.textContent = nombre(x.nombre) + ' · cuenta ' + x.informe + (tarde(x) ? (vencida(x) ? ' · plazo vencido' : ' · no llegó (se esperaba el ' + corta(x.probable) + ')') : ' · llega ~' + corta(x.probable));
    return f;
  }

  /* ══════════════ CORTES: por semana y, dentro, por día de corte ══════════════ */

  function vCortes() {
    var l = filtradas(), por = {};
    l.forEach(function (x) { var f = aFecha(x.fin); if (!f) return; var s = dmy(lunes(f)); (por[s] = por[s] || {}); (por[s][x.fin] = por[s][x.fin] || []).push(x); });
    var ss = Object.keys(por).sort(function (a, b) { return aFecha(a) - aFecha(b); });
    if (!ss.length) { zCuerpo.appendChild(O().vacio('Nadie corta periodo en la agenda' + (F.buscar || F.sup || F.sec ? ' con esos filtros' : '') + '.', limpiar)); return; }
    ss.forEach(function (s) {
      var dias = Object.keys(por[s]).sort(function (a, b) { return aFecha(a) - aFecha(b); });
      var n = dias.reduce(function (a, k) { return a + por[s][k].length; }, 0);
      var sec = K.nodo('<section class="ag-semc"><h3 class="bloque__t ag-t"></h3><div class="ag-grupos"></div></section>');
      sec.querySelector('h3').textContent = 'SEMANA DEL ' + rangoSem(aFecha(s)).toUpperCase() + ' · ' + dias.length + (dias.length === 1 ? ' CORTE' : ' CORTES') + ' · ' + cuentas(n).toUpperCase();
      var gz = sec.querySelector('.ag-grupos');
      dias.forEach(function (k) {
        var g = por[s][k];
        var t = K.nodo('<details class="kit-tarjeta ag-g"><summary><b class="ag-g__n"></b><span class="ag-g__t"></span><span class="ag-g__v"></span></summary><div class="ag-g__l"></div></details>');
        t.querySelector('.ag-g__n').textContent = g.length;
        t.querySelector('.ag-g__t').textContent = 'Corte ' + larga(k);
        var lim = g.reduce(function (a, x) { return !a || aFecha(x.limite) > aFecha(a) ? x.limite : a; }, '');
        t.querySelector('.ag-g__v').textContent = 'presentan hasta el ' + corta(lim);
        var ntc = g.filter(tarde).length;
        if (ntc) { t.classList.add('ag-g--tarde'); t.querySelector('.ag-g__v').textContent += ' · ' + ntc + ' sin llegar'; }
        g.sort(function (a, b) { return (+b.atraso || 0) - (+a.atraso || 0) || aFecha(a.probable) - aFecha(b.probable); }).forEach(function (x) {
          t.querySelector('.ag-g__l').appendChild(chipCorte(x));
        });
        gz.appendChild(t);
      });
      zCuerpo.appendChild(sec);
    });
  }

  /* ══════════════ LISTA ══════════════ */

  function vLista() {
    var rojas = filtradas().filter(tarde).sort(function (a, b) { return aFecha(a.probable) - aFecha(b.probable) || (a.nombre < b.nombre ? -1 : 1); });
    var vienen = filtradas().filter(function (x) { return !tarde(x); }).sort(function (a, b) { return aFecha(a.probable) - aFecha(b.probable) || (a.nombre < b.nombre ? -1 : 1); });
    var llego = llegadasF().slice().sort(function (a, b) { return aFecha(b.fecha) - aFecha(a.fecha) || (a.nombre < b.nombre ? -1 : 1); });
    var ops = [{ valor: 'vienen', texto: 'Por llegar' }], cn = { vienen: vienen.length };
    if (rojas.length || V.lista === 'tarde') { ops.push({ valor: 'tarde', texto: 'No llegaron en su día' }); cn.tarde = rojas.length; }
    if (D.llego) { ops.push({ valor: 'llego', texto: 'Ya llegaron' }); cn.llego = llego.length; }
    if (!cn.hasOwnProperty(V.lista)) V.lista = 'vienen';
    if (ops.length > 1) {
      var z = K.nodo('<div class="at-pas"></div>');
      zCuerpo.appendChild(z);
      var f = K.piezas.pastillas.montar(z, { opciones: ops, valor: V.lista, alCambiar: function (v) { V.lista = v; cuerpo(); } });
      if (f) f.conteos(cn);
    }
    var son = V.lista === 'llego' ? llego : V.lista === 'tarde' ? rojas : vienen;
    zCuerpo.appendChild(titulo(V.lista === 'llego' ? 'YA LLEGARON EN ' + MESES[hoy().getMonth()].toUpperCase() + ' · ' + son.length
      : V.lista === 'tarde' ? 'NO LLEGARON EN SU DÍA · ' + son.length : 'TODAS LAS QUE VIENEN · ' + son.length, V.lista === 'tarde' ? 'ag-t--malo' : ''));
    if (!son.length) { zCuerpo.appendChild(O().vacio('Nadie con esos filtros.', limpiar)); return; }
    var g = K.nodo('<div class="kit-rejilla kit-rejilla--auto ag-lista"></div>');
    son.forEach(function (x) { g.appendChild(son === llego ? tarjetaLlego(x) : tarjeta(x)); });
    zCuerpo.appendChild(g);
  }

  function limpiar() { F = { buscar: '', sup: '', sec: '' }; pintar(); }

  /* ══════════════ tarjetas ══════════════ */

  function cabTarjeta(x, fecha) {
    var cab = K.nodo('<div class="at-tar__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(x.nombre, { foto: x.foto || '', tam: 44 }));
    var q = K.nodo('<div class="at-tar__quien"><b class="at-tar__n"></b><span class="at-tar__s"></span></div>');
    q.querySelector('b').textContent = nombre(x.nombre);
    q.querySelector('span').textContent = 'Contrato ' + (x.contrato || x.id) + (C.modo !== 'SUPERVISION' ? ' · ' + nombre(x.sup) : '');
    cab.appendChild(q);
    var dd = K.nodo('<span class="at-dias ag-dd"><b></b><small></small></span>');
    var p = aFecha(fecha);
    dd.querySelector('b').textContent = p ? p.getDate() : '';
    dd.querySelector('small').textContent = p ? MESES[p.getMonth()].slice(0, 3) : '';
    cab.appendChild(dd);
    return { cab: cab, dd: dd };
  }

  function tarjeta(x) {
    var rojo = tarde(x);
    var t = K.nodo('<article class="kit-tarjeta at-tar ag-tar' + (rojo ? ' ag-tar--tarde' + (vencida(x) ? ' ag-tar--vencida' : '') : '') + '"></article>');
    var c = cabTarjeta(x, x.probable); c.dd.title = rojo ? 'Se esperaba este día y no llegó' : 'Día probable';
    if (rojo) c.dd.classList.add('ag-dd--tarde');
    t.appendChild(c.cab);
    if (rojo) { var av = K.nodo('<p class="ag-tarde"></p>'); av.innerHTML = K.icono('aviso', 15) + ' <span></span>'; av.querySelector('span').textContent = txtTarde(x); t.appendChild(av); }
    var det = K.nodo('<p class="at-tar__det"></p>');
    det.innerHTML = K.icono('calendario', 15) + ' <span>Cuenta <b>' + x.informe + '</b> de ' + x.total + ' · periodo ' + K.esc(corta(x.ini)) + ' al ' + K.esc(corta(x.fin)) +
      ' · puede presentarla hasta el <b>' + K.esc(corta(x.limite)) + '</b></span>';
    t.appendChild(det);
    var ch = K.nodo('<div class="at-chips"></div>');
    var c1 = K.nodo('<span class="at-chip"></span>');
    c1.textContent = x.hist ? 'Suele presentar ' + (x.lag ? habiles(x.lag) + ' después del corte' : 'el mismo día del corte') + ' (' + x.hist + (x.hist === 1 ? ' cuenta' : ' cuentas') + ')'
      : 'Sin historia: se toma lo usual (' + habiles(x.lag) + ')';
    ch.appendChild(c1);
    if (ESTADO_T[x.estado]) { var c2 = K.nodo('<span class="at-chip' + (x.estado === 'INGRESADA' ? ' at-chip--aviso' : '') + '"></span>'); c2.textContent = ESTADO_T[x.estado]; ch.appendChild(c2); }
    if (x.sec && C.modo !== 'SUPERVISION') { var c3 = K.nodo('<span class="at-chip"></span>'); c3.textContent = secNombre(x.sec); ch.appendChild(c3); }
    t.appendChild(ch);
    return t;
  }

  function tarjetaLlego(x) {
    var t = K.nodo('<article class="kit-tarjeta at-tar ag-tar ag-tar--llego"></article>');
    var c = cabTarjeta(x, x.fecha); c.dd.title = 'Día en que llegó'; c.dd.classList.add('ag-dd--llego');
    t.appendChild(c.cab);
    var det = K.nodo('<p class="at-tar__det"></p>');
    det.innerHTML = K.icono('check', 15) + ' <span>Cuenta <b>' + x.informe + '</b> de ' + x.total + ' · llegó el <b>' + K.esc(corta(x.fecha)) + '</b></span>';
    t.appendChild(det);
    var ch = K.nodo('<div class="at-chips"></div>');
    var c1 = K.nodo('<span class="at-chip at-chip--ok"></span>'); c1.textContent = 'Hoy: ' + estadoTxt(x.estado); ch.appendChild(c1);
    if (x.sec && C.modo !== 'SUPERVISION') { var c3 = K.nodo('<span class="at-chip"></span>'); c3.textContent = secNombre(x.sec); ch.appendChild(c3); }
    t.appendChild(ch);
    return t;
  }

  /* ══════════════ filas de lo que se ve (Excel y PDF por bloques) ══════════════ */

  function filasVista() {
    var r = rango(), out = [];
    function dentro(s) { var d = aFecha(s); return d && d >= r[0] && d <= r[1]; }
    var conLlego = V.modo !== 'cortes' && !(V.modo === 'lista' && V.lista !== 'llego');
    var conVienen = !(V.modo === 'lista' && V.lista === 'llego');
    if (conVienen) filtradas().forEach(function (x) {
      if (V.modo === 'cortes' ? !dentro(x.fin) : !dentro(x.probable)) return;
      if (V.modo === 'lista' && (V.lista === 'tarde') !== tarde(x)) return;
      out.push({ tipo: vencida(x) ? 'Vencida' : tarde(x) ? 'No llegó' : 'Por llegar', aviso: tarde(x) ? txtTarde(x) : '', fecha: x.probable, dia: larga(x.probable), nombre: nombre(x.nombre), contrato: x.contrato, id: x.id, supervisor: nombre(x.sup), secretaria: secNombre(x.sec),
                 cuenta: x.informe + ' de ' + x.total, informe: x.informe, total: x.total, inicio: x.ini, fin: x.fin, limite: x.limite,
                 suele: x.hist ? habiles(x.lag) + ' (' + x.hist + ' cuentas)' : 'sin historia (' + habiles(x.lag) + ')', estado: ESTADO_T[x.estado] || estadoTxt(x.estado) });
    });
    if (conLlego) llegadasF().forEach(function (x) {
      if (!dentro(x.fecha)) return;
      out.push({ tipo: 'Llegó', aviso: '', fecha: x.fecha, dia: larga(x.fecha), nombre: nombre(x.nombre), contrato: x.contrato, id: x.id, supervisor: nombre(x.sup), secretaria: secNombre(x.sec),
                 cuenta: x.informe + ' de ' + x.total, informe: x.informe, total: x.total, inicio: '', fin: '', limite: '', suele: '', estado: estadoTxt(x.estado) });
    });
    var ORD = { Vencida: 0, 'No llegó': 1, 'Por llegar': 2, 'Llegó': 3 };
    out.sort(function (a, b) { return aFecha(a.fecha) - aFecha(b.fecha) || ORD[a.tipo] - ORD[b.tipo] || (a.nombre < b.nombre ? -1 : 1); });
    return out;
  }
  function subtitulo(n) {
    var f = [];
    if (F.sup) f.push(nombre(F.sup)); if (F.sec) f.push(secNombre(F.sec)); if (F.buscar) f.push('"' + F.buscar + '"');
    return (D.alcance || '') + ' · ' + etiqueta() + ' · ' + cuentas(n) + (f.length ? ' · filtro: ' + f.join(', ') : '') + ' · calculado ' + (D.calculado || D.fecha);
  }

  function excel() {
    var fs = filasVista();
    if (!fs.length) { K.aviso('No hay cuentas en lo que estás viendo.', 'info', 2500); return; }
    K.piezas.exportar.aExcel('Agenda de revisión · ' + etiqueta(), [
      { campo: 'tipo', titulo: 'Tipo' }, { campo: 'fecha', titulo: 'Día (probable o de llegada)' }, { campo: 'nombre', titulo: 'Contratista' }, { campo: 'contrato', titulo: 'Contrato' },
      { campo: 'id', titulo: 'ID contrato' }, { campo: 'supervisor', titulo: 'Supervisor' }, { campo: 'secretaria', titulo: 'Secretaría' },
      { campo: 'informe', titulo: 'Cuenta' }, { campo: 'total', titulo: 'Total de cuentas' }, { campo: 'inicio', titulo: 'Inicio del periodo' },
      { campo: 'fin', titulo: 'Fin del periodo (corte)' }, { campo: 'limite', titulo: 'Presenta hasta' }, { campo: 'suele', titulo: 'Suele tardar' },
      { campo: 'estado', titulo: 'Estado hoy' }, { campo: 'aviso', titulo: 'Aviso' }
    ], fs);
  }

  /* ══════════════ IMPRIMIR: un PDF de lo que se está viendo ══════════════ */

  var imprimiendo = false;
  function imprimir(btn) {
    if (imprimiendo) return;
    var fs = filasVista();
    if (!fs.length && V.modo !== 'mes' && V.modo !== 'semana') { K.aviso('No hay cuentas en lo que estás viendo.', 'info', 2500); return; }
    imprimiendo = true; btn.disabled = true;
    var p = (V.modo === 'mes' || V.modo === 'semana') ? conPDF().then(function () { return V.modo === 'mes' ? pdfMes() : pdfSemana(); }) : pdfBloques(fs);
    Promise.resolve(p).then(function () { imprimiendo = false; btn.disabled = false; },
      function (e) { imprimiendo = false; btn.disabled = false; K.aviso((e && e.message) || 'No se pudo armar el PDF.', 'malo', 6000); });
  }

  function pdfBloques(fs) {
    return K.piezas.exportar.aPDF('Agenda de revisión · ' + etiqueta(), [
      { campo: 'cuenta', titulo: 'Cuenta' }, { campo: 'inicio', titulo: 'Inicio del periodo' }, { campo: 'fin', titulo: 'Corte' },
      { campo: 'limite', titulo: 'Presenta hasta' }, { campo: 'suele', titulo: 'Suele tardar' }, { campo: 'estado', titulo: 'Estado hoy' },
      { campo: 'secretaria', titulo: 'Secretaría' }, { campo: 'aviso', titulo: 'Aviso' }
    ], fs, {
      subtitulo: subtitulo(fs.length),
      bloque: { titulo: function (f) { return f.nombre; }, sub: function (f) { return 'Contrato ' + f.contrato + ' · ' + f.supervisor; },
                marca: function (f) { return f.tipo === 'Llegó' ? 'Llegó ' + corta(f.fecha) : f.tipo === 'Vencida' ? 'Vencida' : f.tipo === 'No llegó' ? 'No llegó' : 'Llega ~' + corta(f.fecha); },
                tono: function (f) { return f.tipo === 'Llegó' ? 'ok' : (f.tipo === 'Por llegar' ? 'info' : 'malo'); } },
      grupo: function (f) {
        if (V.modo === 'cortes') { var c = aFecha(f.fin); return 'Semana del ' + rangoSem(lunes(c)) + ' · corte ' + larga(f.fin); }
        return (f.tipo === 'Llegó' ? 'Llegaron el ' : f.tipo === 'Por llegar' ? 'Llegan el ' : 'Se esperaban el ') + f.dia;
      },
      resumen: function (l) {
        var dias = {}, lg = 0, nl = 0; l.forEach(function (f) { dias[f.fecha] = 1; if (f.tipo === 'Llegó') lg++; else if (f.tipo !== 'Por llegar') nl++; });
        return [{ etiqueta: 'Por llegar', valor: l.length - lg - nl }, { etiqueta: 'No llegaron en su día', valor: nl }, { etiqueta: 'Ya llegaron', valor: lg }, { etiqueta: 'Días', valor: Object.keys(dias).length },
                { etiqueta: 'Plazo para presentar', valor: habiles(D.dias || 5) }];
      }
    });
  }

  function conPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = CDN_PDF; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { mal(new Error('No se pudo bajar la librería de PDF. Revisa la conexión e intenta otra vez.')); };
      document.head.appendChild(s);
    });
  }

  /* Hoja horizontal con el membrete del ecosistema. */
  function hoja() {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    var cfg = (C.config && C.config()) || {};
    function membrete(sub) {
      doc.setFillColor(6, 64, 43); doc.rect(0, 0, W, 18, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
      doc.text(String(cfg.MARCA_MUNICIPIO || 'MUNICIPIO DE FLANDES'), 10, 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text('Agenda de revisión · ' + String((window.MARCA && window.MARCA.TITULO) || K.app || ''), 10, 13.5);
      doc.text('Generado el ' + new Date().toLocaleString('es-CO'), W - 10, 8, { align: 'right' });
      doc.setTextColor(20, 30, 25); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text(etiqueta(), 10, 26);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 85, 78);
      doc.text(doc.splitTextToSize(sub, W - 20)[0], 10, 31);
      return 35;
    }
    function pie() {
      var n = doc.getNumberOfPages();
      for (var i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 130, 125);
        doc.text('Por llegar = día probable (fin del periodo + lo que cada uno suele tardar). En rojo = su día pasó y no ha llegado. Llegó = fecha real de radicación. Solo consulta.', 10, H - 6);
        doc.text('Página ' + i + ' de ' + n, W - 10, H - 6, { align: 'right' });
      }
    }
    return { doc: doc, W: W, H: H, membrete: membrete, pie: pie };
  }

  function txtCorto(doc, s, w) { s = String(s); if (doc.getTextWidth(s) <= w) return s; while (s.length > 1 && doc.getTextWidth(s + '…') > w) s = s.slice(0, -1); return s + '…'; }
  function guardarPDF(doc) { doc.save(K.piezas.exportar.nombreArchivo('Agenda de revision ' + etiqueta()) + '.pdf'); }

  function pdfMes() {
    var m = porDia(), r = rango(), h = hoja(), doc = h.doc, n = 0, nl = 0, ini = lunes(r[0]), sem = [];
    for (var d = ini; d <= r[1] || d.getDay() !== 1; d = mas(d, 1)) sem.push(d);
    var nr = 0;
    sem.forEach(function (d) { if (d.getMonth() === r[0].getMonth()) { var e = m[dmy(d)]; if (e) { n += e.vienen.length; nl += e.llego.length; nr += e.vienen.filter(tarde).length; } } });
    var y0 = h.membrete(subtitulo(n + nl) + ' · ' + (n - nr) + ' por llegar · ' + (nr ? nr + ' no llegaron en su día · ' : '') + nl + ' ya llegaron');
    var filas = sem.length / 7, cw = (h.W - 20) / 7, ch = (h.H - y0 - 16 - 6) / filas, faltan = [];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(70, 85, 78);
    ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'].forEach(function (t, i) { doc.text(t, 10 + i * cw + 2, y0 + 3.5); });
    var y1 = y0 + 6;
    sem.forEach(function (d, i) {
      var x = 10 + (i % 7) * cw, y = y1 + Math.floor(i / 7) * ch, key = dmy(d), e = m[key] || vacioDia(), otro = d.getMonth() !== r[0].getMonth();
      if (finde(d) || otro) { doc.setFillColor(243, 246, 244); doc.rect(x, y, cw, ch, 'F'); }
      doc.setDrawColor(205, 218, 211); doc.rect(x, y, cw, ch);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(otro ? 160 : 20, otro ? 170 : 30, otro ? 165 : 25);
      doc.text(String(d.getDate()), x + 1.8, y + 4.2);
      if (otro) return;
      var ntP = e.vienen.filter(tarde).length, nvP = e.vienen.length - ntP;
      var tag = [nvP ? nvP + ' por llegar' : '', ntP ? ntP + ' sin llegar' : '', e.llego.length ? e.llego.length + (e.llego.length > 1 ? ' llegaron' : ' llegó') : ''].filter(Boolean).join(' · ');
      if (ntP) { doc.setDrawColor(192, 57, 43); doc.setLineWidth(.6); doc.rect(x + .3, y + .3, cw - .6, ch - .6); doc.setLineWidth(.2); }
      if (tag) { doc.setFontSize(7); if (ntP) doc.setTextColor(192, 57, 43); else doc.setTextColor(6, 64, 43); doc.text(txtCorto(doc, tag, cw - 9), x + cw - 1.8, y + 4.2, { align: 'right' }); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
      var cab = Math.max(0, Math.floor((ch - 7) / 3.1)), todos = e.vienen.map(function (x) { return [x, false]; }).concat(e.llego.map(function (x) { return [x, true]; }));
      var ver = todos.length > cab ? cab - 1 : todos.length;
      todos.slice(0, Math.max(0, ver)).forEach(function (p, j) {
        if (!p[1] && tarde(p[0])) doc.setTextColor(192, 57, 43); else doc.setTextColor(p[1] ? 30 : 20, p[1] ? 132 : 30, p[1] ? 73 : 25);
        doc.text(txtCorto(doc, (p[1] ? '+ ' : (tarde(p[0]) ? '! ' : '• ')) + nombre(p[0].nombre) + ' · c' + p[0].informe, cw - 3.6), x + 1.8, y + 8 + j * 3.1);
      });
      if (todos.length > ver) { doc.setTextColor(180, 83, 9); doc.text('… y ' + (todos.length - ver) + ' más (ver detalle)', x + 1.8, y + 8 + Math.max(0, ver) * 3.1); faltan.push(d); }
    });
    doc.setFontSize(7); doc.setTextColor(70, 85, 78); doc.setFont('helvetica', 'normal');
    doc.text('• por llegar   ! no llegó en su día (en rojo)   + ya llegó   (cN = número de la cuenta)', 10, h.H - 11);
    if (faltan.length) detalle(h, m, faltan);
    h.pie(); guardarPDF(doc);
  }

  /** Páginas con los nombres completos de los días que no cupieron en la cuadrícula. */
  function detalle(h, m, dias) {
    var doc = h.doc, y = 0, col = 0, cw = (h.W - 20) / 3, x0 = 10, top = 0;
    function nueva() { doc.addPage(); top = h.membrete('Detalle de los días que no cupieron en la cuadrícula'); y = top; col = 0; }
    nueva();
    dias.forEach(function (d) {
      var e = m[dmy(d)], lineas = 1 + e.vienen.length + e.llego.length;
      if (y + lineas * 3.6 + 3 > h.H - 14) { col++; y = top; if (col > 2) nueva(); }
      var x = x0 + col * cw;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(6, 64, 43);
      doc.text(cap(larga(d)), x, y + 3); y += 4.6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
      e.vienen.forEach(function (p) { if (tarde(p)) doc.setTextColor(192, 57, 43); else doc.setTextColor(20, 30, 25); doc.text(txtCorto(doc, (tarde(p) ? '! ' : '• ') + nombre(p.nombre) + ' · cuenta ' + p.informe + ' de ' + p.total + (tarde(p) ? (vencida(p) ? ' · plazo vencido' : ' · no llegó') : ''), cw - 4), x + 1, y + 3); y += 3.6; });
      e.llego.forEach(function (p) { doc.setTextColor(30, 132, 73); doc.text(txtCorto(doc, '+ ' + nombre(p.nombre) + ' · cuenta ' + p.informe + ' · ' + estadoTxt(p.estado), cw - 4), x + 1, y + 3); y += 3.6; });
      y += 2.4;
    });
  }

  function pdfSemana() {
    var m = porDia(), r = rango(), h = hoja(), doc = h.doc, n = 0, nl = 0, dias = [];
    var nr = 0;
    for (var i = 0; i < 7; i++) { var d = mas(r[0], i), e = m[dmy(d)] || vacioDia(); dias.push([d, e]); n += e.vienen.length; nl += e.llego.length; nr += e.vienen.filter(tarde).length; }
    var cw = (h.W - 20) / 7, lh = 3.5, pag = 0;
    /* cada día es una columna; si una no cabe, sigue en la página siguiente con las mismas columnas */
    var colas = dias.map(function (p) {
      var l = [];
      p[1].vienen.forEach(function (x) { if (tarde(x)) l.push(['r', nombre(x.nombre)], ['rs', (vencida(x) ? 'Plazo vencido' : 'No llegó') + ' · cuenta ' + x.informe + ' de ' + x.total]); else l.push(['v', nombre(x.nombre)], ['vs', 'Cuenta ' + x.informe + ' de ' + x.total + ' · contrato ' + x.contrato]); });
      p[1].llego.forEach(function (x) { l.push(['l', nombre(x.nombre)], ['ls', 'Llegó · cuenta ' + x.informe + ' · ' + estadoTxt(x.estado)]); });
      return l;
    });
    var quedan = function () { return colas.some(function (c) { return c.length; }); };
    do {
      if (pag) doc.addPage();
      var y0 = h.membrete(subtitulo(n + nl) + ' · ' + (n - nr) + ' por llegar · ' + (nr ? nr + ' no llegaron en su día · ' : '') + nl + ' ya llegaron' + (pag ? ' · continuación' : ''));
      var cabeza = 12, yMax = h.H - 14;
      dias.forEach(function (p, i) {
        var x = 10 + i * cw, d = p[0];
        doc.setFillColor(finde(d) ? 236 : 6, finde(d) ? 241 : 64, finde(d) ? 238 : 43); doc.rect(x, y0, cw, cabeza, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(finde(d) ? 70 : 255, finde(d) ? 85 : 255, finde(d) ? 78 : 255);
        doc.text(cap(DIAS_L[d.getDay()]) + ' ' + d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3), x + 2, y0 + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
        var ntW = p[1].vienen.filter(tarde).length, nvW = p[1].vienen.length - ntW;
        doc.text(txtCorto(doc, (nvW ? nvW + ' por llegar' : 'nada por llegar') + (ntW ? ' · ' + ntW + ' sin llegar' : '') + (p[1].llego.length ? ' · ' + p[1].llego.length + ' llegaron' : ''), cw - 4), x + 2, y0 + 9.4);
        doc.setDrawColor(205, 218, 211); doc.rect(x, y0, cw, yMax - y0);
        var y = y0 + cabeza + 4, c = colas[i];
        if (fuera(d) && !pag) { doc.setTextColor(140, 150, 145); doc.text('Fuera de la agenda', x + 2, y); }
        while (c.length && y + lh <= yMax - 1) {
          var it = c[0];
          if ((it[0] === 'v' || it[0] === 'l' || it[0] === 'r') && y + lh * 2 > yMax - 1) break;   /* nombre y su línea van juntos */
          c.shift();
          var fuerte = it[0] === 'v' || it[0] === 'l' || it[0] === 'r';
          doc.setFont('helvetica', fuerte ? 'bold' : 'normal'); doc.setFontSize(fuerte ? 7.6 : 6.6);
          if (it[0] === 'r' || it[0] === 'rs') doc.setTextColor(192, 57, 43); else if (it[0] === 'l' || it[0] === 'ls') doc.setTextColor(30, 132, 73); else doc.setTextColor(fuerte ? 20 : 90, fuerte ? 30 : 104, fuerte ? 25 : 97);
          doc.text(txtCorto(doc, it[1], cw - 4), x + 2, y);
          y += fuerte ? lh : lh + 1.2;
        }
      });
      pag++;
    } while (quedan() && pag < 20);
    h.pie(); guardarPDF(doc);
  }

  window.AGENDA = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    olvidar: function () { D = null; F = { buscar: '', sup: '', sec: '' }; V = { modo: '', ref: null, dia: '', lista: 'vienen' }; },
    _datos: function () { return D; }, _filtradas: filtradas, _filas: filasVista, _v: function () { return V; }
  };
}());
