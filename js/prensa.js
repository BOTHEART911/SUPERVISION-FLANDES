/* ============================================================
   SUPERVISION-FLANDES · SOLICITUD A PRENSA
   Ecosistema Flandes · Fase 6, entrega 6.1

     #/prensa[/nueva]

   Es el formulario de CONTRATISTA-FLANDES (4.8) con las reglas de
   Supervisión (dictadas por Oss el 23/09/2026):
     · SIN restricción de antelación: la entrega o publicación puede ser
       hoy mismo (en Contratista son 3 días). Lo único que no se deja es
       una fecha que ya pasó, porque no significa nada.
     · El calendario institucional NO va (se suprimió en todas las apps).
     · Quien pide es el supervisor (o el revisor), no un contrato: la
       secretaría se elige entre las de SU supervisión, la más usada
       primero.
   La regla la hace cumplir el SERVIDOR (SUPERVISION.prensaSolicitar);
   aquí solo se ayuda para no viajar con algo que va a volver.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var P = null;              /* lo último que respondió prensaEstado */
  var FILTRO = '';

  function app() { return C.app || K.id('app'); }

  function iso(dmy) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dmy || ''));
    return m ? (m[3] + '-' + m[2] + '-' + m[1]) : '';
  }

  function campo(etiqueta, ayuda, control, obligatorio) {
    var c = K.nodo('<label class="campo"><span>' + K.esc(etiqueta) + (obligatorio ? ' <i class="tr-oblig" aria-hidden="true">*</i>' : '') + '</span></label>');
    c.appendChild(control);
    if (ayuda) c.appendChild(K.nodo('<p class="campo__ayuda">' + ayuda + '</p>'));
    return c;
  }

  function estadoTono(e) {
    e = K.norm(e);
    if (e === 'REALIZADA') return 'ok';
    if (e === 'EN PROCESO' || e === 'ASIGNADA') return 'info';
    if (e === 'RECHAZADA' || e === 'ANULADA') return 'malo';
    return 'aviso';
  }
  function estadoTexto(e) {
    return { 'PENDIENTE': 'Recibida', 'EN PROCESO': 'En proceso', 'REALIZADA': 'Realizada' }[K.norm(e)] ||
      (String(e || '').charAt(0) + String(e || '').slice(1).toLowerCase());
  }
  function pasos(estado) {
    var n = { 'PENDIENTE': 1, 'EN PROCESO': 2, 'REALIZADA': 3 }[K.norm(estado)] || 1;
    return '<ol class="tr-pasos" aria-label="En qué va">' +
      ['Recibida', 'En proceso', 'Realizada'].map(function (t, i) {
        var cl = i + 1 < n ? ' tr-paso--hecho' : (i + 1 === n ? ' tr-paso--actual' : '');
        return '<li class="tr-paso' + cl + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><i></i>' + t + '</li>';
      }).join('') + '</ol>';
  }

  /* Los textos del CORE van sin tildes; los que se enseñan tal cual se arreglan aquí. */
  function tildes(s) {
    return String(s || '').replace(/\bdias\b/g, 'días').replace(/\bpublicacion\b/g, 'publicación').replace(/\bvalida\b/g, 'válida')
      .replace(/\bterminacion\b/g, 'terminación').replace(/\bdespues\b/g, 'después').replace(/\bmas\b/g, 'más')
      .replace(/\bsecretaria\b/g, 'secretaría').replace(/\blogistica\b/g, 'logística').replace(/\bpaso\b/g, 'pasó');
  }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  /* ══════════════ la vista ══════════════ */

  function vista(sub) {
    var c = K.nodo('<div class="kit-ancho vista tr"></div>');
    app().appendChild(c);
    var p = K.pedir('prensaEstado', {}, { ms: 60000 }).then(function (r) { P = r; return r; });
    K.piezas.esqueletos.mientras(c, p, { forma: 'ficha', cuantos: 2, espera: 'Trayendo tus solicitudes a Prensa' })
      .then(function () { pintar(c, sub === 'nueva'); })
      ['catch'](function (e) {
        c.appendChild(C.errorCaja ? C.errorCaja(e, function () { app().innerHTML = ''; vista(sub); }) : K.nodo('<p>' + K.esc(e.message) + '</p>'));
        K.piezas.creditos.montar(c);
      });
  }

  function pintar(c, abrirForm) {
    c.innerHTML = '';
    c.appendChild(K.nodo(
      '<section class="kit-tarjeta tr-cab">' +
      '  <span class="tr-cab__ico">' + K.icono('megafono', 24) + '</span>' +
      '  <div class="tr-cab__txt"><h2 class="tr-cab__t">SOLICITUD A PRENSA</h2>' +
      '  <p class="tr-cab__p">Pide apoyo al equipo de Comunicaciones para tu secretaría: fotos, video, piezas gráficas, perifoneo o publicación en la web. ' +
      'Desde Supervisión <b>no hay antelación mínima</b>: puedes pedirlo para hoy mismo.</p></div>' +
      '</section>'));

    var zona = K.nodo('<section class="kit-tarjeta tr-nueva"></section>');
    var boton = K.nodo('<button type="button" class="kit-btn kit-btn--marca tr-nueva__b">' + K.icono('mas', 18) + ' Nueva solicitud a Prensa</button>');
    zona.appendChild(boton);
    boton.addEventListener('click', function () {
      boton.hidden = true;
      zona.appendChild(formulario(c, function () { boton.hidden = false; }));
      zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    c.appendChild(zona);
    if (abrirForm) boton.click();

    c.appendChild(mias());
    K.piezas.creditos.montar(c);
  }

  function formulario(c, alCerrar) {
    var D = { requerimientos: [], secretaria: (P.secretarias || [])[0] || '' };
    var f = K.nodo('<form class="formulario tr-form" novalidate><h3 class="grupo__t">Nueva solicitud</h3></form>');

    var chips = K.nodo('<div class="tr-chips" role="group" aria-label="Qué necesitas"></div>');
    (P.requerimientos || []).forEach(function (r) {
      var b = K.nodo('<button type="button" class="kit-pastilla tr-chip" aria-pressed="false">' + K.icono('check', 14) + K.esc(r) + '</button>');
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        D.requerimientos = [].map.call(chips.querySelectorAll('[aria-pressed="true"]'), function (x) { return x.textContent.trim(); });
        cReq.classList.toggle('campo--ok', D.requerimientos.length > 0);
      });
      chips.appendChild(b);
    });
    var cReq = K.nodo('<div class="campo"><span>¿Qué necesitas? <i class="tr-oblig" aria-hidden="true">*</i></span></div>');
    cReq.appendChild(chips);
    cReq.appendChild(K.nodo('<p class="campo__ayuda">Elige uno o varios.</p>'));
    f.appendChild(cReq);

    var det = K.nodo('<textarea rows="5" maxlength="5000" placeholder="Objetivo, participantes, el texto que debe llevar la pieza, logos, logística…"></textarea>');
    var cuenta = K.nodo('<small class="tr-cuenta">0 caracteres</small>');
    var cDet = campo('Detalles del evento o requerimiento', 'Cuenta todo lo que prensa necesita saber. Mínimo una frase completa.', det, true);
    cDet.appendChild(cuenta);
    det.addEventListener('input', function () {
      D.detalles = det.value;
      cuenta.textContent = det.value.trim().length + ' caracteres';
      cDet.classList.toggle('campo--ok', det.value.trim().length >= 15);
    });
    f.appendChild(cDet);

    /* sin antelación: la rueda arranca HOY (P.minPublicacion es hoy) */
    var pub = K.nodo('<input type="date" data-kit-fecha data-titulo="Entrega o publicación" min="' + iso(P.minPublicacion) + '" placeholder="dd/mm/aaaa">');
    pub.addEventListener('change', function () { D.publicacion = K.fecha(pub.value); });
    f.appendChild(campo('Fecha de entrega o publicación', 'Puede ser <b>hoy</b> (' + K.esc(P.hoy) + ') o cualquier día después.', pub, true));

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Si es un evento</h3>'));
    var ev = K.nodo('<input type="text" maxlength="300" placeholder="Ej: Entrega de kits escolares en la sede El Colegio">');
    ev.addEventListener('input', function () { D.evento = ev.value; });
    f.appendChild(campo('Nombre del evento', 'Si no es un evento, déjalo vacío.', ev, false));

    var fe = K.nodo('<input type="date" data-kit-fecha data-titulo="Fecha del evento" placeholder="dd/mm/aaaa">');
    fe.addEventListener('change', function () { D.fechaEvento = K.fecha(fe.value); });
    f.appendChild(campo('Fecha del evento', '', fe, false));

    var fila = K.nodo('<div class="campo-fila"></div>');
    var hi = K.nodo('<input type="time">'), hf = K.nodo('<input type="time">');
    hi.addEventListener('input', function () { D.horaInicio = hi.value; });
    hf.addEventListener('input', function () { D.horaFin = hf.value; });
    fila.appendChild(campo('Hora de inicio', '', hi, false));
    fila.appendChild(campo('Hora de terminación', '', hf, false));
    f.appendChild(fila);

    var lug = K.nodo('<input type="text" maxlength="300" placeholder="Lugar o punto de encuentro">');
    lug.addEventListener('input', function () { D.lugar = lug.value; });
    f.appendChild(campo('Lugar', '', lug, false));

    var otr = K.nodo('<textarea rows="2" maxlength="1000" placeholder="Algo más que no esté en la lista"></textarea>');
    otr.addEventListener('input', function () { D.otros = otr.value; });
    f.appendChild(campo('Otros', '', otr, false));

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Quién lo pide</h3>'));
    f.appendChild(K.nodo('<div class="dato"><span class="dato__e">Nombre</span><span class="dato__v">' + K.esc(nombre(P.nombre)) + '</span></div>'));
    /* 7.0 · un revisor pide a nombre del supervisor: se le dice, y queda quién la registró */
    if (P.registra && K.norm(P.registra) !== K.norm(P.nombre)) {
      f.appendChild(K.nodo('<p class="formulario__nota">Sale a nombre de ' + K.esc(nombre(P.nombre)) + '. Queda registrado que la hiciste tú (' + K.esc(nombre(P.registra)) + ').</p>'));
    }
    var secs = P.secretarias || [];
    var sel = K.nodo('<select></select>');
    secs.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s; o.textContent = titulo(s);
      sel.appendChild(o);
    });
    if (!secs.length) {
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Tu usuario no tiene secretaría asignada';
      sel.appendChild(o0); sel.disabled = true;
    }
    sel.addEventListener('change', function () { D.secretaria = sel.value; });
    f.appendChild(campo('Secretaría', secs.length > 1 ? 'Las de tu supervisión; la primera es la que más contratos tiene.' : '', sel, true));

    var car = K.nodo('<input type="text" maxlength="150" placeholder="Tu cargo">');
    car.value = P.cargo || '';
    D.cargo = car.value;
    car.addEventListener('input', function () { D.cargo = car.value; });
    f.appendChild(campo('Tu cargo', P.cargo ? 'El de tu última solicitud. Cámbialo si no es el mismo.' : '', car, true));

    var pie = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var si = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">' + K.icono('enviar', 16) + ' Revisar y enviar</button>');
    pie.appendChild(no); pie.appendChild(si);
    f.appendChild(pie);
    no.addEventListener('click', function () { f.remove(); if (alCerrar) alCerrar(); });

    f.addEventListener('submit', function (evn) {
      evn.preventDefault();
      var falta = faltaDe(D);
      if (falta) { K.aviso(falta, 'aviso', 5000); return; }
      K.piezas.confirmar.abrir({
        titulo: 'Resumen de tu solicitud',
        lista: [
          ['Necesitas', D.requerimientos.join(', ')],
          ['Entrega o publicación', D.publicacion + (D.publicacion === P.hoy ? ' (hoy)' : '')],
          D.evento ? ['Evento', D.evento] : null,
          D.fechaEvento ? ['Fecha del evento', D.fechaEvento + (D.horaInicio ? ' · ' + D.horaInicio + (D.horaFin ? ' a ' + D.horaFin : '') : '')] : null,
          D.lugar ? ['Lugar', D.lugar] : null,
          ['Detalles', D.detalles.trim().length > 140 ? D.detalles.trim().slice(0, 139) + '…' : D.detalles.trim()],
          ['Secretaría', titulo(D.secretaria)],
          ['Tu cargo', String(D.cargo || '').toUpperCase()]
        ].filter(Boolean),
        nota: 'Le avisamos al grupo de Prensa. Aquí mismo vas a ver cuándo la toman y quién la atiende.',
        si: 'Enviar', no: 'Editar'
      }).then(function (ok) { if (ok) enviar(c, D); });
    });

    if (K.piezas.fechas) setTimeout(function () { K.piezas.fechas.montar(f); }, 0);
    return f;
  }

  /** Lo mismo que va a exigir el servidor, dicho antes de viajar. */
  function faltaDe(D) {
    if (!D.requerimientos.length) return 'Elige al menos una cosa que necesitas.';
    if (String(D.detalles || '').trim().length < 15) return 'Cuenta con más detalle lo que necesitas.';
    if (!D.publicacion) return 'Elige la fecha de entrega o publicación.';
    if (iso(D.publicacion) < iso(P.hoy)) return 'La fecha de entrega o publicación ya pasó.';
    if (D.horaInicio && D.horaFin && D.horaFin <= D.horaInicio) return 'La hora de terminación tiene que ser después de la de inicio.';
    if (!String(D.secretaria || '').trim()) return 'Elige la secretaría que hace la solicitud.';
    if (!String(D.cargo || '').trim()) return 'Escribe tu cargo.';
    return '';
  }

  function enviar(c, D) {
    K.ocupado = true;
    K.piezas.guardado.abrir({
      titulo: 'Enviando tu solicitud a Prensa',
      sub: 'No cierres la app hasta que termine.',
      pasos: ['Guardando la solicitud', 'Avisando al equipo de Comunicaciones', 'Terminando']
    });
    K.pedir('prensaSolicitar', {
      requerimientos: D.requerimientos, detalles: D.detalles, publicacion: D.publicacion,
      evento: D.evento || '', fechaEvento: D.fechaEvento || '', horaInicio: D.horaInicio || '', horaFin: D.horaFin || '',
      lugar: D.lugar || '', otros: D.otros || '', cargo: D.cargo || '', secretaria: D.secretaria || ''
    }, { ms: 90000 })
      .then(function (r) {
        K.ocupado = false;
        K.piezas.guardado.listo({ sub: 'Quedó con el código ' + r.codigo + '.' });
        var aviso = r && r.aviso;
        setTimeout(function () {
          if (aviso && aviso.ok === false) {
            K.piezas.confirmar.avisar({
              titulo: 'El aviso a Prensa no salió',
              texto: 'Tu solicitud ' + r.codigo + ' SÍ quedó registrada, pero el WhatsApp al grupo de Prensa no se pudo enviar.',
              nota: 'Coméntaselo al equipo de Comunicaciones para que la busquen en su app.',
              si: 'Entendido'
            });
          }
          app().innerHTML = ''; vista();
        }, 1500);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        K.aviso(tildes((e && e.message) || 'No se pudo enviar.'), 'malo', 9000);
      });
  }

  function mias() {
    var s = K.nodo('<section class="kit-tarjeta tr-mias"><h3 class="seg-sec__t">MIS SOLICITUDES</h3></section>');
    var sol = P.solicitudes || [];
    if (!sol.length) {
      s.appendChild(K.nodo('<p class="seg-nada">Todavía no le has pedido nada a Prensa desde esta app.</p>'));
      return s;
    }
    var conteos = { '': sol.length };
    sol.forEach(function (x) { conteos[x.estado] = (conteos[x.estado] || 0) + 1; });
    var ops = [{ valor: '', texto: 'Todas' }];
    ['PENDIENTE', 'EN PROCESO', 'REALIZADA'].forEach(function (e) {
      if (conteos[e]) ops.push({ valor: e, texto: estadoTexto(e) + 's', tono: estadoTono(e) === 'ok' ? 'ok' : 'aviso' });
    });
    var fil = K.nodo('<div></div>');
    s.appendChild(fil);
    var lista = K.nodo('<div class="tr-lista"></div>');
    s.appendChild(lista);
    if (FILTRO && !conteos[FILTRO]) FILTRO = '';
    var pp = K.piezas.pastillas.montar(fil, { opciones: ops, valor: FILTRO, alCambiar: function (v) { FILTRO = v || ''; pintarLista(); } });
    if (pp && pp.conteos) pp.conteos(conteos);

    function pintarLista() {
      lista.innerHTML = '';
      sol.filter(function (x) { return !FILTRO || x.estado === FILTRO; }).forEach(function (x) {
        var tono = estadoTono(x.estado);
        var d = K.nodo(
          '<details class="tr-sol tr-sol--' + tono + '">' +
          '  <summary>' +
          '    <span class="tr-sol__cab"><b>' + K.esc(x.codigo) + '</b><span class="tr-est tr-est--' + tono + '">' + K.esc(estadoTexto(x.estado)) + '</span></span>' +
          '    <span class="tr-sol__t">' + K.esc(x.evento || resumen(x.detalles, 90)) + '</span>' +
          '    <span class="tr-sol__meta">' + K.esc(['Pedida el ' + x.fecha, x.publicacion ? 'para el ' + x.publicacion : ''].filter(Boolean).join(' · ')) + '</span>' +
          (x.asignado ? '<span class="tr-sol__quien">' + K.icono('check', 13) + ' <span class="tr-sol__cara"></span>La atiende ' + K.esc(nombre(x.asignado)) + '</span>' : '') +
          '  </summary>' +
          '  <div class="tr-sol__cuerpo">' + pasos(x.estado) +
          '    <div class="tr-chips tr-chips--quietas">' + (x.requerimientos || []).map(function (r) { return '<span class="kit-pastilla">' + K.esc(r) + '</span>'; }).join('') + '</div>' +
          '    <p class="tr-sol__det">' + K.esc(x.detalles).replace(/\n/g, '<br>') + '</p>' +
          '    <dl class="seg-datos">' +
          dato('Evento', x.evento) + dato('Fecha del evento', [x.fechaEvento, x.horaInicio && x.horaFin ? x.horaInicio + ' a ' + x.horaFin : x.horaInicio].filter(Boolean).join(' · ')) +
          dato('Lugar', x.lugar) + dato('Otros', x.otros) + dato('Cargo', x.cargo) +
          '    </dl>' +
          '  </div>' +
          '</details>');
        var hueco = d.querySelector('.tr-sol__cara');
        if (hueco && K.piezas.personas) hueco.appendChild(K.piezas.personas.avatar(x.asignado, { tam: 22, sinZoom: true }));
        else if (hueco) hueco.remove();
        lista.appendChild(d);
      });
    }
    pintarLista();
    return s;
  }

  function dato(t, v) {
    v = String(v || '').trim();
    return v ? '<div class="seg-dato"><dt>' + K.esc(t) + '</dt><dd>' + K.esc(v) + '</dd></div>' : '';
  }
  function resumen(t, n) {
    var s = String(t || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  }

  window.PRENSA_SUP = {
    configurar: function (o) { C = o || {}; },
    vista: vista,
    olvidar: function () { P = null; FILTRO = ''; },
    _estado: function () { return P; },
    _falta: faltaDe
  };
}());
