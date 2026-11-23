import { SUPPORT } from '../../game/config/support';

/**
 * Los dos botones para apoyar el proyecto (T-044, BT-01): "Compartir" y "Comentarios". Aqui se decide que pasa al pulsar
 * cada uno; lo que hace falta del navegador llega en `SupportEnv`, asi las reglas se prueban sin navegador. El componente
 * (`SupportButtons`) ensena el resultado.
 *
 * Los dos abren algo fuera del juego (la hoja de compartir del aparato o la aplicacion de correo) sin navegar: la partida
 * y la pantalla completa no se tocan desde aqui. Sin conexion, ninguno lo intenta: lo dice (`offline`).
 */

/** Lo que el juego necesita del navegador para apoyar el proyecto. */
export interface SupportEnv {
  /** Hay conexion (`navigator.onLine`). */
  readonly online: boolean;
  /** La hoja de compartir del aparato (`navigator.share`), si la tiene. Falla con `AbortError` si el jugador la cierra. */
  readonly share?: (data: ShareData) => Promise<void>;
  /** Copia un texto; false si el navegador no deja. */
  readonly copy: (text: string) => Promise<boolean>;
  /** Abre un enlace `mailto:` en la aplicacion de correo, sin salir del juego. */
  readonly openMail: (href: string) => void;
}

/** Lo que paso al pulsar un boton: lo que el componente le cuenta al jugador. */
export type SupportResult =
  /** Sin conexion: no se intento nada. */
  | { readonly kind: 'offline' }
  /** Se abrio la hoja de compartir del aparato (y se compartio o el jugador la cerro): no hay nada que decir. */
  | { readonly kind: 'shared' }
  /** Sin hoja de compartir: el enlace quedo copiado. */
  | { readonly kind: 'copied'; readonly url: string }
  /** Ni hoja de compartir ni copiar: el enlace, a la vista para copiarlo a mano. */
  | { readonly kind: 'manual'; readonly url: string }
  /** Se pidio abrir el correo. Si el aparato no tiene aplicacion de correo, nada se abre: la direccion, a la vista. */
  | { readonly kind: 'mail'; readonly email: string };

/** El enlace `mailto:` del boton "Comentarios": destinatario y asunto rellenos (el asunto lleva la version, BT-02). */
export function feedbackHref(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

/**
 * La direccion del juego que se comparte: la de la configuracion o, sin ella, la del juego abierto (origen y base de Vite,
 * sin la pagina ni los parametros: `?brote=` es solo de desarrollo).
 */
export function gameUrl(configured: string | null, origin: string, base: string): string {
  if (configured) return configured;
  return new URL(base || '/', origin).href;
}

/** "Compartir": la hoja del aparato y, si no hay (o falla), copia el enlace; si tampoco, lo deja a la vista. */
export async function shareGame(env: SupportEnv, data: { title: string; text: string; url: string }): Promise<SupportResult> {
  if (!env.online) return { kind: 'offline' };
  if (env.share) {
    try {
      await env.share(data);
      return { kind: 'shared' };
    } catch (error) {
      // Cerrar la hoja no es un fallo: no hay nada que decir.
      if (error instanceof Error && error.name === 'AbortError') return { kind: 'shared' };
    }
  }
  return (await env.copy(data.url)) ? { kind: 'copied', url: data.url } : { kind: 'manual', url: data.url };
}

/** "Comentarios": un correo nuevo para Carmine con el asunto puesto. */
export function sendFeedback(env: SupportEnv, email: string, subject: string): SupportResult {
  if (!env.online) return { kind: 'offline' };
  env.openMail(feedbackHref(email, subject));
  return { kind: 'mail', email };
}

/** Copia con el portapapeles moderno o, en http (la red de casa, sin `navigator.clipboard`), con el metodo de antes. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Sigue con el metodo de antes.
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand('copy');
    field.remove();
    return done;
  } catch {
    return false;
  }
}

/**
 * Abre el correo sin navegar: un enlace que se pulsa solo. Con `location.href` algunos navegadores tratan la pagina como si
 * se fuera (y el juego guardaria y pausaria para nada).
 */
function openMail(href: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Lo del navegador de verdad, leido en el momento (la conexion puede ir y venir). */
export function browserSupport(): SupportEnv {
  const share = typeof navigator.share === 'function' ? (data: ShareData) => navigator.share(data) : undefined;
  return { online: navigator.onLine !== false, share, copy: copyText, openMail };
}

/** La direccion del juego que se comparte, en este navegador. */
export function currentGameUrl(): string {
  return gameUrl(SUPPORT.shareUrl, window.location.origin, import.meta.env.BASE_URL);
}

