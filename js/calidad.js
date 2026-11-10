/* ============================================================
   CALIDAD DEL PRIMER FILTRO · CONTRATACIÓN, ADMIN y SUPERVISIÓN
   (mismo archivo en las tres apps) · 10/11/2026

   La vista es de la pieza 39 del kit (kit/calidad.js): aquí solo se
   pone la cabecera y se elige el modo.
     · CONTRATACIÓN y ADMIN: una tarjeta por supervisor, de mayor a menor
       calidad, con su INFORME gerencial (permiso calidadSupervision).
     · SUPERVISIÓN (modo 'mia'): el supervisor ve SOLO su tarjeta y lo que
       le conviene reforzar (permiso calidadMia). Sin ranking.
   Una sola lectura por vista (se recuerda en el teléfono y se renueva por
   detrás); los botones y la cabecera se pintan al instante.
   ============================================================ */
(function () {
  'use strict';
  var K = window.KIT;
  var C = {};

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct cal"></div>');
    C.app.appendChild(caja);
    var O = window.OFICINA, mia = C.modo === 'mia';
    if (O && O.cabecera) {
      O.cabecera(caja, 'grafica', mia ? 'MI CALIDAD COMO PRIMER FILTRO' : 'CALIDAD DEL PRIMER FILTRO',
        mia ? 'Cómo llegan a Contratación las cuentas que apruebas.' : 'Cómo llegan a Contratación las cuentas que aprueba cada supervisor.');
    }
    var cuerpo = K.nodo('<div class="cal-cuerpo"></div>');
    caja.appendChild(cuerpo);
    var Q = K.piezas.calidad;
    if (!Q) cuerpo.appendChild(C.errorCaja(new Error('Esta vista necesita la versión nueva de la app. Recarga la página.')));
    else if (mia) Q.vistaMia(cuerpo, { accion: 'calidadMia' });
    else Q.vistaRanking(cuerpo, { accionLista: 'calidadSupervisores', accionUno: 'calidadSupervisor', app: C.nombreApp || 'Contratación', recordar: 'calidad.ranking' });
    if (K.piezas.creditos) K.piezas.creditos.montar(caja);
  }

  /** La guía del asistente de ayuda (la usa js/ayuda.js de cada app). */
  function ayuda() {
    var mia = C.modo === 'mia';
    if (mia) return {
      guia: 'Tu **calidad como primer filtro**: qué tan completas llegan a Contratación las cuentas que apruebas, con los mismos **6 bombillos** que guían al contratista. ' +
            'Combina la **redacción con que pasan** (80 %) y las que **Contratación devolvió después** (20 %). Abajo, **Para tu próxima revisión** dice qué conviene reforzar. **Informe** arma tu PDF. Solo tú ves este detalle en Supervisión.',
      botones: [
        { texto: '¿Cómo subo mi porcentaje?', responde: function () {
            return 'Antes de **Aprobar**, mira los bombillos de cada actividad: si alguno está en rojo, tócalo y usa **Pasar a la observación para el contratista** y devuelve la cuenta. ' +
                   'Lo que más pesa es lo que se repite en **Para tu próxima revisión**. Cada cuenta que llega completa a Contratación sube el porcentaje.';
          } }
      ]
    };

    var Q = function () { try { return K.recordado.leer('calidad.ranking'); } catch (e) { return null; } };
    return {
      guia: 'Una tarjeta por **supervisor**, de mayor a menor **calidad del primer filtro**: qué tan completas llegan a Contratación las cuentas que aprueba, con los mismos **6 bombillos** que guían al contratista. ' +
            'El porcentaje combina la **redacción con que pasan** (80 %) y las que **Contratación devolvió después** (20 %). Sus propias devoluciones se muestran pero no suben el puntaje. ' +
            'Con menos de 5 cuentas aparece al final, sin puesto. **Informe** arma el PDF gerencial del supervisor con hallazgos, lo que se le escapa, lo que devuelve y **compromisos sugeridos**. Es una herramienta de mejora, no una sanción.',
      botones: [
        { texto: '¿Cómo se calcula el porcentaje?', responde: function () {
            return 'Cada obligación vale el promedio de sus bombillos (verde 100, ámbar 50, rojo 0; el gris no cuenta). La cuenta vale el promedio de sus obligaciones de gestión (las generales y las «no requeridas» no entran; una vacía vale 0). ' +
                   'El supervisor: **80 %** el promedio de las cuentas que aprobó + **20 %** (100 − % de esas cuentas que Contratación devolvió después). Lo de antes del 10/11 se midió con el texto de hoy y sale marcado como aproximado.';
          } },
        { texto: '¿Qué bombillo se deja pasar más?', responde: function () {
            var d = Q(); if (!d || !d.supervisores) return 'Todavía está cargando.';
            var B = ['Qué hizo distinto', 'Cuántos', 'Para quién', 'Resultado', 'Cuándo', 'Soporte'];
            var s = [0, 0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0, 0];
            d.supervisores.forEach(function (x) { (x.bomb || []).forEach(function (v, i) { if (v !== null && v !== undefined) { s[i] += v; n[i]++; } }); });
            var L = B.map(function (t, i) { return { t: t, v: n[i] ? Math.round(s[i] / n[i]) : null }; }).filter(function (x) { return x.v !== null; }).sort(function (a, b) { return a.v - b.v; });
            if (!L.length) return 'Aún no hay medidas.';
            return 'En todo el equipo, lo que más se deja pasar:\n' + L.slice(0, 3).map(function (x) { return '· **' + x.t + '**: ' + x.v + ' % en verde'; }).join('\n');
          } }
      ]
    };
  }

  window.CALIDAD = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    ayuda: ayuda
  };
}());
