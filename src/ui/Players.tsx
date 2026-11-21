import { useState, type RefObject } from 'react';
import { cleanName, isValidName } from '../game/playerName';
import { MAX_PROFILES, type Profile } from '../game/profiles';
import { formatSavedAt } from '../i18n';
import { NameField } from './NameField';
import { hasPlayed, lostLines, playerName, type PlayerCard } from './playerCards';
import { useLanguage, useText } from './useText';

/** Cuantos colores de avatar hay: el de cada jugador sale de su numero ("Jugador 1" verde-sol, 2 coral y 3 cielo). */
const AVATAR_TONES = 3;

/**
 * Avatar de un jugador (T-034): un brote en un circulo de su color. Cada numero lleva algo suyo (el 2, un capullo; el 3,
 * una tercera hoja) para distinguirlos de un vistazo. No es una planta del juego: es un dibujo de menu, como el brote del
 * titulo.
 */
export function PlayerAvatar({ profile, sway = false }: { profile: Profile; sway?: boolean }) {
  const tone = ((profile.number - 1) % AVATAR_TONES) + 1;
  return (
    <svg className={`player-avatar tone-${tone}${sway ? ' is-swaying' : ''}`} viewBox="0 0 32 32" aria-hidden="true">
      <circle className="player-avatar-disc" cx="16" cy="16" r="14.5" />
      <circle className="player-avatar-shine" cx="12.5" cy="11.5" r="7.5" />
      <path className="player-avatar-soil" d="M6.5 25.5 C10 22.5 22 22.5 25.5 25.5 C23 29.2 9 29.2 6.5 25.5 Z" />
      <g className="player-avatar-sprout">
        <path className="player-avatar-stem" d="M16 25 C16 21 15.4 18 16 13.5" />
        <path className="player-avatar-leaf is-left" d="M16 18 C10.5 19 6.5 15.5 6.5 10 C12 10 15.5 13 16 18 Z" />
        <path className="player-avatar-leaf is-right" d="M16 15.5 C17.6 10 22 7 26 7.6 C25.6 12.6 21.6 16.2 16 15.5 Z" />
        {tone === 2 && <circle className="player-avatar-bud" cx="16" cy="11.8" r="2.6" />}
        {tone === 3 && <path className="player-avatar-leaf is-small" d="M16 21.5 C19.5 20 23 21 24.4 23.6 C21 24.8 17.8 24 16 21.5 Z" />}
      </g>
    </svg>
  );
}

interface PlayerChipProps {
  profile: Profile;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}

/** Arriba del menu de la portada: quien juega y el boton para cambiar de jugador (T-034). */
export function PlayerChip({ profile, buttonRef, onClick }: PlayerChipProps) {
  const t = useText();
  const name = playerName(t, profile);
  return (
    <button ref={buttonRef} type="button" className="player-chip" onClick={onClick} aria-label={t.players.changeLabel(name)} title={t.players.changeLabel(name)}>
      <PlayerAvatar profile={profile} sway />
      <span className="player-chip-text">
        <small>{t.players.playing}</small>
        <strong>{name}</strong>
      </span>
      <span className="player-chip-change">
        <span aria-hidden="true">⇄</span> {t.players.change}
      </span>
    </button>
  );
}

interface PlayersPanelProps {
  titleId: string;
  /** Recibe el foco al abrir: el boton de volver, como en Opciones y Creditos. */
  firstButton: RefObject<HTMLButtonElement | null>;
  players: readonly PlayerCard[];
  /** El jugador activo. */
  active: string;
  /** Al volver de la confirmacion: el jugador que se acaba de borrar, para avisarlo. */
  removed: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  /** Pide confirmar el borrado. */
  onRemove: (id: string) => void;
  onBack: () => void;
}

/**
 * Pantalla de jugadores (T-034), en el panel de la portada: cada jugador con su avatar, su nombre, sus jefes vencidos y la
 * ultima vez que jugo; el activo, marcado. Elegir uno lo deja activo y vuelve al menu. Al lado de cada uno, la papelera
 * (borrar pide confirmacion). Debajo, crear uno nuevo, apagado con el maximo de jugadores y diciendo por que.
 */
export function PlayersPanel({ titleId, firstButton, players, active, removed, onSelect, onCreate, onRemove, onBack }: PlayersPanelProps) {
  const t = useText();
  const language = useLanguage();
  const now = Date.now();
  const canCreate = players.length < MAX_PROFILES;
  const alone = players.length === 1;
  return (
    <>
      <div className="settings-header">
        <button ref={firstButton} type="button" className="btn btn-ghost" onClick={onBack} aria-label={t.common.back} title={t.common.back}>
          <span aria-hidden="true">←</span>
        </button>
        <h2 id={titleId} className="pause-title is-small">
          {t.players.title}
        </h2>
      </div>
      <ul className="player-list">
        {players.map((card, i) => {
          const { profile } = card;
          const name = playerName(t, profile);
          const current = profile.id === active;
          // El unico jugador, sin nada guardado ni nombre (T-033): borrarlo no cambiaria nada.
          const removable = !alone || lostLines(t, card).length > 0 || profile.name !== null;
          return (
            <li key={profile.id} className="player-row" style={{ animationDelay: `${0.05 + 0.07 * i}s` }}>
              <button
                type="button"
                className={`btn player-pick${current ? ' is-current' : ''}`}
                aria-current={current ? 'true' : undefined}
                title={t.players.select(name)}
                onClick={() => onSelect(profile.id)}
              >
                <PlayerAvatar profile={profile} sway={current} />
                <span className="player-info">
                  <span className="player-name-line">
                    <strong className="player-name">{name}</strong>
                    {current && <span className="btn-badge">{t.players.current}</span>}
                  </span>
                  <small className="btn-detail player-detail">{t.players.defeated(card.progress.defeated.length)}</small>
                  <small className="btn-detail player-detail is-when">
                    {hasPlayed(profile) ? t.players.lastPlayed(formatSavedAt(profile.updatedAt, now, language)) : t.players.notPlayed}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="btn btn-erase player-remove"
                aria-label={t.players.remove(name)}
                title={removable ? t.players.remove(name) : t.players.nothingToRemove}
                disabled={!removable}
                onClick={() => onRemove(profile.id)}
              >
                <span className="trash-icon" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {removed && (
        <p className="settings-note is-done player-removed" role="status">
          {t.players.removed(removed)}
        </p>
      )}
      <button
        type="button"
        className="btn has-detail player-create"
        onClick={onCreate}
        disabled={!canCreate}
        title={canCreate ? t.players.createDetail : t.players.fullDetail(MAX_PROFILES)}
      >
        <span className="btn-line">
          <span aria-hidden="true">+</span> {canCreate ? t.players.create : t.players.full}
        </span>
        <small className="btn-detail">{canCreate ? t.players.createDetail : t.players.fullDetail(MAX_PROFILES)}</small>
      </button>
    </>
  );
}

interface RemovePlayerProps {
  titleId: string;
  firstButton: RefObject<HTMLButtonElement | null>;
  card: PlayerCard;
  /** Es el unico jugador: al borrarlo queda uno nuevo y vacio. */
  last: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** "Borrar jugador" (PF-06): dice que se pierde y que se queda. El foco empieza en "Mejor no". */
export function RemovePlayer({ titleId, firstButton, card, last, onCancel, onConfirm }: RemovePlayerProps) {
  const t = useText();
  const lines = lostLines(t, card);
  return (
    <div className="title-confirm is-player" role="alertdialog" aria-labelledby={titleId}>
      <h2 id={titleId} className="pause-title is-small">
        {t.players.confirmTitle(playerName(t, card.profile))}
      </h2>
      {lines.length > 0 ? (
        <>
          <p className="title-confirm-text">{t.players.confirmLost}</p>
          <ul className="title-confirm-list">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="title-confirm-text">{t.players.confirmNothing}</p>
      )}
      <p className="title-confirm-note">{last ? t.players.confirmLast : t.players.confirmKept}</p>
      <div className="pause-actions">
        <button ref={firstButton} type="button" className="btn" onClick={onCancel}>
          {t.players.confirmNo}
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {t.players.confirmYes}
        </button>
      </div>
    </div>
  );
}

interface PlayerNameSettingProps {
  profile: Profile;
  /** Ya limpio y distinto del que tenia. */
  onRename: (name: string) => void;
}

/**
 * El nombre del jugador activo en Opciones de la portada (T-033): el campo con el que tiene y "Guardar", apagado mientras
 * no haya un nombre nuevo. Con el campo vacio se ve su nombre provisional ("Jugador 1"). Intro tambien guarda.
 */
export function PlayerNameSetting({ profile, onRename }: PlayerNameSettingProps) {
  const t = useText();
  const [value, setValue] = useState(profile.name ?? '');
  /** El nombre que se acaba de guardar, para decirlo hasta que se vuelva a escribir. */
  const [saved, setSaved] = useState<string | null>(null);
  const clean = cleanName(value);
  const changed = isValidName(value) && clean !== profile.name;
  return (
    <section className="settings-section">
      <h3>{t.name.section}</h3>
      <form
        className="name-setting"
        onSubmit={(event) => {
          event.preventDefault();
          if (!changed) return;
          onRename(clean);
          setValue(clean);
          setSaved(clean);
        }}
      >
        <NameField
          value={value}
          onChange={(next) => {
            setValue(next);
            setSaved(null);
          }}
          placeholder={t.players.defaultName(profile.number)}
        />
        <button type="submit" className="btn name-save" disabled={!changed} title={isValidName(value) ? undefined : t.name.empty}>
          {t.name.save}
        </button>
      </form>
      {saved ? (
        <p className="settings-note is-done" role="status">
          {t.name.saved(saved)}
        </p>
      ) : (
        <p className="settings-note">{t.name.help}</p>
      )}
    </section>
  );
}
