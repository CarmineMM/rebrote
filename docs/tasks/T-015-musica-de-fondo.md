# [Audio] Música de fondo

**Estado:** Pendiente · **Prioridad:** Media · **Tamaño estimado:** S (orientativo) · **Depende de:** T-014 · **Bloquea a:** ninguna · **Origen:** conversación de diseño del 20 nov 2026

## Contexto
La música no se genera con Phaser: es un archivo de audio que alguien compuso y que Phaser reproduce en bucle. Esta task reutiliza el módulo de audio de T-014. Los créditos ya tienen pantalla (`src/ui/Credits.tsx` y `credits` en `src/i18n/`), que es donde va la atribución si la licencia la pide.

## Objetivos
1. **Tres ambientes:** menú, ronda y jefe.
2. **Cambios suaves** entre pistas, sin cortes.
3. **Licencias en regla** y atribución visible.

## Alcance
**Incluye:** tres pistas en bucle, fundido entre ellas, ajuste `musicVolume` (sugerido) junto al de efectos, carga diferida, atribución en Créditos, origen y licencia anotados junto a cada archivo.
**No incluye:** música adaptativa por capas (idea para más adelante: instrumentos orgánicos con una capa digital que entra cuando aprieta la oleada), una pista por brote.

## Decisiones pendientes
| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| U-01 | ¿De dónde sale la música? | a) Incompetech (pide atribución). b) OpenGameArt. c) Generada con IA. d) Encargo | a o b para empezar. Si es c, revisar la licencia del plan antes de monetizar | Carmine |
| U-02 | ¿Qué pistas? | Las elige Carmine de oído | Tono: marimba, madera o ukelele para menú y ronda; algo más tenso y digital para el jefe | Carmine |
| U-03 | ¿Qué hace la música en pausa? | a) Se calla. b) Baja de volumen | b: se nota que el juego sigue ahí | Carmine |

Esta task no se puede ejecutar hasta que Carmine entregue los tres archivos o sus enlaces (U-01 y U-02).

## Criterios de aceptación
- [ ] En la portada y los menús suena la pista de menú en bucle.
- [ ] Al empezar una partida suena la pista de ronda; en la ronda del jefe, la del jefe.
- [ ] El cambio entre pistas es un fundido, sin silencio brusco ni dos pistas a todo volumen a la vez.
- [ ] El bucle no tiene salto audible al repetirse.
- [ ] Hay un control de volumen de música separado del de efectos, y se recuerda.
- [ ] Con la música a 0 no se descarga ni se reproduce ninguna pista.
- [ ] La portada aparece igual de rápido que antes: la música se descarga después.
- [ ] Con la pestaña oculta o el aviso de girar la pantalla, la música se calla.
- [ ] Créditos muestra autor, título y licencia de cada pista, en español e inglés.
- [ ] `npm test` y `npm run build` pasan.

## Casos límite y riesgos
- La música no puede empezar antes del primer toque del jugador: en la portada arranca con el primer clic.
- Volver del tablero al menú a mitad de un fundido no deja dos pistas sonando.
- Peso: cada pista debería rondar 1 a 2 MB. Si pesa más, se recorta o se baja la calidad.
- Derrota y victoria: la música baja para dejar oír su efecto (T-014).

## Objetivo final con ejemplos
| Momento | Se oye |
|---|---|
| Portada tras el primer clic | Pista de menú |
| Ronda 3 | Pista de ronda |
| Ronda 10, llega Creeper | Fundido a la pista de jefe |
| Música a 0, efectos a 80 | Solo efectos |

## Cómo probarlo (QA)
1. Dejar sonar cada pista dos vueltas completas y escuchar el empalme.
2. Pasar de menú a partida y de la ronda 9 a la 10.
3. Recargar con la música a 0 y mirar en la pestaña de red que no se descarga.
