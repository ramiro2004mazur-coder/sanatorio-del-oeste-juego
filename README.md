# Sanatorio del Oeste · el juego

Juego web pixel art (estilo RPG visto desde arriba) para cerrar la presentación del TP de **Equipos, Personas y Liderazgo**.
Se juega desde el celular escaneando un QR. Tres niveles (todos desbloqueados desde el menú):

1. **Gestión del cambio**: sos un paciente con la rodilla rota. Medidor: DOLOR.
2. **Seguridad psicológica** · "El error de la factura": sos Lucía, administrativa. Medidor: MIEDO.
3. **Feedback y coaching** · "Un año sin feedback": sos Tomás, enfermero nuevo. Medidor: MOTIVACIÓN (batería que baja) y un calendario de enero a diciembre.

- Juego: https://ramiro2004mazur-coder.github.io/sanatorio-del-oeste-juego/
- QR para proyectar: https://ramiro2004mazur-coder.github.io/sanatorio-del-oeste-juego/qr.html
- QR en PNG para la presentación: [`qr-juego.png`](qr-juego.png)

100 % estático: Phaser 3.80.1 + Vite. Sin backend, sin imágenes ni audios externos (todo se dibuja y se sintetiza por código).
Cada push a `main` se publica solo en GitHub Pages (`.github/workflows/deploy.yml`).

## Correrlo en tu compu

```bash
npm install
npm run dev        # http://localhost:5173/sanatorio-del-oeste-juego/
npm run build      # genera dist/
npm test           # tests de Playwright (iPhone SE, iPhone 14, Pixel 5, landscape y compu)
```

Para probar contra la versión publicada:

```bash
BASE_URL=https://ramiro2004mazur-coder.github.io/sanatorio-del-oeste-juego/ npx playwright test
```

## Editar los créditos

Abrí `src/config.js` y cambiá los textos:

```js
export const CREDITOS = {
  materia: 'Equipos, Personas y Liderazgo',
  profesor: 'Nombre del profe',
  grupo: ['Nombre 1', 'Nombre 2', 'Nombre 3'],
};
```

Hacé commit y push a `main`: en uno o dos minutos está publicado.

## Cómo se agrega un nivel

1. Copiá uno de los archivos de `src/levels/` (por ejemplo `seguridad-psicologica.js`) a uno nuevo y cambiá el contenido.
2. Si el nivel necesita animaciones propias (una cola que se forma, papeles que se multiplican, un pergamino...), creá
   `src/levels/eventos/<id>.js`. Si no, podés reutilizar los eventos de otro nivel.
3. Sumalo a `LEVELS` y a `SCRIPTS` en `src/levels/index.js`. Aparece solo en el menú y en la pantalla final.

El mapa (`src/core/map.js`) es el mismo para todos: los consultorios y el hall a la izquierda, y el ala del personal a la
derecha (Administración, office de enfermería con el QR, Jefatura y sala de reuniones). Cada nivel elige qué puertas
están cerradas y qué carteles hay. Campos del archivo de datos:

| Campo | Qué es |
| --- | --- |
| `titulo`, `subtitulo`, `menu` | Nombre del nivel y textos de la carta del menú. |
| `jugador` | A quién manejás: `sprite`, `nombre`, posición y `andar` (`renguea`, `tiembla`, `cansado`). |
| `medidor` | La barra de arriba: `nombre`, `icono` (`face`, `fear`, `batt`), `sube` (false = batería), `vineta`, `inicial`, `porSegundo`, `maxAntesDelColapso`, `topeSegundos` (tope de tiempo: la derrota llega sí o sí), `lentitud`. |
| `camara` | `{ ancho }` en tiles, si el nivel no usa todo el mapa. |
| `carteles`, `cartelesExtra`, `puertasCerradas` | Carteles de las puertas, carteles sueltos y puertas cerradas. |
| `npcs`, `pacientes`, `objetos` | Personajes, pacientes que deambulan y objetos tocables (fichero, bandeja, carrito; `sprite` y `solido` opcionales). |
| `zonas` | Rectángulos del mapa que disparan eventos al entrar. |
| `pasos` | El guion: objetivo, a dónde apunta la flechita (`npc:`, `obj:`, `puerta:`), `contador`, `completo`, `alEntrar`. |
| `reglas` | "Cuando hablás con X / tocás Y / entrás a Z (en el paso P), decí esto, mové el medidor, marcá, disparé tal evento, pasá a tal paso". Gana la primera que coincide. |
| `desmayo` | Texto de la derrota (la animación la define el guion del nivel). |
| `queFallo`, `decision` | "¿Qué falló?" y las 3 opciones (una `correcta: true`, las otras con `porQue`). Salen en orden aleatorio. |
| `arreglado` | Datos de la repetición "así sería con nuestra propuesta". |
| `propuesta` | Bloques, recuadro `encuesta` (opcional) y recuadro `materia`. |
| `final` | `resumen` (pantalla de nivel completado) y `linea` (pantalla final). |

En los textos, `**así**` resalta palabras. Los sprites están en `src/core/characters.js` (se agregan cambiando colores).
Los niveles completados se guardan en `localStorage` (si el navegador no deja, no pasa nada).

## Modo debug

Agregá `?debug=1` a la URL: aparece un botón **DBG** abajo a la izquierda para saltar a cualquier escena o nivel, ver hitboxes y poner velocidad x3.
Sin el parámetro no existe nada de eso. `?test=1` solo expone los hooks que usan los tests.

## Estructura

```
src/
  main.js            configuración de Phaser
  config.js          créditos
  levels/            un archivo de datos por nivel + index.js
  levels/eventos/    animaciones propias de cada nivel
  core/              audio, fuentes, sprites, mapa, mundo (grilla y caminos), UI, estado, debug
  scenes/            Boot → Title → Levels → Game (+Hud) → WhatFailed → Decision → (Lost) → Fixed → Proposal → End / Finale
tests/               Playwright
qr.html              página del QR (se genera en el build)
site.config.js       usuario de GitHub y nombre del repo (URL pública)
```

## Limitaciones conocidas

- **iPhone en modo silencio** (switch lateral): Safari no reproduce Web Audio. El juego anda igual, sin sonido.
- El sonido arranca recién con el primer toque (lo exigen los navegadores).
- En celular acostado aparece "Girá el celu" y el juego queda en pausa hasta que lo enderezás.
- En pantallas muy altas el juego deja franjas arriba y abajo (mantiene la proporción 9:16).
