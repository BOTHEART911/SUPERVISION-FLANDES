/* ============================================================
   CUENTAS ATRASADAS · SUPERVISIÓN y ADMIN (mismo archivo en las dos)
   Ecosistema Flandes · Fase 10 · entrega 10.5

   LA REGLA: el contratista presenta la cuenta al supervisor dentro de
   los N días hábiles (5 de fábrica, lo cambia ADMIN) siguientes al fin
   del periodo. Si no, está ATRASADA. Los festivos son los del CORE.

   SUPERVISIÓN
     · En el inicio, un bloque con los atrasados de SU alcance (el
       supervisor, lo suyo; el REVISOR, lo de su supervisor o secretaría)
       y el botón COMPARTIR: abre el compartir del propio teléfono o
       computador con la lista ya escrita. Quien comparte escoge a quién.
       La app no manda nada por su cuenta, ni por el bot ni a un grupo.
     · La vista CUENTAS ATRASADAS con la lista completa, filtros, PDF por
       bloques, Excel e Insights.
     · Los datos llegan DENTRO de 'cuentas', que el inicio ya pedía: cero
       viajes nuevos al servidor.

   ADMIN (lo mismo, de todo el ecosistema, más)
     · El aviso PUSH al contratista: UNO por cuenta atrasada, nunca se
       repite. Interruptor, hora, "Ensayar" (no manda) y "Avisar ahora".
     · Configuración: plazo en días hábiles, texto del push, encabezado y
       pie del mensaje que se comparte (con vista previa).
     · Contratos que no se cuentan (con motivo en la bitácora) y los
       contratos ACTIVOS a los que les faltan fechas o total de informes.
     · Un llamado para entrar ('atrasos') y uno por acción
       ('atrasosGuardar', 'atrasosAvisar'), cada uno devuelve la vista.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var D = null;              /* lo último que llegó: {fecha, dias, lista, compartir, supervision, ...} */
  var F = { buscar: '', sup: '', sec: '', est: '' };
  var zona = null;

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var ESTADO_T = { 'SIN INICIAR': 'Sin iniciar', BORRADOR: 'En borrador', 'EN PROCESO': 'En proceso', INGRESADA: 'Lista sin reportar', 'SIN ESTADO': 'Sin estado' };

  function esAdmin() { return C.modo === 'ADMIN'; }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function secNombre(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function lista() { return (D && D.lista) || []; }
  /** 'Supervisión de DAMARA LEAL' -> 'Supervisión de Damara Leal'; 'SECRETARÍA DE HACIENDA' -> 'Secretaría de Hacienda' */
  function supTxt() {
    var t = String((D && D.supervision) || '');
    var m = /^Supervisión de (.+)$/.exec(t);
    if (m) return 'Supervisión de ' + nombre(m[1]);
    return /^SECRETAR/i.test(t) ? secNombre(t) : t;
  }
  function corto(f) { return String(f || '').slice(0, 5); }
  function fechaLarga(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(f || ''));
    if (!m) return String(f || '');
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    return DIAS[d.getDay()] + ' ' + (+m[1]) + ' de ' + MESES[+m[2] - 1] + ' de ' + m[3];
  }
  function dias(n) { return n + (n === 1 ? ' día hábil' : ' días hábiles'); }
  function tono(x) { return x.dias > 20 ? 'malo' : (x.dias > 5 ? 'aviso' : 'info'); }
  function rellenar(t, d) {
    return String(t || '').replace(/\{(\w+)\}/g, function (a, k) { return d[k] === undefined || d[k] === null ? '' : String(d[k]); });
  }

  function filtradas() {
    var q = K.norm(F.buscar);
    return lista().filter(function (x) {
      if (F.sup && K.norm(x.sup) !== F.sup) return false;
      if (F.sec && K.norm(x.sec) !== F.sec) return false;
      if (F.est && x.estado !== F.est) return false;
      if (q && K.norm([x.nombre, x.doc, x.id, x.contrato, x.sup, x.sec].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
  }

  /* ══════════════ el texto que se comparte ══════════════ */

  /**
   * Lo que sale por el botón COMPARTIR. Se arma aquí con el encabezado y el
   * pie que dejó ADMIN. Formato de WhatsApp (*negrita*), que en un correo
   * se lee igual de bien.
   */
  function textoCompartir(l, un) {
    var cfg = (D && D.compartir) || {};
    var datos = { supervision: supTxt(), fecha: fechaLarga(D && D.fecha), dias: (D && D.dias) || 5, total: l.length };
    var partes = [];
    var enc = rellenar(cfg.encabezado || '⏰ *CUENTAS ATRASADAS* · {supervision}\nCorte: {fecha}', datos).trim();
    if (enc) partes.push(enc);
    var cuerpo = l.map(function (x, i) {
      return (un ? '' : (i + 1) + '. ') + '*' + nombre(x.nombre) + '*' + (x.contrato ? ' (contrato ' + x.contrato + ')' : '') + '\n' +
        '   Cuenta ' + x.informe + ' de ' + x.total + ' · periodo ' + x.ini + ' al ' + x.fin + '\n' +
        '   Venció el ' + x.limite + ' · ' + dias(x.dias) + ' de retraso' +
        (x.pendientes > 1 ? ' · ' + x.pendientes + ' cuentas vencidas' : '');
    }).join('\n\n');
    partes.push(cuerpo);
    var pie = rellenar(cfg.pie || '', datos).trim();
    if (pie) partes.push(pie);
    return partes.join('\n\n');
  }

  function compartir(l, un, boton) {
    if (!l.length) { K.aviso('No hay nadie atrasado para compartir.', 'info', 2500); return; }
    if (!K.piezas.compartir) { K.aviso('Falta la pieza de compartir del kit.', 'malo', 4000); return; }
    if (boton) { boton.disabled = true; setTimeout(function () { boton.disabled = false; }, 900); }
    K.piezas.compartir.texto({ titulo: 'Cuentas atrasadas', texto: textoCompartir(l, un) });
  }

  /* ══════════════ piezas de la tarjeta ══════════════ */

  function tarjeta(x, o) {
    o = o || {};
    var t = K.nodo('<article class="kit-tarjeta at-tar at-tar--' + tono(x) + '"></article>');
    var cab = K.nodo('<div class="at-tar__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(x.nombre, { foto: x.img || '', tam: o.mini ? 38 : 46 }));
    var q = K.nodo('<div class="at-tar__quien"><b class="at-tar__n"></b><span class="at-tar__s"></span></div>');
    q.querySelector('b').textContent = nombre(x.nombre);
    q.querySelector('span').textContent = 'Contrato ' + (x.contrato || x.id) + (o.mini ? '' : ' · ' + nombre(x.sup));
    cab.appendChild(q);
    var dd = K.nodo('<span class="at-dias" title="Días hábiles de retraso"><b></b><small></small></span>');
    dd.querySelector('b').textContent = x.dias;
    dd.querySelector('small').textContent = x.dias === 1 ? 'día' : 'días';
    cab.appendChild(dd);
    t.appendChild(cab);

    var det = K.nodo('<p class="at-tar__det"></p>');
    det.innerHTML = K.icono('vencido', 15) + ' <span>Cuenta <b>' + x.informe + '</b> de ' + x.total + ' · periodo ' + K.esc(corto(x.ini)) + ' al ' + K.esc(x.fin) +
      ' · venció el <b>' + K.esc(x.limite) + '</b></span>';
    t.appendChild(det);

    if (!o.mini) {
      var chips = K.nodo('<div class="at-chips"></div>');
      chips.appendChild(chip(ESTADO_T[x.estado] || x.estado, x.estado === 'INGRESADA' ? 'aviso' : ''));
      if (x.pendientes > 1) chips.appendChild(chip(x.pendientes + ' cuentas vencidas', 'malo'));
      if (x.sec) chips.appendChild(chip(secNombre(x.sec), ''));
      if (x.avisado) chips.appendChild(chip((x.avisoEstado === 'ENVIADO' ? 'Push enviado ' : 'Aviso en su buzón ') + corto(x.avisado), 'ok'));
      t.appendChild(chips);

      var acc = K.nodo('<div class="at-tar__acc"></div>');
      var bC = K.nodo('<button type="button" class="kit-btn kit-btn--plano at-mini">' + K.icono('compartir', 15) + ' Compartir</button>');
      bC.addEventListener('click', function () { compartir([x], true, bC); });
      acc.appendChild(bC);
      if (esAdmin()) {
        var bF = K.nodo('<button type="button" class="kit-btn kit-btn--plano at-mini">' + K.icono('persona', 15) + ' Ficha</button>');
        bF.addEventListener('click', function () { C.irA('contratista/' + encodeURIComponent(x.id)); });
        acc.appendChild(bF);
        var bX = K.nodo('<button type="button" class="kit-btn kit-btn--plano at-mini">' + K.icono('prohibido', 15) + ' No contar</button>');
        bX.addEventListener('click', function () { excluir(x, true); });
        acc.appendChild(bX);
      }
      t.appendChild(acc);
    }
    return t;
  }

  function chip(texto, t) {
    var c = K.nodo('<span class="at-chip' + (t ? ' at-chip--' + t : '') + '"></span>');
    c.textContent = texto;
    return c;
  }

  /* ══════════════ el bloque del inicio de SUPERVISIÓN ══════════════ */

  /**
   * destino: la sección del inicio. datos: lo que vino en 'cuentas'.
   * Sin nadie atrasado se dice (es una buena noticia, no se esconde).
   */
  function inicio(destino, datos) {
    D = datos || D;
    destino.innerHTML = '';
    if (!D) return;
    var l = lista();
    var caja = K.nodo('<div class="kit-tarjeta at-ini' + (l.length ? ' at-ini--hay' : '') + '"></div>');
    var cab = K.nodo('<div class="at-ini__cab"><span class="at-ini__ico">' + K.icono(l.length ? 'vencido' : 'check', 22) + '</span>' +
      '<div><b class="at-ini__t"></b><span class="at-ini__p"></span></div></div>');
    cab.querySelector('.at-ini__t').textContent = l.length
      ? l.length + (l.length === 1 ? ' contratista con la cuenta atrasada' : ' contratistas con la cuenta atrasada')
      : 'Nadie tiene la cuenta atrasada';
    cab.querySelector('.at-ini__p').textContent = 'Plazo: ' + dias(D.dias || 5) + ' después del fin del periodo para presentarla. Corte: ' + fechaLarga(D.fecha) + '.';
    caja.appendChild(cab);
    if (l.length) {
      var ul = K.nodo('<div class="at-ini__lista"></div>');
      l.slice(0, 3).forEach(function (x) { ul.appendChild(tarjeta(x, { mini: true })); });
      caja.appendChild(ul);
      if (l.length > 3) caja.appendChild(K.nodo('<p class="formulario__nota at-ini__mas">… y ' + (l.length - 3) + ' más.</p>'));
      var acc = K.nodo('<div class="ct-acc at-ini__acc"></div>');
      var bC = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('compartir', 16) + ' Compartir la lista</button>');
      bC.addEventListener('click', function () { compartir(lista(), false, bC); });
      var bV = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('adelante', 15) + ' Ver todos</button>');
      bV.addEventListener('click', function () { C.irA('atrasos'); });
      acc.appendChild(bV); acc.appendChild(bC);
      caja.appendChild(acc);
    }
    destino.appendChild(caja);
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct at"></div>');
    C.app.appendChild(caja);
    window.OFICINA.cabecera(caja, 'vencido', 'CUENTAS ATRASADAS',
      'El contratista presenta la cuenta al supervisor dentro de los <b>días hábiles</b> siguientes al fin del periodo (sin fines de semana ni festivos). ' +
      'Si no, aparece aquí. <b>Compartir</b> abre el compartir de tu teléfono o computador con la lista escrita: tú escoges el chat, el grupo o el correo.');
    zona = K.nodo('<div class="at-zona"></div>');
    caja.appendChild(zona);
    K.piezas.creditos.montar(caja);
    var p = C.traer(false).then(function (d) { D = d; return d; });
    K.piezas.esqueletos.mientras(zona, p, { forma: 'ficha', cuantos: 3, espera: 'Cargando las cuentas atrasadas' })
      .then(function () { pintar(); if (window.AYUDA) window.AYUDA.montar('atrasos'); },
        function (e) { zona.appendChild(C.errorCaja(e)); });
  }

  function refrescar() {
    return C.traer(true).then(function (d) { D = d; pintar(); });
  }

  var zLista = null, zTotal = null;

  function pintar() {
    if (!zona || !D) return;
    zona.innerHTML = '';
    if (esAdmin()) {
      zona.appendChild(bloqueAviso());
    }

    var b = window.OFICINA.barra({ placeholder: 'Buscar por nombre, documento o contrato', valor: F.buscar,
      alBuscar: function (t) { F.buscar = t; pintarLista(); }, alRefrescar: refrescar });
    zona.appendChild(b.caja);

    zona.appendChild(cifras());

    var acc = K.nodo('<div class="ct-acc at-acc"></div>');
    var bC = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('compartir', 16) + ' Compartir</button>');
    var bP = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('pdf', 16) + ' PDF</button>');
    var bX = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('hoja', 16) + ' Excel</button>');
    bC.addEventListener('click', function () { compartir(filtradas(), false, bC); });
    bP.addEventListener('click', function () { exportar('pdf'); });
    bX.addEventListener('click', function () { exportar('xlsx'); });
    acc.appendChild(bC); acc.appendChild(bP); acc.appendChild(bX);
    zona.appendChild(acc);

    pastillas();
    zTotal = K.nodo('<p class="formulario__nota at-total"></p>');
    zona.appendChild(zTotal);
    zLista = K.nodo('<div class="kit-rejilla kit-rejilla--auto at-lista"></div>');
    zona.appendChild(zLista);
    pintarLista();

    if (esAdmin()) {
      zona.appendChild(bloqueConfig());
      if ((D.excluidos || []).length) zona.appendChild(bloqueExcluidos());
      if ((D.sinDatos || []).length) zona.appendChild(bloqueSinDatos());
      zona.appendChild(bloqueAvisos());
    }
  }

  function cifras() {
    var l = lista(), vencidas = 0, max = 0;
    l.forEach(function (x) { vencidas += x.pendientes || 1; if (x.dias > max) max = x.dias; });
    var c = K.nodo('<div class="kit-tarjeta at-cifras"></div>');
    [[l.length, l.length === 1 ? 'Contratista atrasado' : 'Contratistas atrasados'],
     [vencidas, 'Cuentas vencidas sin presentar'],
     [max, 'Días hábiles del más atrasado'],
     [esAdmin() ? (D.alDia || 0) : dias(D.dias || 5).replace(/ .*/, ''), esAdmin() ? 'Contratos al día' : 'Días hábiles de plazo']
    ].forEach(function (x) {
      var d = K.nodo('<div class="at-cifra"><b></b><span></span></div>');
      d.querySelector('b').textContent = K.numero(x[0]);
      d.querySelector('span').textContent = x[1];
      c.appendChild(d);
    });
    var p = K.nodo('<p class="formulario__nota at-corte"></p>');
    p.textContent = 'Corte: ' + fechaLarga(D.fecha) + (D.calculado ? ' · calculado ' + D.calculado.slice(-8, -3) : '') +
      (D.supervision && !esAdmin() ? ' · ' + supTxt() : '');
    c.appendChild(p);
    return c;
  }

  function pastillas() {
    var l = lista();
    function grupo(campo, fmt, todos, clave) {
      var n = {};
      l.forEach(function (x) { var k = K.norm(x[campo]); if (k) n[k] = n[k] || { t: fmt(x[campo]), c: 0 }; if (k) n[k].c++; });
      var ks = Object.keys(n);
      if (ks.length < 2) return;
      var z = K.nodo('<div class="at-pas"></div>');
      zona.appendChild(z);
      var f = K.piezas.pastillas.montar(z, {
        opciones: [{ valor: '', texto: todos }].concat(ks.sort().map(function (k) { return { valor: k, texto: n[k].t }; })),
        valor: F[clave], envuelve: true,
        alCambiar: function (v) { F[clave] = v; pintarLista(); }
      });
      var cn = { '': l.length };
      ks.forEach(function (k) { cn[k] = n[k].c; });
      if (f) f.conteos(cn);
    }
    grupo('sup', nombre, 'Todos los supervisores', 'sup');
    grupo('sec', secNombre, 'Todas las secretarías', 'sec');
    var ests = {};
    l.forEach(function (x) { ests[x.estado] = (ests[x.estado] || 0) + 1; });
    if (Object.keys(ests).length > 1) {
      var z = K.nodo('<div class="at-pas"></div>');
      zona.appendChild(z);
      var f = K.piezas.pastillas.montar(z, {
        opciones: [{ valor: '', texto: 'Cualquier estado' }].concat(Object.keys(ests).map(function (e) { return { valor: e, texto: ESTADO_T[e] || e, tono: e === 'INGRESADA' ? 'aviso' : '' }; })),
        valor: F.est, envuelve: true,
        alCambiar: function (v) { F.est = v; pintarLista(); }
      });
      ests[''] = l.length;
      if (f) f.conteos(ests);
    }
  }

  function pintarLista() {
    if (!zLista) return;
    var l = filtradas();
    zLista.innerHTML = '';
    zTotal.innerHTML = '<b>' + K.numero(l.length) + '</b> ' + (l.length === 1 ? 'contratista' : 'contratistas') +
      (l.length !== lista().length ? ' de ' + K.numero(lista().length) : '') + ' · del más atrasado al más reciente';
    if (!lista().length) {
      zLista.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio at-vacio">' + K.icono('check', 22) +
        '<p>Nadie tiene la cuenta atrasada. Todos presentaron dentro del plazo.</p></div>'));
      return;
    }
    if (!l.length) {
      zLista.appendChild(window.OFICINA.vacio('Nadie con esos filtros.', function () { F = { buscar: '', sup: '', sec: '', est: '' }; pintar(); }));
      return;
    }
    l.forEach(function (x) { zLista.appendChild(tarjeta(x)); });
  }

  /* ══════════════ PDF por bloques y Excel ══════════════ */

  function exportar(que) {
    var l = filtradas();
    if (!l.length) { K.aviso('No hay atrasados con esos filtros.', 'info', 2500); return; }
    var ex = K.piezas.exportar;
    var filas = l.map(function (x) {
      return { nombre: nombre(x.nombre), documento: x.doc, contrato: x.contrato, id: x.id, supervisor: nombre(x.sup), secretaria: secNombre(x.sec),
               cuenta: x.informe + ' de ' + x.total, informe: x.informe, total: x.total, inicio: x.ini, fin: x.fin, limite: x.limite,
               dias: x.dias, pendientes: x.pendientes, estado: ESTADO_T[x.estado] || x.estado,
               aviso: x.avisado ? (x.avisoEstado === 'ENVIADO' ? 'Push enviado el ' : 'Quedó en su buzón el ') + x.avisado : 'Sin aviso' };
    });
    var sub = 'Corte: ' + fechaLarga(D.fecha) + ' · plazo de ' + dias(D.dias || 5) + ' · ' + l.length + (l.length === 1 ? ' contratista' : ' contratistas') +
      (D.supervision && !esAdmin() ? ' · ' + supTxt() : '');
    if (que === 'xlsx') {
      ex.aExcel('Cuentas atrasadas', [
        { campo: 'nombre', titulo: 'Contratista' }, { campo: 'documento', titulo: 'Documento' }, { campo: 'contrato', titulo: 'Contrato' },
        { campo: 'id', titulo: 'ID contrato' }, { campo: 'supervisor', titulo: 'Supervisor' }, { campo: 'secretaria', titulo: 'Secretaría' },
        { campo: 'informe', titulo: 'Cuenta atrasada' }, { campo: 'total', titulo: 'Total de cuentas' }, { campo: 'inicio', titulo: 'Inicio del periodo' },
        { campo: 'fin', titulo: 'Fin del periodo' }, { campo: 'limite', titulo: 'Venció el' }, { campo: 'dias', titulo: 'Días hábiles de retraso' },
        { campo: 'pendientes', titulo: 'Cuentas vencidas' }, { campo: 'estado', titulo: 'Estado de la cuenta' }, { campo: 'aviso', titulo: 'Aviso al contratista' }
      ], filas);
      return;
    }
    ex.aPDF('Cuentas atrasadas', [
      { campo: 'cuenta', titulo: 'Cuenta atrasada' }, { campo: 'inicio', titulo: 'Inicio del periodo' }, { campo: 'fin', titulo: 'Fin del periodo' },
      { campo: 'limite', titulo: 'Venció el' }, { campo: 'dias', titulo: 'Días hábiles de retraso' }, { campo: 'pendientes', titulo: 'Cuentas vencidas' },
      { campo: 'estado', titulo: 'Estado de la cuenta' }, { campo: 'secretaria', titulo: 'Secretaría' }, { campo: 'aviso', titulo: 'Aviso al contratista' }
    ], filas, {
      subtitulo: sub,
      bloque: {
        titulo: function (f) { return f.nombre; },
        sub: function (f) { return 'Contrato ' + f.contrato + ' · ' + f.documento; },
        marca: function (f) { return f.dias + (f.dias === 1 ? ' día hábil' : ' días hábiles'); },
        tono: function (f) { return f.dias > 20 ? 'malo' : 'aviso'; }
      },
      grupo: function (f) { return 'Supervisión de ' + f.supervisor; },
      resumen: function (fs) {
        var v = 0, m = 0;
        fs.forEach(function (f) { v += f.pendientes || 1; if (f.dias > m) m = f.dias; });
        return [{ etiqueta: 'Contratistas atrasados', valor: fs.length }, { etiqueta: 'Cuentas vencidas', valor: v },
                { etiqueta: 'Días del más atrasado', valor: m }, { etiqueta: 'Plazo', valor: dias(D.dias || 5) }];
      }
    });
  }

  /* ══════════════ ADMIN: el aviso push ══════════════ */

  function seccion(icono, titulo, texto) {
    return K.nodo('<section class="kit-tarjeta grupo cf-bloque ad-bloque at-bloque"><h3 class="grupo__t">' + K.icono(icono, 16) + ' ' + K.esc(titulo) + '</h3>' +
      (texto ? '<p class="formulario__nota">' + texto + '</p>' : '') + '</section>');
  }

  function bloqueAviso() {
    var on = D.cfg && D.cfg.push && D.cfg.push.activo === true;
    var s = seccion('campana', 'AVISO AL CONTRATISTA',
      'A cada contratista atrasado le llega <b>una sola notificación push</b> por esa cuenta: no se repite nunca, salga o no. ' +
      'Si su teléfono no tiene los avisos activos, le queda en el buzón de la app. <b>No sale por WhatsApp.</b> ' +
      'Sale sola a la hora de abajo, en día hábil, con el reloj de los recordatorios.');
    var g = K.nodo('<div class="rc-estado"></div>');
    function fila(ok, icono, t, p) {
      var f = K.nodo('<div class="rc-estado__f rc-estado__f--' + (ok ? 'ok' : 'off') + '">' + K.icono(icono, 18) + '<div><b></b><span></span></div></div>');
      f.querySelector('b').textContent = t; f.querySelector('span').textContent = p;
      g.appendChild(f);
    }
    fila(on, 'campana', 'Aviso push ' + (on ? 'ENCENDIDO' : 'APAGADO'), on ? 'Sale los días hábiles a las ' + h12(D.cfg.push.hora) + '.' : 'No sale ningún aviso. Se enciende el día del paso a producción.');
    fila(D.reloj > 0, 'reloj', D.reloj > 0 ? 'Reloj instalado' : 'Reloj sin instalar', D.reloj > 0 ? 'Cada 10 minutos el CORE mira si toca.' : 'Es el mismo de los recordatorios: se instala en la Fase 11. Sin él no sale nada solo.');
    fila(!!D.pushListo, 'telefono', D.pushListo ? 'Firebase listo' : 'Firebase sin configurar', D.pushListo ? 'El CORE puede mandar notificaciones push.' : 'Sin Firebase el aviso solo queda en el buzón.');
    fila(!D.porAvisar, 'sobre', D.porAvisar ? D.porAvisar + (D.porAvisar === 1 ? ' atrasado aún sin aviso' : ' atrasados aún sin aviso') : 'Todos los atrasados ya tienen su aviso',
      D.porAvisar ? 'Les llega en el próximo envío.' : 'Nadie recibe otro.');
    s.appendChild(g);
    var acc = K.nodo('<div class="ct-acc"></div>');
    var bE = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('ojo', 15) + ' Ensayar (no manda nada)</button>');
    var bA = K.nodo('<button type="button" class="kit-btn ' + (on ? 'kit-btn--marca' : 'kit-btn--plano') + '"' + (on ? '' : ' disabled') + '>' + K.icono('enviar', 15) + ' Avisar ahora</button>');
    bE.addEventListener('click', function () { avisar(true, bE); });
    bA.addEventListener('click', function () {
      K.piezas.confirmar.preguntar({ titulo: 'Avisar ahora', texto: 'Les llega el push a ' + D.porAvisar + ' contratistas que aún no lo tienen. No se puede deshacer. ¿Seguimos?', si: 'Sí, avisar', peligro: true })
        .then(function (si) { if (si) avisar(false, bA); });
    });
    acc.appendChild(bE); acc.appendChild(bA);
    s.appendChild(acc);
    if (D.resultado) {
      var r = K.nodo('<p class="kit-tarjeta rv-aviso rv-aviso--ok at-res">' + K.icono('info', 16) + '<span></span></p>');
      r.querySelector('span').textContent = D.resultado.resumen;
      s.appendChild(r);
    }
    return s;
  }

  function h12(hm) {
    var p = String(hm || '').split(':'), h = +p[0], m = +p[1];
    if (!(h >= 0)) return hm;
    return (h % 12 || 12) + ':' + ('0' + m).slice(-2) + (h >= 12 ? ' pm' : ' am');
  }

  function avisar(ensayo, boton) {
    boton.disabled = true; boton.classList.add('kit-ocupado');
    var p = K.pedir('atrasosAvisar', { ensayo: ensayo }, { ms: 120000 });
    var q = ensayo ? p : K.piezas.guardado.mientras(p, { titulo: 'Avisando a los atrasados', sub: 'Una sola notificación push por cuenta.',
      pasos: ['Revisando quién no tiene aviso…', 'Mandando los push…', 'Anotando cada aviso…'], listo: { titulo: 'Listo', paso: 'Queda en la bitácora' } });
    q.then(function (v) {
      D = v;
      pintar();
      K.aviso(v.resultado ? v.resultado.resumen : 'Listo.', 'ok', 7000);
    }, function (e) {
      boton.disabled = false; boton.classList.remove('kit-ocupado');
      K.aviso((e && e.message) || 'No se pudo.', 'malo', 9000);
    });
  }

  /* ══════════════ ADMIN: configuración ══════════════ */

  function bloqueConfig() {
    var c = JSON.parse(JSON.stringify(D.cfg || {}));
    var pl = { titulo: (D.plantilla || {}).titulo || '', cuerpo: (D.plantilla || {}).cuerpo || '' };
    var orig = JSON.stringify({ c: c, pl: pl });
    var s = seccion('herramienta', 'CONFIGURACIÓN', 'Lo que cambies aquí vale para Supervisión y para el aviso desde el próximo cálculo. Queda en la bitácora.');

    var fila = K.nodo('<div class="at-form"></div>');
    var lD = K.nodo('<label class="op-campo"><span>Plazo en días hábiles</span><input class="ad-in" type="number" min="1" max="30" inputmode="numeric"><small class="campo__ayuda">Días hábiles después del fin del periodo para presentar la cuenta.</small></label>');
    var iD = lD.querySelector('input'); iD.value = c.diasHabiles || 5;
    iD.addEventListener('input', function () { c.diasHabiles = parseInt(iD.value, 10) || 0; cambio(); });
    fila.appendChild(lD);
    var lH = K.nodo('<label class="op-campo"><span>Hora del aviso push</span><input class="ad-in" type="time" step="300"><small class="campo__ayuda">Solo días hábiles.</small></label>');
    var iH = lH.querySelector('input'); iH.value = (c.push && c.push.hora) || '08:00';
    iH.addEventListener('change', function () { c.push = c.push || {}; c.push.hora = String(iH.value || '').slice(0, 5); cambio(); });
    fila.appendChild(lH);
    s.appendChild(fila);

    var sw = K.nodo('<label class="op-check cf-sw ad-sw ad-sw--grande"><input type="checkbox"><span></span></label>');
    var iS = sw.querySelector('input'); iS.checked = !!(c.push && c.push.activo);
    function tSw() { sw.querySelector('span').innerHTML = iS.checked ? '<b>Aviso push ENCENDIDO</b> · les llega a los contratistas de verdad' : '<b>Aviso push APAGADO</b> · no sale nada (así debe estar en la copia de trabajo)'; }
    iS.addEventListener('change', function () { c.push = c.push || {}; c.push.activo = iS.checked; tSw(); cambio(); });
    tSw();
    s.appendChild(sw);

    var sub1 = K.nodo('<div class="rc-sub"><h4>' + K.icono('campana', 15) + ' Texto del push</h4><p class="formulario__nota">Marcadores: {nombre} {contrato} {informe} {total} {periodo} {limite} {dias}. El push es corto.</p></div>');
    s.appendChild(sub1);
    var lT = K.nodo('<label class="op-campo cf-ancho"><span>Título</span><input class="ad-in" maxlength="80"></label>');
    var iT = lT.querySelector('input'); iT.value = pl.titulo;
    var lC = K.nodo('<label class="op-campo cf-ancho"><span>Texto</span><textarea class="ad-in" rows="2" maxlength="240"></textarea></label>');
    var iC = lC.querySelector('textarea'); iC.value = pl.cuerpo;
    s.appendChild(lT); s.appendChild(lC);
    var prevP = K.nodo('<div class="at-push"><span class="at-push__ico">' + K.icono('campana', 16) + '</span><div><b></b><span></span></div></div>');
    s.appendChild(prevP);
    iT.addEventListener('input', function () { pl.titulo = iT.value; cambio(); });
    iC.addEventListener('input', function () { pl.cuerpo = iC.value; cambio(); });

    var sub2 = K.nodo('<div class="rc-sub"><h4>' + K.icono('compartir', 15) + ' Mensaje que se comparte desde Supervisión</h4><p class="formulario__nota">Marcadores: {supervision} {fecha} {dias} {total}. La lista de atrasados va en medio. *texto* sale en negrita en WhatsApp.</p></div>');
    s.appendChild(sub2);
    c.compartir = c.compartir || {};
    var lE = K.nodo('<label class="op-campo cf-ancho"><span>Encabezado</span><textarea class="ad-in" rows="3" maxlength="600"></textarea></label>');
    var iE = lE.querySelector('textarea'); iE.value = c.compartir.encabezado || '';
    var lP = K.nodo('<label class="op-campo cf-ancho"><span>Pie</span><textarea class="ad-in" rows="2" maxlength="600"></textarea></label>');
    var iP = lP.querySelector('textarea'); iP.value = c.compartir.pie || '';
    s.appendChild(lE); s.appendChild(lP);
    iE.addEventListener('input', function () { c.compartir.encabezado = iE.value; cambio(); });
    iP.addEventListener('input', function () { c.compartir.pie = iP.value; cambio(); });
    var cajaW = K.nodo('<div class="rc-wa at-wa"><div class="rc-wa__globo"></div></div>');
    var prevW = cajaW.firstChild;
    s.appendChild(cajaW);

    var pie = K.nodo('<div class="ad-pie" hidden>' +
      '<label class="op-campo ad-motivo"><span>Motivo del cambio (queda en la bitácora)</span><input type="text" maxlength="300" placeholder="Opcional"></label>' +
      '<div class="ct-acc"><button type="button" class="kit-btn kit-btn--plano">' + K.icono('girar', 14) + ' Deshacer</button>' +
      '<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar</button></div></div>');
    var bs = pie.querySelectorAll('button');
    bs[0].addEventListener('click', function () { pintar(); });
    bs[1].addEventListener('click', function () {
      if (!(c.diasHabiles >= 1 && c.diasHabiles <= 30)) { K.aviso('El plazo va de 1 a 30 días hábiles.', 'aviso', 4000); return; }
      if (!String(c.compartir.encabezado || '').trim()) { K.aviso('Escribe el encabezado del mensaje.', 'aviso', 4000); return; }
      if (!pl.titulo.trim() || !pl.cuerpo.trim()) { K.aviso('El push necesita título y texto.', 'aviso', 4000); return; }
      var avisoOn = c.push && c.push.activo && !(D.cfg.push && D.cfg.push.activo);
      var seguir = avisoOn
        ? K.piezas.confirmar.preguntar({ titulo: 'Encender el aviso push', texto: 'Con el aviso encendido y el reloj instalado, a cada atrasado le llega su push DE VERDAD. En la copia de trabajo debe quedar apagado. ¿Encenderlo?', si: 'Sí, encender', peligro: true })
        : Promise.resolve(true);
      seguir.then(function (si) { if (si) guardar({ cfg: c, plantilla: pl, motivo: pie.querySelector('input').value.trim() }, bs[1]); });
    });
    s.appendChild(pie);

    function cambio() {
      prevP.querySelector(':scope > div > b').textContent = rellenar(pl.titulo, ejemplo()) || '(sin título)';
      prevP.querySelector(':scope > div > span').textContent = rellenar(pl.cuerpo, ejemplo()) || '(sin texto)';
      var guardado = D.compartir;
      D.compartir = c.compartir;
      var diasG = D.dias; D.dias = c.diasHabiles || D.dias;
      var sup0 = D.supervision; D.supervision = D.supervision || 'Supervisión de Ana Pérez';
      prevW.innerHTML = wa(textoCompartir(lista().slice(0, 2).length ? lista().slice(0, 2) : [ejemploFila()], false));
      D.compartir = guardado; D.dias = diasG; D.supervision = sup0;
      pie.hidden = JSON.stringify({ c: c, pl: pl }) === orig;
    }
    cambio();
    return s;
  }

  function ejemplo() {
    var x = lista()[0] || ejemploFila();
    return { nombre: nombre(x.nombre), contrato: x.contrato, informe: x.informe, total: x.total, periodo: x.ini + ' al ' + x.fin, limite: x.limite, dias: x.dias };
  }
  function ejemploFila() {
    return { nombre: 'ANA PÉREZ', contrato: '001', informe: 3, total: 6, ini: '01/08/2026', fin: '31/08/2026', limite: '07/09/2026', dias: 4, pendientes: 1 };
  }

  /** El formato de WhatsApp, para ver el mensaje como va a llegar. */
  function wa(texto) {
    return String(texto || '').split('\n').map(function (l) {
      return K.esc(l).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') || '&nbsp;';
    }).join('<br>');
  }

  function guardar(cuerpo, boton) {
    boton.disabled = true;
    K.piezas.guardado.mientras(K.pedir('atrasosGuardar', cuerpo, { ms: 120000 }), {
      titulo: 'Guardando las cuentas atrasadas', sub: 'Supervisión lo ve desde el próximo cálculo.',
      pasos: ['Validando en el CORE…', 'Guardando en CONFIG…', 'Recalculando los atrasados…'], listo: { titulo: 'Guardado', paso: 'Queda en la bitácora' }
    }).then(function (v) {
      if (!v.guardado) K.aviso('No había nada que cambiar.', 'info', 2500);
      D = v;
      pintar();
    }, function (e) { boton.disabled = false; K.aviso((e && e.message) || 'No se pudo guardar.', 'malo', 9000); });
  }

  /* ══════════════ ADMIN: no contar / volver a contar ══════════════ */

  function excluir(x, sacar) {
    var cuerpo = K.nodo('<div><p class="formulario__nota"></p><label class="op-campo"><span>Motivo (queda en la bitácora)</span><input class="ad-in" maxlength="300"></label></div>');
    cuerpo.querySelector('p').textContent = sacar
      ? nombre(x.nombre) + ' (' + x.id + ') deja de salir como atrasado en Supervisión y no recibe el aviso. Úsalo para un contrato suspendido o con una novedad que el cálculo no conoce.'
      : nombre(x.nombre) + ' (' + x.id + ') vuelve a contarse.';
    var m = window.OFICINA.modal({ titulo: sacar ? 'No contar este contrato' : 'Volver a contar', cuerpo: cuerpo, botones: [
      { texto: 'Cancelar', al: function () { m.cerrar(); } },
      { texto: sacar ? 'No contar' : 'Volver a contar', marca: true, icono: 'check', al: function () {
        var motivo = cuerpo.querySelector('input').value.trim();
        if (sacar && !motivo) { K.aviso('Escribe el motivo.', 'aviso', 3000); return; }
        var c = JSON.parse(JSON.stringify(D.cfg));
        c.excluir = (c.excluir || []).filter(function (i) { return K.norm(i) !== K.norm(x.id); });
        if (sacar) c.excluir.push(x.id);
        m.cerrar();
        guardar({ cfg: c, motivo: (sacar ? 'No contar ' : 'Volver a contar ') + x.id + (motivo ? ': ' + motivo : '') }, m.botones[1]);
      } }
    ] });
  }

  function bloqueExcluidos() {
    var s = seccion('prohibido', 'CONTRATOS QUE NO SE CUENTAN', 'Están atrasados según el cálculo, pero ADMIN los sacó (suspensión, novedad). No salen en Supervisión ni reciben el aviso.');
    D.excluidos.forEach(function (x) {
      var f = K.nodo('<div class="at-fila"><span></span><button type="button" class="kit-btn kit-btn--plano at-mini">' + K.icono('girar', 14) + ' Volver a contar</button></div>');
      f.querySelector('span').textContent = nombre(x.nombre) + ' · ' + x.id + ' · cuenta ' + x.informe + ' venció el ' + x.limite;
      f.querySelector('button').addEventListener('click', function () { excluir(x, false); });
      s.appendChild(f);
    });
    return s;
  }

  function bloqueSinDatos() {
    var s = seccion('aviso', 'CONTRATOS ACTIVOS SIN DATOS PARA CALCULAR',
      'Sin <b>FECHA INICIO</b>, <b>FECHA FINAL</b> o <b>TOTAL DE INFORMES</b> no se sabe cuándo vence su cuenta, así que no se inventa. Complétalos en la ficha.');
    s.classList.add('ad-bloque--alerta');
    D.sinDatos.forEach(function (x) {
      var f = K.nodo('<div class="at-fila"><span></span><button type="button" class="kit-btn kit-btn--plano at-mini">' + K.icono('persona', 14) + ' Ficha</button></div>');
      f.querySelector('span').textContent = nombre(x.nombre) + ' · ' + x.id + ' · ' + x.motivo;
      f.querySelector('button').addEventListener('click', function () { C.irA('contratista/' + encodeURIComponent(x.id)); });
      s.appendChild(f);
    });
    return s;
  }

  function bloqueAvisos() {
    var a = D.avisos || { total: 0, lista: [] };
    var s = seccion('sobre', 'AVISOS ENVIADOS', a.total ? 'Los últimos ' + a.lista.length + ' de ' + a.total + '. Cada cuenta atrasada recibe uno solo.' : 'Todavía no ha salido ningún aviso.');
    a.lista.forEach(function (x) {
      var f = K.nodo('<div class="at-fila"><span></span><em></em></div>');
      f.querySelector('span').textContent = x.fecha + ' · ' + nombre(x.nombre) + ' · cuenta ' + x.informe + ' (venció ' + x.limite + ')';
      f.querySelector('em').textContent = x.estado + (x.detalle ? ' · ' + x.detalle : '');
      f.querySelector('em').className = 'at-chip at-chip--' + (x.estado === 'ENVIADO' ? 'ok' : 'aviso');
      s.appendChild(f);
    });
    return s;
  }

  window.ATRASOS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    inicio: inicio,
    recibir: function (d) { D = d || null; },
    olvidar: function () { D = null; F = { buscar: '', sup: '', sec: '', est: '' }; },
    textoCompartir: textoCompartir,
    _datos: function () { return D; }, _filtradas: filtradas, _filtros: function () { return F; }
  };
}());
