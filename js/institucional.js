/* ============================================================
   SUPERVISION-FLANDES · INSTITUCIONAL Y PERFIL (entrega 6.3)

     #/directorio   DIRECTORIO INSTITUCIONAL (el de CONTRATISTA)
     #/drive        DRIVE DE HACIENDA
     #/perfil       MI FIRMA Y MI FOTO

   DRIVE DE HACIENDA
     La app vieja solo abría la carpeta en Google Drive, y solo para LUZ
     HAYDEE ORTEGA MAYORGA (el nombre estaba escrito en el código). Ahora
     quién la ve y qué carpeta es lo dice la llave DRIVE_HACIENDA de CONFIG
     (la cambia ADMIN). Si la cuenta del sistema puede leer la carpeta, se
     navega aquí mismo y los PDF e imágenes se abren en el visor; si no,
     se abre en Google Drive con la cuenta de la persona, como antes.

   MI FIRMA
     Es la imagen que va en el informe de supervisión y en el acta. Se
     sube una foto de la firma en papel blanco: la app le quita el fondo
     blanco, la recorta al trazo y la guarda como PNG transparente. Solo
     el SUPERVISOR (el REVISOR firma a nombre del supervisor, no con la
     suya). La foto de perfil es la misma de todas las apps.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var DIR = null;

  function caja() {
    var c = K.nodo('<div class="kit-ancho vista ct of ins"></div>');
    C.app.appendChild(c);
    return c;
  }

  /* ══════════════ DIRECTORIO ══════════════ */

  function directorio() {
    var c = caja();
    var p = DIR ? Promise.resolve(DIR) : O.leer('directorio').then(function (l) { DIR = l || []; return DIR; });
    K.piezas.esqueletos.mientras(c, p, { forma: 'filas', cuantos: 6, espera: 'Trayendo el directorio' })
      .then(function () { pintarDirectorio(c); })
      ['catch'](function (e) { c.appendChild(C.errorCaja(e, function () { DIR = null; C.app.innerHTML = ''; directorio(); })); });
  }

  function pintarDirectorio(c) {
    c.innerHTML = '';
    O.cabecera(c, 'ubicacion', 'DIRECTORIO INSTITUCIONAL',
      'Las dependencias de la Alcaldía: dónde quedan, su correo y sus líneas. Toca para escribir, llamar o llegar.');
    var b = O.barra({ placeholder: 'Buscar dependencia, dirección o correo', alBuscar: function (q) { pintar(q); },
      alRefrescar: function () { return O.leer('directorio').then(function (l) { DIR = l || []; pintar(b.inp.value); }); } });
    c.appendChild(b.caja);
    var cuenta = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    c.appendChild(cuenta);
    var lista = K.nodo('<div class="ins-dir" role="list"></div>');
    c.appendChild(lista);
    function pintar(q) {
      var n = K.norm(q || '');
      var vivos = DIR.filter(function (d) { return !n || K.norm(d.lugar + ' ' + d.direccion + ' ' + d.correo).indexOf(n) >= 0; });
      lista.innerHTML = '';
      vivos.forEach(function (d) { lista.appendChild(contacto(d)); });
      cuenta.innerHTML = '<b>' + vivos.length + '</b> ' + (vivos.length === 1 ? 'dependencia' : 'dependencias');
      if (!vivos.length) lista.appendChild(O.vacio('Nada coincide con "' + q + '".'));
    }
    pintar('');
    K.piezas.creditos.montar(c);
  }

  function contacto(d) {
    var t = K.nodo('<article role="listitem" class="kit-tarjeta ins-contacto">' +
      '<h3 class="ins-contacto__t">' + K.esc(d.lugar) + '</h3>' +
      '<p class="ins-contacto__dir">' + K.icono('ubicacion', 15) + ' ' + K.esc(d.direccion || 'Sin dirección registrada') + '</p>' +
      (d.correo ? '<p class="ins-contacto__dato">' + K.icono('sobre', 15) + ' ' + K.esc(d.correo) + '</p>' : '') +
      (d.correoMalo ? '<p class="ins-contacto__malo">' + K.icono('aviso', 15) + ' El correo registrado (' + K.esc(d.correoMalo) + ') no es válido.</p>' : '') +
      '<div class="ins-contacto__acciones"></div></article>');
    var z = t.querySelector('.ins-contacto__acciones');
    function boton(icono, texto, href, externo) {
      z.appendChild(K.nodo('<a class="ins-accion" href="' + K.esc(href) + '"' + (externo ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        K.icono(icono, 18) + '<span>' + K.esc(texto) + '</span></a>'));
    }
    if (d.ubicacion) boton('ubicacion', 'Cómo llegar', d.ubicacion, true);
    if (d.correo) boton('sobre', 'Correo', 'mailto:' + d.correo, false);
    if (d.whatsapp) boton('whatsapp', 'WhatsApp', 'https://wa.me/57' + d.whatsapp, true);
    if (d.telefono) boton('llamar', 'Llamar', 'tel:' + (d.telefono.length === 10 ? '+57' : '') + d.telefono, false);
    return t;
  }

  /* ══════════════ DRIVE DE HACIENDA ══════════════ */

  var PILA = [];      /* [{nombre, t}] la ruta de carpetas abiertas */

  function drive() {
    var c = caja();
    O.cabecera(c, 'nube', 'DRIVE DE HACIENDA',
      'La carpeta compartida de la Secretaría de Hacienda. Los PDF y las imágenes se abren aquí mismo; lo demás, en Google Drive.');
    var zona = K.nodo('<div class="dh"></div>');
    c.appendChild(zona);
    abrirCarpeta(zona, PILA.length ? PILA[PILA.length - 1] : null);
    K.piezas.creditos.montar(c);
  }

  function abrirCarpeta(zona, nodo) {
    zona.innerHTML = '';
    var p = O.leer('driveHacienda', nodo && nodo.t ? { t: nodo.t } : {});
    K.piezas.esqueletos.mientras(zona, p, { forma: 'filas', cuantos: 5, espera: 'Abriendo la carpeta' })
      .then(function (d) { pintarCarpeta(zona, d); })
      ['catch'](function (e) {
        zona.appendChild(C.errorCaja(e, function () { PILA = []; abrirCarpeta(zona, null); }));
      });
  }

  function pintarCarpeta(zona, d) {
    zona.innerHTML = '';
    var abrirDrive = K.nodo('<a class="kit-btn kit-btn--plano dh-abrir" href="' + K.esc(d.url) + '" target="_blank" rel="noopener">' +
      K.icono('abrir-pestana', 16) + ' Abrir en Google Drive</a>');
    if (d.sinAcceso) {
      var s = K.nodo('<section class="kit-tarjeta dh-sin"><img src="' + K.esc(K.medio('img/drive.webp')) + '" alt="" class="dh-sin__img">' +
        '<p><b>La carpeta se abre en Google Drive con tu cuenta.</b><br>' + K.esc(d.motivo || '') +
        '<br><small>Para navegarla aquí mismo, el dueño de la carpeta debe compartirla (como lector) con la cuenta del sistema.</small></p></section>');
      s.appendChild(abrirDrive);
      zona.appendChild(s);
      return;
    }
    var migas = K.nodo('<nav class="dh-migas" aria-label="Ruta de la carpeta"></nav>');
    var raiz = K.nodo('<button type="button" class="dh-miga">' + K.icono('nube', 14) + ' Hacienda</button>');
    raiz.addEventListener('click', function () { PILA = []; abrirCarpeta(zona, null); });
    migas.appendChild(raiz);
    PILA.forEach(function (n, i) {
      var m = K.nodo('<button type="button" class="dh-miga"></button>');
      m.textContent = '› ' + n.nombre;
      m.addEventListener('click', function () { PILA = PILA.slice(0, i + 1); abrirCarpeta(zona, n); });
      migas.appendChild(m);
    });
    zona.appendChild(migas);
    var barra = K.nodo('<div class="ct-barra-bus"></div>');
    var b = K.nodo('<label class="ins-buscar">' + K.icono('buscar', 18) + '<input type="search" placeholder="Buscar en esta carpeta" autocomplete="off"></label>');
    barra.appendChild(b);
    barra.appendChild(abrirDrive);
    zona.appendChild(barra);
    var lista = K.nodo('<div class="dh-lista" role="list"></div>');
    zona.appendChild(lista);
    var vistos = d.archivos.filter(function (a) { return a.tipo === 'pdf' || a.tipo === 'imagen'; });
    function pintar(q) {
      var n = K.norm(q || '');
      lista.innerHTML = '';
      d.carpetas.filter(function (x) { return !n || K.norm(x.nombre).indexOf(n) >= 0; }).forEach(function (x) {
        var f = K.nodo('<button type="button" class="kit-tarjeta dh-item dh-item--carpeta" role="listitem">' + K.icono('archivo', 20) +
          '<span class="dh-item__n"></span>' + K.icono('adelante', 16) + '</button>');
        f.querySelector('.dh-item__n').textContent = x.nombre;
        f.addEventListener('click', function () { PILA.push(x); abrirCarpeta(zona, x); });
        lista.appendChild(f);
      });
      d.archivos.filter(function (x) { return !n || K.norm(x.nombre).indexOf(n) >= 0; }).forEach(function (x) {
        var f = K.nodo('<button type="button" class="kit-tarjeta dh-item" role="listitem">' + K.icono(x.tipo === 'imagen' ? 'imagen' : (x.tipo === 'pdf' ? 'pdf' : 'documento'), 20) +
          '<span class="dh-item__n"></span><small class="dh-item__m"></small></button>');
        f.querySelector('.dh-item__n').textContent = x.nombre;
        f.querySelector('.dh-item__m').textContent = [x.fecha ? O.fecha(x.fecha) : '', x.bytes ? (x.bytes > 1048576 ? (x.bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(x.bytes / 1024)) + ' KB') : ''].filter(Boolean).join(' · ');
        f.addEventListener('click', function () {
          K.vibrar(6);
          var i = vistos.indexOf(x);
          if (i >= 0) O.verDocs(vistos.map(function (v) { return { titulo: v.nombre, t: v.t, nombre: v.nombre, tipo: v.tipo }; }), i);
          else window.open(x.url, '_blank', 'noopener');
        });
        lista.appendChild(f);
      });
      if (!lista.children.length) lista.appendChild(O.vacio(n ? 'Nada coincide con "' + q + '".' : 'Esta carpeta está vacía.'));
    }
    b.querySelector('input').addEventListener('input', K.debounce(function (ev) { pintar(ev.target.value); }, 120));
    pintar('');
  }

  /* ══════════════ PERFIL: FIRMA Y FOTO ══════════════ */

  function perfil() {
    var c = caja();
    O.cabecera(c, 'persona', 'MI FIRMA Y MI FOTO',
      'La firma es la que sale en tus informes de supervisión y en las actas. La foto es la misma en todas las apps de la Alcaldía.');
    var zona = K.nodo('<div class="pf"></div>');
    c.appendChild(zona);
    K.piezas.esqueletos.mientras(zona, O.leer('firma'), { forma: 'ficha', cuantos: 1, espera: 'Trayendo tu firma' })
      .then(function (f) { pintarPerfil(zona, f); })
      ['catch'](function (e) { zona.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(c);
  }

  function pintarPerfil(zona, f) {
    zona.innerHTML = '';
    var yo = (C.yo && C.yo()) || {};
    /* la foto */
    var gf = K.nodo('<section class="kit-tarjeta grupo pf-foto"><h3 class="grupo__t">Foto de perfil</h3></section>');
    if (K.piezas.perfil) {
      var cara = K.piezas.perfil.cara(yo.nombre || '', C.miFoto ? C.miFoto(200) : '', { tam: 96, fotoActual: function () { return C.miFoto ? C.miFoto(512) : ''; } });
      gf.appendChild(cara);
      var bf = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('camara', 16) + ' Cambiar mi foto</button>');
      bf.addEventListener('click', function () { if (C.abrirFoto) C.abrirFoto(); });
      gf.appendChild(bf);
    }
    zona.appendChild(gf);

    /* la firma */
    var g = K.nodo('<section class="kit-tarjeta grupo pf-firma"><h3 class="grupo__t">Mi firma</h3></section>');
    /* 25/09 · el REVISOR no firma: no se le dice que sus informes saldrían sin firma */
    if (!f.puede) {
      g.appendChild(K.nodo('<p class="formulario__nota">' + K.icono('info', 13) + ' Como revisor, lo que decides sale con la firma del supervisor del contrato. Aquí solo cambias tu foto.</p>'));
      zona.appendChild(g);
      return;
    }
    var marco = K.nodo('<div class="pf-marco"></div>');
    if (f.mini) {
      var img = K.nodo('<img class="pf-img" alt="Tu firma actual">');
      img.src = f.mini;
      img.addEventListener('error', function () { marco.innerHTML = '<p class="formulario__nota">Tu firma está guardada, pero Drive no deja verla desde aquí.</p>'; });
      marco.appendChild(img);
    } else {
      marco.appendChild(K.nodo('<p class="formulario__nota formulario__nota--fuerte">No tienes firma cargada: tus informes saldrían sin firma.</p>'));
    }
    g.appendChild(marco);
    g.appendChild(K.nodo('<p class="formulario__nota">Firma con tinta oscura en una hoja blanca y tómale una foto de cerca. La app le quita el fondo y la recorta.</p>'));
    var inp = K.nodo('<input type="file" accept="image/png,image/jpeg,image/webp" hidden>');
    var elegir = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('camara', 16) + ' ' + (f.mini ? 'Cambiar mi firma' : 'Subir mi firma') + '</button>');
    elegir.addEventListener('click', function () { inp.click(); });
    g.appendChild(inp);
    g.appendChild(elegir);
    var prev = K.nodo('<div class="pf-prev" hidden></div>');
    g.appendChild(prev);
    inp.addEventListener('change', function () {
      var file = inp.files && inp.files[0];
      inp.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) { K.aviso('Elige una imagen (foto de la firma).', 'aviso', 4000); return; }
      limpiarFirma(file).then(function (png) { mostrarPrevia(prev, png, marco, elegir); },
        function (e) { K.aviso((e && e.message) || 'No se pudo leer la imagen.', 'malo', 5000); });
    });
    zona.appendChild(g);
  }

  function mostrarPrevia(prev, png, marco, elegir) {
    prev.hidden = false;
    prev.innerHTML = '';
    prev.appendChild(K.nodo('<p class="grupo__t">Así va a quedar</p>'));
    var m = K.nodo('<div class="pf-marco pf-marco--previa"><img class="pf-img" alt="Vista previa de la firma"></div>');
    m.querySelector('img').src = png;
    prev.appendChild(m);
    var a = K.nodo('<div class="ct-acc"></div>');
    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var si = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar firma</button>');
    no.addEventListener('click', function () { prev.hidden = true; prev.innerHTML = ''; });
    si.addEventListener('click', function () {
      if (K.ocupado) return;
      K.ocupado = true;
      si.disabled = true; no.disabled = true;
      K.piezas.guardado.mientras(K.pedir('firmaGuardar', { imagen: png }, { ms: 90000 }), {
        titulo: 'Guardando tu firma', sub: 'No cierres la app.',
        pasos: ['Subiendo la firma…', 'Poniéndola en tus informes…', 'Listo'],
        listo: { titulo: 'Firma guardada', paso: 'Tus próximos informes salen con esta firma' }
      }).then(function (r) {
        K.ocupado = false;
        marco.innerHTML = '';
        var img = K.nodo('<img class="pf-img" alt="Tu firma actual">');
        img.src = png;
        marco.appendChild(img);
        prev.hidden = true; prev.innerHTML = '';
        elegir.innerHTML = K.icono('camara', 16) + ' Cambiar mi firma';
        if (C.alFirma) C.alFirma(r);
      }, function (e) {
        K.ocupado = false;
        si.disabled = false; no.disabled = false;
        K.aviso((e && e.message) || 'No se pudo guardar la firma.', 'malo', 7000);
      });
    });
    a.appendChild(no); a.appendChild(si);
    prev.appendChild(a);
  }

  /**
   * La foto de la firma → PNG transparente, recortado al trazo, de máximo
   * 900 px de ancho. Lo claro (papel) se vuelve transparente con un borde
   * suave para que el trazo no quede serruchado; lo oscuro se deja.
   */
  function limpiarFirma(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          var w = Math.max(1, Math.round(img.naturalWidth * escala)), h = Math.max(1, Math.round(img.naturalHeight * escala));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var cx = cv.getContext('2d');
          cx.drawImage(img, 0, 0, w, h);
          var d = cx.getImageData(0, 0, w, h), p = d.data;
          var x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
              var i = (y * w + x) * 4;
              var luz = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
              var alfa = luz >= 200 ? 0 : (luz <= 140 ? 255 : Math.round((200 - luz) * 255 / 60));
              p[i + 3] = Math.min(p[i + 3], alfa);
              if (p[i + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
          }
          URL.revokeObjectURL(url);
          if (x1 < 0) { rej(new Error('No se ve ningún trazo: toma la foto con más luz y la firma en tinta oscura.')); return; }
          cx.putImageData(d, 0, 0);
          var m = Math.round(Math.max(w, h) * 0.02);
          x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
          var cw = x1 - x0 + 1, ch = y1 - y0 + 1;
          var f = Math.min(1, 900 / cw);
          var out = document.createElement('canvas'); out.width = Math.round(cw * f); out.height = Math.round(ch * f);
          out.getContext('2d').drawImage(cv, x0, y0, cw, ch, 0, 0, out.width, out.height);
          res(out.toDataURL('image/png'));
        } catch (e) { rej(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  window.INSTITUCIONAL = {
    configurar: function (c) { C = c || {}; },
    directorio: directorio, drive: drive, perfil: perfil,
    olvidar: function () { DIR = null; PILA = []; },
    _dir: function () { return DIR; },
    _limpiarFirma: limpiarFirma
  };
}());
