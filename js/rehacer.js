/* ═══════════════════════════════════════════════════════════════════
   10/10 · REHACER DOCUMENTOS e HISTORIAL DE OBSERVACIONES
   (misma pieza en SUPERVISIÓN y CONTRATACIÓN)

   · REHACER DOCUMENTOS: botón en la cabecera del detalle de la cuenta, con
     la misma lógica de ADMIN (Soporte104 + Rehacer1007 en el CORE). Lo ven
     el supervisor y los revisores (en Contratación, solo revisores: el CREADOR
     no revisa cuentas). El CORE dice si puede (D.rehacer) y por qué no
     (D.rehacer.bloqueo). Check "Conservar fecha de radicación" marcado; si
     se desmarca, los documentos salen con la fecha de hoy (antes de las
     4:00 p. m.) o del siguiente día hábil permitido.
     Se hace DE FONDO: la persona sigue revisando y se le avisa al terminar.
     Escudo desde el primer toque (no hay doble envío; el kit pone el rid).

   · HISTORIAL DE OBSERVACIONES: si la cuenta se ha devuelto (o quedó
     incompleta), arriba del detalle se ve cada vez que se le escribió al
     contratista: fecha, quién y qué. Sale de la traza de la cuenta, que ya
     viaja en el detalle (cero viajes nuevos); las devoluciones viejas de
     Contratación (antes de la 5.3) se suman cuando llega el historial.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var K = window.KIT;
  var EN_CURSO = {};   /* 'fila|informe' -> true mientras se rehace de fondo */

  function O() { return window.OFICINA; }
  function llave(cu) { return cu.fila + '|' + cu.informe; }

  function ocupado(b) {
    b.disabled = true; b.classList.add('kit-ocupado');
    b.innerHTML = K.icono('girar', 15) + ' Rehaciendo…';
  }

  /** El botón de la cabecera, o null si esta persona no rehace. */
  function boton(D, alTerminar) {
    var R = D && D.rehacer;
    if (!R) return null;
    var cu = D.cuenta;
    var b = K.nodo('<button type="button" class="ins-accion rv-cab__rehacer" title="Rehacer los documentos de la cuenta">' +
      K.icono('girar', 15) + ' Rehacer documentos</button>');
    if (R.bloqueo) { b.classList.add('rv-cab__rehacer--bloq'); b.title = R.bloqueo; }
    if (EN_CURSO[llave(cu)]) ocupado(b);
    b.addEventListener('click', function () {
      if (EN_CURSO[llave(cu)]) { K.aviso('Ya se están rehaciendo los documentos de esta cuenta. Te aviso al terminar.', 'aviso', 5000); return; }
      if (R.bloqueo) { K.aviso(R.bloqueo, 'aviso', 8000); return; }
      abrirModal(D, b, alTerminar);
    });
    return b;
  }

  function abrirModal(D, boton, alTerminar) {
    var R = D.rehacer, cu = D.cuenta;
    var sup = [];
    if (R.informeSup) sup.push('el <b>informe de supervisión</b>');
    if (R.acta) sup.push('el <b>acta de cumplimiento</b>');
    var fo = K.nodo('<div class="formulario rh-form">' +
      '<p class="formulario__nota formulario__nota--fuerte">Cuenta ' + K.esc(cu.informe) + ' · ' + K.esc(cu.estado || '') +
      '. Se vuelven a generar los <b>documentos combinados</b> de su carpeta (actividades, evidencias, exoneración y equivalente a factura, los que le toquen)' +
      (sup.length ? ' y ' + sup.join(' y ') + ' (a nombre del supervisor del contrato, con el mismo enlace)' : '') +
      ' con los datos que hay <b>hoy</b> en la hoja. Los anteriores se reemplazan. La cuenta no cambia de estado.</p>' +
      '<label class="campo"><span>Motivo (queda en la traza de la cuenta y en la bitácora)</span>' +
      '<textarea rows="3" maxlength="500" placeholder="Ej: el contratista corrigió el valor de la planilla"></textarea></label>' +
      '<label class="op-check cf-sw rh-fecha"><input type="checkbox" checked><span>Conservar fecha de radicación' +
      (R.fecha ? ' (' + K.esc(R.fecha) + ')' : '') + '</span></label>' +
      '<p class="formulario__nota rh-fecha__n" hidden></p>' +
      '<p class="formulario__nota">Se hace <b>de fondo</b>: puedes seguir revisando y te aviso cuando quede listo.</p></div>');
    var txt = fo.querySelector('textarea'), ch = fo.querySelector('input[type=checkbox]'), nota = fo.querySelector('.rh-fecha__n');
    ch.addEventListener('change', function () {
      nota.hidden = ch.checked;
      nota.innerHTML = R.fechaHoy
        ? 'Los documentos saldrán con fecha de radicación <b>' + K.esc(R.fechaHoy) + '</b> (hoy antes de las 4:00 p. m.; si no, el siguiente día hábil, sin los últimos días del mes configurados). La fecha también cambia en la hoja.'
        : 'Hoy no hay fecha de radicación disponible: deja marcada la casilla.';
    });
    var m = O().modal({ titulo: 'Rehacer documentos · cuenta ' + cu.informe, cuerpo: fo,
      botones: [{ texto: 'Cancelar', al: function () { m.cerrar(); } }, { texto: 'Rehacer', icono: 'girar', marca: true, al: function () {
        var mot = txt.value.trim();
        if (mot.length < 5) { txt.focus(); K.aviso('Escribe el motivo.', 'aviso', 4000); return; }
        if (!ch.checked && !R.fechaHoy) { K.aviso('Hoy no hay fecha de radicación disponible: deja marcada la casilla.', 'aviso', 6000); return; }
        var k = llave(cu);
        if (EN_CURSO[k]) return;
        EN_CURSO[k] = true;                 /* escudo desde el primer toque */
        m.botones[1].disabled = true;
        ocupado(boton);
        var p = K.pedir('documentosRehacer', { fila: cu.fila, idContrato: cu.idContrato, informe: cu.informe,
          motivo: mot, conservarFecha: ch.checked }, { ms: 330000 });
        m.cerrar();
        K.aviso('Rehaciendo los documentos de la cuenta ' + cu.informe + '. Puedes seguir revisando: te aviso al terminar.', 'ok', 6000);
        p.then(function (r) {
          delete EN_CURSO[k];
          if (boton.isConnected) { boton.disabled = false; boton.classList.remove('kit-ocupado'); boton.innerHTML = K.icono('girar', 15) + ' Rehacer documentos'; }
          K.aviso('Cuenta ' + cu.informe + ': se rehicieron ' + r.documentos.length + (r.documentos.length === 1 ? ' documento' : ' documentos') +
            ' (' + r.documentos.join(', ') + ')' + (r.fechaCambio ? ' con fecha de radicación ' + r.fechaRadicacion : '') +
            (r.errores && r.errores.length ? '. No salieron: ' + r.errores.join(' · ') : '.'), r.errores && r.errores.length ? 'aviso' : 'ok', 12000);
          if (alTerminar) alTerminar(r);
        }, function (e) {
          delete EN_CURSO[k];
          if (boton.isConnected) { boton.disabled = false; boton.classList.remove('kit-ocupado'); boton.innerHTML = K.icono('girar', 15) + ' Rehacer documentos'; }
          K.aviso('Cuenta ' + cu.informe + ': ' + ((e && e.message) || 'no se pudieron rehacer los documentos.'), 'malo', 12000);
        });
      } }] });
    setTimeout(function () { txt.focus(); }, 120);
  }

  /* ---------- historial de observaciones ---------- */

  function clave(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/.exec(String(f || ''));
    return m ? Number(m[3] + m[2] + m[1] + (m[4] || '00') + (m[5] || '00')) : 0;
  }

  /** Las veces que se le escribió al contratista al devolver o dejar incompleta. */
  function observaciones(D) {
    var t = (D && D.traza) || {}, out = [], ya = {};
    (t.lineas || []).forEach(function (x) {
      var e = String(x.estado || '').toUpperCase();
      if (e !== 'DEVUELTA' && e !== 'INCOMPLETA') return;
      var q = String(x.quien || ''), aNombre = '';
      var mm = /^(.*), a nombre de (.*)$/.exec(q);
      if (mm) { q = mm[2]; aNombre = mm[1]; }
      ya[String(x.fecha).slice(0, 10) + '|' + e] = true;
      out.push({ f: x.fecha, e: e, q: q, r: aNombre, m: /^Sin observaciones$/.test(x.texto || '') ? '' : (x.texto || '') });
    });
    (t.eventos || []).forEach(function (x) {
      var e = String(x.estado || '').toUpperCase();
      if (e !== 'DEVUELTA' && e !== 'INCOMPLETA') return;
      if (ya[String(x.fecha).slice(0, 10) + '|' + e]) return;
      out.push({ f: x.fecha, e: e, q: x.quien, r: x.revisor, m: x.motivo || '' });
    });
    out.sort(function (a, b) { return clave(b.f) - clave(a.f); });   /* la más reciente arriba */
    return out;
  }

  /** La tarjeta, o null si la cuenta nunca se devolvió. */
  function historial(D, nombre) {
    var lista = observaciones(D);
    if (!lista.length) return null;
    nombre = nombre || function (s) { return s; };
    var n = lista.length;
    var d = K.nodo('<details class="kit-tarjeta grupo rh-hist"><summary>' + K.icono('reloj', 16) +
      ' <b>Historial de observaciones al contratista</b> · ' + n + (n === 1 ? ' vez' : ' veces') + '</summary></details>');
    d.open = !!(D.cuenta && (D.cuenta.porRevisar || D.cuenta.enPlan));
    d.appendChild(K.nodo('<p class="formulario__nota">Lo que se le envió cada vez que la cuenta se devolvió o quedó incompleta, la más reciente primero.</p>'));
    var ol = K.nodo('<ol class="rv-linea rh-hist__l"></ol>');
    lista.forEach(function (x) {
      var li = K.nodo('<li class="rv-linea__i rv-linea__i--malo"><p class="rv-linea__t"><b></b> · <span></span></p><p class="rv-linea__q"></p></li>');
      li.querySelector('b').textContent = x.e;
      li.querySelector('span').textContent = x.f || '';
      li.querySelector('.rv-linea__q').textContent = nombre(x.q || '') + (x.r && K.norm(x.r) !== K.norm(x.q) ? ' (revisó ' + nombre(x.r) + ')' : '');
      if (x.m) { var p = K.nodo('<p class="rv-linea__m"></p>'); p.textContent = x.m; li.appendChild(p); }
      ol.appendChild(li);
    });
    d.appendChild(ol);
    return d;
  }

  window.REHACER = { boton: boton, historial: historial, observaciones: observaciones };
})();
