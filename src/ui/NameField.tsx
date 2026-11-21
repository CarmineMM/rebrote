import { useId, useRef, type RefObject } from 'react';
import { NAME_MAX_LENGTH, limitName, nameLength } from '../game/playerName';
import { useText } from './useText';

interface NameFieldProps {
  value: string;
  /** Recibe lo que queda en el campo, ya sin lo que no se puede escribir (`limitName`). */
  onChange: (value: string) => void;
  /** Lo que se ve con el campo vacio. */
  placeholder: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** "is-light" sobre el bocadillo de la viñeta; por defecto, el del panel de los menus. */
  tone?: 'light' | 'dark';
}

/**
 * Campo para escribir el nombre del jugador (T-033): en la viñeta en la que Boxer lo pregunta y en Opciones. No deja
 * escribir mas letras que el maximo (contadas como las ve el jugador: un emoji es una) y dice cuantas lleva. Mientras se
 * compone una letra con el teclado (acentos, japones, la sugerencia de Android) no se corta: se corta al acabarla.
 */
export function NameField({ value, onChange, placeholder, inputRef, tone = 'dark' }: NameFieldProps) {
  const t = useText();
  const countId = useId();
  const composing = useRef(false);
  const own = useRef<HTMLInputElement>(null);
  const input = inputRef ?? own;
  const used = Math.min(nameLength(value), NAME_MAX_LENGTH);

  return (
    <span className={`name-field is-${tone}`}>
      <input
        ref={input}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={t.name.label}
        aria-describedby={countId}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(event) => onChange(composing.current ? event.target.value : limitName(event.target.value))}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          onChange(limitName(event.currentTarget.value));
        }}
      />
      <span id={countId} className={`name-count${used >= NAME_MAX_LENGTH ? ' is-full' : ''}`}>
        <span aria-hidden="true">{t.name.count(used, NAME_MAX_LENGTH)}</span>
        <span className="visually-hidden">{t.name.countLabel(used, NAME_MAX_LENGTH)}</span>
      </span>
    </span>
  );
}
