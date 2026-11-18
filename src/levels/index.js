// Lista de niveles, en orden. Para sumar uno:
//  1. Crear el archivo de datos (copiá uno de esta carpeta) → textos, mapa, guion, opciones, propuesta.
//  2. Si necesita animaciones propias, crear eventos/<id>.js (o reutilizar uno).
//  3. Agregarlo acá abajo en LEVELS y en SCRIPTS.
import gestionDelCambio from './gestion-del-cambio.js';
import seguridadPsicologica from './seguridad-psicologica.js';
import feedbackCoaching from './feedback-coaching.js';
import eventosCambio from './eventos/gestion-del-cambio.js';
import eventosSeguridad from './eventos/seguridad-psicologica.js';
import eventosFeedback from './eventos/feedback-coaching.js';

export const LEVELS = [gestionDelCambio, seguridadPsicologica, feedbackCoaching];

const SCRIPTS = {
  [gestionDelCambio.id]: eventosCambio,
  [seguridadPsicologica.id]: eventosSeguridad,
  [feedbackCoaching.id]: eventosFeedback,
};

export function scriptFor(id) {
  return SCRIPTS[id] || {};
}
