/* ============================================================
   SUPERVISION-FLANDES · REQUERIMIENTOS (6.3, la vista de CONTRATACIÓN 5.4)

   En Supervisión la lista de contratistas es SOLO la de tu alcance (el
   CORE la filtra) y el requerimiento sale con tu nombre como Supervisión.

   Qué cambia frente a la app vieja
     · Antes: un botón REDACTAR por contratista que mandaba un WhatsApp
       desde el navegador (con la llave de BuilderBot en el código) y no
       dejaba rastro. Nadie sabía qué se le pidió a quién ni si respondió.
     · Ahora cada requerimiento queda guardado (hoja REQUERIMIENTOS) con
       quién lo hizo, a qué contrato y cuándo; sale por el despachador del
       CORE (notificación en la app + WhatsApp, y queda en MIS
       NOTIFICACIONES del contratista) y se marca ATENDIDO cuando se
       resuelve.
     · Se puede mandar el mismo texto a varios contratistas a la vez
       (máximo 20) y hay textos rápidos para lo que se pide siempre.

   Dos pestañas
     CONTRATISTAS  a quién pedirle algo. Pastillas: activos / todos,
                   con requerimientos abiertos / sin ninguno, secretaría.
     HISTORIAL     todo lo pedido, con su estado. Pastillas: abiertos,
                   atendidos, todos.
   Las dos tienen buscador y Refrescar.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'requerimientos.filtro.v1';

  var DATA = null;       /* {lista, rapidos, yo, tope} */
  var HORA = null;
  var CARGANDO = null;
  var F = leerFiltro();
  var SEL = {};          /* id de contrato → true */

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return { tab: g.tab || 'contratistas', estado: g.estado === undefined ? 'ACTIVO' : g.estado, req: g.req || '',
             sec: g.sec || '', hist: g.hist === undefined ? 'ABIERTO' : g.hist, busca: '' };
  }
  function guardarFiltro() {
    K.guardar.escribir(FILTRO_K, { tab: F.tab, estado: F.estado, req: F.req, sec: F.sec, hist: F.hist });
  }

  function recibir(d) {
    DATA = d || { lista: [], rapidos: [], tope: 20 };
    DATA.lista = (DATA.lista || []).map(function (r) {
      r._t = K.norm([r.nombre, r.doc, r.contrato, r.sec, r.texto, r.emisor, r.id].join(' '));
      return r;
    });
    HORA = new Date();
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('requerimientos').then(function (d) { CARGANDO = null; recibir(d); return DATA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function contratistas() { return window.CONTRATISTAS ? window.CONTRATISTAS.todas() : []; }

  /** idContrato → {abiertos, total, ultimo} */
  function porContrato() {
    var m = {};
    (DATA ? DATA.lista : []).forEach(function (r) {
      var k = K.norm(r.idContrato);
      var x = m[k] || (m[k] = { abiertos: 0, total: 0, ultimo: null });
      x.total++;
      if (r.estado !== 'ATENDIDO') x.abiertos++;
      if (!x.ultimo) x.ultimo = r;          /* la lista viene de la más nueva a la más vieja */
    });
    return m;
  }

  function coincide(t, q) {
    q = K.norm(q || '');
    if (!q) return true;
    var p = q.split(' ').filter(Boolean);
    for (var i = 0; i < p.length; i++) if (t.indexOf(p[i]) < 0) return false;
    return true;
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'sobre', 'REQUERIMIENTOS',
      'Pídele algo a un contratista (o a varios a la vez). Le llega como notificación en la app y por WhatsApp, y queda en su buzón. Márcalo atendido cuando lo resuelva.');

    var zTab = K.nodo('<div class="of-tabs"></div>');
    caja.appendChild(zTab);
    var b = O.barra({
      placeholder: 'Nombre, documento, contrato o texto', valor: F.busca,
      alBuscar: function (q) { F.busca = q; pintar(); },
      alRefrescar: function () {
        return Promise.all([cargar(true), window.CONTRATISTAS ? window.CONTRATISTAS.cargar(true) : null]).then(function () { montarPastillas(); pintar(); });
      }
    });
    caja.appendChild(b.caja);
    var zA = K.nodo('<div></div>'), zB = K.nodo('<div></div>'), zC = K.nodo('<div></div>');
    caja.appendChild(zA); caja.appendChild(zB); caja.appendChild(zC);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var rej = K.nodo('<div class="kit-rejilla ct-lista"></div>');
    caja.appendChild(rej);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);
    var bandeja = K.nodo('<div class="of-bandeja" hidden><span class="of-bandeja__n"></span>' +
      '<button type="button" class="kit-btn kit-btn--plano of-bandeja__q">Quitar</button>' +
      '<button type="button" class="kit-btn kit-btn--marca of-bandeja__r">' + K.icono('enviar', 16) + ' Redactar</button></div>');
    caja.appendChild(bandeja);
    bandeja.querySelector('.of-bandeja__q').addEventListener('click', function () { SEL = {}; pintar(); });
    bandeja.querySelector('.of-bandeja__r').addEventListener('click', function () {
      var ids = Object.keys(SEL);
      redactar(contratistas().filter(function (f) { return SEL[f.id]; }), function () { SEL = {}; pintar(); });
      return ids;
    });

    var pTab, pA, pB, pC, VER = 60;
    pTab = K.piezas.pastillas.montar(zTab, {
      etiqueta: 'Qué ver',
      opciones: [{ valor: 'contratistas', texto: 'Contratistas' }, { valor: 'historial', texto: 'Historial' }],
      valor: F.tab,
      alCambiar: function (v) { F.tab = v; guardarFiltro(); montarPastillas(); pintar(); }
    });

    function montarPastillas() {
      zA.innerHTML = ''; zB.innerHTML = ''; zC.innerHTML = '';
      if (F.tab === 'historial') {
        pA = K.piezas.pastillas.montar(zA, {
          etiqueta: 'Estado', valor: F.hist,
          opciones: [{ valor: 'ABIERTO', texto: 'Abiertos', tono: 'aviso' }, { valor: 'ATENDIDO', texto: 'Atendidos', tono: 'ok' }, { valor: '', texto: 'Todos' }],
          alCambiar: function (v) { F.hist = v; guardarFiltro(); pintar(); }
        });
        pB = null; pC = null;
        return;
      }
      pA = K.piezas.pastillas.montar(zA, {
        etiqueta: 'Contrato', valor: F.estado,
        opciones: [{ valor: 'ACTIVO', texto: 'Activos', tono: 'ok' }, { valor: '', texto: 'Todos' }],
        alCambiar: function (v) { F.estado = v; guardarFiltro(); pintar(); }
      });
      pB = K.piezas.pastillas.montar(zB, {
        etiqueta: 'Requerimientos', valor: F.req,
        opciones: [{ valor: '', texto: 'Todos' }, { valor: 'abiertos', texto: 'Con requerimientos abiertos', tono: 'aviso' }, { valor: 'sin', texto: 'Sin requerimientos' }],
        alCambiar: function (v) { F.req = v; guardarFiltro(); pintar(); }
      });
      pC = K.piezas.pastillas.montar(zC, {
        etiqueta: 'Secretaría', valor: F.sec, opciones: [{ valor: '', texto: 'Todas las secretarías' }],
        alCambiar: function (v) { F.sec = v; guardarFiltro(); pintar(); }
      });
    }

    function pasaC(f, pc, sin) {
      sin = sin || {};
      if (!sin.estado && F.estado === 'ACTIVO' && f.estado !== 'ACTIVO') return false;
      var x = pc[K.norm(f.id)];
      if (!sin.req && F.req === 'abiertos' && !(x && x.abiertos)) return false;
      if (!sin.req && F.req === 'sin' && x) return false;
      if (!sin.sec && F.sec && f.sec !== F.sec) return false;
      return coincide(f._t || K.norm([f.nombre, f.doc, f.contrato, f.sec].join(' ')), F.busca);
    }

    function pintar() {
      rej.innerHTML = '';
      mas.hidden = true;
      if (F.tab === 'historial') return pintarHistorial();
      var pc = porContrato(), L = contratistas();
      /* conteos de las pastillas con los demás filtros puestos */
      var bE = L.filter(function (f) { return pasaC(f, pc, { estado: true }); });
      pA.conteos({ ACTIVO: bE.filter(function (f) { return f.estado === 'ACTIVO'; }).length, '': bE.length });
      O.marcar(zA, F.estado);
      var bR = L.filter(function (f) { return pasaC(f, pc, { req: true }); });
      pB.conteos({ '': bR.length, abiertos: bR.filter(function (f) { var x = pc[K.norm(f.id)]; return x && x.abiertos; }).length,
                   sin: bR.filter(function (f) { return !pc[K.norm(f.id)]; }).length });
      O.marcar(zB, F.req);
      var bS = L.filter(function (f) { return pasaC(f, pc, { sec: true }); });
      var m = {};
      bS.forEach(function (f) { if (f.sec) m[f.sec] = (m[f.sec] || 0) + 1; });
      var claves = Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'es'); });
      var cS = { '': bS.length };
      claves.forEach(function (s) { cS[s] = m[s]; });
      pC.opciones([{ valor: '', texto: 'Todas las secretarías' }].concat(claves.map(function (s) { return { valor: s, texto: O.titulo(s) }; })));
      pC.conteos(cS);
      O.marcar(zC, F.sec);

      var filas = L.filter(function (f) { return pasaC(f, pc); });
      filas.sort(function (a, b) {
        var xa = pc[K.norm(a.id)], xb = pc[K.norm(b.id)];
        return ((xb && xb.abiertos) || 0) - ((xa && xa.abiertos) || 0) || String(a.nombre).localeCompare(String(b.nombre), 'es');
      });
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'contratista' : 'contratistas') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      if (!filas.length) {
        rej.appendChild(O.vacio('No hay contratistas con estos filtros.', function () { F.req = ''; F.sec = ''; F.busca = ''; b.inp.value = ''; montarPastillas(); pintar(); }));
      }
      filas.slice(0, VER).forEach(function (f) { rej.appendChild(tarjetaC(f, pc[K.norm(f.id)])); });
      if (filas.length > VER) {
        mas.hidden = false;
        mas.textContent = 'Ver ' + Math.min(60, filas.length - VER) + ' más';
      }
      pintarBandeja();
    }
    mas.addEventListener('click', function () { VER += 60; pintar(); });

    function pintarBandeja() {
      var n = Object.keys(SEL).length;
      bandeja.hidden = !n || F.tab !== 'contratistas';
      bandeja.querySelector('.of-bandeja__n').innerHTML = '<b>' + n + '</b> ' + (n === 1 ? 'elegido' : 'elegidos') +
        (n > ((DATA && DATA.tope) || 20) ? ' · máximo ' + ((DATA && DATA.tope) || 20) : '');
    }

    function tarjetaC(f, x) {
      var t = K.nodo('<article class="kit-tarjeta ct-t of-t' + (SEL[f.id] ? ' of-t--sel' : '') + '"></article>');
      var cab = K.nodo('<div class="ct-t__cab"></div>');
      if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(f.nombre, { tam: 44, foto: f.img || '' }));
      cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(O.nombre(f.nombre)) + '</h3>' +
        '<p class="ct-t__doc">Contrato ' + K.esc(f.contrato || '—') + ' · ' + K.esc(O.titulo(f.sec) || 'sin secretaría') + '</p></div>'));
      var elegir = K.nodo('<label class="of-elegir" title="Elegir para un requerimiento a varios"><input type="checkbox"><span class="kit-oculto">Elegir</span></label>');
      var chk = elegir.querySelector('input');
      chk.checked = !!SEL[f.id];
      chk.addEventListener('change', function () {
        if (chk.checked) SEL[f.id] = true; else delete SEL[f.id];
        t.classList.toggle('of-t--sel', chk.checked);
        pintarBandeja();
      });
      cab.appendChild(elegir);
      t.appendChild(cab);
      if (x) {
        t.appendChild(K.nodo('<div class="ct-t__marcas">' +
          (x.abiertos ? '<span class="ct-marca of-marca--abierto">' + K.icono('reloj', 11) + ' ' + x.abiertos + (x.abiertos === 1 ? ' abierto' : ' abiertos') + '</span>' : '') +
          '<span class="ct-marca">' + x.total + (x.total === 1 ? ' requerimiento' : ' requerimientos') + '</span></div>'));
        var u = x.ultimo;
        var ult = K.nodo('<p class="of-ultimo"><span></span><small></small></p>');
        ult.querySelector('span').textContent = u.texto;
        ult.querySelector('small').textContent = O.cuando(u.fecha) + ' · ' + O.nombre(u.emisor);
        t.appendChild(ult);
      } else if (f.estado !== 'ACTIVO') {
        t.appendChild(K.nodo('<div class="ct-t__marcas"><span class="ct-marca">INACTIVO</span></div>'));
      }
      var a = K.nodo('<div class="ct-acc"></div>');
      var red = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('enviar', 16) + ' Redactar</button>');
      red.addEventListener('click', function () { K.vibrar(8); redactar([f]); });
      a.appendChild(red);
      if (x) {
        var hi = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('reloj', 15) + ' Historial</button>');
        hi.addEventListener('click', function () {
          F.tab = 'historial'; F.hist = ''; F.busca = f.contrato ? f.id : f.nombre; b.inp.value = F.busca;
          pTab.poner('historial'); guardarFiltro(); montarPastillas(); pintar();
        });
        a.appendChild(hi);
      }
      t.appendChild(a);
      return t;
    }

    /* ---------- historial ---------- */

    function pintarHistorial() {
      var L = (DATA ? DATA.lista : []);
      var base = L.filter(function (r) { return coincide(r._t, F.busca) || K.norm(r.idContrato) === K.norm(F.busca); });
      pA.conteos({ ABIERTO: base.filter(function (r) { return r.estado !== 'ATENDIDO'; }).length,
                   ATENDIDO: base.filter(function (r) { return r.estado === 'ATENDIDO'; }).length, '': base.length });
      O.marcar(zA, F.hist);
      var filas = base.filter(function (r) { return !F.hist || (F.hist === 'ATENDIDO' ? r.estado === 'ATENDIDO' : r.estado !== 'ATENDIDO'); });
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'requerimiento' : 'requerimientos') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      if (!L.length) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio">' + K.icono('sobre', 30) +
          '<p><b>Todavía no hay requerimientos.</b><br>Ve a la pestaña Contratistas y toca Redactar.</p></div>'));
        pintarBandeja();
        return;
      }
      if (!filas.length) rej.appendChild(O.vacio('No hay requerimientos con estos filtros.', function () { F.hist = ''; F.busca = ''; b.inp.value = ''; montarPastillas(); pintar(); }));
      filas.slice(0, VER).forEach(function (r) { rej.appendChild(tarjetaR(r)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(60, filas.length - VER) + ' más'; }
      pintarBandeja();
    }

    function tarjetaR(r) {
      var at = r.estado === 'ATENDIDO';
      var t = K.nodo('<article class="kit-tarjeta ct-t of-t of-req' + (at ? ' of-req--at' : '') + '"></article>');
      var cab = K.nodo('<div class="ct-t__cab"></div>');
      var foto = '';
      contratistas().some(function (f) { if (K.norm(f.id) === K.norm(r.idContrato)) { foto = f.img || ''; return true; } return false; });
      if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(r.nombre, { tam: 40, foto: foto }));
      cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(O.nombre(r.nombre)) + '</h3>' +
        '<p class="ct-t__doc">' + K.esc(r.id) + ' · contrato ' + K.esc(r.contrato || '—') + '</p></div>'));
      cab.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' + (at ? 'of-estado--ok' : 'of-estado--abierto') + '">' + (at ? 'ATENDIDO' : 'ABIERTO') + '</span>'));
      t.appendChild(cab);
      var tx = K.nodo('<p class="of-req__txt"></p>');
      tx.textContent = r.texto;
      t.appendChild(tx);
      t.appendChild(K.nodo('<p class="of-req__pie">' + K.icono('persona', 12) + ' ' + K.esc(O.nombre(r.emisor)) + ' · ' +
        K.esc(O.fecha(r.fecha)) + (r.hora ? ' ' + K.esc(r.hora) : '') +
        (at ? '<br>' + K.icono('check', 12) + ' Atendido por ' + K.esc(O.nombre(r.estadoPor)) + ' · ' + K.esc(O.fecha(r.fechaEstado.slice(0, 10))) + ' ' + K.esc(r.fechaEstado.slice(11)) : '') +
        (r.aviso && /falló|SIN/.test(r.aviso) ? '<br><span class="of-req__malo">' + K.icono('aviso', 12) + ' Aviso: ' + K.esc(r.aviso) + '</span>' : '') +
        '</p>'));
      var a = K.nodo('<div class="ct-acc"></div>');
      var cambia = K.nodo('<button type="button" class="kit-btn ' + (at ? 'kit-btn--plano' : 'kit-btn--marca') + '">' +
        K.icono(at ? 'recargar' : 'check', 15) + (at ? ' Reabrir' : ' Marcar atendido') + '</button>');
      cambia.addEventListener('click', function () {
        cambia.disabled = true; cambia.classList.add('kit-ocupado');
        K.pedir('requerimientoEstado', { id: r.id, estado: at ? 'ABIERTO' : 'ATENDIDO' }, { ms: 60000 }).then(function (n) {
          DATA.lista.forEach(function (x, i) { if (x.id === n.id) { n._t = x._t; DATA.lista[i] = n; } });
          K.aviso(at ? 'Requerimiento reabierto.' : 'Marcado como atendido.', 'ok', 2500);
          pintar();
        }, function (e) {
          K.aviso((e && e.message) || 'No se pudo cambiar.', 'malo', 6000);
          cambia.disabled = false; cambia.classList.remove('kit-ocupado');
        });
      });
      a.appendChild(cambia);
      var otro = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('enviar', 15) + ' Otro</button>');
      otro.addEventListener('click', function () {
        var f = contratistas().filter(function (x) { return K.norm(x.id) === K.norm(r.idContrato); })[0];
        if (f) redactar([f]); else K.aviso('Ese contrato ya no está en la lista.', 'aviso', 4000);
      });
      a.appendChild(otro);
      t.appendChild(a);
      return t;
    }

    K.piezas.esqueletos.mientras(rej, Promise.all([cargar(false), window.CONTRATISTAS ? window.CONTRATISTAS.cargar() : null]),
      { forma: 'tarjetas', cuantos: 4 })
      .then(function () { montarPastillas(); pintar(); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });

    K.piezas.creditos.montar(caja);
    vista._repintar = function () { montarPastillas(); pintar(); };
  }

  /* ══════════════ redactar ══════════════ */

  function redactar(destinos, alTerminar) {
    var tope = (DATA && DATA.tope) || 20;
    if (!destinos.length) return;
    if (destinos.length > tope) { K.aviso('Máximo ' + tope + ' contratistas por envío. Quita algunos.', 'aviso', 5000); return; }
    var TOPE = 1500;
    var cuerpo = K.nodo('<div class="of-redactar"></div>');
    var para = K.nodo('<div class="of-para"><span class="of-para__t">Para</span></div>');
    destinos.forEach(function (f) {
      var c = K.nodo('<span class="of-chip"></span>');
      if (K.piezas.personas) c.appendChild(K.piezas.personas.avatar(f.nombre, { tam: 22, foto: f.img || '' }));
      c.appendChild(document.createTextNode(O.nombre(f.nombre) + ' · ' + (f.contrato || '')));
      para.appendChild(c);
    });
    cuerpo.appendChild(para);
    var ta = K.nodo('<textarea class="rv-editor__ta of-ta" rows="6" maxlength="' + TOPE + '" placeholder="Escribe qué necesitas que haga el contratista…"></textarea>');
    cuerpo.appendChild(ta);
    var cuenta = K.nodo('<p class="of-cuenta">0 / ' + TOPE + '</p>');
    cuerpo.appendChild(cuenta);
    ta.addEventListener('input', function () { cuenta.textContent = ta.value.length + ' / ' + TOPE; });
    var rap = (DATA && DATA.rapidos) || [];
    if (rap.length) {
      cuerpo.appendChild(K.nodo('<p class="of-rapidos__t">Textos rápidos · toca uno para usarlo</p>'));
      var zr = K.nodo('<div class="of-rapidos"></div>');
      rap.forEach(function (tx) {
        var b = K.nodo('<button type="button" class="of-rapido"></button>');
        b.textContent = tx;
        b.addEventListener('click', function () {
          ta.value = ta.value.trim() ? (ta.value.trim() + '\n' + tx) : tx;
          ta.dispatchEvent(new Event('input'));
          ta.focus();
        });
        zr.appendChild(b);
      });
      cuerpo.appendChild(zr);
    }
    cuerpo.appendChild(K.nodo('<p class="formulario__nota">' + K.icono('campana', 13) +
      ' Le llega como notificación en la app CONTRATISTA y por WhatsApp, y queda en MIS NOTIFICACIONES. Sale con tu nombre como Supervisión.</p>'));

    var m = O.modal({
      titulo: destinos.length === 1 ? 'Requerimiento' : 'Requerimiento a ' + destinos.length + ' contratistas',
      cuerpo: cuerpo, ancha: true,
      botones: [
        { texto: 'Cancelar', al: function () { m.cerrar(); } },
        { texto: 'Enviar', icono: 'enviar', marca: true, al: enviar }
      ]
    });
    setTimeout(function () { ta.focus(); }, 120);

    function enviar() {
      var texto = ta.value.replace(/\r/g, '').trim();
      if (texto.length < 8) { K.aviso('Escribe el requerimiento (mínimo 8 caracteres).', 'aviso', 4000); ta.focus(); return; }
      if (K.ocupado) return;
      K.ocupado = true;
      m.botones.forEach(function (x) { x.disabled = true; });
      K.piezas.guardado.mientras(K.pedir('requerimientoEnviar', { texto: texto, destinos: destinos.map(function (f) { return f.id; }) }, { ms: 120000 }), {
        titulo: destinos.length === 1 ? 'Enviando el requerimiento' : 'Enviando ' + destinos.length + ' requerimientos',
        sub: 'No cierres la app.',
        pasos: ['Guardando…', 'Avisando al contratista…', 'Listo'],
        listo: { titulo: 'Requerimiento enviado', paso: 'Guardado y avisado' }
      }).then(function (r) {
        K.ocupado = false;
        if (r && r.lista) recibir({ lista: r.lista, rapidos: DATA.rapidos, yo: DATA.yo, tope: DATA.tope });
        var malos = ((r && r.enviados) || []).filter(function (x) { return !x.ok; });
        if (malos.length) {
          K.aviso('Quedó guardado, pero el aviso no salió para ' + malos.map(function (x) { return O.nombre(x.nombre); }).join(', ') + '. Revisa el historial.', 'aviso', 10000);
        }
        m.cerrar();
        if (alTerminar) alTerminar();
        if (vista._repintar) vista._repintar();
      }, function (e) {
        K.ocupado = false;
        m.botones.forEach(function (x) { x.disabled = false; });
        K.aviso((e && e.message) || 'No se pudo enviar.', 'malo', 9000);
      });
    }
  }

  window.REQS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    redactar: redactar,   /* 6.3: desde la tarjeta y la ficha del contratista */
    olvidar: function () { DATA = null; SEL = {}; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; },
    _porContrato: porContrato
  };
}());
