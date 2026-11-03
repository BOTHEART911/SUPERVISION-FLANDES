/* ============================================================
   KIT-FLANDES · HUELLAS DE LAS EVIDENCIAS (02/11/2026)

   Para qué
     Saber si una evidencia ya se presentó en una cuenta anterior del mismo
     contrato (aunque salte cuentas: la de la cuenta 3 en la 6).

       · Imagen: el teléfono recomprime cada foto, así que dos copias de la
         misma foto nunca tienen los mismos bytes. Se compara su FORMA: la
         imagen reducida a 64 px de ancho y en grises, partida en una rejilla,
         dice en cada fila si una celda es más clara que la siguiente (dHash).
           h64  = rejilla 9×8   → 64 bits (filtro rápido)
           h256 = rejilla 17×16 → 256 bits (confirma)
         Es EXACTAMENTE el mismo cálculo que hace el CORE (Huellas1102.gs) con
         la miniatura de Drive de las fotos viejas.
       · Adjunto (PDF/Word/Excel): huella exacta (md5), la misma que Drive
         guarda como md5Checksum.

   Rendimiento
     · Una foto: < 15 ms (se mide sobre la imagen ya preparada).
     · md5 de un adjunto de 10 MB: ~60 ms. Ningún viaje al servidor.

   Cómo se usa
     H.deFuente(canvas|img|bitmap)      → {h64, h256}
     H.deArchivo(File)                  → Promise {h64, h256}
     H.md5(File|ArrayBuffer)            → Promise 'hex'
     H.igual(a, b, umbral)              → true si son la misma imagen
     H.indice(d)                        → índice de las cuentas anteriores
                                           (respuesta de revisionAnterior /
                                           actividadesAnteriores con ev:1)
     H.buscar(indice, {h64,h256}|{md5}) → [{informe, obl}] (la más reciente primero)
   ============================================================ */
(function () {
  'use strict';
  var K = window.KIT;
  if (!K) return;

  var MINI = 64;
  var UMBRAL = { h64: 10, h256: 40 };   /* el CORE manda el suyo (d.evid.umbral) */

  /* ── el algoritmo (IGUAL en el CORE) ── */
  function grilla(g, w, h, cols, rows) {
    var out = new Array(cols * rows);
    for (var cy = 0; cy < rows; cy++) {
      var y0 = Math.floor(cy * h / rows), y1 = Math.max(y0 + 1, Math.floor((cy + 1) * h / rows));
      for (var cx = 0; cx < cols; cx++) {
        var x0 = Math.floor(cx * w / cols), x1 = Math.max(x0 + 1, Math.floor((cx + 1) * w / cols));
        var s = 0, n = 0;
        for (var y = y0; y < y1 && y < h; y++) for (var x = x0; x < x1 && x < w; x++) { s += g[y * w + x]; n++; }
        out[cy * cols + cx] = n ? s / n : 0;
      }
    }
    return out;
  }
  function dhash(g, w, h, cols, rows) {
    var a = grilla(g, w, h, cols, rows), hex = '', nib = 0, k = 0;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols - 1; x++) {
        nib = (nib << 1) | (a[y * cols + x] > a[y * cols + x + 1] ? 1 : 0);
        if (++k === 4) { hex += nib.toString(16); nib = 0; k = 0; }
      }
    }
    return hex;
  }
  function huellas(g, w, h) { return { h64: dhash(g, w, h, 9, 8), h256: dhash(g, w, h, 17, 16) }; }

  var POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  function dist(a, b) {
    a = String(a || ''); b = String(b || '');
    if (!a || a.length !== b.length) return -1;
    var d = 0;
    for (var i = 0; i < a.length; i++) d += POP[parseInt(a.charAt(i), 16) ^ parseInt(b.charAt(i), 16)];
    return d;
  }
  function igual(x, y, um) {
    um = um || UMBRAL;
    if (!x || !y) return false;
    var d1 = dist(x.h64, y.h64);
    if (d1 < 0 || d1 > um.h64) return false;
    var d2 = dist(x.h256, y.h256);
    return d2 >= 0 && d2 <= um.h256;
  }

  /* ── del navegador ── */

  /**
   * La miniatura de 64 px de ancho, bajando por mitades (con suavizado alto):
   * de 1.600 a 64 de un salto el navegador submuestrea y la huella cambia
   * entre equipos; por mitades queda como la miniatura de Drive.
   */
  function mini(src) {
    var w = src.width || src.naturalWidth || 0, h = src.height || src.naturalHeight || 0;
    if (!w || !h) throw new Error('imagen vacía');
    var cur = src, cw = w, ch = h;
    while (cw > MINI * 2) {
      var nw = Math.max(MINI, Math.round(cw / 2)), nh = Math.max(1, Math.round(ch * nw / cw));
      var c = document.createElement('canvas'); c.width = nw; c.height = nh;
      var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.fillStyle = '#fff'; g.fillRect(0, 0, nw, nh);
      g.drawImage(cur, 0, 0, nw, nh);
      cur = c; cw = nw; ch = nh;
    }
    var fw = MINI, fh = Math.max(1, Math.round(ch * MINI / cw));
    var f = document.createElement('canvas'); f.width = fw; f.height = fh;
    var fg = f.getContext('2d', { willReadFrequently: true }); fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = 'high';
    fg.fillStyle = '#fff'; fg.fillRect(0, 0, fw, fh);
    fg.drawImage(cur, 0, 0, fw, fh);
    return { g: fg, w: fw, h: fh };
  }

  /** Huellas de un canvas, <img> o ImageBitmap ya dibujable. */
  function deFuente(src) {
    var m = mini(src);
    var px = m.g.getImageData(0, 0, m.w, m.h).data, n = m.w * m.h, gris = new Array(n);
    for (var i = 0; i < n; i++) gris[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    return huellas(gris, m.w, m.h);
  }

  function deArchivo(file) {
    var abrir = window.createImageBitmap
      ? createImageBitmap(file, { imageOrientation: 'from-image' })['catch'](function () { return createImageBitmap(file); })
      : new Promise(function (ok, mal) {
        var u = URL.createObjectURL(file), im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); ok(im); };
        im.onerror = function () { URL.revokeObjectURL(u); mal(new Error('no se pudo leer la imagen')); };
        im.src = u;
      });
    return Promise.resolve(abrir).then(function (b) {
      var r = deFuente(b);
      if (b.close) try { b.close(); } catch (e) {}
      return r;
    });
  }

  /* ── md5 (RFC 1321), sobre los bytes del archivo ── */
  var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  var T = new Int32Array(64);
  for (var ti = 0; ti < 64; ti++) T[ti] = Math.floor(Math.abs(Math.sin(ti + 1)) * 4294967296) | 0;

  function md5Bytes(u8) {
    var n = u8.length, total = ((n + 8) >>> 6) + 1, W = new Int32Array(16);
    var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (var blk = 0; blk < total; blk++) {
      var base = blk * 64;
      for (var j = 0; j < 16; j++) {
        var w = 0;
        for (var q = 0; q < 4; q++) {
          var p = base + j * 4 + q, by;
          if (p < n) by = u8[p]; else if (p === n) by = 0x80; else by = 0;
          w |= by << (q * 8);
        }
        W[j] = w;
      }
      if (blk === total - 1) { var bits = n * 8; W[14] = bits | 0; W[15] = Math.floor(bits / 4294967296) | 0; }
      var A = a0, B = b0, C = c0, D = d0;
      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
        else { F = C ^ (B | ~D); g = (7 * i) & 15; }
        var tmp = D; D = C; C = B;
        var x = (A + F + T[i] + W[g]) | 0;
        B = (B + ((x << S[i]) | (x >>> (32 - S[i])))) | 0;
        A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    function hex(v) { var s = ''; for (var k = 0; k < 4; k++) s += ('0' + ((v >>> (k * 8)) & 255).toString(16)).slice(-2); return s; }
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  }

  function md5(x) {
    if (x instanceof ArrayBuffer) return Promise.resolve(md5Bytes(new Uint8Array(x)));
    var leer = x && x.arrayBuffer ? x.arrayBuffer() : new Promise(function (ok, mal) {
      var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = mal; r.readAsArrayBuffer(x);
    });
    return leer.then(function (ab) { return md5Bytes(new Uint8Array(ab)); });
  }

  /* ── el índice de las cuentas anteriores ──
     d.evid = { umbral:{h64,h256}, cuentas:{ "<informe>": { "<obl>": {i:[[id,h64,h256]], a:[[id,nombre,md5]]} } },
                actual:{...igual...}, otros:[...] } */
  function indice(d) {
    var ev = d && d.evid;
    if (!ev) return null;
    var img = [], adj = [];
    Object.keys(ev.cuentas || {}).forEach(function (inf) {
      var c = ev.cuentas[inf] || {};
      Object.keys(c).forEach(function (o) {
        (c[o].i || []).forEach(function (x) { if (x[1]) img.push({ informe: +inf, obl: +o, id: x[0], h64: x[1], h256: x[2] || '' }); });
        (c[o].a || []).forEach(function (x) { if (x[2]) adj.push({ informe: +inf, obl: +o, id: x[0], nombre: x[1] || '', md5: x[2] }); });
      });
    });
    img.sort(function (a, b) { return b.informe - a.informe; });
    adj.sort(function (a, b) { return b.informe - a.informe; });
    return { img: img, adj: adj, umbral: ev.umbral || UMBRAL, actual: ev.actual || {}, otros: ev.otros || [] };
  }

  /** Dónde se usó antes. q = {h64,h256} o {md5}. Devuelve las coincidencias (más reciente primero). */
  function buscar(ix, q) {
    if (!ix || !q) return [];
    if (q.md5) return ix.adj.filter(function (x) { return x.md5 === q.md5; });
    return ix.img.filter(function (x) { return igual(q, x, ix.umbral); });
  }

  K.piezas.huella = {
    deFuente: deFuente, deArchivo: deArchivo, md5: md5, md5Bytes: md5Bytes,
    dist: dist, igual: igual, indice: indice, buscar: buscar,
    _huellas: huellas, umbral: UMBRAL, mini: MINI
  };
}());
