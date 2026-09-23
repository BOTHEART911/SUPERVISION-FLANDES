/* ============================================================
   SUPERVISION-FLANDES · APP
   Ecosistema Flandes · Fase 6, entrega 6.1

   Lo que entra en esta entrega
     · La entrada con documento y contraseña (roles SUPERVISOR y REVISOR;
       el DEV entra a todo).
     · El inicio con la misma cara de CONTRATISTA y CONTRATACIÓN: franja
       con cielo, tu foto, los accesos por bloques y abajo el resumen de
       tus cuentas por estado (se toca y abre la lista ya filtrada).
     · CUENTAS DE MI SUPERVISIÓN (revision.js): la lista con pastillas, el
       detalle, la bitácora, el visto bueno del revisor, la decisión y el
       plan de pagos con el informe de supervisión.
     · SOLICITUD A PRENSA (prensa.js), sin antelación mínima.
     · Soporte en el menú del perfil (hoja SOPORTE + grupo de desarrollo).

   Qué ve cada quien lo decide el CORE (SUPERVISION.cuentas): el
   supervisor, SOLO las cuentas de sus contratos; el REVISOR, las del
   supervisor o la secretaría a la que ADMIN lo ató. Aquí no se filtra
   nada por seguridad: esconder un botón es cortesía, no protección.

   Reglas de siempre
     · Todo dato de la hoja pasa por K.esc antes de entrar al HTML.
     · La app no conoce ninguna URL: todo sale de marca.js.
     · Modo oscuro de serie (el botón vive en el banner).
     · Abrir la app es UNA llamada al CORE ('inicio'); la lista de cuentas
       llega justo después, sin frenar el saludo.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var M = window.MARCA || {};
  var app = K.id('app');

  var YO = null;          /* quién entró */
  var ARRANQUE = null;    /* lo que trajo 'inicio' */

  /* ══════════════ el arranque, en UNA sola llamada ══════════════ */

  /*
   * 5.3.1 · LA PÁGINA EN BLANCO. Apps Script responde con una redirección a
   * googleusercontent cuya llave es de UN solo uso; a veces llega vencida y
   * Google devuelve un 404 en HTML aunque el servidor ya contestó. 'inicio'
   * solo lee, así que se reintenta una vez sin preguntarle nada a nadie.
   * Solo se reintenta lo que no escribe.
   */
  function leer(accion, datos, veces) {
    return K.pedir(accion, datos || {}, { ms: 60000 })['catch'](function (e) {
      var red = e && (e.codigo === 'RESPUESTA_NO_JSON' || e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO');
      if (red && (veces || 0) < 1) return leer(accion, datos, (veces || 0) + 1);
      throw e;
    });
  }

  /* conEsqueleto: solo al abrir la app. Cuando lo pide una vista que ya está
     pintada (el inicio, la lista), NO se reemplaza la pantalla: era lo que la
     dejaba en blanco si 'inicio' fallaba (el esqueleto se llevaba el saludo
     y al quitarlo no quedaba nada). */
  function arranque(conEsqueleto) {
    var quitar = (conEsqueleto && K.piezas.esqueletos && app)
      ? K.piezas.esqueletos.poner(app, { forma: 'ficha', cuantos: 1, sitio: 'reemplaza', espera: 'Cargando tu supervisión' })
      : function () {};

    return leer('inicio').then(function (d) {
      ARRANQUE = d;
      YO = d.yo || YO;
      if (d.personas && K.piezas.personas) K.piezas.personas.cargar(d.personas);
      if (d.push && K.piezas.avisos && K.piezas.avisos.configurar) K.piezas.avisos.configurar(d.push);
      if (d.config && K.piezas.creditos && K.piezas.creditos.configurar) K.piezas.creditos.configurar(d.config);
      quitar();
      return d;
    }, function (e) {
      quitar();
      throw e;
    });
  }

  K.listo(function () {
    registrarSW();
    if (K.piezas.instalar) K.piezas.instalar.vigilar();
    if (K.piezas.version) K.piezas.version.vigilar();

    var puerta = K.piezas.bienvenida
      ? K.piezas.bienvenida.abrir({
          titulo: 'Supervisión',
          sub: M.MUNICIPIO || 'Alcaldía de Flandes',
          imagen: M.APP_ICON || 'img/icono-512.png'
        })
      : Promise.resolve('saltada');

    puerta.then(function () {
      K.piezas.sesion.entrar({
        titulo: 'SUPERVISIÓN',
        sub: 'Ingresa con tu documento y contraseña',
        imagen: M.APP_ICON || 'img/icono-512.png',
        comprobar: function () { return arranque(true).then(function (d) { return d.yo; }); },
        alEntrar: arrancar
      });
    });
  });

  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js')['catch'](function () {});
  }

  function arrancar(yo) {
    YO = yo || {};
    montarBanner();

    if (K.piezas.avisos) {
      K.piezas.avisos.autoActivar();
      K.piezas.avisos.alLlegar(function (a) {
        K.aviso(a.titulo ? (a.titulo + ': ' + a.cuerpo) : a.cuerpo, 'info', 6000);
      });
    }

    if (window.AYUDA) {
      window.AYUDA.configurar(function () {
        return { yo: YO, arranque: ARRANQUE, revision: window.REVISION || null, prensa: window.PRENSA_SUP || null };
      });
    }

    if (window.REVISION) {
      window.REVISION.configurar({
        app: app, puede: puede, irA: irA, errorCaja: errorCaja,
        yo: function () { return YO || {}; },
        alcance: function () { return (ARRANQUE && ARRANQUE.alcance) || {}; },
        /* los números del inicio siguen a la lista sin otro viaje */
        alCambiar: function (n) { if (ARRANQUE) ARRANQUE.cuentas = n; }
      });
    }

    if (window.PRENSA_SUP) window.PRENSA_SUP.configurar({ app: app, errorCaja: errorCaja });

    K.cuando('kit:foto', function (r) {
      YO.imagen = r.url || '';
      K.piezas.banner.perfil({ foto: r.foto || '' });
      var cara = document.querySelector('.saludo .kit-perfil-cara');
      if (cara && K.piezas.perfil) cara.parentNode.replaceChild(caraPerfil(), cara);
    });

    window.addEventListener('hashchange', enrutar);
    enrutar();
  }

  /* ══════════════ permisos ══════════════
   * Lo que se pinta sale de las vistas que el CORE dice que este rol puede
   * abrir (llave PERMISOS de CONFIG). El CORE vuelve a comprobarlo en cada
   * llamada: esconder un botón no es la seguridad, es la cortesía. */
  function puede(vista) {
    var r = K.norm((YO && YO.rol) || '');
    if (r === 'DEV') return true;
    var v = (YO && YO.vistas) || [];
    for (var i = 0; i < v.length; i++) if (K.norm(v[i]) === K.norm(vista)) return true;
    return false;
  }

  function miFoto(ancho) {
    return K.miniDrive ? K.miniDrive(YO.imagen || '', ancho || 200) : (YO.imagen || '');
  }

  function abrirFoto() {
    if (!K.piezas.perfil) return;
    K.piezas.perfil.abrir({ nombre: YO.nombre || '', foto: miFoto(512) });
  }

  function caraPerfil() {
    return K.piezas.perfil.cara(YO.nombre || '', miFoto(200), {
      tam: 66, fotoActual: function () { return miFoto(512); }
    });
  }

  function montarBanner() {
    K.piezas.banner.montar({
      titulo: 'Supervisión',
      nombre: YO.nombre || '',
      rol: rolLegible(YO.rol),
      foto: miFoto(200),
      menu: [
        { texto: 'Foto de perfil', al: abrirFoto },
        { texto: 'Actualizar contraseña', al: function () { K.piezas.sesion.cambiarClave(); } },
        { texto: 'Instalar la app', al: function () { K.piezas.instalar.abrir(); } },
        /* 5.1.1 · soporte en TODAS las apps: se guarda en la hoja SOPORTE
           (la responde ADMIN) y avisa al grupo de desarrollo por WhatsApp */
        { texto: 'Soporte', al: function () { if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: vistaActual() }); } },
        { texto: 'Cerrar sesión', al: salir, peligro: true }
      ]
    });
    if (K.piezas.cielo) K.piezas.cielo.soloFondo(document.querySelector('.kit-banner'));
  }

  function rolLegible(r) {
    var n = K.norm(r || '');
    if (n === 'SUPERVISOR') return 'SUPERVISOR · Supervisión';
    if (n === 'REVISOR') return 'REVISOR · Supervisión';
    if (n === 'DEV') return 'DEV · Desarrollo';
    return r || 'Supervisión';
  }

  function salir() {
    if (K.piezas.avisos) K.piezas.avisos.olvidar();
    if (K.piezas.insights) K.piezas.insights.quitar();
    if (window.REVISION) window.REVISION.olvidar();
    if (window.PRENSA_SUP) window.PRENSA_SUP.olvidar();
    K.piezas.sesion.salir();
    location.hash = '';
  }

  /* ══════════════ vistas ══════════════ */

  var VISTAS = {
    inicio: vistaInicio,
    revisar: function () { window.REVISION.lista(); },
    cuenta: function (sub) { window.REVISION.detalle(sub); },
    prensa: function (sub) { window.PRENSA_SUP.vista(sub); }
  };

  var titulos = {
    inicio: 'Supervisión',
    revisar: 'CUENTAS',
    cuenta: 'CUENTA',
    prensa: 'SOLICITUD A PRENSA'
  };

  /* El permiso de cada vista (llave PERMISOS de CONFIG). El CORE lo vuelve
     a exigir en cada llamada: esto solo evita pintar lo que no se puede. */
  var PERMISO = { revisar: 'revisarCuentas', cuenta: 'revisarCuentas', prensa: 'solicitudPrensa' };

  function irA(v) { location.hash = '#/' + v; }

  /** El nombre de la vista donde está la persona: va en la solicitud de soporte. */
  function vistaActual() {
    var v = String(location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'inicio';
    return titulos[v] || v;
  }

  function enrutar() {
    var partes = String(location.hash || '').replace(/^#\/?/, '').split('/');
    var v = partes[0] || 'inicio';
    if (!VISTAS[v]) v = 'inicio';
    if (v !== 'inicio' && !puede(PERMISO[v] || v)) v = 'inicio';

    K.piezas.banner.vista(titulos[v]);
    /* la ficha vuelve a la lista (con sus filtros), la lista al inicio y
       adición/cesión/suspensión a la ficha de la que salieron */
    var resto = partes.slice(1).join('/');
    K.piezas.banner.atras(v === 'inicio' ? null : function () {
      if (v === 'cuenta') irA('revisar');
      else irA('inicio');
    });

    app.innerHTML = '';
    if (window.AYUDA) window.AYUDA.montar(v);
    window.scrollTo(0, 0);
    VISTAS[v](resto);
  }

  /* ---------- inicio ---------- */

  function vistaInicio() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    var al = (ARRANQUE && ARRANQUE.alcance) || {};
    var saludo = K.nodo(
      '<section class="saludo">' +
      '  <div class="saludo__txt">' +
      '    <p class="saludo__hola">' + K.esc(saludoDelDia()) + ',</p>' +
      '    <h2 class="saludo__nombre">' + K.esc(nombreCorto(YO.nombre)) + '</h2>' +
      '    <p class="saludo__doc">' + K.esc(rolLegible(YO.rol)) + ' · ' + K.esc(fechaHumana(new Date())) + '</p>' +
      (textoAlcance(al) ? '    <p class="saludo__doc sp-alcance">' + K.esc(textoAlcance(al)) + '</p>' : '') +
      '  </div>' +
      '</section>'
    );
    if (K.piezas.perfil && K.piezas.personas) saludo.appendChild(caraPerfil());
    if (K.piezas.cielo) K.piezas.cielo.poner(saludo, { burbujas: 3 });
    caja.appendChild(saludo);

    function bloque(titulo, tarjetas) {
      var s = K.nodo('<section class="bloque" aria-label="' + K.esc(titulo) + '">' +
        '<h3 class="bloque__t">' + K.esc(titulo) + '</h3></section>');
      var r = K.nodo('<div class="kit-rejilla kit-rejilla--auto accesos"></div>');
      tarjetas.forEach(function (t) { r.appendChild(t); });
      s.appendChild(r);
      caja.appendChild(s);
      return s;
    }

    var accRev = null, accPlan = null;
    if (puede('revisarCuentas')) {
      if (al.tipo === 'NADA') {
        caja.appendChild(K.nodo('<section class="kit-tarjeta rv-aviso rv-aviso--malo">' + K.icono('candado', 18) +
          '<span>Tu usuario REVISOR todavía no está atado a un supervisor o a una secretaría. Pídeselo al administrador; mientras tanto no verás cuentas.</span></section>'));
      } else {
        /* la imagen de cada acceso dice lo que hace: un documento con lápiz
           para revisar y una carpeta con visto bueno para aceptar el plan */
        accRev = acceso('REVISAR CUENTAS', 'Las cuentas que reportaron tus contratistas: documentos, evidencias, notas y decisión',
          'img/procesos_de_cuenta.webp', function () { abrirLista({ est: 'REPORTADA' }); });
        accPlan = acceso('PLAN DE PAGOS', 'Firma el informe de supervisión y acepta el plan de pagos',
          'img/tramites_y_solicitudes.webp', function () { abrirLista({ est: 'PLAN DE PAGOS' }); });
        bloque('CUENTAS', [accRev, accPlan]);
      }
    }

    if (puede('solicitudPrensa')) {
      bloque('OFICINA', [
        acceso('SOLICITUD A PRENSA', 'Fotos, video, piezas gráficas o publicaciones para tu secretaría, sin antelación mínima',
          'img/comunicaciones.webp', function () { irA('prensa'); })
      ]);
    }

    var destino = K.nodo('<section class="resumen"></section>');
    if (accRev) {
      var sRes = K.nodo('<section class="bloque" aria-label="Resumen de cuentas"><h3 class="bloque__t">RESUMEN DE MIS CUENTAS</h3></section>');
      sRes.appendChild(destino);
      caja.appendChild(sRes);
    }

    app.appendChild(caja);
    K.piezas.creditos.montar(caja);

    if (accRev && window.REVISION) {
      K.piezas.esqueletos.mientras(destino, window.REVISION.cargar(false), { forma: 'ficha', cuantos: 1, espera: 'Cargando tus cuentas' })
        .then(function () {
          var n = window.REVISION.contar();
          burbuja(accRev, n['REPORTADA'], 'por revisar', 'Estás al día: no hay cuentas esperando revisión');
          burbuja(accPlan, n['PLAN DE PAGOS'], 'en plan de pagos', 'No hay planes de pago por aceptar');
          pintarResumen(destino, n);
        })
        ['catch'](function (e) { destino.appendChild(errorCaja(e)); });
    }
  }

  function burbuja(acc, n, que, vacio) {
    if (!acc) return;
    var p = acc.querySelector('.acceso__p');
    if (n) acc.insertAdjacentHTML('beforeend', '<b class="acceso__burbuja rv-burbuja" aria-label="' + n + ' ' + que + '">' + (n > 99 ? '99+' : n) + '</b>');
    else if (p) p.textContent = vacio;
  }

  function abrirLista(f) {
    if (window.REVISION && window.REVISION.filtrar) window.REVISION.filtrar(f || {});
    irA('revisar');
  }

  function textoAlcance(al) {
    if (!al || !al.tipo) return '';
    if (al.tipo === 'TODO') return 'Ves la supervisión de todos los contratos.';
    if (al.tipo === 'SECRETARIA') return 'Revisas las cuentas de la ' + nombrePropio(al.valor) + (al.decide ? '' : ' · das visto bueno, no decides');
    if (al.tipo === 'SUPERVISOR' && K.norm(al.rol) === 'REVISOR') return 'Revisas las cuentas de la supervisión de ' + (K.piezas.personas ? K.piezas.personas.nombrePropio(al.valor) : al.valor) + (al.decide ? '' : ' · das visto bueno, no decides');
    return '';
  }

  /* El resumen del inicio: una cifra por estado que se toca y abre la lista
     ya filtrada. Se cuenta en el teléfono sobre la lista que ya llegó. */
  function pintarResumen(destino, n) {
    destino.innerHTML = '';
    var caja = K.nodo('<div class="kit-tarjeta resumen__caja ct-resumen"></div>');
    var ref = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar ct-recargar--mini" aria-label="Refrescar las cifras">' +
      K.icono('recargar', 16) + '<span>Refrescar</span></button>');
    ref.addEventListener('click', function () {
      ref.disabled = true; ref.classList.add('kit-ocupado');
      window.REVISION.cargar(true).then(function () { pintarResumen(destino, window.REVISION.contar()); K.aviso('Cifras al día.', 'ok', 2000); },
        function (e) { K.aviso((e && e.message) || 'No se pudo refrescar.', 'malo', 5000); ref.disabled = false; ref.classList.remove('kit-ocupado'); });
    });
    caja.appendChild(ref);
    var cifras = K.nodo('<div class="ct-cifras sp-cifras"></div>');
    [
      ['REPORTADA', 'Por revisar'],
      ['PLAN DE PAGOS', 'Plan de pagos'],
      ['REVISADA POR SUPERVISOR', 'En Contratación'],
      ['APROBADA', 'Aprobadas'],
      ['DEVUELTA', 'Devueltas'],
      ['INCOMPLETA', 'Incompletas']
    ].forEach(function (c) {
      var b = K.nodo('<button type="button" class="ct-cifra"><b>' + K.numero(n[c[0]] || 0) + '</b><span>' + K.esc(c[1]) + '</span></button>');
      b.addEventListener('click', function () { K.vibrar(6); abrirLista({ est: c[0] }); });
      cifras.appendChild(b);
    });
    caja.appendChild(cifras);
    caja.appendChild(K.nodo('<p class="ct-resumen__t sp-total">' + K.numero(n.total || 0) + ' cuentas en trámite en tu supervisión</p>'));
    destino.appendChild(caja);
  }

  function acceso(titulo, texto, medio, al, cuenta) {
    var b = K.nodo(
      '<button type="button" class="kit-tarjeta acceso">' +
      '  <img class="acceso__img" src="' + K.esc(K.medio(medio)) + '" alt="" loading="lazy">' +
      (cuenta ? '  <b class="acceso__burbuja rv-burbuja" aria-label="' + cuenta + ' por revisar">' + (cuenta > 99 ? '99+' : cuenta) + '</b>' : '') +
      '  <span class="acceso__txt">' +
      '    <span class="acceso__t">' + K.esc(titulo) + '</span>' +
      '    <span class="acceso__p">' + K.esc(texto) + '</span>' +
      '  </span>' +
      '</button>'
    );
    b.addEventListener('click', function () { K.vibrar(8); al(); });
    return b;
  }

  /* ══════════════ auxiliares ══════════════ */

  function saludoDelDia() {
    var h = new Date().getHours();
    return h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
  }

  function fechaHumana(d) {
    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];
  }

  function nombreCorto(n) {
    var p = String(n || '').trim().split(/\s+/);
    if (!p[0]) return '';
    return p.length > 1 ? (p[0] + ' ' + p[1]) : p[0];
  }

  function nombrePropio(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    /* SECRETARÍA DE HACIENDA → Secretaría de Hacienda */
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  function errorCaja(e, alReintentar) {
    var msg = (e && e.message) ? e.message : 'No se pudo cargar.';
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc(msg) + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', function () {
      if (alReintentar) alReintentar(); else enrutar();
    });
    return c;
  }
}());
