/* ============================================================
   SUPERVISION-FLANDES · ADAPTADOR DEL ASISTENTE DE AYUDA
   24/10/2026 · entrega 3 (la pieza es la misma de CONTRATISTA)

   La pieza kit/asistente.js no sabe nada de esta app. Aquí se le dice:
     · a dónde puede llevar (destino), con qué rótulo y con qué filtro
       de la lista ya puesto (por revisar, plan de pagos, devueltas…),
     · qué está cerrado y por qué (puerta): el permiso de la vista
       (llave PERMISOS de CONFIG, igual que el menú) o el REVISOR que
       todavía no está atado a un supervisor o secretaría,
     · lo más urgente al abrir (urgente): cuentas por revisar, actas y
       planes de pago por firmar, atrasados, recordatorios,
     · los datos reales de las respuestas ({{clave}}).

   TODO sale de lo que la app ya trajo: el arranque, la lista de cuentas
   (REVISION, que llega con el 'inicio') y, si la persona ya abrió esas
   vistas, CUENTAS ATRASADAS y la AGENDA. Ningún dato viaja al servidor
   para responder.

   La base embebida (js/asistente-base.js) es el respaldo para la primera
   apertura y la pantalla de entrada; la del CORE la reemplaza en cuanto
   llega con el arranque (solo cuando cambia su sello).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  if (!K || !K.piezas.asistente) return;

  function APP() { return window.SUPERVISION_APP || {}; }
  function ar() { try { return (APP().arranque && APP().arranque()) || {}; } catch (e) { return {}; } }
  function yo() { try { return (APP().yo && APP().yo()) || {}; } catch (e) { return {}; } }
  function RV() { return window.REVISION || null; }
  function listaLista() { var r = RV(); return !!(r && r.pendientes && r.pendientes() !== null); }
  function cuentas() { var r = RV(); try { return r && r._cuentas ? r._cuentas() : []; } catch (e) { return []; } }
  function porEstado(e) { return cuentas().filter(function (c) { return c.estado === e; }); }
  function AT() { try { return window.ATRASOS ? window.ATRASOS._datos() : null; } catch (e) { return null; } }
  function alcance() { return ar().alcance || {}; }
  function rol() { return K.norm(yo().rol || ''); }

  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function diasDe(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(f || ''));
    if (!m) return null;
    var d = new Date(+m[3], +m[2] - 1, +m[1]), hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - d) / 864e5);
  }
  function lista(filas, fmt, max) {
    max = max || 5;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }
  var CARGANDO = 'Tus cuentas todavía están llegando: pregúntame de nuevo en un momento.';

  /* ---------- alcance y permisos ---------- */

  function sinAtar() { return alcance().tipo === 'NADA'; }
  function puede(perm) { try { return APP().puede ? APP().puede(perm) : true; } catch (e) { return true; } }
  function decide() {
    var r = rol();
    if (r === 'DEV' || r === 'SUPERVISOR') return true;
    return !!alcance().decide;
  }

  function textoAlcance() {
    var al = alcance();
    if (al.tipo === 'NADA') return 'Tu usuario **REVISOR** todavía no está atado a un supervisor ni a una secretaría: por eso no ves cuentas. Pídeselo al **administrador**.';
    if (al.tipo === 'TODO') return 'Ves la supervisión de **todos los contratos**.';
    if (al.tipo === 'SECRETARIA') return 'Revisas las cuentas de la **' + nombre(al.valor) + '**' + (al.decide ? '.' : ': das visto bueno, no decides.');
    if (al.tipo === 'SUPERVISOR' && K.norm(al.rol) === 'REVISOR') return 'Revisas las cuentas de la supervisión de **' + nombre(al.valor) + '**' + (al.decide ? '.' : ': das visto bueno, no decides.');
    return 'Ves **solo las cuentas de los contratos que supervisas**.';
  }

  /* ---------- lo más urgente al abrir ---------- */

  function masAntigua() {
    var c = porEstado('REPORTADA').slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
    return c[0] || null;
  }

  function urgente() {
    if (sinAtar()) return { texto: textoAlcance(), accion: 'soporte' };
    if (!puede('revisarCuentas') || !listaLista()) return null;
    var pr = porEstado('REPORTADA'), pp = porEstado('PLAN DE PAGOS');
    var actas = pp.filter(function (c) { return c.ultimo && !c.acta; });
    if (pr.length) {
      var v = masAntigua(), d = v ? diasDe(v.radicada) : null;
      return { texto: 'Tienes **' + plural(pr.length, 'cuenta por revisar', 'cuentas por revisar') + '**' +
        (v && d !== null && d > 0 ? '; la de **' + nombre(v.nombre) + '** lleva ' + plural(d, 'día', 'días') + ' esperando.' : '.'), accion: 'ir:revisar' };
    }
    if (pp.length) {
      return { texto: 'Tienes **' + plural(pp.length, 'cuenta en plan de pagos', 'cuentas en plan de pagos') + '** por cerrar' +
        (actas.length ? ' (' + plural(actas.length, 'es la última y lleva', 'son la última y llevan') + ' **acta de cumplimiento**)' : '') +
        ': firma el informe de supervisión y acepta el plan.', accion: 'ir:plan' };
    }
    var at = AT();
    if (at && at.lista && at.lista.length) {
      return { texto: '**' + plural(at.lista.length, 'contratista tiene', 'contratistas tienen') + ' la cuenta atrasada**: recuérdales o comparte la lista.', accion: 'ir:atrasos' };
    }
    var rec = cuentas().filter(function (c) { return c.rec && !c.rec.recordado; });
    if (rec.length) return { texto: datoRecordar(), accion: rec.some(function (c) { return c.estado === 'INGRESADA'; }) ? 'ir:ingresadas' : 'ir:devueltas' };
    return null;
  }

  /* ---------- a dónde puede llevar ---------- */

  var DESTINOS = {
    inicio:         ['Ir al inicio', 'inicio'],
    revisar:        ['Ver las cuentas por revisar', 'revisar', { est: 'REPORTADA' }],
    plan:           ['Ver las de plan de pagos', 'revisar', { est: 'PLAN DE PAGOS' }],
    devueltas:      ['Ver las devueltas', 'revisar', { est: 'DEVUELTA' }],
    ingresadas:     ['Ver las ingresadas', 'revisar', { est: 'INGRESADA' }],
    contratacion:   ['Ver las que están en Contratación', 'revisar', { est: 'REVISADA POR SUPERVISOR' }],
    atrasos:        ['Ir a CUENTAS ATRASADAS', 'atrasos'],
    agenda:         ['Ir a la AGENDA DE REVISIÓN', 'agenda'],
    contratistas:   ['Ir a CONTRATISTAS', 'contratistas'],
    firmados:       ['Ir a INFORMES FIRMADOS', 'firmados'],
    reporte:        ['Ir al REPORTE', 'reporte'],
    misregistros:   ['Ir a MIS REGISTROS', 'misregistros'],
    requerimientos: ['Ir a REQUERIMIENTOS', 'requerimientos'],
    comunicados:    ['Ir a COMUNICADOS', 'comunicados'],
    comunicaciones: ['Ir a SOLICITUD A COMUNICACIONES', 'comunicaciones'],
    directorio:     ['Ir al DIRECTORIO', 'directorio'],
    drive:          ['Abrir el DRIVE DE HACIENDA', 'drive'],
    perfil:         ['Ir a MI FIRMA Y MI FOTO', 'perfil'],
    secop:          ['Abrir el SECOP II', null]
  };
  var NOMBRES = { revisar: 'revisar cuentas', plan: 'revisar cuentas', devueltas: 'revisar cuentas', ingresadas: 'revisar cuentas',
    contratacion: 'revisar cuentas', atrasos: 'cuentas atrasadas', agenda: 'la agenda de revisión', contratistas: 'CONTRATISTAS',
    firmados: 'INFORMES FIRMADOS', reporte: 'el REPORTE', requerimientos: 'REQUERIMIENTOS', comunicados: 'COMUNICADOS',
    comunicaciones: 'SOLICITUD A COMUNICACIONES', directorio: 'el DIRECTORIO', drive: 'el DRIVE DE HACIENDA', perfil: 'MI FIRMA Y MI FOTO' };

  function rutaActual() { return String(location.hash || '').replace(/^#\/?/, ''); }

  function destino(id) {
    var d = DESTINOS[id];
    if (!d) return null;
    return { etiqueta: d[0], ir: function () {
      if (id === 'secop') { var u = APP().urlSecop ? APP().urlSecop() : ''; if (u) window.open(u, '_blank', 'noopener'); return; }
      if (d[2] && RV() && RV().filtrar) RV().filtrar(d[2]);
      if (rutaActual() === d[1]) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
      location.hash = '#/' + d[1];
    } };
  }

  /** Lo cerrado se explica (permiso, revisor sin atar, sin carpeta) y se ofrece soporte. */
  function puerta(id) {
    var d = DESTINOS[id];
    if (!d || !d[1] || d[1] === 'inicio' || d[1] === 'misregistros') return null;
    var perm = APP().permiso ? APP().permiso(d[1]) : d[1];
    if (perm === 'revisarCuentas' && sinAtar()) return { texto: textoAlcance(), accion: 'soporte' };
    if (!puede(perm)) {
      return { texto: 'Tu usuario no tiene permiso para **' + (NOMBRES[id] || id) + '**. Si lo necesitas, pídeselo al administrador.', accion: 'soporte' };
    }
    if (id === 'drive' && !ar().driveHacienda) return { texto: 'Tu usuario no tiene asignada la carpeta del **Drive de Hacienda**. La asigna el administrador.', accion: 'soporte' };
    return null;
  }

  /* ---------- acciones que no son ir a una vista ---------- */

  function vistaTitulo() { try { return (APP().vistaActual && APP().vistaActual()) || ''; } catch (e) { return ''; } }

  function accion(a) {
    switch (a) {
      case 'guia': return { etiqueta: 'Descargar la guía rápida', icono: 'descargar', cierra: false, hacer: function () { if (K.piezas.guia) K.piezas.guia.descargar('SUPERVISION'); } };
      case 'soporte': return { etiqueta: 'Contarle a soporte', icono: 'salvavidas', hacer: function (p) {
        if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: vistaTitulo(), texto: p ? 'Le pregunté al asistente: «' + p + '»\n' : '' });
      } };
      case 'foto': return { etiqueta: 'Cambiar mi foto', icono: 'camara', hacer: function () { if (APP().abrirFoto) APP().abrirFoto(); } };
      case 'clave': return { etiqueta: 'Actualizar contraseña', icono: 'llave', hacer: function () { K.piezas.sesion.cambiarClave(); } };
      case 'instalar': return { etiqueta: 'Instalar la app', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      default: return null;
    }
  }

  /* ---------- los datos de las respuestas ---------- */

  function datoRecordar() {
    if (!listaLista()) return CARGANDO;
    var c = cuentas().filter(function (x) { return x.rec && !x.rec.recordado; });
    if (!c.length) return 'Hoy **a nadie**: no hay cuentas devueltas, incompletas o corregidas sin reportar pendientes de recordatorio.';
    c.sort(function (a, b) { return (b.rec.vencida ? b.rec.dias : -b.rec.dias) - (a.rec.vencida ? a.rec.dias : -a.rec.dias); });
    return '**' + plural(c.length, 'cuenta', 'cuentas') + '** sin recordatorio hoy:\n' + lista(c, function (x) {
      return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + ' ' + (x.estado === 'INGRESADA' ? 'corregida sin reportar' : x.estado.toLowerCase()) +
        (x.rec.limite ? (x.rec.vencida ? ', ' + plural(x.rec.dias, 'día hábil', 'días hábiles') + ' vencida' : ', le quedan ' + plural(x.rec.dias, 'día hábil', 'días hábiles')) : '');
    });
  }

  function dato(k) {
    switch (k) {
      case 'queMeToca':
        var u = urgente();
        if (u) return u.texto;
        if (!listaLista()) return puede('revisarCuentas') ? CARGANDO : 'Tu usuario no revisa cuentas: aquí tienes las vistas de oficina e institucional.';
        return 'Por ahora **nada urgente**: no tienes cuentas por revisar ni planes de pago por aceptar. ✓';
      case 'porRevisar':
        if (sinAtar()) return textoAlcance();
        if (!listaLista()) return CARGANDO;
        var n = porEstado('REPORTADA').length;
        if (!n) return '**Ninguna**: estás al día, no hay cuentas esperando revisión. ✓';
        var vb = porEstado('REPORTADA').filter(function (c) { return c.concepto && c.concepto.tipo === 'VISTO BUENO'; }).length;
        return 'Tienes **' + plural(n, 'cuenta por revisar', 'cuentas por revisar') + '**' + (vb ? ', ' + plural(vb, 'ya con visto bueno', 'ya con visto bueno') + ' de un revisor' : '') + '. Te llevo a la lista.';
      case 'masAntigua':
        if (!listaLista()) return CARGANDO;
        var o = porEstado('REPORTADA').slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
        if (!o.length) return '¡Ninguna! No hay cuentas por revisar. ✓';
        return 'Las que más llevan esperando:\n' + lista(o, function (x) {
          var d = diasDe(x.radicada);
          return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + ' de ' + (x.total || '?') + (d !== null ? ', radicada hace ' + plural(d, 'día', 'días') : '');
        });
      case 'planPendiente':
        if (!listaLista()) return CARGANDO;
        var pp = porEstado('PLAN DE PAGOS');
        if (!pp.length) return 'No hay planes de pago esperando. ✓';
        return '**' + plural(pp.length, 'cuenta', 'cuentas') + '** en plan de pagos:\n' + lista(pp, function (x) {
          return '· **' + nombre(x.nombre) + '** — ' + (x.informeSup ? 'informe firmado, falta aceptar el plan' : 'falta firmar el informe') +
            (x.ultimo ? (x.acta ? ' (última cuenta: acta firmada)' : ' (última cuenta: falta el acta)') : '');
        });
      case 'actasPendientes':
        if (!listaLista()) return '';
        var ac = porEstado('PLAN DE PAGOS').filter(function (c) { return c.ultimo && !c.acta; });
        return ac.length ? 'Ahora te ' + (ac.length === 1 ? 'falta firmar la de ' : 'faltan las de ') + ac.map(function (c) { return '**' + nombre(c.nombre) + '**'; }).join(', ') + '.'
                         : 'Ahora no tienes actas pendientes.';
      case 'alcance': return textoAlcance();
      case 'puedoDecidir':
        return decide() ? 'Tu usuario **sí puede decidir**.' : 'Tu usuario da **visto bueno**; aprobar, devolver o marcar incompleta lo hace el supervisor del contrato.';
      case 'quienRevisa':
        if (!listaLista()) return CARGANDO;
        var rv = porEstado('REPORTADA').filter(function (x) { return x.revision || x.concepto; });
        if (!rv.length) return 'Nadie tiene revisiones a medias ni conceptos de revisor ahora mismo.';
        return lista(rv, function (x) {
          return '· **' + nombre(x.nombre) + '**: ' + (x.concepto ? (x.concepto.tipo === 'VISTO BUENO' ? 'visto bueno' : 'con inconsistencia') + ' de ' + nombre(x.concepto.por)
            : 'la revisa ' + nombre(x.revision.por) + ' desde ' + x.revision.desde);
        }, 6);
      case 'enContratacion':
        if (!listaLista()) return CARGANDO;
        var ec = porEstado('REVISADA POR SUPERVISOR');
        return ec.length ? '**' + plural(ec.length, 'cuenta tuya está', 'cuentas tuyas están') + '** esperando la aprobación de **Contratación**.' : 'Ninguna cuenta tuya está esperando a Contratación.';
      case 'devueltas':
        if (!listaLista()) return CARGANDO;
        var dv = cuentas().filter(function (x) { return x.estado === 'DEVUELTA' || x.estado === 'INCOMPLETA'; });
        if (!dv.length) return 'Ninguna está esperando corrección del contratista. ✓';
        return '**' + plural(dv.length, 'cuenta espera', 'cuentas esperan') + '** corrección:\n' + lista(dv, function (x) {
          return '· **' + nombre(x.nombre) + '** (' + x.estado.toLowerCase() + ', cuenta ' + x.informe + ')';
        });
      case 'recordar': return datoRecordar();
      case 'cobroPorRevisar':
        if (!listaLista()) return CARGANDO;
        var cr = porEstado('REPORTADA'), s = 0;
        cr.forEach(function (x) { s += Number(x.cobro) || 0; });
        return cr.length ? 'Las ' + plural(cr.length, 'cuenta', 'cuentas') + ' por revisar cobran **' + pesos(s) + '** en total.' : 'No hay cuentas por revisar.';
      case 'atrasados':
        if (sinAtar()) return textoAlcance();
        var at = AT();
        if (!at || !at.lista) return 'En **CUENTAS ATRASADAS** ves quién no presentó su cuenta dentro del plazo, con los días hábiles de cada uno.';
        if (!at.lista.length) return 'Nadie tiene la cuenta atrasada. ✓';
        return '**' + plural(at.lista.length, 'contratista tiene', 'contratistas tienen') + '** la cuenta atrasada:\n' + lista(at.lista, function (a) {
          return '· **' + nombre(a.nombre) + '** — cuenta ' + a.informe + ', venció el ' + a.limite + ' (' + plural(a.dias, 'día hábil', 'días hábiles') + ')';
        });
      case 'diasPlazo': var a2 = AT(); return String((a2 && a2.dias) || 5);
      case 'agenda':
        var A = window.AGENDA;
        try {
          if (A && A._datos && A._datos() && A.ayuda) {
            var b = (A.ayuda().botones || []).filter(function (x) { return /esta semana/.test(x.texto); })[0];
            if (b) return b.responde();
          }
        } catch (e) {}
        return 'En la **AGENDA DE REVISIÓN** ves qué días te llega cuánto trabajo y de quiénes, según el corte de cada contratista (Mes, Semana, Día, Cortes o Lista).';
      case 'avisosTelefono':
        var e = K.piezas.avisos ? K.piezas.avisos.estado() : '';
        if (e === 'listo') return 'Este teléfono **ya recibe avisos**: te llegan cuando un contratista reporta una cuenta o su plan de pagos, aunque tengas la app cerrada.';
        if (e === 'ios-sin-instalar') return 'En iPhone los avisos solo llegan con la app **instalada** en la pantalla de inicio: menú de tu perfil → Instalar la app.';
        if (e === 'bloqueado') return 'Los avisos están **bloqueados** en este navegador: actívalos en los permisos del sitio (el candado junto a la dirección) y vuelve a abrir la app.';
        return 'Los avisos se activan solos al entrar: acepta el permiso de notificaciones cuando el teléfono lo pida.';
      case 'nombre': return nombre(String(yo().nombre || '').split(/\s+/)[0] || '');
      default: return '';
    }
  }

  function vista() {
    try { var cl = (K.piezas.insights.configuracion() || {}).clave; if (cl) return cl; } catch (e) {}
    return rutaActual().split('/')[0] || 'inicio';
  }

  var ADAPTADOR = {
    vista: vista,
    estado: function () { return 'ACTIVO'; },
    dato: dato, urgente: urgente, destino: destino, puerta: puerta, accion: accion
  };

  /* ══════════════ la pantalla de entrada ══════════════ */

  function campo(n) { return document.querySelector('.kit-sesion [name="' + n + '"]'); }
  function resaltar(el) {
    if (!el) return;
    el.classList.add('kit-as-resalta');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    setTimeout(function () { el.classList.remove('kit-as-resalta'); }, 3600);
  }

  var ENTRADA = {
    vista: function () { return 'entrada'; },
    estado: function () { return ''; },
    dato: function () { return ''; },
    urgente: function () { return null; },
    destino: function () { return null; },
    puerta: function () { return null; },
    accion: function (a) {
      if (a === 'olvide') return { etiqueta: 'Mostrarme el botón', icono: 'llave', hacer: function () {
        var d = campo('documento');
        if (d && !String(d.value || '').trim()) { d.focus(); resaltar(d); }
        /* NO se toca: pedir la contraseña lo decide la persona */
        resaltar(document.querySelector('.kit-sesion__olvide'));
      } };
      if (a === 'documento') return { etiqueta: 'Ir a la entrada', icono: 'persona', hacer: function () {
        var d = campo('documento'), cl = campo('clave');
        var el = d && !String(d.value || '').trim() ? d : (cl || d);
        if (el) { el.focus(); resaltar(el); }
      } };
      if (a === 'instalar') return { etiqueta: 'Cómo instalarla', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      return null;
    }
  };

  K.piezas.asistente.configurar({
    app: 'SUPERVISION',
    base: window.ASISTENTE_BASE || [],
    adaptador: ADAPTADOR
  });

  window.SUPERVISION_ASISTENTE = {
    adaptador: ADAPTADOR,
    entrada: ENTRADA,
    /* para las pruebas */
    _urgente: urgente, _dato: dato
  };
}());
