/**
 * Reglas del juego instalable (T-029, ADR-0021), puras y con test: que boton de instalar sale en la portada y cuando se
 * aplica una version nueva. Lo que escucha al navegador esta en `install.ts` y `update.ts`.
 */

/**
 * Lo que ofrece el boton "Instalar" de la portada:
 * - `none`: no sale. Ya instalado, o un navegador que no deja instalar (Firefox de escritorio).
 * - `prompt`: abre el dialogo de instalacion del navegador (Chrome y Edge).
 * - `ios`: abre la ayuda con los dos pasos de Safari (V-02): Compartir y "Anadir a pantalla de inicio".
 * - `menu`: el navegador ya lo ofrecio y el jugador cancelo; hasta que lo vuelva a ofrecer, el boton explica como
 *   instalar desde su menu. Asi el boton no desaparece al cancelar y sigue funcionando.
 */
export type InstallOffer = 'none' | 'prompt' | 'ios' | 'menu';

export interface InstallState {
  /** Abierto como aplicacion instalada (o recien instalado en esta pagina). */
  installed: boolean;
  /** iPhone o iPad: no hay dialogo de instalacion. */
  ios: boolean;
  /** El navegador dejo un dialogo de instalacion listo (`beforeinstallprompt`) que aun no se uso. */
  canPrompt: boolean;
  /** El navegador ofrecio instalar en algun momento de esta visita. */
  offered: boolean;
}

export function installOffer({ installed, ios, canPrompt, offered }: InstallState): InstallOffer {
  if (installed) return 'none';
  if (canPrompt) return 'prompt';
  if (ios) return 'ios';
  return offered ? 'menu' : 'none';
}

/** Lo justo del navegador para saber si es un iPhone o un iPad. */
export interface DeviceHints {
  userAgent: string;
  /** `navigator.maxTouchPoints`: un iPad con iPadOS se presenta como un Mac, pero tactil. */
  maxTouchPoints: number;
}

/** iPhone, iPod o iPad, tambien el iPad que dice ser un Mac. Cualquier navegador de iOS instala igual: desde Compartir. */
export function isIos({ userAgent, maxTouchPoints }: DeviceHints): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** Lo justo del navegador para saber si la pagina se abrio como aplicacion instalada. */
export interface DisplayHints {
  /** `(display-mode: standalone)` */
  standalone: boolean;
  /** `(display-mode: fullscreen)`, que tambien es verdad en el navegador con la pantalla completa puesta (ADR-0007). */
  fullscreen: boolean;
  /** Hay un elemento a pantalla completa (`document.fullscreenElement`): es la del navegador, no la de la aplicacion. */
  fullscreenElement: boolean;
  /** `navigator.standalone`: Safari de iOS abierto desde la pantalla de inicio. */
  iosStandalone: boolean;
}

/**
 * Si se abrio como aplicacion instalada. Instalada se abre a pantalla completa (V-04), pero el navegador tambien dice
 * "pantalla completa" cuando el juego la pide (ADR-0007): solo cuenta si no la pidio la pagina.
 */
export function isInstalled({ standalone, fullscreen, fullscreenElement, iosStandalone }: DisplayHints): boolean {
  return standalone || iosStandalone || (fullscreen && !fullscreenElement);
}

/**
 * Como esta la version nueva:
 * - `none`: no hay.
 * - `waiting`: bajada y esperando a que se la deje entrar.
 * - `reload`: ya manda (la dejo entrar esta pestana u otra) y solo falta recargar la pagina.
 */
export type UpdateState = 'none' | 'waiting' | 'reload';

export interface UpdateMoment {
  update: UpdateState;
  /** En la portada o en el Invernadero (T-019): ninguna partida en marcha. */
  onTitle: boolean;
  /** Hay una vineta de la historia encima (T-031). */
  story: boolean;
  /** El jugador esta escribiendo (su nombre, T-033). */
  typing: boolean;
}

/**
 * Si es el momento de aplicar la version nueva (V-03): sola, sin preguntar, y solo en la portada, nunca en mitad de una
 * partida, de una vineta o mientras se escribe. Lo normal es que llegue al abrir el juego, en la portada; quien la recibe
 * jugando termina su partida y la tiene al volver a la portada.
 */
export function shouldApplyUpdate({ update, onTitle, story, typing }: UpdateMoment): boolean {
  return update !== 'none' && onTitle && !story && !typing;
}
