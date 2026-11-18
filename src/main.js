import Phaser from 'phaser';
import './style.css';
import { initDom } from './core/dom.js';
import { initDevtools } from './core/devtools.js';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import Game from './scenes/Game.js';
import Hud from './scenes/Hud.js';
import WhatFailed from './scenes/WhatFailed.js';
import Decision from './scenes/Decision.js';
import Lost from './scenes/Lost.js';
import Fixed from './scenes/Fixed.js';
import Proposal from './scenes/Proposal.js';
import End from './scenes/End.js';
import Levels from './scenes/Levels.js';
import Finale from './scenes/Finale.js';

const config = {
  // Canvas 2D: más predecible que WebGL en celulares viejos y sin pérdidas de contexto.
  type: Phaser.CANVAS,
  parent: 'game',
  width: 720,
  height: 1280,
  backgroundColor: '#0f2a2e',
  pixelArt: true,
  roundPixels: true,
  banner: false,
  audio: { noAudio: true }, // el audio lo manejamos nosotros (core/audio.js)
  input: { activePointers: 3, windowEvents: true },
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Title, Levels, Game, Hud, WhatFailed, Decision, Lost, Fixed, Proposal, End, Finale],
};

const game = new Phaser.Game(config);
initDom(game);
initDevtools(game);
