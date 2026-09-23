/* ============================================================
   SUPERVISION-FLANDES · AYUDA POR VISTA (Insights)
   Ecosistema Flandes · Fase 6, entrega 6.1

   El mismo patrón de CONTRATISTA y CONTRATACIÓN: cada vista tiene una
   GUÍA que habla de lo que hay en pantalla y PREGUNTAS RÁPIDAS con la
   respuesta calculada en el teléfono. Nada viaja al servidor ni pasa
   por una IA: los números salen de la lista que ya llegó.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var CTX = function () { return {}; };

  function ctx() { try { return CTX() || {}; } catch (e) { return {}; } }
  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function primerNombre(s) { return nombre(String(s || '').trim().split(/\s+/)[0] || ''); }
  function hola() { var y = ctx().yo || {}; return y.nombre ? primerNombre(y.nombre) + ', ' : ''; }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function RV() { return window.REVISION || null; }
  function cuentas() { return RV() ? RV()._cuentas() : []; }
  function soyRevisor() { return K.norm((ctx().yo || {}).rol || '') === 'REVISOR'; }

  function parseFecha(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function diasDe(f) {
    var d = parseFecha(f); if (!d) return null;
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - d) / 864e5);
  }
  function listaCorta(filas, fmt, max) {
    max = max || 8;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }
  function porEstado(e) { return cuentas().filter(function (c) { return c.estado === e; }); }

  var GUIAS = {

    inicio: function () {
      var n = RV() && RV().contar ? RV().contar() : null;
      var t = hola() + 'este es el inicio de Supervisión. ';
      if (n && n.total) {
        t += 'Tienes **' + (n['REPORTADA'] || 0) + ' por revisar** y **' + (n['PLAN DE PAGOS'] || 0) + ' en plan de pagos**. ';
        if (n['REVISADA POR SUPERVISOR']) t += n['REVISADA POR SUPERVISOR'] + ' ya están en Contratación. ';
      } else if (n) t += 'No tienes cuentas en trámite ahora mismo. ';
      t += soyRevisor()
        ? 'Como **revisor** revisas, dejas notas y marcas **Visto bueno** o **Con inconsistencia**; la decisión la toma el supervisor (o tú, si el administrador te dio ese permiso).'
        : 'Toca una cifra del resumen y la lista se abre ya filtrada.';
      return {
        guia: t,
        botones: [
          { texto: '¿Cuál lleva más días esperando?', responde: function () {
              var c = porEstado('REPORTADA');
              if (!c.length) return '¡Ninguna! No hay cuentas por revisar.';
              var o = c.slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
              return listaCorta(o, function (x) {
                var d = diasDe(x.radicada);
                return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + ' de ' + x.total + (d !== null ? ', radicada hace ' + d + (d === 1 ? ' día' : ' días') : '');
              }, 6);
            } },
          { texto: '¿Qué tiene visto bueno?', responde: function () {
              var c = porEstado('REPORTADA').filter(function (x) { return x.concepto; });
              if (!c.length) return 'Ninguna cuenta tiene todavía el concepto de un revisor.';
              return listaCorta(c, function (x) {
                return '· **' + nombre(x.nombre) + '** — ' + (x.concepto.tipo === 'VISTO BUENO' ? 'Visto bueno' : 'Con inconsistencia') + ' de ' + nombre(x.concepto.por) + ' (' + x.concepto.fecha + ')';
              }, 8);
            } },
          { texto: '¿Cuánto cobran las cuentas por revisar?', responde: function () {
              var c = porEstado('REPORTADA'), s = 0;
              c.forEach(function (x) { s += Number(x.cobro) || 0; });
              return c.length ? 'Las ' + c.length + ' cuentas por revisar cobran **' + pesos(s) + '** en total.' : 'No hay cuentas por revisar.';
            } },
          { texto: '¿Cómo cambio mi foto?', responde: function () {
              return 'Toca tu foto (o tus iniciales) en el saludo, o el menú de tu perfil → **Foto de perfil**. Es la misma en todas las apps de la Alcaldía.';
            } }
        ]
      };
    },

    revisar: function () {
      return {
        guia: 'Aquí están las cuentas en trámite de tu supervisión, de la más antigua a la más nueva. Filtra por **estado** (por revisar, plan de pagos, en Contratación, devueltas, incompletas, aprobadas), por **cómo va la revisión** ' +
              '(sin abrir, en revisión, visto bueno, con inconsistencia) y por secretaría. El botón de descarga saca la lista en **Excel** (una fila por cuenta) o en **PDF** (un informe por bloques).',
        botones: [
          { texto: '¿Qué estoy viendo?', responde: function () {
              var v = RV() ? RV()._visibles() : [];
              var m = {};
              v.forEach(function (c) { m[c.estado] = (m[c.estado] || 0) + 1; });
              return 'Estás viendo **' + v.length + '** ' + (v.length === 1 ? 'cuenta' : 'cuentas') + (v.length ? ':\n' + Object.keys(m).map(function (k) { return '· ' + k + ': **' + m[k] + '**'; }).join('\n') : '.');
            } },
          { texto: '¿Quién está revisando qué?', responde: function () {
              var c = porEstado('REPORTADA').filter(function (x) { return x.revision; });
              if (!c.length) return 'Nadie tiene revisiones a medias.';
              return listaCorta(c, function (x) {
                return '· **' + nombre(x.revision.por) + '** con ' + nombre(x.nombre) + ' (desde ' + x.revision.desde + ', ' + x.revision.notas + ' notas)';
              }, 8);
            } },
          { texto: '¿Cuáles devolví o marqué incompletas?', responde: function () {
              var c = cuentas().filter(function (x) { return x.estado === 'DEVUELTA' || x.estado === 'INCOMPLETA'; });
              if (!c.length) return 'Ninguna está esperando corrección del contratista.';
              return listaCorta(c, function (x) {
                return '· **' + nombre(x.nombre) + '** (' + x.estado.toLowerCase() + ', cuenta ' + x.informe + ')' + (x.observacion ? ': «' + x.observacion.slice(0, 120) + '»' : '');
              }, 6);
            } },
          { texto: '¿Qué falta en plan de pagos?', responde: function () {
              var c = porEstado('PLAN DE PAGOS');
              if (!c.length) return 'No hay planes de pago esperando.';
              return listaCorta(c, function (x) {
                return '· **' + nombre(x.nombre) + '** — ' + (x.informeSup ? 'informe firmado, falta aceptar el plan' : 'falta firmar el informe') + (x.ultimo ? (x.acta ? ' (última cuenta: acta firmada)' : ' (última cuenta: falta el acta de cumplimiento)') : '');
              }, 8);
            } }
        ]
      };
    },

    cuenta: function () {
      return {
        guia: 'Revisa por pestañas: **Contrato**, **Pago**, **Planilla** y **Actividades**. Cada documento se abre en el visor y cada evidencia en el carrusel con zoom. ' +
              'Marca con ✓ lo revisado y deja **notas internas**. **Guardar revisión** no cambia el estado. ' +
              (soyRevisor() ? 'Cuando termines, deja tu **Visto bueno** o marca **Con inconsistencia**: queda en la tarjeta con tu nombre, fecha y hora. ' : '') +
              'Aprobar, devolver o marcar incompleta sale siempre **a nombre del supervisor** del contrato.',
        botones: [
          { texto: '¿Qué me falta por mirar?', responde: function () {
              var r = RV(); if (!r || !r._detalle()) return 'La cuenta todavía está cargando.';
              var B = r._bitacora(), docs = r._docs(), d = r._detalle();
              var fd = docs.filter(function (x) { return !B.vistos['doc:' + x.id]; });
              var fo = d.obligaciones.filter(function (o) { return !B.vistos['obl:' + o.n]; });
              if (!fd.length && !fo.length) return 'Nada: ya marcaste todo como revisado.';
              var t = [];
              if (fo.length) t.push('**Obligaciones:** ' + fo.map(function (o) { return o.n; }).join(', '));
              if (fd.length) t.push('**Documentos:** ' + fd.map(function (x) { return x.titulo; }).join(', '));
              return t.join('\n');
            } },
          { texto: '¿Cuadran los saldos?', responde: function () {
              var r = RV(), d = r && r._detalle(); if (!d) return 'La cuenta todavía está cargando.';
              var k = d.cuenta.campos || {}, h = d.historial || [];
              var s = K.aNumero(k.saldo), c = K.aNumero(k.cobro), n = K.aNumero(k.nuevoSaldo);
              var t = 'Saldo **' + pesos(s) + '** − cobro **' + pesos(c) + '** = ' + pesos(s - c) + (Math.abs(s - c - n) > 1 ? ' ⚠ y declaró **' + pesos(n) + '**.' : ' ✓');
              var i = -1; h.forEach(function (x, j) { if (x.actual) i = j; });
              if (i > 0) {
                var a = h[i - 1];
                t += '\nLa cuenta ' + a.informe + ' dejó **' + pesos(a.nuevoSaldo) + '**' + (Math.abs(a.nuevoSaldo - s) > 1 ? ' ⚠ no coincide con el saldo actual.' : ' ✓ coincide.');
              }
              return t;
            } },
          { texto: '¿Qué dijo el revisor?', responde: function () {
              var r = RV(), d = r && r._detalle(); if (!d) return 'La cuenta todavía está cargando.';
              var c = d.revision && d.revision.concepto;
              if (!c) return 'Todavía no hay un concepto de revisor en esta ronda.';
              return '**' + (c.tipo === 'VISTO BUENO' ? 'Visto Bueno' : 'Con inconsistencia') + '**: ' + nombre(c.por) + ' · ' + c.fecha + (c.nota ? '\n«' + c.nota + '»' : '');
            } },
          { texto: '¿A nombre de quién sale?', responde: function () {
              var r = RV(), d = r && r._detalle(); if (!d) return 'La cuenta todavía está cargando.';
              return 'De **' + nombre(d.cuenta.supervisor) + '**, el supervisor del contrato ' + d.cuenta.contrato + '. Quién revisó de verdad queda en la historia de la cuenta.';
            } }
        ]
      };
    },

    prensa: function () {
      return {
        guia: 'Pide apoyo al equipo de Comunicaciones para tu secretaría. Desde Supervisión **no hay antelación mínima**: la entrega o publicación puede ser hoy mismo. ' +
              'Abajo ves tus solicitudes y en qué van (recibida, en proceso, realizada).',
        botones: [
          { texto: '¿En qué van mis solicitudes?', responde: function () {
              var p = window.PRENSA_SUP && window.PRENSA_SUP._estado();
              var s = (p && p.solicitudes) || [];
              if (!s.length) return 'Todavía no has pedido nada a Prensa desde esta app.';
              var m = {};
              s.forEach(function (x) { m[x.estado] = (m[x.estado] || 0) + 1; });
              return Object.keys(m).map(function (k) { return '· ' + k + ': **' + m[k] + '**'; }).join('\n');
            } },
          { texto: '¿Qué puedo pedir?', responde: function () {
              var p = window.PRENSA_SUP && window.PRENSA_SUP._estado();
              return ((p && p.requerimientos) || []).map(function (r) { return '· ' + r; }).join('\n') || 'La lista de requerimientos todavía está cargando.';
            } }
        ]
      };
    }
  };

  var TITULOS = { inicio: 'Tu inicio', revisar: 'Cuentas de mi supervisión', cuenta: 'Revisión de cuenta', prensa: 'Solicitud a Prensa' };

  function montar(vista, extra) {
    if (!K.piezas.insights) return;
    var g = GUIAS[vista];
    if (!g) return;
    var base = g();
    K.piezas.insights.montar({
      vista: (extra && extra.vista) || TITULOS[vista] || vista,
      guia: function () { return g().guia; },
      botones: base.botones || [],
      alto: !!base.alto
    });
  }

  window.AYUDA = {
    configurar: function (fn) { if (typeof fn === 'function') CTX = fn; },
    montar: montar,
    tiene: function (v) { return !!GUIAS[v]; },
    _guias: GUIAS
  };
}());
