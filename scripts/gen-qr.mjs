// Genera qr-juego.png (para meter en la presentación) con la URL pública del juego.
import QRCode from 'qrcode';
import { PUBLIC_URL } from '../site.config.js';

await QRCode.toFile('qr-juego.png', PUBLIC_URL, {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 1200,
  color: { dark: '#0f2a2e', light: '#ffffff' },
});
console.log(`qr-juego.png → ${PUBLIC_URL}`);
