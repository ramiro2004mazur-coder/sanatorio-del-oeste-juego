// Fuentes pixel empaquetadas en el build (sin Google Fonts ni CDN).
import vtUrl from '@fontsource/vt323/files/vt323-latin-400-normal.woff2?url';
import pxUrl from '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff2?url';

export const FONT_BODY = '"VT323", "Courier New", monospace';
export const FONT_TITLE = '"Silkscreen", "VT323", "Courier New", monospace';

// Carga las fuentes; si tardan o fallan, el juego sigue con la fuente de respaldo.
export function loadFonts(timeoutMs = 3500) {
  const list = [
    ['VT323', vtUrl, { weight: '400' }],
    ['Silkscreen', pxUrl, { weight: '700' }],
  ];
  const loads = list.map(([family, url, desc]) => {
    try {
      if (typeof FontFace === 'undefined' || !document.fonts) return Promise.resolve();
      const face = new FontFace(family, `url(${url}) format("woff2")`, desc);
      return face
        .load()
        .then((f) => {
          document.fonts.add(f);
        })
        .catch(() => {});
    } catch (e) {
      return Promise.resolve();
    }
  });
  const timeout = new Promise((r) => setTimeout(r, timeoutMs));
  return Promise.race([Promise.all(loads), timeout]);
}
