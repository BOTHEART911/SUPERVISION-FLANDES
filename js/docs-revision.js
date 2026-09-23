/* ============================================================
   CONTRATACION-FLANDES · DOCUMENTOS DE LA REVISIÓN (entrega 5.4)

   Por qué existe
     En la 5.3 cada documento se pedía al CORE en el momento de tocarlo,
     uno por uno. Medido el 23/09 con la cuenta real por revisar:
     0,6 a 3,4 s de servidor por documento, más el viaje de ida y vuelta.
     Pasar de un documento al siguiente volvía a costar lo mismo.

   Qué hace ahora
     · Al abrir la cuenta, el CORE lista la carpeta una sola vez y devuelve
       cada archivo con un BOLETO firmado (revisionArchivos).
     · Mientras la persona lee la pestaña, este módulo baja los documentos
       en segundo plano, en paquetes de hasta 4 MB (revisionPaquete: el CORE
       los baja de Drive en paralelo) con dos viajes a la vez. Primero los
       de la pestaña donde está la persona.
     · Si toca uno que todavía no ha llegado, ese se pide solo y ya, sin
       esperar la cola.
     · Los bytes quedan en memoria mientras la cuenta esté abierta: volver
       a un documento es inmediato.
     · Si algo falla (CORE viejo, boleto vencido, red), el visor cae a la
       ruta de la 5.3 (revisionDocumento). Nunca se queda sin documento.

   El revisor sigue sin necesitar permisos de Drive en su teléfono: los
   bytes salen del CORE, igual que en la 5.3.

   Uso (desde revision.js)
     DOCS_REV.recibir(q, respuestaDeRevisionArchivos)
     DOCS_REV.precargar([ids en orden])
     DOCS_REV.pedir(id)      -> Promise {nombre, mime, tipo, bytes} o null
     DOCS_REV.adelantar([ids])
     DOCS_REV.olvidar()
     DOCS_REV.medidas()      -> lo que tardó cada paquete (para Insights)
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;

  var LOTE_BYTES = 4 * 1024 * 1024;     /* por viaje */
  var LOTE_DOCS = 6;
  var EN_VUELO = 2;                     /* viajes a la vez en segundo plano */
  var TOPE_UNO = 12 * 1024 * 1024;      /* más grande que esto: solo al tocarlo */
  var TOPE_PRECARGA = 40 * 1024 * 1024; /* memoria que se permite adelantar */

  var S = null;   /* la cuenta abierta */
  var GEN = 0;

  function diferido() {
    var d = { enviado: false, listo: false };
    d.p = new Promise(function (res, rej) { d.res = res; d.rej = rej; });
    d.p['catch'](function () {});   /* sin "unhandled rejection" si nadie lo abrió */
    return d;
  }

  /** latin-1 (un carácter = un byte) → bytes */
  function aBytes(l1) {
    var n = l1.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = l1.charCodeAt(i) & 255;
    return out;
  }

  function recibir(q, r) {
    GEN++;
    S = { gen: GEN, q: q, boletos: {}, cache: {}, cola: [], enVuelo: 0, precargado: 0, medidas: [] };
    r = r || {};
    var cols = r.columnas || {};
    Object.keys(cols).forEach(function (id) {
      var c = cols[id];
      if (c && c.t && !c.falta) S.boletos[id] = { t: c.t, bytes: c.bytes || 0, mime: c.mime || '', nombre: c.nombre || '' };
    });
    (r.grupos || []).forEach(function (g) {
      (g.archivos || []).forEach(function (a) {
        if (a.t && !S.boletos[a.id]) S.boletos[a.id] = { t: a.t, bytes: a.bytes || 0, mime: a.mime || '', nombre: a.nombre || '' };
      });
    });
  }

  function hay(id) { return !!(S && S.boletos[id]); }

  function entrada(id) {
    if (!S.cache[id]) S.cache[id] = diferido();
    return S.cache[id];
  }

  function fallo(id, e) {
    var c = S.cache[id];
    if (!c) return;
    delete S.cache[id];            /* se puede volver a pedir */
    c.rej(e);
  }

  function enviar(ids) {
    var st = S;
    if (!st || !ids.length) return;
    st.enVuelo++;
    ids.forEach(function (id) { entrada(id).enviado = true; });
    var t0 = Date.now();
    K.pedir('revisionPaquete', { docs: ids.map(function (id) { return { id: id, t: st.boletos[id].t }; }) }, { ms: 90000 })
      .then(function (r) {
        if (st !== S) return;
        var vistos = {}, bytes = 0;
        (r && r.docs || []).forEach(function (d) {
          vistos[d.id] = true;
          var c = st.cache[d.id];
          if (!c) return;
          if (typeof d.l1 === 'string') {
            var b = aBytes(d.l1);
            bytes += b.length;
            c.listo = true;
            c.res({ nombre: st.boletos[d.id].nombre || 'documento', mime: d.mime, tipo: d.tipo, bytes: b });
          } else if (d.luego) {
            c.enviado = false;
            st.cola.unshift(d.id);   /* no cupo: va en el próximo viaje */
          } else {
            fallo(d.id, new Error(d.error || 'No se pudo traer el documento.'));
          }
        });
        ids.forEach(function (id) { if (!vistos[id]) fallo(id, new Error('El documento no llegó.')); });
        st.medidas.push({ docs: ids.length, kb: Math.round(bytes / 1024), ms: Date.now() - t0 });
      }, function (e) {
        if (st !== S) return;
        ids.forEach(function (id) { fallo(id, e); });
        st.medidas.push({ docs: ids.length, kb: 0, ms: Date.now() - t0, error: (e && e.message) || 'red' });
      })
      .then(function () {
        if (st !== S) return;
        st.enVuelo--;
        bombear();
      });
  }

  /** Arma el siguiente paquete de la cola: hasta 6 documentos o 4 MB. */
  function bombear() {
    if (!S) return;
    while (S.enVuelo < EN_VUELO && S.cola.length) {
      var lote = [], peso = 0;
      while (S.cola.length && lote.length < LOTE_DOCS) {
        var id = S.cola[0];
        var c = S.cache[id];
        if (c && c.enviado) { S.cola.shift(); continue; }
        var b = S.boletos[id] ? (S.boletos[id].bytes || 400 * 1024) : 0;
        if (lote.length && peso + b > LOTE_BYTES) break;
        S.cola.shift();
        lote.push(id);
        peso += b;
      }
      if (!lote.length) break;
      enviar(lote);
    }
  }

  function precargar(ids) {
    if (!S) return;
    (ids || []).forEach(function (id) {
      var b = S.boletos[id];
      if (!b || S.cache[id] || S.cola.indexOf(id) >= 0) return;
      var peso = b.bytes || 400 * 1024;
      if (peso > TOPE_UNO || S.precargado + peso > TOPE_PRECARGA) return;
      S.precargado += peso;
      S.cola.push(id);
    });
    bombear();
  }

  /** Los vecinos del que se está viendo pasan al frente de la cola. */
  function adelantar(ids) {
    if (!S) return;
    (ids || []).slice().reverse().forEach(function (id) {
      var i = S.cola.indexOf(id);
      if (i > 0) { S.cola.splice(i, 1); S.cola.unshift(id); }
      else if (i < 0 && hay(id) && !S.cache[id]) S.cola.unshift(id);
    });
    bombear();
  }

  /** El documento para el visor. null si no hay boleto (el visor usa la ruta vieja). */
  function pedir(id) {
    if (!hay(id)) return null;
    var c = S.cache[id];
    if (c && (c.enviado || c.listo)) return c.p;
    var i = S.cola.indexOf(id);
    if (i >= 0) S.cola.splice(i, 1);
    enviar([id]);            /* se pide ya, aunque haya otros dos viajes en curso */
    return S.cache[id].p;
  }

  function listo(id) { return !!(S && S.cache[id] && S.cache[id].listo); }

  function olvidar() { GEN++; S = null; }

  window.DOCS_REV = {
    recibir: recibir, precargar: precargar, adelantar: adelantar, pedir: pedir, listo: listo, hay: hay,
    olvidar: olvidar,
    medidas: function () { return S ? S.medidas.slice() : []; },
    _aBytes: aBytes
  };
}());
