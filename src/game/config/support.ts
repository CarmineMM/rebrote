/**
 * Apoyar el proyecto (T-044, BT-01 y BT-02): a donde llevan los botones del aviso de beta. Es el unico sitio con estos
 * enlaces: los componentes los leen de aqui, nunca escritos a mano. Como la musica, no van en `balance.ts`: no cambian el
 * juego.
 *
 * - "Comentarios" abre un correo nuevo para `feedbackEmail`, con el asunto ya puesto y la version del juego (el texto del
 *   asunto esta en `beta.feedbackSubject` de `src/i18n/`).
 * - "Compartir" comparte la direccion del juego: `shareUrl` o, si es null, la direccion en la que esta abierto (su origen y
 *   la base de Vite), que es la que funciona donde se publique.
 *
 * La direccion de correo queda a la vista de cualquiera que abra el juego: Carmine lo acepta por sencillez (T-044).
 */
export const SUPPORT = {
  feedbackEmail: 'carminemaggiom@gmail.com',
  shareUrl: null as string | null,
} as const;
