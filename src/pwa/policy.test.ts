import { describe, expect, it } from 'vitest';
import { installOffer, isInstalled, isIos, shouldApplyUpdate, type InstallState, type UpdateMoment } from './policy';

const fresh: InstallState = { installed: false, ios: false, canPrompt: false, offered: false };

describe('installOffer', () => {
  it('Chrome o Edge sin instalar: el dialogo del navegador', () => {
    expect(installOffer({ ...fresh, canPrompt: true, offered: true })).toBe('prompt');
  });

  it('un navegador que no deja instalar (Firefox de escritorio): sin boton', () => {
    expect(installOffer(fresh)).toBe('none');
  });

  it('instalado: sin boton, aunque el navegador ofrezca otra vez', () => {
    expect(installOffer({ ...fresh, installed: true, canPrompt: true, offered: true })).toBe('none');
    expect(installOffer({ ...fresh, installed: true, ios: true })).toBe('none');
  });

  it('iPhone o iPad: la ayuda con los dos pasos', () => {
    expect(installOffer({ ...fresh, ios: true })).toBe('ios');
  });

  it('el jugador cancelo el dialogo: el boton sigue y explica el menu hasta que el navegador vuelva a ofrecerlo', () => {
    expect(installOffer({ ...fresh, offered: true })).toBe('menu');
    expect(installOffer({ ...fresh, offered: true, canPrompt: true })).toBe('prompt');
  });
});

describe('isIos', () => {
  it.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1', 5],
    ['iPad antiguo', 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148', 5],
    ['iPad que se presenta como Mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15', 5],
    ['Chrome en iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0 Mobile/15E148 Safari/604.1', 5],
  ])('%s: si', (_, userAgent, maxTouchPoints) => {
    expect(isIos({ userAgent, maxTouchPoints })).toBe(true);
  });

  it.each([
    ['Mac de verdad', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15', 0],
    ['Android', 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36', 5],
    ['Firefox en Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0', 0],
  ])('%s: no', (_, userAgent, maxTouchPoints) => {
    expect(isIos({ userAgent, maxTouchPoints })).toBe(false);
  });
});

describe('isInstalled', () => {
  const browser = { standalone: false, fullscreen: false, fullscreenElement: false, iosStandalone: false };

  it('en una pestana del navegador: no', () => {
    expect(isInstalled(browser)).toBe(false);
  });

  it('abierta como aplicacion, a pantalla completa (Android) o sin barra (iPhone): si', () => {
    expect(isInstalled({ ...browser, fullscreen: true })).toBe(true);
    expect(isInstalled({ ...browser, standalone: true })).toBe(true);
    expect(isInstalled({ ...browser, iosStandalone: true })).toBe(true);
  });

  it('en el navegador con la pantalla completa del juego (ADR-0007): no', () => {
    expect(isInstalled({ ...browser, fullscreen: true, fullscreenElement: true })).toBe(false);
  });
});

describe('shouldApplyUpdate', () => {
  const idle: UpdateMoment = { update: 'waiting', onTitle: true, story: false, typing: false };

  it('version nueva en la portada: se aplica sola', () => {
    expect(shouldApplyUpdate(idle)).toBe(true);
    expect(shouldApplyUpdate({ ...idle, update: 'reload' })).toBe(true);
  });

  it('sin version nueva: nada', () => {
    expect(shouldApplyUpdate({ ...idle, update: 'none' })).toBe(false);
  });

  it('nunca en mitad de una partida, aunque ya mande (la dejo entrar otra pestana)', () => {
    expect(shouldApplyUpdate({ ...idle, onTitle: false })).toBe(false);
    expect(shouldApplyUpdate({ ...idle, update: 'reload', onTitle: false })).toBe(false);
  });

  it('ni con una vineta encima ni mientras se escribe el nombre', () => {
    expect(shouldApplyUpdate({ ...idle, story: true })).toBe(false);
    expect(shouldApplyUpdate({ ...idle, typing: true })).toBe(false);
  });
});
