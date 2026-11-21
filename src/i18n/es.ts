/**
 * Textos del juego en espanol, el idioma de referencia (T-011, ADR-0009). Cada texto nuevo va aqui y en `en.ts` con la
 * misma clave: el tipo `Dictionary` sale de este archivo y obliga al ingles a tenerlos todos. Los textos con numeros son
 * funciones que reciben los numeros ya formateados (`formatNumber`, `formatPercent`, `formatSeconds`) o enteros.
 * Nada de numeros de balance aqui: llegan como argumento desde las reglas.
 */
export const es = {
  /** Para `Intl` (fechas y "hace 5 minutos"). */
  locale: 'es-ES',
  /** Coma decimal y espacio antes de "%" ("57,5", "20 %"). */
  decimalComma: true,

  common: {
    back: 'Volver',
    close: 'Cerrar',
    loading: 'Cargando el jardín…',
    /** Lo que aun no existe: la tienda y las plantas del Invernadero (T-019), el brote que viene. */
    soon: 'Próximamente',
  },

  /** Aviso de girar la pantalla en un movil o tableta en vertical (ADR-0011). */
  rotate: {
    title: 'Gira la pantalla',
    body: 'Rebrote se juega en horizontal. Pon el móvil o la tableta de lado para jugar.',
    paused: 'Tu partida te espera en pausa.',
  },

  time: {
    justNow: 'ahora mismo',
  },

  /**
   * Brotes (T-018): cada campana que acaba en un jefe. Su nombre es su numero y su jefe ("Brote 1: Creeper"), que se ve
   * siempre (B-03). El nombre del jefe sale de `info.enemy.names`.
   */
  outbreak: {
    title: (number: number, boss: string) => `Brote ${number}: ${boss}`,
    /** El brote sin su jefe, para uno que aun no esta en el juego (la ruta, T-019). */
    number: (number: number) => `Brote ${number}`,
  },

  /** Menu de inicio (T-011). */
  title: {
    tagline: 'Solo la naturaleza puede salvarnos',
    menu: 'Menú principal',
    newGame: 'Nueva partida',
    /** Sin Invernadero, reanuda la partida guardada; con el (T-019, R-02), lleva a el. */
    continue: 'Continuar',
    noSave: 'No hay partida guardada',
    toGreenhouse: 'Al Invernadero',
    /** Debajo de "Continuar" con el Invernadero abierto: la partida a medias que espera alli. */
    waiting: (outbreak: string, round: number) => `Partida a medias (${outbreak}, ronda ${round})`,
    saveSummary: (round: number, total: number, lives: number, coins: number) =>
      `Ronda ${round} de ${total} · ${lives === 1 ? '1 vida' : `${lives} vidas`} · ${coins} monedas`,
    savedAt: (when: string) => `Guardada ${when}`,
    options: 'Opciones',
    credits: 'Créditos',
    language: 'Idioma',
    autosave: 'Tu partida se guarda sola.',
    confirmTitle: '¿Empezar de cero?',
    confirmText: (round: number) => `Se borrará tu partida guardada (ronda ${round}).`,
    confirmKeeps: 'Tu progreso se conserva: los jefes vencidos siguen vencidos.',
    confirmYes: 'Sí, nueva partida',
    confirmNo: 'Mejor no',
    version: (version: string) => `Versión ${version}`,
  },

  /**
   * Jugadores (T-034): varios perfiles en el mismo aparato, cada uno con su progreso, su partida y sus tours vistos. Se
   * cambia, se crea y se borra desde la portada.
   */
  players: {
    title: 'Jugadores',
    /** Nombre de un jugador que aun no eligio el suyo (PF-05; el nombre llega en T-033). */
    defaultName: (number: number) => `Jugador ${number}`,
    /** Encima del nombre en la portada. */
    playing: 'Juega',
    change: 'Cambiar',
    changeLabel: (name: string) => `Cambiar jugador. Ahora juega ${name}`,
    /** En la fila del jugador activo de la lista. */
    current: 'Jugando',
    select: (name: string) => `Jugar como ${name}`,
    defeated: (count: number) => (count === 0 ? 'Sin jefes vencidos' : count === 1 ? '1 jefe vencido' : `${count} jefes vencidos`),
    lastPlayed: (when: string) => `Última vez: ${when}`,
    notPlayed: 'Aún sin estrenar',
    create: 'Nuevo jugador',
    createDetail: 'Empieza desde cero',
    full: 'Máximo de jugadores',
    fullDetail: (max: number) => `Caben ${max}: borra uno para hacer sitio`,
    remove: (name: string) => `Borrar a ${name}`,
    nothingToRemove: 'No tiene nada guardado',
    removed: (name: string) => `${name}: borrado.`,
    confirmTitle: (name: string) => `¿Borrar a ${name}?`,
    confirmLost: 'Se perderá para siempre:',
    confirmNothing: 'No tiene nada guardado.',
    bosses: (names: string) => `Jefes vencidos: ${names}`,
    save: (round: number) => `Partida guardada en la ronda ${round}`,
    /** Las viñetas de la historia que ya vio (T-031). */
    story: 'Las viñetas de la historia vistas',
    tours: 'Los tours de ayuda vistos',
    confirmKept: 'Los demás jugadores y los ajustes no cambian.',
    confirmLast: 'Quedará un jugador nuevo, sin nada guardado. Los ajustes no cambian.',
    confirmYes: 'Sí, borrar',
    confirmNo: 'Mejor no',
  },

  /**
   * El nombre del jugador (T-033): Boxer lo pregunta tras vencer a Creeper y se cambia en Opciones. El apodo que pone Boxer
   * a quien no lo dice ("Rookie", NJ-03) es el mismo en todos los idiomas y esta en `src/game/playerName.ts`.
   */
  name: {
    label: 'Tu nombre',
    placeholder: 'Escribe tu nombre',
    /** Junto al campo: cuantas letras lleva y cuantas caben. */
    count: (used: number, max: number) => `${used}/${max}`,
    countLabel: (used: number, max: number) => `${used} de ${max} caracteres`,
    confirm: '¡Listo!',
    /** Boxer le pone un apodo (NJ-02). */
    decline: 'Prefiero no decirlo',
    /** El boton de confirmar, apagado con el campo vacio. */
    empty: 'Escribe al menos una letra',
    /** En Opciones de la portada. */
    section: 'Jugador',
    help: 'Así te llaman Boxer y Patty.',
    save: 'Guardar',
    saved: (name: string) => `Ahora te llamas ${name}.`,
  },

  /**
   * Invernadero (T-019): el sitio entre brotes, con todo lo que se hace fuera de la partida. Se abre al vencer a Creeper
   * (R-01). La tienda (T-022) y las plantas (T-023) esperan con candado.
   */
  greenhouse: {
    title: 'Invernadero',
    /** El titulo grande de arriba a la izquierda en el Invernadero, en lugar de "REBROTE". */
    logo: 'INVERNADERO',
    /** Bajo el titulo grande, en lugar del lema: el nombre del jugador (T-033). */
    hello: (name: string) => `¡Hola, ${name}!`,
    resume: 'Reanudar',
    resumeDetail: (outbreak: string, round: number, total: number) => `${outbreak} · ronda ${round} de ${total}`,
    next: 'Siguiente brote',
    route: 'Ruta de brotes',
    routeDetail: (defeated: number) => (defeated === 1 ? '1 jefe vencido' : `${defeated} jefes vencidos`),
    shop: 'Tienda',
    plants: 'Plantas',
    back: 'Volver a la portada',
    confirmTitle: (outbreak: string) => `¿Empezar ${outbreak}?`,
    confirmText: (outbreak: string, round: number) => `Se borrará tu partida a medias (${outbreak}, ronda ${round}).`,
    confirmYes: 'Sí, empezar',
    confirmNo: 'Mejor no',
  },

  /** Ruta de brotes (T-019): un camino con un lugar por brote, hasta el destino final. */
  route: {
    title: 'Ruta de brotes',
    defeated: 'Superado',
    current: 'Siguiente',
    locked: (boss: string) => `Bloqueado: se abre al vencer a ${boss}`,
    final: '???',
    finalHint: 'El final del camino',
    boss: (name: string, rounds: number) => `Jefe: ${name} · ${rounds} rondas`,
    saved: (round: number, total: number) => `Partida a medias: ronda ${round} de ${total}`,
    play: 'Jugar',
    replay: 'Volver a jugar',
    resume: 'Reanudar',
    restart: 'Empezar de cero',
    hint: 'Toca un lugar del camino para verlo.',
    keys: '← → para moverte por el camino · Esc para volver',
  },

  /** Lo que dice Creeper en la portada al hacerle clic (o cada tanto). */
  cover: {
    creeperLines: ['SOY CREEPER: ¡ATRÁPAME SI PUEDES!', '¡ESTE JARDÍN SERÁ MÍO!', '¡MIS GUSANOS NO PARAN!', '¿JUGAMOS?'],
    wormOuch: '¡Ay!',
  },

  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    settings: 'Ajustes',
    exit: 'Salir al menú',
    hint: 'Esc o P pausa · Esc o clic derecho suelta la carta elegida · Doble clic sobre una planta o un enemigo: su ficha',
    back: 'Volver al menú de pausa',
  },

  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    languageNote: 'Al cambiar el idioma se recarga el escenario. Tu partida se conserva.',
    sound: 'Sonido',
    sfxVolume: 'Efectos de sonido',
    sfxVolumeHelp: 'Disparos, monedas, explosiones y botones.',
    screen: 'Pantalla',
    fullscreen: 'Pantalla completa',
    fullscreenHelp: 'Oculta las barras del navegador.',
    fullscreenUnsupported: 'Este navegador no la permite.',
    quality: 'Calidad gráfica',
    auto: (level: string) => `Automático (${level})`,
    autoHelp: 'Elige según tu equipo y baja un nivel si el juego va lento.',
    levels: {
      low: { label: 'Bajo', description: 'Menos resolución y efectos. Para equipos modestos o batería.' },
      medium: { label: 'Medio', description: 'Escenario animado con efectos moderados.' },
      high: { label: 'Alto', description: 'Más nitidez, todas las animaciones, destellos y haces de luz.' },
      ultra: { label: 'Ultra', description: 'Doble resolución, más vida y color más vivo. Pide una GPU potente.' },
    },
    qualityNote: 'Al cambiar la calidad se recarga el escenario. Tu partida se conserva.',
    performance: 'Rendimiento',
    showFps: 'Mostrar FPS',
    showFpsHelp: 'Fotogramas por segundo en una esquina.',
    help: 'Ayuda',
    tours: 'Tours de ayuda',
    toursHelp: 'Una mano te enseña cada cosa nueva la primera vez que sale.',
  },

  hud: {
    cards: 'Cartas',
    cardNames: { shooter: 'Disparadora', fire: 'Fuego', ice: 'Hielo' },
    cardHelp: {
      shooter: 'Sembrar disparadora',
      fire: 'Fuego: en una casilla vacía, mina que explota',
      fireInfuse: 'Fuego: en una casilla vacía, mina; sobre una disparadora, la infunde (un fuego por cañón)',
      ice: 'Hielo: en una casilla vacía, mina que frena',
      iceInfuse: 'Hielo: en una casilla vacía, mina que frena; sobre una disparadora, la infunde (un hielo por cañón)',
    },
    noFunds: 'Saldo insuficiente',
    coins: 'Monedas',
    lives: (lives: number, max: number) => `Vidas: ${lives} de ${max}`,
    pause: 'Pausa',
    pauseTitle: 'Pausa (Esc o P)',
  },

  round: {
    label: 'Ronda',
    /** "Ronda 3 de 10": la palabra y el "de", porque el numero va resaltado. */
    word: 'Ronda',
    of: 'de',
    finalBattle: 'Combate final',
    startsIn: 'Empieza en',
    bossIn: 'Creeper llega en',
    seconds: 's',
    go: '¡Que vengan!',
    goBoss: '¡Que venga!',
    /** Aviso de una linea de cada ronda de cada brote (T-018), en orden: uno por ronda de su guion en `OUTBREAKS`. */
    notices: {
      creeper: [
        'Siembra disparadoras: cada una defiende su carril',
        'Toca una disparadora para subirla de nivel (hasta el 5)',
        'Siembra fuego solo y explota. ¡Llega el acorazado, y los gusanos ya tienen nivel!',
        'Siembra hielo solo y frena en área. ¡Llega el escupidor!',
        'Suelta fuego o hielo sobre una disparadora (o arrastra una mina hasta ella) para infundirla',
        'Arrastra una disparadora sobre otra igual para fusionarlas',
        'Llegan todos a la vez: gusanos, acorazados y escupidores. ¡Aguanta!',
        '¡Creeper se prepara! Sus tropas llegan más rápido y en mayor número',
        'Creeper casi está listo: aún más tropas y más rápidas',
        '¡Llega Creeper con su escolta! Salta de carril: reparte tus defensas',
      ],
    },
  },

  boss: {
    caught: '¡Atrapado!',
    phase1: 'Fase 1',
    phase2: 'Fase 2: ¡enfadado!',
    health: (name: string) => `Vida de ${name}`,
  },

  level: {
    aria: (level: number) => `Disparadora de nivel ${level}`,
    level: (level: number) => `Nivel ${level}`,
    max: '(máximo)',
    base: 'Daño y cadencia de base',
    bonus: (damage: string, rate: string) => `Daño +${damage} · Cadencia +${rate}`,
    capUntil: (cap: number, round: number) => `Tope ${cap}: sube en la ronda ${round}`,
    atMax: (cap: number) => `Ya está en el nivel máximo (${cap})`,
    capTitle: (cap: number, round: number) => `Tope de nivel ${cap} hasta la ronda ${round}`,
    nextLevel: (damage: string, rate: string) => `Siguiente nivel: +${damage} de daño y +${rate} de cadencia`,
    /** El siguiente nivel da premio (5, 10, 15 y 20): debajo va lo que suma, con `bonus`. */
    milestone: (level: number) => `¡Premio en el nivel ${level}!`,
    noFunds: 'Saldo insuficiente',
    maxButton: 'Máximo',
    up: 'Subir',
  },

  unlock: {
    round: (round: number) => `Ronda ${round}`,
    title: '¡YA LO TIENES!',
    go: '¡A jugar!',
    shooter: { title: 'Disparadora', text: 'Siémbrala en una casilla: dispara a los gusanos de su carril.' },
    levelUp: {
      title: 'Subir de nivel',
      text: (upTo: number | null) => `Toca una disparadora y pulsa «Subir»: más daño y más cadencia${upTo === null ? '' : ` (hasta el nivel ${upTo})`}.`,
    },
    levelCap: {
      title: (level: number) => `Nivel máximo: ${level}`,
      text: (level: number) => `Tus disparadoras ya pueden subir hasta el nivel ${level}.`,
    },
    fireMine: { title: 'Mina de fuego', text: (countdown: string) => `Siémbrala sola: cuando un gusano se acerca, cuenta ${countdown} y explota.` },
    iceMine: { title: 'Mina de hielo', text: 'Siémbrala sola: al explotar frena mucho a los gusanos de alrededor.' },
    infuse: {
      title: 'Infundir',
      text: 'Suelta fuego o hielo sobre una disparadora, o arrastra hasta ella una mina sembrada: sus semillas queman o frenan.',
    },
    fuse: { title: 'Fusionar', text: 'Arrastra una disparadora sobre otra igual: suman cañones y pegan más fuerte.' },
  },

  /**
   * Tours de ayuda (T-013): frases cortas, una por paso. Lo importante lo ensenan la mano y el dibujo del bocadillo. Cada
   * paso de `TOURS` (`src/ui/tour/tours.ts`) tiene aqui su frase, con la misma clave.
   */
  tour: {
    label: 'Ayuda',
    names: {
      basics: 'Lo básico',
      levelUp: 'Subir de nivel',
      fireMine: 'Mina de fuego',
      iceMine: 'Mina de hielo',
      infuse: 'Infundir',
      fuse: 'Fusionar',
    },
    next: 'Siguiente',
    done: '¡Entendido!',
    skip: 'Saltar',
    nice: '¡Bien!',
    stepOf: (step: number, total: number) => `Paso ${step} de ${total}`,
    steps: {
      basics: {
        sow: 'Arrastra la disparadora al césped',
        lane: 'Solo dispara en su carril: ¡cubre los cinco!',
        coins: 'Sembrar cuesta monedas; cazar gusanos te da más',
        lives: 'Si un gusano cruza el jardín, pierdes un corazón',
        info: 'Toca dos veces una planta para ver su ficha',
        go: '¿Listo? ¡Que vengan!',
      },
      levelUp: {
        pick: 'Toca una disparadora',
        up: 'Pulsa «Subir»: pega más fuerte y más rápido',
      },
      fireMine: {
        sow: 'Siembra el fuego en el césped',
        boom: (countdown: string) => `Si un gusano se acerca, cuenta ${countdown} y ¡pum!`,
      },
      iceMine: {
        sow: 'Siembra el hielo en el césped',
        freeze: 'Al explotar, frena mucho a los de alrededor',
      },
      infuse: {
        card: 'Suelta fuego o hielo sobre una disparadora',
        mine: 'O arrastra hasta ella una mina sembrada',
      },
      fuse: {
        drag: 'Arrastra una disparadora sobre otra igual',
      },
    },
    /** Pista de la moneda en el suelo (G-08). */
    coin: '¡Tócala! Vale más',
  },

  /**
   * Viñetas de la historia (T-031, ADR-0019). El guion es el de `docs/specs/04-historia.md`. Los nombres de los personajes
   * no se traducen. `onward` y `hello` reciben el nombre del jugador (T-033) o null: sin nombre, la frase va sin el.
   */
  story: {
    label: 'Historia',
    names: { boxer: 'Boxer', patty: 'Patty' },
    skip: 'Saltar',
    next: 'Seguir',
    /** Pista bajo el bocadillo cuando el texto ya salio entero. */
    hint: 'Toca para seguir',
    stepOf: (step: number, count: number) => `Viñeta ${step} de ${count}`,
    /** En el Invernadero, para volver a verlas (Y-05). */
    replay: 'Historia',
    replayDetail: 'Vuelve a ver las viñetas',
    replayTitle: 'La historia hasta ahora',
    titles: {
      opening: 'El rescate',
      creeperDown: 'Lo que pasó',
      pattyGreenhouse: 'Patty, la botánica',
    },
    lines: {
      opening: {
        noTime: '¡No hay tiempo para explicarte! Toma esa planta y sígueme el juego.',
      },
      creeperDown: {
        creeper: 'Eso era Creeper. Un programa de 1971 que solo sabía saltar de una máquina a otra. Inofensivo… hasta que ella lo sacó de la pantalla.',
        ai: 'Ella es una IA. La hicimos para protegernos de los virus, así que los aprendió todos. Y un día decidió que el fallo éramos nosotros.',
        chips: 'Controla todo lo que lleva un chip. Por eso Patty creó estas plantas: son lo único que no puede hackear.',
        name: 'Por cierto, con las prisas no te pregunté. ¿Cómo te llamas?',
        onward: (name: string | null) =>
          `Pues esto no ha terminado${name ? `, ${name}` : ''}. Ha empezado por el más viejo y el más torpe. Los siguientes serán peores. Ven, te enseño el Invernadero.`,
      },
      pattyGreenhouse: {
        hello: (name: string | null) =>
          `¿Así que tú eres quien ha parado a Creeper${name ? `, ${name}` : ''}? Soy Patty. Las plantas son cosa mía. Vuelve cuando quieras: siempre estoy creando algo nuevo.`,
      },
    },
  },

  defeat: {
    title: '¡Se colaron!',
    bossTitle: '¡Creeper se escapó!',
    text: (crossed: number, round: number | null, total: number) =>
      `${crossed === 1 ? '1 gusano cruzó' : `${crossed} gusanos cruzaron`} el jardín${round === null ? '' : ` en la ronda ${round} de ${total}`}.`,
    bossText: 'Saltó de carril y cruzó el jardín en el combate final.',
    hint: 'Cada disparadora solo defiende su carril: cubre los cinco.',
    bossHint: 'Creeper salta de carril: reparte tus defensas por los cinco.',
    again: 'Jugar otra vez',
    menu: 'Menú principal',
  },

  victory: {
    title: '¡Atrapaste a Creeper!',
    text: (rounds: number) => `Superaste las ${rounds} rondas y el jardín está a salvo.`,
    hint: 'Creeper (1971) fue el primer gusano informático: saltaba de máquina en máquina.',
    again: 'Jugar otra vez',
    /** Tras vencer a un jefe se va al Invernadero (T-019). */
    greenhouse: 'Al Invernadero',
  },

  /** Rotulos y textos que salen sobre el tablero. */
  board: {
    attack: '¡Ahí vienen!',
    roundCleared: (round: number) => `¡Ronda ${round} superada!`,
    bossDown: '¡Creeper atrapado!',
    gardenSafe: '¡Jardín a salvo!',
    bossEscaped: '¡Se escapó!',
    lifeLost: '−1 ♥',
    fused: '¡Fusión!',
    infused: { fire: '¡Fuego!', ice: '¡Hielo!' },
    cannotInfuse: 'No se puede infundir',
    infuseFrom: (round: number) => `Infundir: desde la ronda ${round}`,
    hasElement: { fire: 'Ya tiene fuego', ice: 'Ya tiene hielo' },
    infuse: (price: string) => `Infundir: ${price}`,
    noFunds: 'No alcanza la moneda',
    fuse: (cannons: number) => `Fusionar: ${cannons} cañones`,
    willBeLevel: (level: number) => `Quedará en nivel ${level}`,
    otherVariant: 'Otra variante',
    maxCannons: (cannons: number) => `Máximo ${cannons} cañones`,
    infuseWithMine: 'Infundir con la mina',
    infuseMinePlus: (extra: string) => `Infundir: mina + ${extra}`,
  },

  /** Lo que dice Creeper en su bocadillo de terminal. El original de 1971 escribia "I'M THE CREEPER : CATCH ME IF YOU CAN". */
  creeper: {
    name: 'Creeper',
    entrance: 'SOY CREEPER: ¡ATRÁPAME SI PUEDES!',
    angry: '¡GRRR! ¡AHORA VAS A VER!',
    jump: ['¡HOP!', '¡POR AQUÍ!', '¡ATRÁPAME!', '¡CUCÚ!'],
    escape: '¡NO ME ATRAPASTE!',
    cheer: '¡JA, JA, JA!',
    preparing: 'CARGANDO… ¡YA CASI ESTOY!',
    /** Lo que pone en su pantalla mientras se prepara (se pinta en su textura). */
    loading: 'CARGANDO',
    shouts: { escort: '¡ADELANTE, MIS ACORAZADOS!' },
  },

  /** Ficha de informacion (T-010). */
  info: {
    close: 'Cerrar la ficha',
    closeTitle: 'Cerrar (Esc)',
    hp: 'Vida',
    level: (level: number) => `Nivel ${level}`,
    stats: {
      damage: 'Daño',
      perShot: (damage: string) => `${damage} por disparo`,
      seeds: (count: number, each: string) => `${count} semillas de ${each}`,
      rate: 'Cadencia',
      every: (time: string) => `Cada ${time}`,
      shotsPerSecond: (shots: string) => `${shots} disparos por segundo`,
      dps: 'Daño por segundo',
      burn: 'Quemadura',
      perSecond: (amount: string) => `${amount} por segundo`,
      during: (time: string) => `durante ${time}`,
      slows: 'Frena',
      slowBy: (percent: string) => `Un ${percent}`,
      range: 'Alcance',
      rangeValue: 'Su carril, hacia delante',
      detects: 'Detecta',
      detectsValue: (cells: string) => `A ${cells} casillas`,
      explodes: 'Explota',
      explodesValue: (time: string) => `${time} después`,
      reaches: (cells: string) => `alcanza ${cells} casillas`,
      damageEach: (damage: string) => `${damage} a cada enemigo`,
      spit: 'Escupitajo',
      spitNote: (time: string, cells: string) => `cada ${time}, a ${cells} casillas`,
      bite: 'Mordisco',
      biteNote: (time: string) => `cada ${time}`,
      slam: 'Golpe al caer',
      slamNote: 'al aterrizar de un salto',
      speed: 'Velocidad',
      speedValue: (cells: string) => `${cells} casillas/s`,
      crosses: (seconds: number) => `cruza el jardín en ${seconds} s`,
      nextJump: 'Próximo salto',
      noMoreJumps: 'Ya no salta más',
      jumpAt: (percent: string) => `Al bajar del ${percent} de vida`,
      onDefeat: 'Al caer',
      youWin: '¡Ganas la partida!',
      reward: 'Recompensa',
      rewardValue: (coins: number) => `${coins} monedas`,
    },
    tags: {
      waiting: 'Esperando a un enemigo',
      explodesIn: (time: string) => `¡Explota en ${time}!`,
      enraged: '¡Enfadado!',
      jumping: 'Saltando de carril',
      spitting: 'Escupiendo',
      biting: 'Mordiendo',
      burning: (amount: string) => `Quemado: −${amount} por segundo`,
      slowed: (percent: string) => `Frenado un ${percent}`,
      hasted: (percent: string) => `Acelerado +${percent}`,
    },
    shooter: {
      title: { plain: 'Disparadora', fire: 'Disparadora de fuego', ice: 'Disparadora de hielo' },
      oneCannon: 'Un cañón',
      fused: (cannons: number) => `${cannons} cañones fusionados`,
      cap: (cap: number) => `Tope ${cap}`,
      about: {
        plain: 'Dispara semillas a los enemigos de su carril que tiene delante.',
        fire: 'Sus semillas queman: el enemigo sigue perdiendo vida un rato después del impacto.',
        ice: 'Sus semillas frenan: el enemigo avanza y muerde más despacio.',
      },
    },
    mine: {
      title: { fire: 'Mina de fuego', ice: 'Mina de hielo' },
      subtitle: { fire: 'Fuego sembrado solo', ice: 'Hielo sembrado solo' },
      about: {
        fire: (countdown: string) =>
          `Cuando un enemigo se acerca, cuenta ${countdown} y explota: daña a todos los de alrededor, también en los carriles de al lado.`,
        ice: (countdown: string) =>
          `Cuando un enemigo se acerca, cuenta ${countdown} y explota: frena mucho a todos los de alrededor, también en los carriles de al lado. No hace daño.`,
      },
    },
    enemy: {
      names: { worm: 'Gusano', armored: 'Gusano acorazado', spitter: 'Gusano escupidor', creeper: 'Creeper' },
      subtitle: {
        worm: 'Gusano informático',
        armored: 'Con casco y placas de acero',
        spitter: 'Ataca desde lejos',
        boss: (outbreak: number) => `Jefe del brote ${outbreak}`,
        bossEnraged: (outbreak: number) => `Jefe del brote ${outbreak} · fase 2`,
      },
      tier: (percent: string) => `+${percent} de fuerza por su tramo`,
      about: {
        worm: 'Avanza por su carril y muerde lo primero que encuentra hasta destruirlo.',
        armored: 'Como el gusano, con cuatro veces su vida y más lento. Se le caen las placas al perder vida.',
        spitter: (cells: string) => `Se para a ${cells} casillas de lo primero sembrado y le escupe. Puede reventar una mina antes de que explote.`,
        creeper: 'Salta de carril al perder vida y deja copias suyas. Si cruza el jardín, se pierde la partida.',
      },
    },
  },

  /** Creditos (T-011). */
  credits: {
    title: 'Créditos',
    author: 'Autor',
    authorRole: 'Idea, diseño y dirección',
    development: 'Desarrollo',
    developmentBy: 'de Anthropic',
    aesthetic: 'Estética',
    aestheticValue: 'Inspirada en Plants vs. Zombies',
    aestheticNote: 'de PopCap Games',
    art: 'Arte y animación',
    artValue: 'Pintados con código, sin imágenes',
    enemies: 'Enemigos',
    enemiesValue: 'Virus informáticos de verdad: Creeper (1971) fue el primer gusano',
    tech: 'Hecho con',
    thanks: '¡Gracias por jugar!',
    legal:
      'Plants vs. Zombies es una marca de Electronic Arts Inc. Rebrote es un proyecto personal sin relación con PopCap Games ni con Electronic Arts.',
  },
};

export type Dictionary = typeof es;
