/* ============================================================
   SUPERVISION-FLANDES · COMUNICADOS (6.3, la vista de CONTRATACIÓN 5.4)

   Qué cambia frente a la app vieja
     · Antes: un cuadro de texto y ENVIAR. Sin adjuntos, sin fecha, sin
       saber si llegó, y sin forma de quitar uno publicado por error.
     · Ahora: texto y documentos (PDF, imágenes, Word, Excel, PowerPoint;
       Office se ve como PDF en el visor), aviso por notificación a los
       teléfonos de los contratistas, fecha de publicación y RETIRAR (el
       contratista deja de verlo; el registro no se borra).
     · La lista muestra todos los comunicados de la Alcaldía, con los
       documentos en el mismo visor de la revisión. Pastillas: publicados /
       retirados / todos, y míos / de todas las oficinas. Refrescar.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'comunicados.filtro.v1';

  var DATA = null;     /* {lista, telefonos, tope} */
  var HORA = null;
  var CARGANDO = null;
  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return { estado: g.estado === undefined ? 'PUBLICADO' : g.estado, autor: g.autor || '', busca: '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, { estado: F.estado, autor: F.autor }); }

  function recibir(d) {
    DATA = d || { lista: [] };
    DATA.lista = (DATA.lista || []).map(function (c) {
      c._t = K.norm([c.emisor, c.area, c.texto, c.id].join(' ') + ' ' + (c.documentos || []).map(function (x) { return x.nombre; }).join(' '));
      return c;
    });
    HORA = new Date();
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('comunicados').then(function (d) { CARGANDO = null; recibir(d); return DATA; },
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

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'megafono', 'COMUNICADOS',
      'Lo que publiques llega como notificación a los teléfonos de los contratistas y queda en su app, con los documentos que adjuntes.');

    var nuevo = K.nodo('<button type="button" class="kit-btn kit-btn--marca of-nuevo">' + K.icono('mas', 18) + ' Nuevo comunicado</button>');
    nuevo.addEventListener('click', function () { K.vibrar(8); redactar(); });
    caja.appendChild(nuevo);

    var b = O.barra({
      placeholder: 'Texto, oficina, quién lo publicó o documento', valor: F.busca,
      alBuscar: function (q) { F.busca = q; pintar(); },
      alRefrescar: function () { return cargar(true).then(pintar); }
    });
    caja.appendChild(b.caja);
    var zA = K.nodo('<div></div>'), zB = K.nodo('<div></div>');
    caja.appendChild(zA); caja.appendChild(zB);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var rej = K.nodo('<div class="of-muro"></div>');
    caja.appendChild(rej);

    var pA = K.piezas.pastillas.montar(zA, {
      etiqueta: 'Estado', valor: F.estado,
      opciones: [{ valor: 'PUBLICADO', texto: 'Publicados', tono: 'ok' }, { valor: 'RETIRADO', texto: 'Retirados', tono: 'malo' }, { valor: '', texto: 'Todos' }],
      alCambiar: function (v) { F.estado = v; guardarFiltro(); pintar(); }
    });
    var pB = K.piezas.pastillas.montar(zB, {
      etiqueta: 'Quién', valor: F.autor,
      opciones: [{ valor: '', texto: 'Todas las oficinas' }, { valor: 'mios', texto: 'Los míos' }],
      alCambiar: function (v) { F.autor = v; guardarFiltro(); pintar(); }
    });

    function pasa(c, sin) {
      sin = sin || {};
      if (!sin.estado && F.estado && c.estado !== F.estado) return false;
      if (!sin.autor && F.autor === 'mios' && !c.mio) return false;
      return coincide(c._t, F.busca);
    }

    function pintar() {
      var L = DATA ? DATA.lista : [];
      var bE = L.filter(function (c) { return pasa(c, { estado: true }); });
      pA.conteos({ PUBLICADO: bE.filter(function (c) { return c.estado === 'PUBLICADO'; }).length,
                   RETIRADO: bE.filter(function (c) { return c.estado === 'RETIRADO'; }).length, '': bE.length });
      O.marcar(zA, F.estado);
      var bA = L.filter(function (c) { return pasa(c, { autor: true }); });
      pB.conteos({ '': bA.length, mios: bA.filter(function (c) { return c.mio; }).length });
      O.marcar(zB, F.autor);

      var filas = L.filter(function (c) { return pasa(c); });
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'comunicado' : 'comunicados') +
        (DATA && DATA.telefonos !== null && DATA.telefonos !== undefined ? ' · <span>' + K.icono('telefono', 12) + ' ' + DATA.telefonos + ' teléfonos reciben avisos</span>' : '') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      rej.innerHTML = '';
      if (!L.length) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio">' + K.icono('megafono', 30) + '<p><b>Todavía no hay comunicados.</b><br>Toca Nuevo comunicado.</p></div>'));
        return;
      }
      if (!filas.length) rej.appendChild(O.vacio('No hay comunicados con estos filtros.', function () { F.estado = ''; F.autor = ''; F.busca = ''; b.inp.value = ''; pintar(); }));
      filas.forEach(function (c) { rej.appendChild(tarjeta(c)); });
    }

    function tarjeta(c) {
      var ret = c.estado === 'RETIRADO';
      var t = K.nodo('<article class="kit-tarjeta of-com' + (ret ? ' of-com--ret' : '') + '"></article>');
      var cab = K.nodo('<div class="of-com__cab"></div>');
      if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(c.emisor, { tam: 44, foto: c.foto || '' }));
      cab.appendChild(K.nodo('<div class="of-com__quien"><b>' + K.esc(O.nombre(c.emisor) || 'Alcaldía') + '</b>' +
        '<span>' + K.esc(O.titulo(c.area)) + (c.fecha ? ' · ' + K.esc(O.cuando(c.fecha)) + (c.hora ? ' ' + K.esc(c.hora) : '') : '') + '</span></div>'));
      if (ret) cab.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado of-estado--malo">RETIRADO</span>'));
      else if (c.mio) cab.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado of-estado--ok">TUYO</span>'));
      t.appendChild(cab);
      if (c.texto) t.appendChild(K.nodo('<p class="of-com__txt">' + O.conEnlaces(c.texto) + '</p>'));
      var docs = c.documentos || [];
      if (docs.length) {
        var z = K.nodo('<div class="of-com__docs"></div>');
        docs.forEach(function (d, i) {
          var x = K.nodo('<button type="button" class="of-doc">' + K.icono(d.tipo === 'imagen' ? 'imagen' : (d.tipo === 'pdf' ? 'pdf' : 'documento'), 16) +
            '<span></span><small>' + K.esc(K.piezas.adjuntos ? K.piezas.adjuntos.pesoLegible(d.bytes || 0) : '') + '</small></button>');
          x.querySelector('span').textContent = d.nombre;
          x.addEventListener('click', function () { verDocs(c, i); });
          z.appendChild(x);
        });
        t.appendChild(z);
      }
      if (c.mio || puedeTodo()) {
        var a = K.nodo('<div class="ct-acc"></div>');
        var bt = K.nodo('<button type="button" class="kit-btn kit-btn--plano' + (ret ? '' : ' kit-btn--malo') + '">' +
          K.icono(ret ? 'recargar' : 'prohibido', 15) + (ret ? ' Volver a publicar' : ' Retirar') + '</button>');
        bt.addEventListener('click', function () { retirar(c, !ret); });
        a.appendChild(bt);
        t.appendChild(a);
      }
      return t;
    }

    function retirar(c, quitar) {
      K.piezas.confirmar.abrir({
        titulo: quitar ? '¿Retirar este comunicado?' : '¿Volver a publicarlo?',
        texto: quitar ? 'Los contratistas dejan de verlo en su app. No se borra: lo puedes volver a publicar.'
                      : 'Los contratistas lo vuelven a ver en su app (no se manda otra notificación).',
        si: quitar ? 'Retirar' : 'Publicar', no: 'Cancelar'
      }).then(function (ok) {
        if (!ok) return;
        K.pedir('comunicadoRetirar', { id: c.id, volver: !quitar }, { ms: 60000 }).then(function (r) {
          c.estado = r.estado;
          K.aviso(quitar ? 'Comunicado retirado.' : 'Comunicado publicado de nuevo.', 'ok', 2500);
          pintar();
        }, function (e) { K.aviso((e && e.message) || 'No se pudo cambiar.', 'malo', 6000); });
      });
    }

    K.piezas.esqueletos.mientras(rej, cargar(false), { forma: 'tarjetas', cuantos: 3 })
      .then(pintar)['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
    vista._repintar = pintar;
  }

  function puedeTodo() { return C.puede && C.esDev && C.esDev(); }

  function verDocs(c, i) {
    if (!K.piezas.visor) return;
    K.piezas.visor.abrir((c.documentos || []).map(function (d) {
      return { titulo: d.nombre, tipo: d.tipo === 'office' ? 'pdf' : (d.tipo === 'otro' ? undefined : d.tipo),
               cargar: function () { return O.leer('comunicadoDocumento', { id: c.id, n: d.n }); } };
    }), { indice: i || 0 });
  }

  /* ══════════════ redactar ══════════════ */

  function redactar() {
    var tope = (DATA && DATA.tope) || { archivos: 5, mb: 15 };
    var cuerpo = K.nodo('<div class="of-redactar"></div>');
    var ta = K.nodo('<textarea class="rv-editor__ta of-ta" rows="7" maxlength="4000" placeholder="Escribe el comunicado. Los enlaces (https://…) se podrán tocar."></textarea>');
    cuerpo.appendChild(ta);
    var cuenta = K.nodo('<p class="of-cuenta">0 / 4000</p>');
    cuerpo.appendChild(cuenta);
    ta.addEventListener('input', function () { cuenta.textContent = ta.value.length + ' / 4000'; });
    cuerpo.appendChild(K.nodo('<p class="of-rapidos__t">Documentos (opcional) · hasta ' + tope.archivos + ', de ' + tope.mb + ' MB cada uno</p>'));
    var zona = K.nodo('<div class="of-adjuntos"></div>');
    cuerpo.appendChild(zona);
    var adj = K.piezas.adjuntos ? K.piezas.adjuntos.montar(zona, {
      acepta: 'application/pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx',
      varios: true, maximo: tope.archivos, maximoMB: tope.mb
    }) : null;
    var n = DATA && DATA.telefonos;
    var chk = K.nodo('<label class="of-check"><input type="checkbox" checked><span>Avisar a los contratistas con una notificación' +
      (n ? ' (' + n + ' teléfonos)' : '') + '</span></label>');
    cuerpo.appendChild(chk);

    var m = O.modal({
      titulo: 'Nuevo comunicado', cuerpo: cuerpo, ancha: true,
      botones: [
        { texto: 'Cancelar', al: function () { m.cerrar(); } },
        { texto: 'Publicar', icono: 'megafono', marca: true, al: publicar }
      ]
    });
    setTimeout(function () { ta.focus(); }, 120);

    function publicar() {
      var texto = ta.value.replace(/\r/g, '').trim();
      var archivos = adj ? adj.archivos() : [];
      if (!texto && !archivos.length) { K.aviso('Escribe el comunicado o adjunta un documento.', 'aviso', 4000); ta.focus(); return; }
      var avisar = chk.querySelector('input').checked;
      K.piezas.confirmar.abrir({
        titulo: 'Publicar el comunicado',
        lista: [
          ['Texto', texto ? (texto.length > 80 ? texto.slice(0, 80) + '…' : texto) : '(solo documentos)'],
          ['Documentos', archivos.length ? archivos.map(function (f) { return f.name; }).join(', ') : 'ninguno'],
          ['Aviso', avisar ? 'Notificación a los contratistas' : 'Sin notificación']
        ],
        si: 'Publicar', no: 'Revisar'
      }).then(function (ok) {
        if (!ok || K.ocupado) return;
        K.ocupado = true;
        var trae = adj ? adj.aBase64() : Promise.resolve([]);
        var envio = trae.then(function (lista) {
          return K.pedir('comunicadoPublicar', {
            texto: texto, avisar: avisar,
            archivos: lista.map(function (a) { return { nombre: a.nombre, mime: a.tipo, base64: a.datos }; })
          }, { ms: 120000 });
        });
        K.piezas.guardado.mientras(envio, {
          titulo: 'Publicando el comunicado', sub: 'No cierres la app.',
          pasos: ['Subiendo los documentos…', 'Guardando…', 'Avisando a los contratistas…'],
          listo: { titulo: 'Comunicado publicado', paso: 'Ya lo pueden ver' }
        }).then(function (r) {
          K.ocupado = false;
          m.cerrar();
          var av = r && r.aviso;
          if (avisar && av && av.error) K.aviso('Quedó publicado, pero la notificación no salió: ' + av.error, 'aviso', 9000);
          F.estado = 'PUBLICADO'; guardarFiltro();
          return cargar(true).then(function () { if (vista._repintar) vista._repintar(); });
        }, function (e) {
          K.ocupado = false;
          K.aviso((e && e.message) || 'No se pudo publicar.', 'malo', 9000);
        });
      });
    }
  }

  window.COMUS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATA = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; }
  };
}());
