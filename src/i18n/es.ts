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
    /** Lo que aun no existe: el brote que viene. */
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
    /**
     * Jefe de un brote en preparacion (T-024): el brote ya tiene rondas, pero su jefe aun no es un enemigo del juego (no
     * esta en `info.enemy.names`). Cuando lo sea, sale de alli y se quita de aqui. Elk Cloner, el del brote 2, llego con
     * T-026; Brain, el del brote 3, con T-039, y Morris, el del brote 4, con T-042. Hoy no hay ninguno.
     */
    comingBoss: {} as Partial<Record<string, string>>,
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
   * Instalar el juego como aplicacion (T-029): el boton de la portada y la ayuda que abre donde el navegador no tiene
   * dialogo (iPhone y iPad, V-02) o el jugador ya lo cancelo. Lo que se cita entre comillas es lo que pone el navegador.
   */
  install: {
    button: 'Instalar',
    title: 'Instalar Rebrote',
    intro: 'Instalado, se abre desde su icono, a pantalla completa y sin conexión.',
    iosShare: 'Toca Compartir, el cuadrado con la flecha hacia arriba.',
    iosAdd: 'Elige «Añadir a pantalla de inicio».',
    iosNote: 'Instalado empieza de cero: lo jugado en Safari se queda en Safari.',
    menuOpen: 'Abre el menú del navegador.',
    menuPick: 'Elige «Instalar Rebrote» o «Añadir a pantalla de inicio».',
  },

  /**
   * Aviso de beta (T-044): sale una vez al vencer al ultimo brote del juego, en la ruta al tocar el lugar "por llegar" y en
   * la portada desde la marca "Beta" junto a la version. Dice que viene mas (sin fechas) y pide apoyar el proyecto con dos
   * botones (BT-01): compartir el juego y mandar comentarios por correo. A donde llevan esta en `src/game/config/support.ts`.
   */
  beta: {
    /** La marca junto a la version de la portada (BT-05) y lo que dice al lector de pantalla. */
    badge: 'Beta',
    badgeLabel: 'Rebrote está en beta: qué significa y cómo apoyar el proyecto',
    /** Encima del titulo del aviso, con la version. */
    kicker: (version: string) => `Beta · versión ${version}`,
    /** Titulo para quien ya vencio al ultimo brote (BT-03). */
    reachedTitle: 'Has llegado al final de la beta',
    /** Titulo para quien aun no llego al final (la ruta y la portada). */
    title: 'Rebrote está en beta',
    text: 'El viaje continúa: mantente a la espera de nuevo contenido. Si te ha gustado, apoya el proyecto.',
    /** BT-06: mientras el juego este en desarrollo no se migran datos (ADR-0014). */
    reset: 'Mientras sea una beta, una versión nueva puede reiniciar tu progreso.',
    share: 'Compartir',
    feedback: 'Comentarios',
    /** Cierra el aviso de la victoria. */
    continue: 'Seguir',
    /** Lo que se manda al compartir, con la direccion del juego. */
    shareTitle: 'Rebrote',
    shareText: 'Solo la naturaleza puede salvarnos. ¡Prueba Rebrote!',
    /** Asunto del correo de "Comentarios" (BT-02), con la version del juego. */
    feedbackSubject: (version: string) => `Rebrote: comentarios de la beta (versión ${version})`,
    offline: 'Necesitas conexión para abrirlo.',
    copied: 'Enlace copiado: pégalo donde quieras.',
    copyLink: 'Copia el enlace:',
    /** Tras pulsar "Comentarios": por si el aparato no tiene aplicacion de correo. */
    mailFallback: '¿No se abre tu correo? Escribe a',
    copy: 'Copiar',
    copiedAddress: 'Copiada',
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
    /** Su saldo de semillas (T-020), ya formateado. */
    seeds: (amount: string) => `Semillas: ${amount}`,
    /** Los inventos que fabrico en el Laboratorio de Patty (T-022, T-036). */
    powers: (count: number) => (count === 1 ? '1 invento fabricado en el laboratorio' : `${count} inventos fabricados en el laboratorio`),
    baseLevel: (level: number) => `La disparadora en nivel base ${level}`,
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
   * (R-01). Desde T-036, con el Laboratorio de Patty siempre abierto.
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
    back: 'Volver a la portada',
    confirmTitle: (outbreak: string) => `¿Empezar ${outbreak}?`,
    confirmText: (outbreak: string, round: number) => `Se borrará tu partida a medias (${outbreak}, ronda ${round}).`,
    confirmYes: 'Sí, empezar',
    confirmNo: 'Mejor no',
    /** Patty en el Invernadero (T-032, VT-05): lo que dice a veces al entrar o al tocarla. Pocas y cortas. */
    patty: [
      '¡Hola! Estoy regando. Tú haz como si nada.',
      'Shh… Estoy creando algo nuevo. ¡No mires!',
      '¿Ves esas hojas? Les hablo cada mañana.',
      'Si algo brota raro, avísame. O no: me encantan las sorpresas.',
      (name: string | null) => (name ? `¡Hola otra vez, ${name}! Pasa, pasa.` : '¡Hola otra vez! Pasa, pasa.'),
    ],
    /** Para los lectores de pantalla y el puntero: tocarla le hace decir otra cosa. */
    talkToPatty: 'Habla con Patty',
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
    musicVolume: 'Música',
    musicVolumeHelp: 'De fondo, en los menús, las rondas y los jefes.',
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
    cardNames: { shooter: 'Disparadora', fire: 'Fuego', ice: 'Hielo', shield: 'Escudo' },
    cardHelp: {
      shooter: 'Sembrar disparadora',
      fire: 'Fuego: en una casilla vacía, mina que explota',
      fireInfuse: 'Fuego: en una casilla vacía, mina; sobre una disparadora, la infunde (un fuego por cañón)',
      ice: 'Hielo: en una casilla vacía, mina que frena',
      iceInfuse: 'Hielo: en una casilla vacía, mina que frena; sobre una disparadora, la infunde (un hielo por cañón)',
      /** Hasta que se puede infundir (T-037: el escudo se infunde desde el brote 3), solo el muro. */
      shield: 'Escudo: en una casilla vacía, muro que aguanta y para los disparos',
      shieldInfuse: 'Escudo: en una casilla vacía, muro que aguanta y para los disparos; sobre una disparadora, la infunde (un escudo por cañón)',
    },
    noFunds: 'Saldo insuficiente',
    coins: 'Monedas',
    lives: (lives: number, max: number) => `Vidas: ${lives} de ${max}`,
    pause: 'Pausa',
    pauseTitle: 'Pausa (Esc o P)',
    /**
     * La barra de sobrecarga (T-042) del brote 4: su rotulo, encendida y la linea que la explica la primera vez que sale. Si
     * se llena, todos corren mas (MR-03) hasta que baja bastante (MR-04).
     */
    overload: {
      label: 'Sobrecarga',
      full: '¡Sobrecarga!',
      hint: 'Si la barra se llena, todos corren más. ¡Limpia el césped!',
      aria: (percent: string, on: boolean) => `Sobrecarga: ${percent}${on ? ', encendida' : ''}`,
    },
    /** Panel izquierdo de los inventos (T-021, T-036: antes "poderes"). */
    powers: {
      label: 'Inventos',
      names: { relocate: 'Recolocar', grenade: 'Granada', iceWall: 'Muro de hielo' },
      help: {
        relocate: 'Recolocar: lleva una disparadora a otra casilla, tal como está',
        grenade: (countdown: string) => `Granada: lánzala a una casilla; explota a los ${countdown} y daña a todos los de alrededor`,
        iceWall: (blocks: number, time: string) => `Muro de hielo: ${blocks} bloques que cortan el paso durante ${time}`,
      },
      /** El nivel del poder (T-022), en la pastilla de su boton y en su ayuda. */
      level: (level: number) => `Nivel ${level}`,
      charges: (count: number) => (count === 1 ? '1 carga' : `${count} cargas`),
      noCharges: 'Ya lo usaste en esta partida',
      attackOnly: 'Se usa en el ataque',
    },
  },

  round: {
    label: 'Ronda',
    /** "Ronda 3 de 10": la palabra y el "de", porque el numero va resaltado. */
    word: 'Ronda',
    of: 'de',
    startsIn: 'Empieza en',
    /** En la preparacion del combate final: "Creeper llega en 12 s". */
    bossIn: (boss: string) => `${boss} llega en`,
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
        '¡Creeper se prepara! Sus tropas llegan más rápido y en mayor número',
        'Creeper casi está listo: aún más tropas y más rápidas',
        '¡Llega Creeper con su escolta! Salta de carril: reparte tus defensas',
      ],
      // T-026: el guion del brote 2, con las tropas de T-025.
      elkCloner: [
        'Lo aprendido sigue contigo. Ojo: los Copycat dejan una copia al caer',
        'Siembra el escudo en una casilla vacía: un muro que para los disparos',
        '¡Llegan los Minstrel! Sus versos cruzan el carril: solo los para un escudo',
        'Acorazados, Minstrel y escupidores juntos: minas para unos, escudos para otros',
        'Dos oleadas por los cinco carriles, con Minstrel detrás de cada una',
        '¡Elk Cloner se prepara! Escribe su poema y sus tropas llegan más rápido',
        'Elk Cloner casi ha terminado su poema: aún más tropas y más rápidas',
        '¡Llega Elk Cloner! Cada pocos versos recita el poema entero por los cinco carriles: pon un escudo en cada uno',
      ],
      // T-039: el guion del brote 3, con las tropas de T-038.
      brain: [
        'Ojo: los Lurker llegan ocultos y tus plantas no los ven de lejos. Las minas y el hielo los descubren',
        'Suelta el escudo sobre una disparadora: aguanta el doble y para lo que va a las de detrás',
        '¡Llega el Skipper! Salta por encima de todo: solo lo para un escudo',
        'Acorazados ocultos y Skipper juntos: minas para unos, escudos para otros',
        'Dos oleadas por los cinco carriles: pon una puerta en cada uno',
        '¡Brain se prepara! Marca sectores para esconderse y sus tropas llegan más rápido',
        'Brain casi está listo: aún más tropas y más rápidas. Cierra los cinco carriles',
        '¡Llega Brain! Salta oculto por encima de todo: solo lo para un escudo, y las minas lo descubren',
      ],
      // T-042: el guion del brote 4, con las tropas que recluta Morris (T-041). La 1 presenta la sobrecarga en una linea.
      morris: [
        'Vuelven los gusanos, en masa y reclutados por Morris. Ojo a la barra: si se llena, todos corren más',
        'Acorazados y escupidores entre la marea: minas de fuego para los grupos',
        'Vuelven los Copycat: sus copias llenan la barra. ¡Limpia deprisa!',
        'Vuelve el Minstrel: escudos delante, sin dejar de limpiar',
        'Vuelven los Lurker, ocultos y en cantidad: minas y hielo para descubrirlos',
        'Vuelve el Skipper: una puerta en cada carril, con la marea detrás',
        '¡Morris se prepara! No para de copiarse y todo llega más rápido',
        'Morris casi está listo: aún más tropas y más rápidas. Llega con el césped limpio',
        '¡Llega Morris! Nada lo para y no deja de soltar gusanos: tumba a los suyos para que tus balas le lleguen',
      ],
    },
  },

  boss: {
    /** Derrotado, en su barra: cada jefe a su manera. */
    caught: { creeper: '¡Atrapado!', elkCloner: '¡Silenciado!', brain: '¡Formateado!', morris: '¡Parcheado!' },
    phase1: 'Fase 1',
    phase2: 'Fase 2: ¡enfadado!',
    health: (name: string) => `Vida de ${name}`,
    /** Elk Cloner (T-026): cuantos versos le faltan para el poema entero, y mientras lo anuncia. */
    poemIn: (verses: number) => (verses <= 1 ? 'Poema al próximo verso' : `Poema en ${verses} versos`),
    poemNow: '¡Poema entero!',
    /** Brain (T-039): oculto o descubierto, y en su fase 2. */
    hidden: (enraged: boolean): string => (enraged ? 'Oculto · fase 2' : 'Oculto'),
    revealed: (enraged: boolean): string => (enraged ? '¡Descubierto! · fase 2' : '¡Descubierto!'),
    /** Morris (T-042): cada cuanto suelta un gusano (MR-07), y mientras muerde algo, que va a la mitad (MR-06). */
    brood: (time: string) => `Un gusano cada ${time}`,
    chewing: '¡Mordiendo! · a media marcha',
  },

  level: {
    aria: (level: number) => `Disparadora de nivel ${level}`,
    level: (level: number) => `Nivel ${level}`,
    max: '(máximo)',
    base: 'Daño y cadencia de base',
    /** Lo que da el nivel; la vida (T-035), solo si crece: en los niveles con premio. */
    bonus: (damage: string, rate: string, hp?: string) => `Daño +${damage} · Cadencia +${rate}${hp ? ` · Vida +${hp}` : ''}`,
    capUntil: (cap: number, round: number) => `Tope ${cap}: sube en la ronda ${round}`,
    atMax: (cap: number) => `Ya está en el nivel máximo (${cap})`,
    capTitle: (cap: number, round: number) => `Tope de nivel ${cap} hasta la ronda ${round}`,
    nextLevel: (damage: string, rate: string, hp?: string) =>
      `Siguiente nivel: +${damage} de daño${hp ? `, +${hp} de vida` : ''} y +${rate} de cadencia`,
    /** El siguiente nivel da premio (5, 10, 15 y 20): debajo va lo que suma, con `bonus`. */
    milestone: (level: number) => `¡Premio en el nivel ${level}!`,
    noFunds: 'Saldo insuficiente',
    maxButton: 'Máximo',
    up: 'Subir',
    /**
     * Arrancar (T-046): el boton del panel, lo que pregunta al primer toque y lo que dice al pasar por encima. "La mitad"
     * es `UPROOT.refund` de `balance.ts`: si cambia, cambian estas frases, la del aviso y la del tour.
     */
    uproot: 'Arrancar',
    uprootConfirm: '¿Arrancar?',
    uprootTitle: (refund: number) => `Arrancar: recuperas ${refund}, la mitad de lo gastado`,
    uprootAgain: 'Toca otra vez para arrancar',
    /** Un muro seleccionado para arrancarlo (T-046): su panel solo trae "Arrancar". */
    wall: 'Muro',
    wallAria: 'Muro',
  },

  unlock: {
    round: (round: number) => `Ronda ${round}`,
    title: '¡YA LO TIENES!',
    go: '¡A jugar!',
    /**
     * Lo que dice quien presenta lo nuevo (T-032): Boxer en el brote 1 (VT-02) y Patty desde el brote 2, con lo que ella
     * crea (VT-03). Rotan por orden: el primer aviso de cada uno dice la primera.
     */
    presenters: {
      boxer: ['Toma, esto te va a hacer falta.', 'Otra cosa para tu caja de herramientas.', '¡Esto no les va a gustar nada!'],
      patty: ['¡He creado algo nuevo!', '¡He creado algo nuevo! Recién brotado.', '¡He creado algo nuevo! Trátalo con cariño.'],
    },
    /**
     * Frase propia de quien presenta una cosa que no es nueva del todo, en vez de la que toca de `presenters` (T-037): el
     * escudo ya existia y Patty solo lo refuerza (ES-01).
     */
    featureLines: {
      shieldInfuse: 'He reforzado el escudo: ahora aguanta sobre una disparadora.',
      // T-046 (AR-09): arrancar no es algo que Patty cree, asi que no dice "¡He creado algo nuevo!".
      uproot: 'Ya puedes arrancar una planta: te devuelvo la mitad de lo que costó.',
    },
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
    shield: {
      title: 'Escudo',
      text: 'Siémbralo en una casilla vacía: es un muro que aguanta y para los disparos.',
    },
    /** T-037: infundir el escudo, en el brote 3. */
    shieldInfuse: {
      title: 'Disparadora con escudo',
      text: 'Suelta el escudo sobre una disparadora, o arrástrale un muro: aguanta el doble y para lo que va a las de detrás.',
    },
    /** T-046: arrancar, en la ronda 4 del brote 3. */
    uproot: {
      title: 'Arrancar',
      text: 'Toca una disparadora o un muro y pulsa «Arrancar» dos veces: recuperas la mitad de lo que costó.',
    },
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
      shield: 'Escudo',
      shieldInfuse: 'Disparadora con escudo',
      uproot: 'Arrancar',
      relocate: 'Recolocar',
      grenade: 'Granada',
      iceWall: 'Muro de hielo',
    },
    next: 'Siguiente',
    done: '¡Entendido!',
    skip: 'Saltar',
    nice: '¡Bien!',
    stepOf: (step: number, total: number) => `Paso ${step} de ${total}`,
    /**
     * Lo que dice Boxer en cada paso (T-032, VT-01): con su voz, con prisa y de tú, pero sin alargarlas: una frase corta
     * por paso, nunca mas larga que la de T-013 (el test lo comprueba).
     */
    steps: {
      basics: {
        sow: '¡Rápido, arrástrala al césped!',
        lane: 'Cada una vigila su carril: ¡cubre los cinco!',
        coins: 'Sembrar cuesta monedas. ¡Los gusanos pagan!',
        lives: 'Ojo: cada gusano que se cuela, un corazón menos',
        info: '¿Dudas? Toca dos veces y verás su ficha',
        go: '¿Listo? ¡Que vengan!',
      },
      levelUp: {
        pick: 'Toca una disparadora',
        up: 'Dale a «Subir»: más fuerte y más rápida',
      },
      fireMine: {
        sow: 'Siembra fuego en el césped',
        boom: (countdown: string) => `¿Un gusano cerca? Cuenta ${countdown} y… ¡pum!`,
      },
      iceMine: {
        sow: 'Siembra hielo en el césped',
        freeze: '¡Al explotar, los deja medio congelados!',
      },
      infuse: {
        card: 'Echa fuego o hielo sobre una disparadora',
        mine: 'O llévale una mina ya sembrada',
      },
      fuse: {
        drag: 'Arrastra una sobre otra igual: ¡fusión!',
      },
      shield: {
        wall: '¡Siembra el escudo solo: un muro!',
        block: 'Los disparos se quedan en el muro',
      },
      // T-037: infundir el escudo, en el brote 3.
      shieldInfuse: {
        card: 'Sobre una disparadora: ¡doble de vida!',
        wall: 'O llévale un muro ya sembrado',
      },
      // T-046: arrancar, en el brote 3.
      uproot: {
        pick: 'Toca una planta o un muro que sobre',
        pull: 'Dos toques a «Arrancar»: ¡la mitad de vuelta!',
      },
      // T-021: los poderes del panel izquierdo.
      relocate: {
        pick: 'Toca «Recolocar», a la izquierda',
        move: 'Y lleva una disparadora a otra casilla',
      },
      grenade: {
        throw: (countdown: string) => `En el ataque, ¡lánzala! Explota a los ${countdown}`,
      },
      iceWall: {
        place: 'En el ataque: bloques que cortan el paso',
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
      // T-043: el giro, en el brote 4.
      morrisOpening: 'Más que nunca',
      morrisDebate: '¿Y si salimos?',
      morrisDown: 'Un largo viaje',
    },
    /** Titulo de lo que cuenta Boxer de cada jefe (T-032), para volver a verlo. */
    loreTitle: (boss: string) => `El ${boss} de verdad`,
    /**
     * Lo que cuenta Boxer del virus de verdad de cada jefe (T-032, VT-04), uno por brote: `line`, en una viñeta al empezar
     * la ronda en que el jefe se prepara (avisa de que llega: el jefe aparece al cerrarla); `card`, completo, en la ficha
     * del jefe. Un jefe nuevo solo necesita estos textos.
     */
    lore: {
      creeper: {
        line: '¡Ojo, que viene Creeper, el primer gusano informático! Al de verdad lo paró Reaper, el primer antivirus. ¡Hoy el Reaper eres tú!',
        card: 'Creeper (1971) fue el primer gusano informático: un experimento que saltaba de un ordenador a otro por ARPANET, la red de la que nació internet. No rompía nada: solo escribía «I’M THE CREEPER: CATCH ME IF YOU CAN!». Para atraparlo se programó Reaper, el primer antivirus.',
      },
      // T-026: sale en la ronda 6 del brote 2, cuando Elk Cloner empieza a prepararse.
      elkCloner: {
        line: '¡Que viene Elk Cloner! En 1982 saltaba de disquete en disquete por los Apple II. ¡Y recitaba poemas!',
        card: 'Elk Cloner (1982) fue uno de los primeros virus que salió de un laboratorio. Viajaba en los disquetes de los Apple II: se copiaba en cada disquete que pasaba por un equipo infectado y, cada 50 arranques, enseñaba un poema en la pantalla. No rompía nada: lo escribió un estudiante de 15 años, como una broma.',
      },
      // T-037: el brote 3, en preparacion. Sale cuando Brain empiece a prepararse (T-039).
      brain: {
        line: '¡Que viene Brain! En 1986 fue el primer virus para PC. Se escondía de quien lo buscaba… ¡y dejó su teléfono en el código!',
        card: 'Brain (1986) fue el primer virus para PC. Lo escribieron dos hermanos de Lahore, que dejaron dentro del código su nombre, su dirección y su teléfono. Viajaba en los disquetes, en el sector de arranque, y era sigiloso: si alguien miraba el disco, le enseñaba una copia limpia. No destruía nada.',
      },
      // T-041: el brote 4. Sale en la ronda 7, cuando Morris empieza a prepararse (T-042); la historia del brote, T-043.
      morris: {
        line: '¡Que viene Morris! En 1988 fue el primer gran gusano de internet. No quería romper nada… pero no paraba de copiarse.',
        card: 'Morris (1988) fue el primer gran gusano de internet. Lo escribió un estudiante que solo quería medir lo grande que era la red. Pero tenía un fallo: se volvía a copiar en equipos que ya estaban infectados, una y otra vez, hasta dejarlos sin recursos. Dejó fuera de servicio miles de equipos.',
      },
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
      // El giro (T-043): al empezar el brote 4, en la ronda 5 y al caer Morris. `pots` recibe el nombre del jugador o null.
      morrisOpening: {
        howMany: 'Otra vez gusanos. Pero mira cuántos.',
        prepared: 'Te he dejado preparado más de lo habitual. Lo vas a necesitar.',
      },
      morrisDebate: {
        think: 'Piénsalo, Patty. Tres jefes, y ninguno ha pasado.',
        garden: '¿Y si salimos y perdemos el jardín?',
        stay: '¿Y si nos quedamos y un día sí pasan?',
      },
      morrisDown: {
        pots: (name: string | null) =>
          `Llevamos demasiado tiempo regando y esperando. ¡Coge las macetas${name ? `, ${name}` : ''}, que nos vamos de excursión!`,
        convinced: 'Está bien. Me habéis convencido los dos.',
        journey: 'Nos espera un largo viaje.',
      },
    },
    /**
     * Comentarios de una línea (T-043): un personaje en la preparación de una ronda, sin parar el juego, en un bocadillo
     * que se va solo. Uno por clave de `REMARKS` (`src/ui/story/remarks.ts`), por brote. Cortos: caben en una esquina a
     * 568 × 320.
     */
    remarks: {
      morris: {
        untouched: 'Bien. Ni se han acercado.',
        tooGood: 'Oye, esto se te da bien. Demasiado bien para seguir escondidos.',
        noIdeas: 'No le des ideas, Boxer. El refugio es todo lo que tenemos.',
        maybe: 'Vale. Puede que tengas algo de razón.',
        promise: 'Si paramos a este, hablamos. Te lo prometo.',
        lastOne: 'Que sea el último que nos pilla esperando.',
      },
    },
    /** Para cerrar un comentario antes de tiempo (lectores de pantalla). */
    closeRemark: 'Cerrar el comentario',
  },

  defeat: {
    title: '¡Se colaron!',
    /** Cuando el jefe cruza el jardin (T-008): cada uno con lo suyo. */
    bossTitle: { creeper: '¡Creeper se escapó!', elkCloner: '¡Elk Cloner cruzó el jardín!', brain: '¡Brain cruzó el jardín!', morris: '¡Morris cruzó el jardín!' },
    /** `outbreak`: en el brote 3 (T-038) no son gusanos, sino bichos. */
    text: (crossed: number, round: number | null, total: number, outbreak: string) =>
      `${crossed === 1 ? `1 ${outbreak === 'brain' ? 'bicho' : 'gusano'} cruzó` : `${crossed} ${outbreak === 'brain' ? 'bichos' : 'gusanos'} cruzaron`} el jardín${round === null ? '' : ` en la ronda ${round} de ${total}`}.`,
    bossText: {
      creeper: 'Saltó de carril y cruzó el jardín en el combate final.',
      elkCloner: 'Recitó hasta el final y cruzó el jardín en el combate final.',
      brain: 'Saltó oculto por encima de todo y cruzó el jardín en el combate final.',
      morris: 'Te enterró en gusanos y cruzó el jardín en el combate final.',
    },
    hint: 'Cada disparadora solo defiende su carril: cubre los cinco.',
    bossHint: {
      creeper: 'Creeper salta de carril: reparte tus defensas por los cinco.',
      elkCloner: 'Sus versos y su poema solo los para un escudo: pon uno delante de tus disparadoras en cada carril.',
      brain: 'Solo lo para un escudo: pon uno en su carril y repónlo cuando caiga. Una mina a su lado también lo descubre.',
      morris: 'Sus gusanos se comen tus balas: tumba los grupos con minas de fuego o la granada y tus disparos le llegarán a él.',
    },
    again: 'Jugar otra vez',
    menu: 'Menú principal',
  },

  victory: {
    /** Cada jefe con lo suyo (T-026). */
    title: { creeper: '¡Atrapaste a Creeper!', elkCloner: '¡Silenciaste a Elk Cloner!', brain: '¡Formateaste a Brain!', morris: '¡Parcheaste a Morris!' },
    text: (rounds: number) => `Superaste las ${rounds} rondas y el jardín está a salvo.`,
    hint: {
      creeper: 'Creeper (1971) fue el primer gusano informático: saltaba de máquina en máquina.',
      elkCloner: 'Elk Cloner (1982) viajaba en los disquetes de los Apple II y enseñaba un poema cada 50 arranques.',
      brain: 'Brain (1986) fue el primer virus para PC: se escondía en el sector de arranque de los disquetes.',
      morris: 'Morris (1988) fue el primer gran gusano de internet: se copiaba una y otra vez hasta dejar las máquinas sin recursos.',
    },
    again: 'Jugar otra vez',
    /** Tras vencer a un jefe se va al Invernadero (T-019). */
    greenhouse: 'Al Invernadero',
    /** La primera vez que cae Creeper se abre el Laboratorio de Patty (T-022, T-036). */
    shopOpened: '¡Laboratorio abierto!',
    shopOpenedText: 'Patty ya puede fabricarte inventos con tus semillas.',
  },

  /**
   * Laboratorio de Patty (T-022, T-036): los inventos se fabrican para siempre y se mejoran hasta el nivel maximo. Los numeros llegan de las
   * reglas (`grenadeAt`, `iceWallAt`, `relocateAt`), ya formateados si llevan decimales o porcentaje.
   */
  shop: {
    title: 'Laboratorio de Patty',
    hint: (max: number) => `Lo que Patty fabrica es para siempre. Antes de cada brote eliges hasta ${max} inventos.`,
    /** Que hace cada invento, en una frase. */
    about: {
      relocate: 'Lleva una disparadora a otra casilla, tal como está.',
      grenade: 'Cae en una casilla, explota y daña a todos los de alrededor.',
      iceWall: 'Bloques de hielo que cortan el paso un rato.',
    },
    /** Lo que hace en un nivel. */
    stats: {
      relocate: (charges: number, heal: string | null) => `${charges === 1 ? '1 uso' : `${charges} usos`} por partida${heal ? ` · cura un ${heal}` : ''}`,
      grenade: (damage: number, radius: string) => `Daño ${damage} · alcance ${radius}`,
      iceWall: (blocks: number, hp: number) => `${blocks} bloques de ${hp} de vida`,
    },
    level: (level: number, max: number) => `Nivel ${level} de ${max}`,
    /** Delante de lo que hara con la mejora. */
    next: (level: number) => `Nivel ${level}:`,
    /** Con premio: los niveles 5 y 10 suman mas. */
    milestone: '¡Premio!',
    owned: { relocate: 'Tuyo', grenade: 'Tuya', iceWall: 'Tuyo' },
    buy: 'Fabricar',
    upgrade: 'Mejorar',
    maxed: 'Nivel máximo',
    noSeeds: 'Te faltan semillas',
    price: (amount: string, count: number) => (count === 1 ? '1 semilla' : `${amount} semillas`),
    bought: '¡Listo!',
    upgraded: (level: number) => `¡Nivel ${level}!`,
  },

  /** El vivero del Laboratorio de Patty (T-023, T-036): el nivel base de la disparadora. */
  plantShop: {
    title: 'Vivero',
    shooter: 'Disparadora',
    about: 'Toda disparadora que siembres en una partida nueva nace en su nivel base. Subirla en la partida cuesta lo de su nivel.',
    level: (level: number, max: number) => `Nivel base ${level} de ${max}`,
    /** Lo que da el nivel base de ahora. */
    now: (level: number) => (level === 1 ? 'Nace en nivel 1, como siempre' : `Nace en nivel ${level}`),
    /** Con premio: el nivel 5 suma mas y trae su jardincito (T-027). */
    milestone: '¡Premio y jardincito!',
    maxed: 'Máximo',
    upgraded: (level: number) => `¡Nivel base ${level}!`,
  },

  /** Antes de empezar un brote (T-022, T-04): que inventos se llevan. */
  loadout: {
    title: 'Inventos del brote',
    hint: (max: number) => `Elige hasta ${max}. Traen sus cargas a la partida.`,
    count: (chosen: number, max: number) => `Llevas ${chosen} de ${max}`,
    full: (max: number) => `Ya llevas ${max}: deja otro antes`,
    play: '¡A jugar!',
    none: 'Sin inventos',
  },

  /**
   * Semillas (T-020): la moneda que el jugador se lleva de cada partida y gasta fuera de ella (el Laboratorio de Patty, T-036). Nunca se
   * confunden con la moneda de la partida: otro nombre, otro icono y otro color. Las cantidades llegan ya formateadas
   * (`formatAmount`) y los porcentajes, con `formatPercent`.
   */
  seeds: {
    name: 'Semillas',
    amount: (amount: string, count: number) => (count === 1 ? '1 semilla' : `${amount} semillas`),
    /** Lo cobrado al acabar la partida, en grande, y su unidad al lado, en pequeno. */
    earned: (amount: string) => `+${amount}`,
    unit: (count: number): string => (count === 1 ? 'semilla' : 'semillas'),
    rounds: (count: number) => (count === 1 ? '1 ronda superada' : `${count} rondas superadas`),
    boss: 'Jefe vencido',
    hearts: (hearts: number, percent: string) => `${hearts === 1 ? 'Te queda 1 vida' : `Te quedan ${hearts} vidas`} (+${percent})`,
    /** Al perder solo se cobra una parte de lo de las rondas (C-04). */
    kept: (percent: string) => `Al perder te llevas el ${percent}`,
    none: 'Supera una ronda para llevarte semillas.',
    /** Brote ya vencido (C-03). */
    replay: 'Brote ya superado: da menos semillas.',
    balance: (amount: string) => `Ahora tienes ${amount}`,
    /** En el menu de pausa: lo que llevan las rondas, sin cobrar. */
    pending: (amount: string, percent: string) => `Semillas de esta partida: ${amount}. Se cobran al acabar; si pierdes, solo el ${percent}.`,
    /** Saldo en el Invernadero. */
    owned: 'Tus semillas',
  },

  /** Rotulos y textos que salen sobre el tablero. */
  board: {
    attack: '¡Ahí vienen!',
    roundCleared: (round: number) => `¡Ronda ${round} superada!`,
    /** Bajo "¡Ronda N superada!": lo que sumo a la partida (T-020). */
    seedsEarned: (amount: string, count: number) => `+${count === 1 ? '1 semilla' : `${amount} semillas`}`,
    /** Debajo, el premio de estreno de la ronda 1 del brote 1 (T-047): sus semillas, aparte de las de la ronda. */
    openingBonus: (amount: string) => `¡Premio de estreno! +${amount}`,
    bossDown: { creeper: '¡Creeper atrapado!', elkCloner: '¡Elk Cloner, silenciado!', brain: '¡Brain, formateado!', morris: '¡Morris, parcheado!' },
    /** La sobrecarga (T-042) se enciende sobre el tablero. */
    overload: '¡Sobrecarga!',
    /** Elk Cloner anuncia el poema entero (T-026, L-03). */
    poem: '¡Poema entero!',
    gardenSafe: '¡Jardín a salvo!',
    bossEscaped: '¡Se escapó!',
    lifeLost: '−1 ♥',
    fused: '¡Fusión!',
    infused: { fire: '¡Fuego!', ice: '¡Hielo!', shield: '¡Escudo!' },
    /** Infundir lo que aun no se puede en este brote (T-037, ES-02: el escudo en el brote 2). */
    infuseLater: 'Infundir: aún no',
    infuseFrom: (round: number) => `Infundir: desde la ronda ${round}`,
    hasElement: { fire: 'Ya tiene fuego', ice: 'Ya tiene hielo', shield: 'Ya tiene escudo' },
    infuse: (price: string) => `Infundir: ${price}`,
    noFunds: 'No alcanza la moneda',
    fuse: (cannons: number) => `Fusionar: ${cannons} cañones`,
    willBeLevel: (level: number) => `Quedará en nivel ${level}`,
    otherVariant: 'Otra variante',
    maxCannons: (cannons: number) => `Máximo ${cannons} cañones`,
    infuseWithMine: 'Infundir con la mina',
    infuseMinePlus: (extra: string) => `Infundir: mina + ${extra}`,
    /** Con un muro en la mano (T-024). */
    infuseWithWall: 'Infundir con el muro',
    infuseWallPlus: (extra: string) => `Infundir: muro + ${extra}`,
    /** Poderes (T-021). */
    relocated: '¡Recolocada!',
    /** Lo que cura recolocar con nivel (T-022). */
    healed: (hp: number) => `+${hp}`,
    pickShooter: 'Elige una disparadora',
    relocateHere: 'Recolocar aquí',
    occupied: 'Casilla ocupada',
    iceBlocked: 'Hay algo en medio',
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

  /**
   * Lo que dice Elk Cloner, el Poeta (T-026), en su bocadillo de pergamino: siempre rimando. Sus versos se inventan para el
   * juego: no se reproduce el poema del virus de verdad.
   */
  elkCloner: {
    entrance: 'Soy Elk Cloner, el Poeta: ¡tu jardín será mi libreta!',
    /** Una de cada tantas veces que suelta un verso por su carril. */
    verses: ['¡De disquete en disquete, mi verso se mete!', '¡Me copio y me recopio, y el jardín ya es propio!', '¡Rima, rima, que te pillo encima!', '¡Verso va, verso viene!'],
    /** Al anunciar el poema entero (L-03), por turnos. */
    poem: [
      'Silencio en la sala: ¡mi poema se instala!',
      'Cinco versos, cinco carriles: ¡que tiemblen tus perejiles!',
      'Ahora va el poema entero: ¡escúchalo, jardinero!',
    ],
    escape: 'Fin del poema y del jardín. Firmado: Elk Cloner.',
    cheer: '¡Bravo, bravísimo! ¡Qué final tan buenísimo!',
    preparing: 'Escribo un poema, y tu jardín es el tema…',
    shouts: { escort: '¡Copycat, en formación: que empiece la función!' },
  },

  /**
   * Lo que dice Brain, el Cerebro (T-039, BR-09), en su bocadillo de contestador: se burla con el telefono que el Brain de
   * verdad dejo en su codigo y con la copia limpia que ensenaba a quien miraba el disco.
   */
  brain: {
    entrance: '¿Me buscabas? Deja tu mensaje.',
    /** Al volver a ocultarse, por turnos. */
    concealed: ['¡Ya no me ves!', 'El número que buscas no está disponible.', 'Aquí solo hay un disco limpio…', '¿Hola? ¿Hay alguien?'],
    /** Cuando lo descubre una mina o la granada, por turnos. */
    blasted: ['¡Eh, que me has visto!', '¡Ay! ¿Quién llama?', '¡Sector descubierto!'],
    /** Una de cada pocas veces que muerde el escudo que lo para. */
    bite: ['Ring, ring… ¡ábreme!', 'Toc, toc: ¡soy Brain!', '¡Este escudo está en mi lista!'],
    /** Al entrar en su fase 2 (BR-06). */
    enraged: '¡Se acabaron las bromas! ¡Reiniciando!',
    escape: 'Llámame cuando quieras: ya tienes mi número.',
    cheer: '¡Gracias por llamar a Brain! ¡Ja, ja!',
    preparing: 'Marcando sectores defectuosos… Aquí no hay nadie, ¿eh?',
    shouts: { escort: '¡Lurkers, a esconderse! ¡Skippers, a saltar!' },
  },

  /**
   * Lo que dice Morris, el Imparable (T-042, MR-09), en su bocadillo de consola: pide perdon mientras lo inunda todo. El Morris
   * real lo escribio un estudiante que solo queria medir la red, y un fallo lo hacia copiarse sin parar.
   */
  morris: {
    entrance: '¡Perdón, perdón! ¡No paran de salir!',
    /** Una de cada pocas veces que se le suelta un gusano, por turnos. */
    brood: ['¡Uy, otro!', '¡Lo siento, me copio solo!', '¡Perdón! ¡Yo solo quería contaros!', '¡Que alguien me pare!', '¡Ay, ay, ay, que se me escapan!'],
    /** Una de cada pocas veces que muerde algo sin pararse (MR-06), por turnos. */
    chew: ['¡Disculpa, voy con prisa!', '¡Perdón por el mordisco!', '¡No puedo frenar!'],
    /** Al encenderse la sobrecarga (T-042). */
    overload: '¡Ay, que esto se llena!',
    escape: '¡Lo siento muchísimo! ¿Me perdonas?',
    cheer: '¡Perdón! ¡Perdón! ¡Pero qué de copias!',
    preparing: 'Contando máquinas… uno, dos, ¿dos? ¡Me he vuelto a copiar!',
    shouts: { escort: '¡Perdón por la escolta! ¡Acorazados, adelante!' },
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
      /** Minstrel (T-025): lo que quita su verso a cada cosa que cruza. */
      verse: 'Verso',
      verseNote: (time: string, cells: string) => `a cada cosa, cada ${time}, desde ${cells} casillas`,
      /** Elk Cloner (T-026): su verso, mientras anda, y su poema entero por los cinco carriles. */
      bossVerseNote: (time: string) => `a cada cosa de su carril, cada ${time}`,
      poem: 'Poema entero',
      poemNote: (every: number, warn: string) => `por los cinco carriles, cada ${every} versos, tras ${warn} de aviso`,
      nextPoem: 'Próximo poema',
      poemIn: (verses: number) => (verses <= 1 ? 'Tras el próximo verso' : `Dentro de ${verses} versos`),
      poemNow: '¡Ya lo está recitando!',
      /** Copycat (T-025): lo que dejan al caer. */
      leavesClone: 'Deja una copia',
      /** Skipper (T-038): cuanto salta y cuanto descansa entre salto y salto. */
      hop: 'Salto',
      hopValue: (cells: string) => `${cells} casillas`,
      hopNote: (time: string) => `y ${time} en tierra`,
      /** Brain (T-039): que lo descubre. */
      revealedBy: 'Lo descubren',
      revealedByValue: 'Un escudo, una mina o la granada',
      revealedByNote: 'ni la cercanía ni las balas',
      /** Lurker (T-038): a que distancia de lo sembrado lo ven las plantas. */
      seen: 'Lo ven',
      seenValue: (cells: string) => `A ${cells} casillas`,
      seenNote: 'de lo primero sembrado en su carril',
      bite: 'Mordisco',
      biteNote: (time: string) => `cada ${time}`,
      slam: 'Golpe al caer',
      slamNote: 'al aterrizar de un salto',
      /** Morris (T-042): los gusanos que suelta (MR-07) y lo que hace al morder (MR-06). */
      brood: 'Gusanos',
      broodValue: (time: string) => `Uno cada ${time}`,
      broodNote: (time: string) => `cada vez más seguido, hasta uno cada ${time}`,
      chew: 'Al morder',
      chewValue: 'Sigue a media marcha',
      chewNote: 'nada lo para',
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
      /** Escudo (T-024): lo que para el muro o la disparadora con escudo. */
      blocks: 'Para',
      blocksValue: 'Lo que disparan a lo de detrás',
      attack: 'Ataque',
      noAttack: 'No ataca',
      drag: 'Arrastrarlo',
      dragValue: 'Infunde escudo en una disparadora',
      /** Muro de hielo del poder (T-021): cuando se derrite. */
      melts: 'Se derrite',
      meltsIn: (time: string) => `Dentro de ${time}`,
    },
    tags: {
      waiting: 'Esperando a un enemigo',
      explodesIn: (time: string) => `¡Explota en ${time}!`,
      enraged: '¡Enfadado!',
      jumping: 'Saltando de carril',
      spitting: 'Escupiendo',
      biting: 'Mordiendo',
      /** Minstrel (T-025): parado a su distancia, y tomando aire antes del verso (F-04). */
      reciting: 'Recitando',
      inhaling: '¡Toma aire!',
      /** Elk Cloner anunciando el poema entero (T-026). */
      poem: '¡Anuncia el poema entero!',
      burning: (amount: string) => `Quemado: −${amount} por segundo`,
      slowed: (percent: string) => `Frenado un ${percent}`,
      hasted: (percent: string) => `Acelerado +${percent}`,
      /** La sobrecarga encendida (T-042) acelera a todos menos al jefe. */
      overloaded: (percent: string) => `Sobrecarga: +${percent}`,
      /** Desgaste del muro (T-024). */
      cracked: 'Agrietado',
      crumbling: '¡A punto de romperse!',
      /** Muro de hielo del poder (T-021) en sus ultimos segundos. */
      melting: '¡Derritiéndose!',
      /** Tropas del brote 3 (T-038): oculta (las plantas no la ven) o descubierta. */
      hidden: 'Oculto: las plantas no lo ven',
      revealed: 'Descubierto',
      /** Skipper (T-038) en mitad de un salto, o agachado para el siguiente. */
      airborne: 'En el aire: no le dan las balas',
      crouching: '¡Va a saltar!',
      /** Una tropa de un brote anterior que vuelve con el color del brote que la recluta (T-041, MT-02). */
      recruited: (boss: string) => `Reclutado por ${boss}`,
    },
    shooter: {
      title: { plain: 'Disparadora', fire: 'Disparadora de fuego', ice: 'Disparadora de hielo', shield: 'Disparadora con escudo' },
      oneCannon: 'Un cañón',
      fused: (cannons: number) => `${cannons} cañones fusionados`,
      cap: (cap: number) => `Tope ${cap}`,
      /** Pastilla del nivel base comprado (T-023). */
      baseLevel: (level: number) => `Nivel base ${level}, del Invernadero`,
      about: {
        plain: 'Dispara semillas a los enemigos de su carril que tiene delante.',
        fire: 'Sus semillas queman: el enemigo sigue perdiendo vida un rato después del impacto.',
        ice: 'Sus semillas frenan: el enemigo avanza y muerde más despacio.',
        shield: 'Dispara como una normal y aguanta el doble. Los disparos enemigos se quedan en ella: no llegan a las de detrás.',
      },
    },
    /** Muro (T-024): el escudo sembrado solo. */
    wall: {
      title: 'Muro',
      subtitle: 'Escudo sembrado solo',
      about: 'No dispara ni explota: aguanta los mordiscos y los disparos que iban a lo de detrás.',
      /** Lo que se suma a `about` cuando ya se puede infundir el escudo (T-037). */
      aboutInfuse: 'Arrástralo sobre una disparadora para infundirle escudo.',
    },
    /** Bloque del muro de hielo del poder (T-021). */
    iceWall: {
      title: 'Muro de hielo',
      subtitle: 'Invento: se derrite',
      about: (time: string) => `Corta el paso: los enemigos se paran a morderlo, y para los disparos y los versos que iban a lo de detrás. Dura ${time}.`,
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
      names: {
        worm: 'Gusano',
        armored: 'Gusano acorazado',
        spitter: 'Gusano escupidor',
        creeper: 'Creeper',
        /** Jefe del brote 2 (T-026). */
        elkCloner: 'Elk Cloner',
        /** Tropas del brote 2 (T-025). */
        copycat: 'Copycat',
        copycatArmored: 'Copycat acorazado',
        copycatSpitter: 'Copycat escupidor',
        minstrel: 'Minstrel',
        /** Tropas del brote 3 (T-038). */
        lurker: 'Lurker',
        lurkerSpitter: 'Lurker escupidor',
        lurkerArmored: 'Lurker acorazado',
        skipper: 'Skipper',
        /** Jefe del brote 3 (T-039). */
        brain: 'Brain',
        /** Jefe del brote 4 (T-042). */
        morris: 'Morris',
      },
      /** La copia que deja cada Copycat al caer (T-025, F-01). */
      cloneNames: { copycat: 'Copia de Copycat', copycatArmored: 'Copia acorazada', copycatSpitter: 'Copia escupidora' },
      subtitle: {
        worm: 'Gusano informático',
        armored: 'Con casco y placas de acero',
        spitter: 'Ataca desde lejos',
        copycat: 'Viaja en disquete',
        copycatArmored: 'Con placas de disquete',
        copycatSpitter: 'Escupe y se copia',
        minstrel: 'Recita versos',
        lurker: 'Llega oculto',
        lurkerSpitter: 'Escupe desde la sombra',
        lurkerArmored: 'Con placas de sectores',
        skipper: 'Salta por encima de todo',
        clone: 'Pequeña y débil',
        boss: (outbreak: number) => `Jefe del brote ${outbreak}`,
        bossEnraged: (outbreak: number) => `Jefe del brote ${outbreak} · fase 2`,
        /** Elk Cloner, el Poeta (T-026). */
        poet: (outbreak: number) => `El Poeta · jefe del brote ${outbreak}`,
        /** Brain, el Cerebro (T-039), y en su fase 2 (BR-06). */
        mastermind: (outbreak: number) => `El Cerebro · jefe del brote ${outbreak}`,
        mastermindEnraged: (outbreak: number) => `El Cerebro · jefe del brote ${outbreak} · fase 2`,
        /** Morris, el Imparable (T-042). */
        unstoppable: (outbreak: number) => `El Imparable · jefe del brote ${outbreak}`,
      },
      about: {
        worm: 'Avanza por su carril y muerde lo primero que encuentra hasta destruirlo.',
        armored: 'Como el gusano, con cuatro veces su vida y más lento. Se le caen las placas al perder vida.',
        spitter: (cells: string) => `Se para a ${cells} casillas de lo primero sembrado y le escupe. Puede reventar una mina antes de que explote.`,
        creeper: 'Salta de carril al perder vida y deja copias suyas. Si cruza el jardín, se pierde la partida.',
        elkCloner: (every: number) =>
          `Avanza despacio y muerde lo que toca. Recita versos por su carril y, cada ${every} versos, el poema entero por los cinco a la vez: solo lo para un escudo, y no mata lo que tenga la vida entera. Si cruza el jardín, se pierde la partida.`,
        copycat: 'Muerde como el gusano. Al caer deja una copia pequeña y débil, una sola vez.',
        copycatArmored: 'Como el acorazado, con placas de disquete. Al caer deja una copia pequeña y débil, una sola vez.',
        copycatSpitter: (cells: string) => `Se para a ${cells} casillas de lo primero sembrado y le escupe. Al caer deja una copia pequeña y débil, una sola vez.`,
        minstrel: (cells: string) =>
          `Se para a ${cells} casillas de lo primero sembrado, se hincha y suelta un verso: una onda que cruza el carril y daña todo lo que pasa, minas incluidas. Solo la para un escudo.`,
        clone: (hp: string, damage: string) => `Salió de un Copycat al caer. Ataca como él, con el ${hp} de su vida y el ${damage} de su fuerza, y ya no deja otra copia.`,
        lurker: (cells: string) =>
          `Llega oculto: las plantas no le apuntan hasta que está a ${cells} casillas de lo primero sembrado en su carril. Recibir daño, el hielo y el fuego lo descubren un rato. Muerde como el gusano.`,
        lurkerSpitter: (cells: string, range: string) =>
          `Llega oculto como el Lurker y las plantas lo ven a ${cells} casillas. Se para a ${range} casillas de lo primero sembrado y le escupe, así que siempre se descubre antes de atacar.`,
        lurkerArmored: (cells: string) =>
          `Llega oculto como el Lurker y las plantas lo ven a ${cells} casillas. Tiene cuatro veces su vida y va más lento. Se le caen las placas al perder vida.`,
        skipper: (cells: string) =>
          `Avanza a saltos de ${cells} casillas por encima de plantas y minas y solo lo para un escudo, al que muerde. En el aire no le dan las balas: hay que pillarlo en tierra.`,
        brain: (cells: string) =>
          `Avanza oculto, a saltos de ${cells} casillas por encima de plantas y minas, y las plantas no le apuntan. Solo lo para un escudo: cae delante, se descubre y lo muerde. Una mina o la granada que estalla a su lado también lo descubre un rato. Si cruza el jardín, se pierde la partida.`,
        morris:
          'Nada lo para: muerde lo que toca y, mientras, sigue a media marcha. Suelta gusanos por los cinco carriles, cada vez más seguido, y los suyos se comen las balas que van hacia él. Si cruza el jardín, se pierde la partida.',
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
    /** Musica de fondo (T-015): el titulo y la licencia de cada pista van tal cual; esto es lo que los rodea. */
    music: 'Música',
    musicTitle: (title: string) => `«${title}»`,
    musicBy: (author: string) => `de ${author}`,
    musicFor: { menu: 'menús', round: 'rondas', boss: 'jefes' },
    tech: 'Hecho con',
    thanks: '¡Gracias por jugar!',
    legal:
      'Plants vs. Zombies es una marca de Electronic Arts Inc. Rebrote es un proyecto personal sin relación con PopCap Games ni con Electronic Arts.',
  },
};

export type Dictionary = typeof es;
