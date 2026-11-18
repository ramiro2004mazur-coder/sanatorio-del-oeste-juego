# Sanatorio del Oeste · el juego

Juego web pixel art (estilo RPG visto desde arriba) para cerrar la presentación del TP de **Equipos, Personas y Liderazgo**.
Se juega desde el celular escaneando un QR. Nivel 1: **Gestión del cambio**.

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

1. Copiá `src/levels/gestion-del-cambio.js` a un archivo nuevo (por ejemplo `src/levels/liderazgo.js`) y cambiá el contenido.
2. Sumalo a la lista en `src/levels/index.js`.

El mapa del hospital (`src/core/map.js`) es el mismo para todos los niveles. Cada nivel define en su archivo:

| Campo | Qué es |
| --- | --- |
| `titulo`, `subtitulo` | Nombre del nivel y frase de la pantalla de inicio. |
| `jugador`, `dolor` | Dónde arrancás, dolor inicial, cuánto sube por segundo, tope de tiempo. |
| `carteles`, `cartelesExtra`, `puertasCerradas` | Qué dicen los carteles de los consultorios (y cómo quedan arreglados). |
| `npcs`, `pacientes` | Personajes con su posición (en tiles) y los pacientes que deambulan. |
| `zonas` | Rectángulos del mapa que disparan eventos al entrar. |
| `pasos` | El guion: objetivo de cada paso, a dónde apunta la flechita y cuándo se completa. |
| `reglas` | "Cuando hablás con X / entrás a Y (en el paso Z), decí esto, subí el dolor, marcá esto, pasá a tal paso". Gana la primera que coincide. |
| `cola`, `desmayo` | El final guionado (mostrador colapsado) y el texto del desmayo. |
| `queFallo`, `decision` | Pantalla "¿Qué falló?" y las 3 opciones (una `correcta: true`, las otras con `porQue`). |
| `arreglado` | Lo que pasa en la repetición del hospital arreglado. |
| `propuesta`, `final` | Contenido de "Nuestra propuesta" y el resumen del final. |

En los textos, `**así**` resalta palabras. Los sprites disponibles están en `src/core/characters.js` (podés agregar más cambiando colores).

Hoy el juego arranca siempre en el nivel 1 (`state.levelIndex = 0` en `src/core/state.js`); para encadenar niveles alcanza con avanzar ese índice desde la pantalla final.

## Modo debug

Agregá `?debug=1` a la URL: aparece un botón **DBG** abajo a la izquierda para saltar a cualquier escena, ver hitboxes y poner velocidad x3.
Sin el parámetro no existe nada de eso. `?test=1` solo expone los hooks que usan los tests.

## Estructura

```
src/
  main.js            configuración de Phaser
  config.js          créditos
  levels/            un archivo por nivel + index.js
  core/              audio, fuentes, sprites, mapa, mundo (grilla y caminos), UI, estado, debug
  scenes/            Boot → Title → Game (+Hud) → WhatFailed → Decision → (Lost) → Fixed → Proposal → End
tests/               Playwright
qr.html              página del QR (se genera en el build)
site.config.js       usuario de GitHub y nombre del repo (URL pública)
```

## Limitaciones conocidas

- **iPhone en modo silencio** (switch lateral): Safari no reproduce Web Audio. El juego anda igual, sin sonido.
- El sonido arranca recién con el primer toque (lo exigen los navegadores).
- En celular acostado aparece "Girá el celu" y el juego queda en pausa hasta que lo enderezás.
- En pantallas muy altas el juego deja franjas arriba y abajo (mantiene la proporción 9:16).
