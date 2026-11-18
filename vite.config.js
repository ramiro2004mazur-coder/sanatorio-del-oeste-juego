import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import QRCode from 'qrcode';
import { REPO, PUBLIC_URL } from './site.config.js';

const root = dirname(fileURLToPath(import.meta.url));

// Inserta el QR (como data URL, generado en build) y la URL pública en qr.html.
function qrEmbed() {
  return {
    name: 'qr-embed',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
      if (!html.includes('__QR_DATA_URL__')) return html;
      const dataUrl = await QRCode.toDataURL(PUBLIC_URL, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 1024,
        color: { dark: '#0f2a2e', light: '#ffffff' },
      });
      return html.replaceAll('__QR_DATA_URL__', dataUrl).replaceAll('__PUBLIC_URL__', PUBLIC_URL);
      },
    },
  };
}

export default defineConfig({
  base: `/${REPO}/`,
  plugins: [qrEmbed()],
  build: {
    target: 'es2018',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        qr: resolve(root, 'qr.html'),
      },
    },
  },
  server: { host: true },
});
