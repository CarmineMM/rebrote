/**
 * En el movil en horizontal la ronda ("Ronda 9 de 9") va en la primera fila del HUD, entre la bandeja y los corazones.
 * Si no cabe (un movil estrecho, cuatro cartas, un saldo de cuatro cifras, el ingles...), va debajo de los corazones. Esta
 * regla, sin React ni DOM, dice si cabe entre el borde derecho de la bandeja y el izquierdo de los marcadores (vidas,
 * saldo y pausa). La fila es una rejilla de cuatro columnas (bandeja, hueco que se estira, ronda y marcadores), asi que
 * entre ellas van tres separaciones aunque el hueco se quede en nada.
 */
export function roundFitsBesideLives(trayRight: number, roundWidth: number, markersLeft: number, gap: number): boolean {
  return trayRight + roundWidth + 3 * gap <= markersLeft;
}
