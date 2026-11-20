import { useSyncExternalStore } from 'react';
import { getLanguage, subscribeLanguage, text, type Dictionary, type Language } from '../i18n';

/** Idioma en curso (T-011). El componente se vuelve a pintar al cambiarlo. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

/** Textos del idioma en curso (`src/i18n/`). El componente se vuelve a pintar al cambiar de idioma. */
export function useText(): Dictionary {
  return text(useLanguage());
}
