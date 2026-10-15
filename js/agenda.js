/* ============================================================
   AGENDA DE REVISIÓN · SUPERVISIÓN, CONTRATACIÓN y ADMIN
   (mismo archivo en las tres apps) · 15/10/2026

   Para qué: saber qué días llega cuánto trabajo y de quiénes.
   Los periodos de cada contrato van mes a mes desde su FECHA INICIO,
   así que los contratistas que iniciaron el mismo día presentan juntos
   (un "grupo de corte"). El CORE calcula, para los próximos 30 días:

     · el fin del periodo de cada cuenta que viene,
     · la ventana para presentarla (hasta el plazo de CUENTAS ATRASADAS),
     · el DÍA PROBABLE: el fin del periodo más lo que esa persona suele
       tardar (mediana de sus cuentas ya radicadas, en días hábiles).

   Solo lectura: no cambia nada. Un viaje ('agenda'); el cálculo queda
   hecho para el día en el CORE y cada app recibe solo su alcance
   (Supervisión, lo suyo; Contratación y ADMIN, todo el ecosistema).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var D = null;                       /* lo último que llegó del CORE */
  var F = { buscar: '', sup: '', sec: '', dia: '' };
  var zona = null, zLista = null, zCal = null;
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var ESTADO_T = { 'SIN INICIAR': 'Sin iniciar', BORRADOR: 'En borrador', 'EN PROCESO': 'En proceso', INGRESADA: 'Lista sin reportar' };
  var ESTADO_HOY = { REPORTADA: 'Por revisar', 'PLAN DE PAGOS': 'Plan de pagos', 'REVISADA POR SUPERVISOR': 'Por revisar en Contratación' };

  function O() { return window.OFICINA; }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function secNombre(s) { return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); }); }
  function aFecha(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  function dmy(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function larga(s) { var d = aFecha(s); return d ? DIAS_L[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] : String(s || ''); }
  function corta(s) { var d = aFecha(s); return d ? d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) : String(s || ''); }
  function habiles(n) { return n + (n === 1 ? ' día hábil' : ' días hábiles'); }

  /** Las filas compactas del CORE como objetos. */
  function items() {
    if (!D) return [];
    if (D._obj) return D._obj;
    var ix = {}; (D.campos || []).forEach(function (k, i) { ix[k] = i; });
    D._obj = (D.items || []).map(function (r) {
      var o = {}; Object.keys(ix).forEach(function (k) { o[k] = r[ix[k]]; }); return o;
    });
    return D._obj;
  }
  function hoyLista() {
    if (!D || !D.hoy) return [];
    var ix = {}; D.hoy.campos.forEach(function (k, i) { ix[k] = i; });
    return D.hoy.lista.map(function (r) { var o = {}; Object.keys(ix).forEach(function (k) { o[k] = r[ix[k]]; }); return o; });
  }

  function filtradas(sinDia) {
    var q = K.norm(F.buscar);
    return items().filter(function (x) {
      if (F.sup && K.norm(x.sup) !== F.sup) return false;
      if (F.sec && K.norm(x.sec) !== F.sec) return false;
      if (!sinDia && F.dia && x.probable !== F.dia) return false;
      if (q && K.norm([x.nombre, x.id, x.contrato, x.sup, x.sec].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
  }

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

  function pintar() {
    if (!zona || !D) return;
    zona.innerHTML = '';
    var b = O().barra({ placeholder: 'Buscar por nombre o contrato', valor: F.buscar,
      alBuscar: function (t) { F.buscar = t; pintarTodo(); },
      alRefrescar: function () { return traer(true).then(pintar); } });
    zona.appendChild(b.caja);
    zona.appendChild(cifras());
    zona.appendChild(bandeja());
    pastillas();
    var acc = K.nodo('<div class="ct-acc ag-acc"></div>');
    var bP = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('pdf', 16) + ' PDF</button>');
    var bX = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('hoja', 16) + ' Excel</button>');
    bP.addEventListener('click', function () { exportar('pdf'); });
    bX.addEventListener('click', function () { exportar('xlsx'); });
    acc.appendChild(bP); acc.appendChild(bX);
    zona.appendChild(acc);
    zCal = K.nodo('<section class="kit-tarjeta ag-cal" aria-label="Calendario de llegada"></section>');
    zona.appendChild(zCal);
    zona.appendChild(K.nodo('<h3 class="bloque__t ag-t">GRUPOS DE CORTE</h3>'));
    zGrupos = K.nodo('<div class="ag-grupos"></div>');
    zona.appendChild(zGrupos);
    zTit = K.nodo('<h3 class="bloque__t ag-t"></h3>');
    zona.appendChild(zTit);
    zLista = K.nodo('<div class="kit-rejilla kit-rejilla--auto ag-lista"></div>');
    zona.appendChild(zLista);
    pintarTodo();
    if (D.sinDatos) zona.appendChild(K.nodo('<p class="formulario__nota ag-nota">' + K.icono('aviso', 14) + ' ' + D.sinDatos +
      (D.sinDatos === 1 ? ' contrato activo no tiene' : ' contratos activos no tienen') + ' FECHA INICIO, FECHA FINAL o TOTAL DE INFORMES: no entran en la agenda hasta completarlos.</p>'));
  }
  var zGrupos = null, zTit = null;

  function pintarTodo() { calendario(); grupos(); lista(); }

  function cifras() {
    var l = items(), hoy = aFecha(D.fecha), en7 = 0, porDia = {}, max = null;
    l.forEach(function (x) {
      var p = aFecha(x.probable);
      if (p && (p - hoy) / 864e5 < 7) en7++;
      porDia[x.probable] = (porDia[x.probable] || 0) + 1;
    });
    Object.keys(porDia).forEach(function (k) { if (!max || porDia[k] > porDia[max]) max = k; });
    var c = K.nodo('<div class="kit-tarjeta at-cifras ag-cifras"></div>');
    [[hoyLista().length, 'En tu bandeja hoy'], [en7, 'Llegan en 7 días'], [l.length, 'Llegan en 30 días'],
     [max ? porDia[max] : 0, max ? 'El día más cargado: ' + corta(max) : 'Sin días cargados']].forEach(function (x) {
      var d = K.nodo('<div class="at-cifra"><b></b><span></span></div>');
      d.querySelector('b').textContent = K.numero(x[0]); d.querySelector('span').textContent = x[1];
      c.appendChild(d);
    });
    var p = K.nodo('<p class="formulario__nota at-corte"></p>');
    p.textContent = (D.alcance || '') + ' · hoy ' + larga(D.fecha) + ' · plazo para presentar: ' + habiles(D.dias || 5) +
      ' · sin historia se toman ' + habiles(D.lagGlobal || 0) + ' (lo usual de todos)' + (D.calculado ? ' · calculado ' + String(D.calculado).slice(-8, -3) : '');
    c.appendChild(p);
    return c;
  }

  /** Lo que ya está esperando revisión hoy. */
  function bandeja() {
    var l = hoyLista();
    var s = K.nodo('<section class="kit-tarjeta ag-hoy"><h3 class="grupo__t">' + K.icono('reloj', 16) + ' HOY EN TU BANDEJA</h3></section>');
    if (!l.length) { s.appendChild(K.nodo('<p class="formulario__nota">Nada esperando revisión ahora mismo.</p>')); return s; }
    var cuenta = {};
    l.forEach(function (x) { var k = ESTADO_HOY[x.estado] || x.estado; cuenta[k] = (cuenta[k] || 0) + 1; });
    s.appendChild(K.nodo('<p class="formulario__nota">' + Object.keys(cuenta).map(function (k) { return '<b>' + cuenta[k] + '</b> ' + K.esc(k.toLowerCase()); }).join(' · ') + '</p>'));
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
    var l = items();
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
        alCambiar: function (v) { F[campo] = v; F.dia = ''; pintarTodo(); }
      });
      var cn = { '': l.length }; ks.forEach(function (k) { cn[k] = n[k].c; });
      if (f) f.conteos(cn);
    }
    grupo('sup', nombre, 'Todos los supervisores');
    grupo('sec', secNombre, 'Todas las secretarías');
  }

  /* ══════════════ calendario: una columna por día, alto = cuántas llegan ══════════════ */

  function calendario() {
    if (!zCal) return;
    zCal.innerHTML = '<h3 class="grupo__t">' + K.icono('calendario', 16) + ' CUÁNDO LLEGAN · día probable</h3>';
    var l = filtradas(true), por = {}, max = 1;
    l.forEach(function (x) { por[x.probable] = (por[x.probable] || 0) + 1; });
    Object.keys(por).forEach(function (k) { if (por[k] > max) max = por[k]; });
    var fila = K.nodo('<div class="ag-dias" role="list"></div>');
    var d0 = aFecha(D.fecha), dH = aFecha(D.hasta);
    for (var d = new Date(d0); d <= dH; d.setDate(d.getDate() + 1)) {
      var k = dmy(d), n = por[k] || 0, finde = d.getDay() === 0 || d.getDay() === 6;
      var b = K.nodo('<button type="button" class="ag-dia' + (finde ? ' ag-dia--finde' : '') + (F.dia === k ? ' ag-dia--sel' : '') + (n ? '' : ' ag-dia--vacio') + '" role="listitem">' +
        '<span class="ag-dia__n"></span><span class="ag-dia__barra"><i></i></span><span class="ag-dia__d"></span><span class="ag-dia__s"></span></button>');
      b.querySelector('.ag-dia__n').textContent = n || '';
      b.querySelector('i').style.height = Math.round((n / max) * 100) + '%';
      b.querySelector('.ag-dia__d').textContent = d.getDate();
      b.querySelector('.ag-dia__s').textContent = DIAS_C[d.getDay()];
      b.title = larga(k) + ': ' + (n ? n + (n === 1 ? ' cuenta probable' : ' cuentas probables') : 'nada');
      b.setAttribute('aria-label', b.title);
      (function (k, n) { b.addEventListener('click', function () { if (!n) return; F.dia = F.dia === k ? '' : k; pintarTodo(); }); })(k, n);
      fila.appendChild(b);
    }
    zCal.appendChild(fila);
    zCal.appendChild(K.nodo('<p class="formulario__nota">Toca un día para ver quiénes. Los sábados y domingos van en gris: lo que cae en fin de semana se presenta el siguiente día hábil.</p>'));
    var sel = fila.querySelector('.ag-dia--sel');
    if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }
  }

  /* ══════════════ grupos de corte: los que terminan periodo el mismo día ══════════════ */

  function grupos() {
    if (!zGrupos) return;
    zGrupos.innerHTML = '';
    var l = filtradas(true), por = {};
    l.forEach(function (x) { (por[x.fin] = por[x.fin] || []).push(x); });
    var ks = Object.keys(por).sort(function (a, b) { return aFecha(a) - aFecha(b); });
    if (!ks.length) { zGrupos.appendChild(K.nodo('<p class="formulario__nota">Nadie corta periodo en los próximos 30 días.</p>')); return; }
    ks.forEach(function (k) {
      var g = por[k];
      var t = K.nodo('<details class="kit-tarjeta ag-g"><summary><b class="ag-g__n"></b><span class="ag-g__t"></span><span class="ag-g__v"></span></summary><div class="ag-g__l"></div></details>');
      t.querySelector('.ag-g__n').textContent = g.length;
      t.querySelector('.ag-g__t').textContent = 'Corte ' + larga(k);
      var lim = g.reduce(function (a, x) { return !a || aFecha(x.limite) > aFecha(a) ? x.limite : a; }, '');
      t.querySelector('.ag-g__v').textContent = 'presentan hasta el ' + corta(lim);
      var ll = t.querySelector('.ag-g__l');
      g.forEach(function (x) {
        var f = K.nodo('<span class="at-chip"></span>');
        f.textContent = nombre(x.nombre) + ' · cuenta ' + x.informe + ' · llega ~' + corta(x.probable);
        ll.appendChild(f);
      });
      zGrupos.appendChild(t);
    });
  }

  /* ══════════════ la lista ══════════════ */

  function lista() {
    if (!zLista) return;
    var l = filtradas().slice().sort(function (a, b) { return aFecha(a.probable) - aFecha(b.probable) || (a.nombre < b.nombre ? -1 : 1); });
    zTit.textContent = F.dia ? 'LLEGAN EL ' + larga(F.dia).toUpperCase() + ' · ' + l.length : 'TODAS LAS QUE VIENEN · ' + l.length;
    zLista.innerHTML = '';
    if (!l.length) {
      zLista.appendChild(O().vacio(items().length ? 'Nadie con esos filtros.' : 'No llega ninguna cuenta en los próximos 30 días.', function () { F = { buscar: '', sup: '', sec: '', dia: '' }; pintar(); }));
      return;
    }
    l.forEach(function (x) { zLista.appendChild(tarjeta(x)); });
  }

  function tarjeta(x) {
    var t = K.nodo('<article class="kit-tarjeta at-tar ag-tar"></article>');
    var cab = K.nodo('<div class="at-tar__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(x.nombre, { foto: x.foto || '', tam: 44 }));
    var q = K.nodo('<div class="at-tar__quien"><b class="at-tar__n"></b><span class="at-tar__s"></span></div>');
    q.querySelector('b').textContent = nombre(x.nombre);
    q.querySelector('span').textContent = 'Contrato ' + (x.contrato || x.id) + (C.modo !== 'SUPERVISION' ? ' · ' + nombre(x.sup) : '');
    cab.appendChild(q);
    var dd = K.nodo('<span class="at-dias ag-dd" title="Día probable"><b></b><small></small></span>');
    var p = aFecha(x.probable);
    dd.querySelector('b').textContent = p ? p.getDate() : '';
    dd.querySelector('small').textContent = p ? MESES[p.getMonth()].slice(0, 3) : '';
    cab.appendChild(dd);
    t.appendChild(cab);
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

  /* ══════════════ PDF por bloques y Excel ══════════════ */

  function exportar(que) {
    var l = filtradas().slice().sort(function (a, b) { return aFecha(a.probable) - aFecha(b.probable); });
    if (!l.length) { K.aviso('No hay cuentas con esos filtros.', 'info', 2500); return; }
    var ex = K.piezas.exportar;
    var filas = l.map(function (x) {
      return { probable: x.probable, dia: larga(x.probable), nombre: nombre(x.nombre), contrato: x.contrato, id: x.id, supervisor: nombre(x.sup), secretaria: secNombre(x.sec),
               cuenta: x.informe + ' de ' + x.total, informe: x.informe, total: x.total, inicio: x.ini, fin: x.fin, limite: x.limite,
               suele: x.hist ? habiles(x.lag) + ' (' + x.hist + ' cuentas)' : 'sin historia (' + habiles(x.lag) + ')', estado: ESTADO_T[x.estado] || x.estado };
    });
    var sub = (D.alcance || '') + ' · del ' + larga(D.fecha) + ' al ' + larga(D.hasta) + ' · ' + l.length + (l.length === 1 ? ' cuenta' : ' cuentas') + (F.dia ? ' · ' + larga(F.dia) : '');
    if (que === 'xlsx') {
      ex.aExcel('Agenda de revisión', [
        { campo: 'probable', titulo: 'Día probable' }, { campo: 'nombre', titulo: 'Contratista' }, { campo: 'contrato', titulo: 'Contrato' },
        { campo: 'id', titulo: 'ID contrato' }, { campo: 'supervisor', titulo: 'Supervisor' }, { campo: 'secretaria', titulo: 'Secretaría' },
        { campo: 'informe', titulo: 'Cuenta' }, { campo: 'total', titulo: 'Total de cuentas' }, { campo: 'inicio', titulo: 'Inicio del periodo' },
        { campo: 'fin', titulo: 'Fin del periodo (corte)' }, { campo: 'limite', titulo: 'Presenta hasta' }, { campo: 'suele', titulo: 'Suele tardar' },
        { campo: 'estado', titulo: 'Estado hoy' }
      ], filas);
      return;
    }
    ex.aPDF('Agenda de revisión', [
      { campo: 'cuenta', titulo: 'Cuenta' }, { campo: 'inicio', titulo: 'Inicio del periodo' }, { campo: 'fin', titulo: 'Corte' },
      { campo: 'limite', titulo: 'Presenta hasta' }, { campo: 'suele', titulo: 'Suele tardar' }, { campo: 'estado', titulo: 'Estado hoy' },
      { campo: 'secretaria', titulo: 'Secretaría' }
    ], filas, {
      subtitulo: sub,
      bloque: { titulo: function (f) { return f.nombre; }, sub: function (f) { return 'Contrato ' + f.contrato + ' · ' + f.supervisor; },
                marca: function (f) { return 'Llega ~' + corta(f.probable); }, tono: function () { return 'info'; } },
      grupo: function (f) { return 'Llegan el ' + f.dia; },
      resumen: function (fs) {
        var dias = {}; fs.forEach(function (f) { dias[f.probable] = 1; });
        return [{ etiqueta: 'Cuentas que llegan', valor: fs.length }, { etiqueta: 'Días con llegada', valor: Object.keys(dias).length },
                { etiqueta: 'Plazo para presentar', valor: habiles(D.dias || 5) }];
      }
    });
  }

  window.AGENDA = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    olvidar: function () { D = null; F = { buscar: '', sup: '', sec: '', dia: '' }; },
    _datos: function () { return D; }, _filtradas: filtradas
  };
}());
