// Flags de debug/test. Nunca se activan sin parámetro en la URL.
let params;
try {
  params = new URLSearchParams(window.location.search);
} catch (e) {
  params = new URLSearchParams('');
}

export const DEBUG = params.get('debug') === '1';
export const TEST = DEBUG || params.get('test') === '1';
export const START_SPEED = (() => {
  const s = Number(params.get('speed'));
  return TEST && s > 0 && s <= 10 ? s : 1;
})();
