/* ============================================================
   SUPERVISION-FLANDES · AYUDA POR VISTA (Insights)
   Ecosistema Flandes · Fase 6, entrega 6.1 (6.3: guías de las 10 vistas nuevas)

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

  /* ══════════════ 6.3 · las vistas nuevas ══════════════ */
  function CT() { return window.CONTRATISTAS || null; }
  function todas() { return CT() ? CT().todas() : []; }
  function top(filas, campo, n) {
    var m = {};
    filas.forEach(function (f) { var v = f[campo] || 'SIN DATO'; m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, n || 99).map(function (k) { return { k: k, n: m[k] }; });
  }
  function fechaIso(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function RQ() { return window.REQS || null; }
  function CM() { return window.COMUS || null; }
  function FI() { return window.FIRMADOS || null; }
  function RP() { return window.REPORTE || null; }
  function IN() { return window.INFORME || null; }

  GUIAS.contratistas = function () {
    return {
      guia: 'Los contratos de tu supervisión. Empiezas viendo los **activos**; las pastillas cambian a inactivos o todos y suman **adicionados** o **cedidos**. ' +
            'En cada tarjeta: **Detalles** (la ficha), **Informe** (sus cuentas en PDF o Excel), **Requerimiento**, WhatsApp y Drive. Un contratista con dos contratos sale dos veces: cada tarjeta es un contrato.',
      botones: [
        { texto: '¿Qué estoy viendo?', responde: function (f) {
            var c = CT();
            return 'Estás viendo **' + f.length + '** ' + (f.length === 1 ? 'contrato' : 'contratos') + (c ? ': ' + c._filtros() : '') + '.';
          } },
        { texto: '¿Quiénes terminan pronto?', responde: function (f) {
            var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            var p = f.filter(function (x) { var d = parseFecha(x.fin); return x.estado === 'ACTIVO' && d && (d - hoy) / 864e5 <= 30; });
            if (!p.length) return 'Ningún contrato activo en pantalla termina en los próximos 30 días.';
            return listaCorta(p, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato + ', termina el ' + x.fin; }, 8);
          } },
        { texto: '¿A quién le faltan fechas?', responde: function (f) {
            var s = f.filter(function (x) { return x.estado === 'ACTIVO' && (!x.inicio || !x.fin); });
            if (!s.length) return 'Todos los activos en pantalla tienen fecha de inicio y de terminación.';
            return 'Sin fecha de inicio o de terminación (sin ellas no salen sus formatos):\n' + listaCorta(s, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato; });
          } },
        { texto: '¿Los que tienen varios contratos?', responde: function () {
            var m = {};
            todas().forEach(function (x) { (m[x.doc] = m[x.doc] || []).push(x); });
            var v = Object.keys(m).filter(function (d) { return m[d].length > 1; });
            if (!v.length) return 'En tu supervisión nadie tiene más de un contrato.';
            return listaCorta(v, function (d) { return '· **' + nombre(m[d][0].nombre) + '** — ' + m[d].map(function (x) { return x.contrato + ' (' + x.estado.toLowerCase() + ')'; }).join(', '); });
          } }
      ],
      filas: function () { return CT() ? CT()._visibles() : []; },
      filtros: function () { return CT() ? CT()._filtros() : ''; },
      medidas: [
        { titulo: 'Contratos', calcula: function (f) { return f.length; } },
        { titulo: 'Activos', calcula: function (f) { return f.filter(function (x) { return x.estado === 'ACTIVO'; }).length; } },
        { titulo: 'Adicionados', calcula: function (f) { return f.filter(function (x) { return x.adic; }).length; } }
      ]
    };
  };

  GUIAS.contratista = function () {
    return {
      guia: 'La ficha del contrato: lo mismo que ve el contratista en su app, más sus datos personales y de pago. Arriba tienes **Informe** para descargar sus cuentas y **Requerimiento** para pedirle algo.',
      botones: [
        { texto: '¿Qué le falta a este contrato?', responde: function () {
            var d = CT() ? CT()._ficha() : null;
            if (!d) return 'La ficha todavía está cargando.';
            var c = d.contrato || {}, p = d.datos || {}, falta = [];
            if (!c.numProceso) falta.push('N° de proceso SECOP II');
            if (!c.fechaInicio) falta.push('fecha de inicio');
            if (!c.fechaTermino) falta.push('fecha de terminación');
            if (!c.rp) falta.push('RP');
            if (!p.firma) falta.push('firma');
            if (!p.numeroCuenta || !p.banco) falta.push('cuenta bancaria');
            if (!p.eps || !p.arl) falta.push('EPS o ARL');
            return falta.length ? 'Le falta: **' + falta.join(', ') + '**. Lo diligencia el contratista desde su app.' : 'No le falta nada: el contrato y sus datos están completos.';
          } }
      ]
    };
  };

  GUIAS.informe = function () {
    return {
      guia: 'Las cuentas de UN contrato (nunca se mezclan dos contratos de la misma persona). Arriba: valor, cobrado, pagado y saldo. ' +
            '**PDF** es un informe para leer, por bloques (puedes sumarle las actividades de cada obligación). **Excel** trae una fila por cuenta con todas las columnas, las mismas de Contabilidad y Tesorería.',
      botones: [
        { texto: '¿Cómo va este contrato?', responde: function () {
            var d = IN() && IN()._datos(); if (!d) return 'Todavía está cargando.';
            var k = K.piezas.informeCuentas.cifras(d);
            return '**' + k.cuentas + '** cuentas' + (k.total ? ' de ' + k.total : '') + ': cobrado **' + pesos(k.cobrado) + '** (' + k.avance + '% del contrato), pagado **' + pesos(k.pagado) + '**, en trámite ' + pesos(k.enTramite) + '. Saldo por ejecutar **' + pesos(k.saldo) + '**.';
          } },
        { texto: '¿Cuál fue la última cuenta?', responde: function () {
            var d = IN() && IN()._datos(); if (!d || !d.cuentas.length) return 'Este contrato todavía no tiene cuentas.';
            var x = d.cuentas[d.cuentas.length - 1];
            return 'La **' + x.informe + (x.total ? ' de ' + x.total : '') + '**: ' + x.estado.toLowerCase() + ', ' + pesos(x.cobro) + (x.radicada ? ', radicada el ' + fechaIso(x.radicada) : '') +
              (x.egreso ? '. Egreso ' + x.egreso + (x.fechaEgreso ? ' del ' + fechaIso(x.fechaEgreso) : '') : '') + '.';
          } },
        { texto: '¿Cuadran los saldos?', responde: function () {
            var d = IN() && IN()._datos(); if (!d || !d.cuentas.length) return 'No hay cuentas.';
            var mal = [];
            d.cuentas.forEach(function (x, i) {
              if (Math.abs((x.saldo - x.cobro) - x.nuevo) > 1) mal.push('cuenta ' + x.informe + ': ' + pesos(x.saldo) + ' − ' + pesos(x.cobro) + ' ≠ ' + pesos(x.nuevo));
              var a = d.cuentas[i - 1];
              if (a && Math.abs(a.nuevo - x.saldo) > 1) mal.push('la ' + a.informe + ' dejó ' + pesos(a.nuevo) + ' y la ' + x.informe + ' arrancó en ' + pesos(x.saldo));
            });
            return mal.length ? '⚠ ' + mal.join('\n⚠ ') : 'Sí: cada saldo menos su cobro da el nuevo saldo y cada cuenta arranca donde terminó la anterior. ✓';
          } }
      ]
    };
  };

  GUIAS.firmados = function () {
    return {
      guia: 'Cada informe de supervisión firmado, con su **ID de firma** (el del código QR del informe). Toca **Ver informe** para abrirlo aquí mismo; en la última cuenta también está el **acta final**. Descarga la lista en PDF (por mes) o Excel.',
      botones: [
        { texto: 'Resúmeme lo firmado', responde: function () {
            var f = FI() ? FI()._filtradas() : []; if (!FI() || !FI()._datos()) return 'Todavía está cargando.';
            var s = 0; f.forEach(function (x) { s += Number(x.cobro) || 0; });
            return '**' + FI()._rango() + '**: ' + f.length + ' informes firmados que certifican **' + pesos(s) + '**.';
          } },
        { texto: '¿Por mes?', responde: function () {
            var f = FI() ? FI()._filtradas() : []; if (!f.length) return 'No hay firmas en este rango.';
            var m = {};
            f.forEach(function (x) { var k = String(x.fecha || '').slice(0, 7); m[k] = (m[k] || 0) + 1; });
            return Object.keys(m).sort().reverse().slice(0, 12).map(function (k) { return '· ' + k.split('-').reverse().join('/') + ': **' + m[k] + '**'; }).join('\n');
          } },
        { texto: '¿A quién le firmé más?', responde: function () {
            var f = FI() ? FI()._filtradas() : []; if (!f.length) return 'No hay firmas en este rango.';
            return listaCorta(top(f, 'nombre', 99), function (x) { return '· **' + nombre(x.k) + '**: ' + x.n; }, 6);
          } }
      ]
    };
  };

  GUIAS.reporte = function () {
    return {
      guia: 'Todas las cuentas de tu supervisión, por **etapa**: en supervisión, en Contratación, devueltas o incompletas, en pago y pagadas. ' +
            'Elige el rango de radicación, filtra y descarga: el **PDF** agrupa por contratista con las cifras arriba; el **Excel** trae todas las columnas. Toca una cuenta para ver el informe de su contrato.',
      botones: [
        { texto: 'Resúmeme el rango', responde: function () {
            var r = RP(); var f = r ? r._filtradas() : []; if (!r || !r._datos()) return 'Todavía está cargando.';
            if (!f.length) return 'No hay cuentas en este rango.';
            var pag = 0, tra = 0;
            f.forEach(function (x) { if (x.etapa === 'ok') pag += Number(x.cobro) || 0; else tra += Number(x.cobro) || 0; });
            return '**' + r._rango() + '**: ' + f.length + ' cuentas. Pagado **' + pesos(pag) + '**, en trámite **' + pesos(tra) + '**.';
          } },
        { texto: '¿Qué está detenido?', responde: function () {
            var r = RP(); var f = r ? r._filtradas().filter(function (x) { return x.etapa !== 'ok'; }) : [];
            if (!f.length) return 'Nada: todo lo de este rango ya está pagado. ✓';
            var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            f = f.slice().sort(function (a, b) { return String(a.radicada).localeCompare(String(b.radicada)); });
            return listaCorta(f, function (x) {
              var d = x.radicada ? Math.round((hoy - new Date(x.radicada + 'T00:00:00')) / 864e5) : null;
              return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + ', ' + x.estado.toLowerCase() + (d !== null ? ' (radicada hace ' + d + ' días)' : '');
            }, 8);
          } },
        { texto: '¿Cuánto se devuelve?', responde: function () {
            var r = RP(); var f = r ? r._filtradas() : []; if (!f.length) return 'No hay cuentas en este rango.';
            var d = f.filter(function (x) { return x.etapa === 'cor'; });
            return d.length ? '**' + d.length + '** de ' + f.length + ' cuentas están devueltas o incompletas ahora mismo:\n' + listaCorta(d, function (x) { return '· **' + nombre(x.nombre) + '**' + (x.motivo ? ': «' + x.motivo.slice(0, 100) + '»' : ''); }, 6)
                            : 'Ninguna cuenta del rango está devuelta ni incompleta. ✓';
          } }
      ]
    };
  };

  GUIAS.requerimientos = function () {
    return {
      guia: 'En **Contratistas** eliges a quién pedirle algo (solo los de tu supervisión): **Redactar**, o marca varios y redacta una sola vez (máximo 20). ' +
            'Le llega como notificación y por WhatsApp, firmado como Supervisión, y queda en su buzón. En **Historial** lo marcas **atendido** cuando lo resuelva.',
      botones: [
        { texto: '¿Cuántos siguen abiertos?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var ab = d.lista.filter(function (r) { return r.estado !== 'ATENDIDO'; });
            if (!d.lista.length) return 'Todavía no has hecho requerimientos desde Supervisión.';
            return ab.length ? '**' + ab.length + '** abiertos de ' + d.lista.length + '.' : 'Ninguno: los ' + d.lista.length + ' están atendidos. ✓';
          } },
        { texto: '¿A quién no le llegó el aviso?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var m = d.lista.filter(function (r) { return /falló|SIN/.test(r.aviso || ''); });
            return m.length ? listaCorta(m, function (r) { return '· **' + nombre(r.nombre) + '** (' + r.id + '): ' + r.aviso; }, 6) : 'A todos les salió el aviso por algún canal. ✓';
          } }
      ]
    };
  };

  GUIAS.comunicados = function () {
    return {
      guia: 'Toca **Nuevo comunicado**: escribe, adjunta documentos (PDF, fotos, Word, Excel…) y publica. Llega como notificación a los teléfonos de los contratistas. **Retirar** lo quita de su app sin borrarlo.',
      botones: [
        { texto: '¿Cuántos teléfonos lo reciben?', responde: function () {
            var d = CM() && CM()._datos(); if (!d) return 'Todavía está cargando.';
            return (d.telefonos === null || d.telefonos === undefined) ? 'No pude contar los teléfonos ahora.' : '**' + d.telefonos + '** teléfonos de contratistas tienen los avisos activados.';
          } },
        { texto: '¿Qué he publicado yo?', responde: function () {
            var d = CM() && CM()._datos(); if (!d) return 'Todavía está cargando.';
            var m = d.lista.filter(function (c) { return c.mio; });
            return m.length ? listaCorta(m, function (c) { return '· ' + (c.fecha ? fechaIso(c.fecha) + ' · ' : '') + (c.estado === 'RETIRADO' ? '(retirado) ' : '') + '«' + String(c.texto || '').slice(0, 60) + '»'; }, 6)
                            : 'Todavía no has publicado comunicados.';
          } }
      ]
    };
  };

  GUIAS.directorio = function () {
    return {
      guia: 'Las dependencias de la Alcaldía con su dirección, correo y líneas. Toca **Cómo llegar**, **Correo**, **WhatsApp** o **Llamar**.',
      botones: [
        { texto: '¿Cuáles tienen WhatsApp?', responde: function () {
            var d = window.INSTITUCIONAL && window.INSTITUCIONAL._dir(); if (!d) return 'Todavía está cargando.';
            var w = d.filter(function (x) { return x.whatsapp; });
            return w.length ? listaCorta(w, function (x) { return '· **' + x.lugar + '**'; }, 14) : 'Ninguna tiene WhatsApp registrado.';
          } }
      ]
    };
  };

  GUIAS.drive = function () {
    return {
      guia: 'La carpeta compartida de la Secretaría de Hacienda. Entra a las carpetas y toca un PDF o una imagen para verlo aquí; lo demás se abre en Google Drive. Quién la ve lo define el administrador.',
      botones: []
    };
  };

  GUIAS.perfil = function () {
    return {
      guia: 'Tu **firma** es la imagen que sale en el informe de supervisión y en el acta de cumplimiento. Sube una foto de tu firma en papel blanco: la app quita el fondo y la recorta. ' +
            'Tu **foto** es la misma en todas las apps de la Alcaldía.',
      botones: [
        { texto: '¿Cómo tomo bien la foto de la firma?', responde: function () {
            return 'Firma con **tinta negra o azul oscura** en una hoja **blanca**, con buena luz y sin sombras. Toma la foto de cerca y derecha. Antes de guardar ves cómo queda.';
          } }
      ]
    };
  };

  var TITULOS = { inicio: 'Tu inicio', revisar: 'Cuentas de mi supervisión', cuenta: 'Revisión de cuenta', prensa: 'Solicitud a Prensa',
                  contratistas: 'Contratistas', contratista: 'Ficha del contratista', informe: 'Informe de cuentas',
                  firmados: 'Informes firmados', reporte: 'Reporte de Supervisión', requerimientos: 'Requerimientos',
                  comunicados: 'Comunicados', directorio: 'Directorio institucional', drive: 'Drive de Hacienda', perfil: 'Mi firma y mi foto' };

  function montar(vista, extra) {
    if (!K.piezas.insights) return;
    var g = GUIAS[vista];
    if (!g) return;
    var base = g();
    var cfg = {
      vista: (extra && extra.vista) || TITULOS[vista] || vista,
      guia: function () { return g().guia; },
      botones: base.botones || [],
      alto: !!base.alto
    };
    if (base.filas) { cfg.filas = base.filas; cfg.medidas = base.medidas; cfg.filtros = base.filtros; }
    K.piezas.insights.montar(cfg);
  }

  window.AYUDA = {
    configurar: function (fn) { if (typeof fn === 'function') CTX = fn; },
    montar: montar,
    tiene: function (v) { return !!GUIAS[v]; },
    _guias: GUIAS
  };
}());
