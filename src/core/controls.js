// Estado compartido de controles: la HUD (joystick/botón A) escribe, el juego lee.
export const controls = {
  joyDir: null, // 'up' | 'down' | 'left' | 'right' | null
  aPending: false,
  pressA() {
    this.aPending = true;
  },
  consumeA() {
    const v = this.aPending;
    this.aPending = false;
    return v;
  },
  reset() {
    this.joyDir = null;
    this.aPending = false;
  },
};
