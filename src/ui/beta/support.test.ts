import { describe, expect, it, vi } from 'vitest';
import { SUPPORT } from '../../game/config/support';
import { feedbackHref, gameUrl, sendFeedback, shareGame, type SupportEnv } from './support';

const DATA = { title: 'Rebrote', text: '¡Pruébalo!', url: 'https://rebrote.example/' };

function env(overrides: Partial<SupportEnv> = {}): SupportEnv {
  return { online: true, copy: vi.fn(async () => true), openMail: vi.fn(), ...overrides };
}

describe('enlaces para apoyar el proyecto (T-044, BT-02)', () => {
  it('los enlaces estan en la configuracion', () => {
    expect(SUPPORT.feedbackEmail).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
  });

  it('"Comentarios" abre un correo con el destinatario y el asunto, con la version, sin romper los acentos', () => {
    const href = feedbackHref('alguien@example.com', 'Rebrote: comentarios de la beta (versión 0.16.2)');
    expect(href.startsWith('mailto:alguien@example.com?subject=')).toBe(true);
    expect(decodeURIComponent(href.split('subject=')[1])).toBe('Rebrote: comentarios de la beta (versión 0.16.2)');
    expect(href).not.toContain(' ');
  });

  it('se comparte la direccion del juego: la configurada o, sin ella, la del juego abierto sin parametros', () => {
    expect(gameUrl('https://rebrote.example/', 'http://localhost:5199', '/')).toBe('https://rebrote.example/');
    expect(gameUrl(null, 'http://localhost:5199', '/')).toBe('http://localhost:5199/');
    expect(gameUrl(null, 'https://carmine.example', '/rebrote/')).toBe('https://carmine.example/rebrote/');
    expect(gameUrl(null, 'https://carmine.example', '')).toBe('https://carmine.example/');
  });
});

describe('"Compartir" (T-044)', () => {
  it('usa la hoja de compartir del aparato si la tiene', async () => {
    const share = vi.fn(async () => undefined);
    const copy = vi.fn(async () => true);
    expect(await shareGame(env({ share, copy }), DATA)).toEqual({ kind: 'shared' });
    expect(share).toHaveBeenCalledWith(DATA);
    expect(copy).not.toHaveBeenCalled();
  });

  it('cerrar la hoja no es un fallo: no dice nada ni copia', async () => {
    const share = vi.fn(async () => {
      throw Object.assign(new Error('cerrada'), { name: 'AbortError' });
    });
    const copy = vi.fn(async () => true);
    expect(await shareGame(env({ share, copy }), DATA)).toEqual({ kind: 'shared' });
    expect(copy).not.toHaveBeenCalled();
  });

  it('sin hoja (o si falla), copia el enlace y lo dice', async () => {
    expect(await shareGame(env(), DATA)).toEqual({ kind: 'copied', url: DATA.url });
    const share = vi.fn(async () => {
      throw Object.assign(new Error('no permitido'), { name: 'NotAllowedError' });
    });
    expect(await shareGame(env({ share }), DATA)).toEqual({ kind: 'copied', url: DATA.url });
  });

  it('si tampoco se puede copiar, deja el enlace a la vista', async () => {
    expect(await shareGame(env({ copy: async () => false }), DATA)).toEqual({ kind: 'manual', url: DATA.url });
  });

  it('sin conexion avisa y no intenta nada', async () => {
    const share = vi.fn(async () => undefined);
    const copy = vi.fn(async () => true);
    expect(await shareGame(env({ online: false, share, copy }), DATA)).toEqual({ kind: 'offline' });
    expect(share).not.toHaveBeenCalled();
    expect(copy).not.toHaveBeenCalled();
  });
});

describe('"Comentarios" (T-044)', () => {
  it('abre el correo con su enlace y deja la direccion a la vista por si no hay aplicacion de correo', () => {
    const openMail = vi.fn();
    expect(sendFeedback(env({ openMail }), 'alguien@example.com', 'Asunto')).toEqual({ kind: 'mail', email: 'alguien@example.com' });
    expect(openMail).toHaveBeenCalledWith('mailto:alguien@example.com?subject=Asunto');
  });

  it('sin conexion avisa y no abre nada', () => {
    const openMail = vi.fn();
    expect(sendFeedback(env({ online: false, openMail }), 'alguien@example.com', 'Asunto')).toEqual({ kind: 'offline' });
    expect(openMail).not.toHaveBeenCalled();
  });
});
