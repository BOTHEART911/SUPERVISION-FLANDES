/* ============================================================
   SUPERVISION-FLANDES · PIEZAS DE LAS VISTAS DE OFICINA (6.3, las mismas de CONTRATACIÓN 5.4)
   Lo que comparten REQUERIMIENTOS, COMUNICADOS y REPORTE: la cabecera,
   la barra de búsqueda con Refrescar, la hoja modal y el formato de
   nombres y fechas. Mismo aspecto que CONTRATISTAS y REVISAR CUENTAS.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;

  /* Lo que solo LEE se reintenta una vez si la redirección de Google llega
     vencida (5.3.1). Lo que escribe no se reintenta nunca. */
  function leer(accion, datos, veces) {
    return K.pedir(accion, datos || {}, { ms: 60000 })['catch'](function (e) {
      var red = e && (e.codigo === 'RESPUESTA_NO_JSON' || e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO');
      if (red && (veces || 0) < 1) return leer(accion, datos, (veces || 0) + 1);
      throw e;
    });
  }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  function horaCorta(d) {
    if (!d) return '';
    var h = d.getHours(), mi = ('0' + d.getMinutes()).slice(-2);
    return (h % 12 || 12) + ':' + mi + (h < 12 ? ' a. m.' : ' p. m.');
  }

  /** 'aaaa-mm-dd' → 'dd/mm/aaaa' */
  function fecha(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }

  /** 'aaaa-mm-dd' → 'hoy', 'ayer', 'hace 5 días' o la fecha. */
  function cuando(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var n = Math.round((hoy - d) / 864e5);
    if (n === 0) return 'hoy';
    if (n === 1) return 'ayer';
    if (n > 1 && n < 7) return 'hace ' + n + ' días';
    return fecha(iso);
  }

  function isoDe(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function cabecera(caja, icono, t, p) {
    caja.appendChild(K.nodo(
      '<header class="ct-cab">' +
      '  <span class="ct-cab__ico">' + K.icono(icono, 22) + '</span>' +
      '  <div><h2 class="ct-cab__t">' + K.esc(t) + '</h2>' +
      '  <p class="ct-cab__p">' + p + '</p></div>' +
      '</header>'));
  }

  /** Buscador + Refrescar. alRefrescar devuelve una promesa. */
  function barra(o) {
    var caja = K.nodo('<div class="ct-barra-bus"></div>');
    var buscar = K.nodo('<label class="ins-buscar">' + K.icono('buscar', 18) +
      '<input type="search" autocomplete="off" enterkeyhint="search"></label>');
    var inp = buscar.querySelector('input');
    inp.placeholder = o.placeholder || 'Buscar';
    inp.setAttribute('aria-label', o.placeholder || 'Buscar');
    inp.value = o.valor || '';
    var rec = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar" aria-label="Refrescar" title="Refrescar">' +
      K.icono('recargar', 18) + '<span class="kit-oculto">Refrescar</span></button>');
    caja.appendChild(buscar);
    caja.appendChild(rec);
    inp.addEventListener('input', K.debounce(function () { o.alBuscar(inp.value.trim()); }, 140));
    rec.addEventListener('click', function () {
      rec.disabled = true;
      rec.classList.add('kit-ocupado');
      Promise.resolve(o.alRefrescar()).then(function () { K.aviso('Al día.', 'ok', 2000); },
        function (e) { K.aviso((e && e.message) || 'No se pudo refrescar.', 'malo', 6000); })
        .then(function () { rec.disabled = false; rec.classList.remove('kit-ocupado'); });
    });
    return { caja: caja, inp: inp, boton: rec };
  }

  function marcar(zona, valor) {
    zona.querySelectorAll('.kit-pastilla').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-valor') === (valor || '') ? 'true' : 'false');
    });
  }

  /** La hoja modal de la app (misma de REVISAR CUENTAS). */
  function modal(o) {
    var capa = K.nodo('<div class="rv-modal" role="dialog" aria-modal="true"><div class="rv-modal__velo"></div>' +
      '<div class="rv-modal__caja' + (o.ancha ? ' rv-modal__caja--ancha' : '') + '"><header class="rv-modal__cab"><h3></h3>' +
      '<button type="button" class="rv-modal__x" aria-label="Cerrar">' + K.icono('cerrar', 18) + '</button></header>' +
      '<div class="rv-modal__cuerpo"></div><footer class="rv-modal__pie"></footer></div></div>');
    capa.querySelector('h3').textContent = o.titulo || '';
    capa.querySelector('.rv-modal__cuerpo').appendChild(o.cuerpo);
    var botones = (o.botones || []).map(function (b) {
      var x = K.nodo('<button type="button" class="kit-btn' + (b.marca ? ' kit-btn--marca' : ' kit-btn--plano') + '"></button>');
      x.innerHTML = (b.icono ? K.icono(b.icono, 16) + ' ' : '') + K.esc(b.texto);
      x.addEventListener('click', b.al);
      capa.querySelector('.rv-modal__pie').appendChild(x);
      return x;
    });
    function cerrar() {
      if (capa.__cerrada) return;
      capa.__cerrada = true;
      document.removeEventListener('keydown', tecla);
      if (o.alCerrar) { try { o.alCerrar(); } catch (e) {} }
      capa.classList.remove('rv-modal--on');
      setTimeout(function () { if (capa.parentNode) capa.parentNode.removeChild(capa); }, 180);
    }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    capa.querySelector('.rv-modal__velo').addEventListener('click', cerrar);
    capa.querySelector('.rv-modal__x').addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla);
    document.body.appendChild(capa);
    requestAnimationFrame(function () { capa.classList.add('rv-modal--on'); });
    return { cerrar: cerrar, botones: botones, capa: capa };
  }

  /** Texto con enlaces tocables, sin meter HTML de nadie. */
  function conEnlaces(texto) {
    var out = [], ultimo = 0, re = /https?:\/\/[^\s<>"']+/gi, m;
    var s = String(texto || '');
    while ((m = re.exec(s))) {
      var url = m[0].replace(/[.,;:)\]]+$/, '');
      out.push(K.esc(s.slice(ultimo, m.index)));
      out.push('<a href="' + K.esc(url) + '" target="_blank" rel="noopener">' + K.esc(url) + '</a>');
      ultimo = m.index + url.length;
    }
    out.push(K.esc(s.slice(ultimo)));
    return out.join('').replace(/\n/g, '<br>');
  }

  function vacio(texto, quitar) {
    var v = K.nodo('<div class="kit-tarjeta ct-vacio"><p></p></div>');
    v.querySelector('p').textContent = texto;
    if (quitar) {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Quitar los filtros</button>');
      b.addEventListener('click', quitar);
      v.appendChild(b);
    }
    return v;
  }

  /**
   * 6.3 · UN DOCUMENTO POR SU BOLETO. El CORE firma cada archivo (informe
   * firmado, acta, archivo del Drive de Hacienda) y los bytes salen por el
   * mismo camino rápido de la revisión (revisionPaquete): la persona no
   * necesita permisos de Drive en su teléfono. Devuelve lo que pide el visor.
   */
  var DOCS = {};
  function docPorBoleto(t, nombreDoc) {
    if (!t) return Promise.reject(new Error('Ese documento no está disponible.'));
    if (DOCS[t]) return Promise.resolve(DOCS[t]);
    return K.pedir('revisionPaquete', { docs: [{ t: t }] }, { ms: 90000 }).then(function (r) {
      var d = r && r.docs && r.docs[0];
      if (!d || d.error || !d.l1) throw new Error((d && d.error) || 'No se pudo abrir el documento.');
      var b = new Uint8Array(d.l1.length);
      for (var i = 0; i < d.l1.length; i++) b[i] = d.l1.charCodeAt(i) & 255;
      var out = { bytes: b, mime: d.mime || 'application/pdf', tipo: d.tipo || 'pdf', nombre: nombreDoc || 'documento.pdf' };
      DOCS[t] = out;
      return out;
    });
  }

  /** Abre en el visor una lista [{titulo, t, nombre, tipo}] empezando en i. */
  function verDocs(lista, i) {
    if (!K.piezas.visor) return;
    K.piezas.visor.abrir(lista.map(function (x) {
      return { titulo: x.titulo, tipo: x.tipo || 'pdf', cargar: function () { return docPorBoleto(x.t, x.nombre); } };
    }), { indice: i || 0 });
  }

  window.OFICINA = {
    leer: leer, nombre: nombre, titulo: titulo, horaCorta: horaCorta, fecha: fecha, cuando: cuando, isoDe: isoDe,
    cabecera: cabecera, barra: barra, marcar: marcar, modal: modal, conEnlaces: conEnlaces, vacio: vacio,
    docPorBoleto: docPorBoleto, verDocs: verDocs, olvidarDocs: function () { DOCS = {}; }
  };
}());
