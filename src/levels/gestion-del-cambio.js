// NIVEL 1 · Gestión del cambio
// Todo el contenido del nivel vive acá: personajes, guion, diálogos, opciones y propuesta.
// En los textos, **así** se resalta una palabra.

export default {
  id: 'gestion-del-cambio',
  titulo: 'GESTIÓN DEL CAMBIO',
  subtitulo: '¿Sobrevivís a la gestión del cambio?',
  // Para el menú de niveles
  menu: { nombre: 'Gestión del cambio', personaje: 'Sos un paciente con la rodilla a la miseria.' },

  // ---------- arranque ----------
  // A quién manejás: sprite (ver core/characters.js), nombre y forma de caminar
  // (renguea | tiembla | cansado | normal).
  jugador: { x: 7, y: 22, dir: 'up', sprite: 'paciente', nombre: 'Paciente', andar: 'renguea' },
  // Medidor de arriba. sube: true = se llena (dolor); false = se vacía (batería).
  // Internamente 0 es "todo bien" y 100 es "perdiste".
  medidor: {
    nombre: 'DOLOR DE RODILLA',
    icono: 'face', // face | fear | batt
    sube: true,
    vineta: 'vignette', // borde rojo
    inicial: 10,
    porSegundo: 0.22, // sube solo con el tiempo
    maxAntesDelColapso: 94, // el desmayo "de verdad" lo da el final guionado...
    topeSegundos: 110, // ...o el tope de tiempo, si alguien se queda quieto
    lentitud: 0.45, // cuánto te frena cuando está lleno
  },
  camara: { ancho: 15 }, // en este nivel el ala del personal no se ve

  // ---------- mapa: qué cambia en este nivel ----------
  // Carteles de los consultorios: lo que dicen hoy (mal) y cómo quedan arreglados.
  carteles: [
    { id: 'c1', texto: 'CARDIOLOGÍA', arreglado: 'ECOGRAFÍA' },
    { id: 'c2', texto: 'ECOGRAFÍA', arreglado: 'TRAUMATOLOGÍA' },
    { id: 'c3', texto: 'TRAUMATOLOGÍA', arreglado: 'CARDIOLOGÍA' },
    { id: 'c4', texto: 'CLÍNICA MÉDICA', arreglado: 'CLÍNICA MÉDICA' },
  ],
  cartelesExtra: [{ x: 9, y: 23, w: 4, texto: '¡NOS MUDAMOS!\nNueva sede >' }],
  puertasCerradas: ['c2', 'ala'],

  npcs: [
    { id: 'recepcionista', sprite: 'recepcionista', nombre: 'Recepcionista', x: 2, y: 11, dir: 'down' },
    { id: 'cardiologa', sprite: 'cardiologa', nombre: 'Cardióloga', x: 12, y: 2, dir: 'left' },
    { id: 'ecografista', sprite: 'ecografista', nombre: 'Ecografista', x: 2, y: 2, dir: 'right' },
    { id: 'clinico', sprite: 'clinico', nombre: 'Clínico', x: 12, y: 7, dir: 'left' },
    { id: 'enfermero', sprite: 'enfermero', nombre: 'Enfermero', x: 6, y: 7, dir: 'down' },
    { id: 'administrativo', sprite: 'administrativo', nombre: 'Administrativo', x: 12, y: 11, dir: 'left' },
    { id: 'maestranza', sprite: 'maestranza', nombre: 'Empleado de maestranza', x: 4, y: 19, dir: 'right' },
  ],

  // Pacientes que deambulan perdidos por el hall
  pacientes: {
    sprites: ['pac1', 'pac2', 'pac3', 'pac4', 'pac5', 'pac6', 'pac7'],
    zona: { x: 6, y: 13, w: 8, h: 8 },
    frases: [
      '¿Usted sabe dónde está Ecografía?',
      'Hace una hora que doy vueltas.',
      'Me dijeron "al fondo". ¿Al fondo de qué?',
      'Yo vine por un análisis, nomás.',
      '¿Esto no se mudaba?',
    ],
  },

  zonas: [
    { id: 'c1', x: 1, y: 1, w: 3, h: 4 },
    { id: 'c3', x: 11, y: 1, w: 3, h: 4 },
    { id: 'c4', x: 11, y: 6, w: 3, h: 4 },
    { id: 'hall', x: 0, y: 11, w: 15, h: 12 },
  ],

  // ---------- guion ----------
  // Cada paso tiene un objetivo (arriba en pantalla) y a dónde apunta la flechita.
  pasos: [
    { id: 'recepcion', objetivo: 'Hablá con recepción.', target: 'npc:recepcionista' },
    { id: 'consultorio3', objetivo: 'Andá a Traumatología: consultorio 3, al fondo.', target: 'puerta:c3' },
    {
      id: 'preguntar',
      objetivo: 'Preguntale a alguien dónde está Traumatología.',
      target: ['npc:enfermero', 'npc:administrativo', 'npc:maestranza'],
      completo: { flags: ['hablo:enfermero', 'hablo:administrativo', 'hablo:maestranza'], ir: 'consultorio1' },
    },
    {
      id: 'consultorio1',
      objetivo: 'Probá en el consultorio 1, como dijo el enfermero.',
      target: 'puerta:c1',
      completo: { flags: ['visito:c1'], ir: 'volver' },
    },
    { id: 'volver', objetivo: 'Volvé a recepción a preguntar.', target: 'npc:recepcionista', alEntrar: 'formarCola' },
  ],

  // Reglas: "cuando pasa X (en el paso Y), decí esto y hacé aquello". Se usa la primera que coincide.
  // en: npc:<id> | zona:<id> | puerta:<id> | paciente
  reglas: [
    // Recepción
    {
      en: 'npc:recepcionista',
      paso: 'recepcion',
      dice: ['¡Hola! ¿Rodilla? Traumatología es el **consultorio 3**, al fondo del pasillo.', '¡Que te mejores!'],
      ir: 'consultorio3',
    },
    { en: 'npc:recepcionista', paso: 'consultorio3', dice: ['Consultorio 3, al fondo del pasillo. ¡Dale que llegás!'] },
    { en: 'npc:recepcionista', paso: 'volver', evento: 'colapso' },
    { en: 'npc:recepcionista', dice: ['Ahora no puedo, hay mucha gente... ¡Preguntale a alguien de adentro!'] },

    // Consultorio 3: dice Traumatología pero es Cardiología
    {
      en: ['zona:c3', 'npc:cardiologa'],
      paso: 'consultorio3',
      quien: 'Cardióloga',
      dice: [
        '¿Rodilla? Esto es **Cardiología** desde el lunes.',
        'A marketing le avisamos ayer. El cartel lo cambian... algún día.',
      ],
      dolor: 25,
      ir: 'preguntar',
    },
    { en: 'npc:cardiologa', dice: ['Tu corazón anda bárbaro. La rodilla no es mi tema.'] },

    // Información contradictoria: cada uno escuchó otra versión de su jefe
    {
      en: 'npc:enfermero',
      paso: 'preguntar',
      siNo: ['hablo:enfermero'],
      dice: ['Mi jefa nos juntó y nos dijo que Traumato pasó al **consultorio 1**.'],
      dolor: 8,
      marca: ['hablo:enfermero'],
    },
    { en: 'npc:enfermero', dice: ['Consultorio 1. Eso dijo mi jefa. Creo.'] },
    {
      en: 'npc:administrativo',
      paso: 'preguntar',
      siNo: ['hablo:administrativo'],
      dice: ['A nosotros solo nos dijeron que la clínica está en **"crecimiento"**.', 'No sé nada más, perdón.'],
      dolor: 8,
      marca: ['hablo:administrativo'],
    },
    { en: 'npc:administrativo', dice: ['"Crecimiento". Es todo lo que sé. Crecimiento.'] },
    {
      en: 'npc:maestranza',
      paso: 'preguntar',
      siNo: ['hablo:maestranza'],
      dice: ['Escuché que **Traumatología se mudó a la otra sede**.', 'Bah, eso dicen en el pasillo.'],
      dolor: 8,
      marca: ['hablo:maestranza'],
    },
    { en: 'npc:maestranza', dice: ['Yo te digo lo que se dice en el pasillo, eh.'] },

    // Consultorio 1: es Ecografía (aunque el cartel diga otra cosa)
    {
      en: ['zona:c1', 'npc:ecografista'],
      paso: ['preguntar', 'consultorio1'],
      siNo: ['visito:c1'],
      quien: 'Ecografista',
      dice: ['¿Traumatología? Acá hacemos **ecografías**... creo.', 'Ayer era otra cosa.'],
      dolor: 12,
      marca: ['visito:c1'],
    },
    { en: 'npc:ecografista', dice: ['Ecografías. Hoy. Mañana vemos.'] },

    // Otros
    { en: 'puerta:c2', quien: 'Cartel', dice: ['CERRADO. "Mudanza en curso. Consulte en recepción."'] },
    { en: 'npc:clinico', dice: ['Clínica Médica. ¿Rodilla? Eso es Traumato. Preguntá afuera.'] },
    { en: 'paciente', alAzar: true },

    // El mostrador colapsado
    { en: 'zona:hall', paso: 'volver', evento: 'colapso' },
  ],

  // Cola del mostrador al final
  cola: {
    posiciones: [
      { x: 2, y: 13 },
      { x: 3, y: 13 },
      { x: 2, y: 14 },
      { x: 1, y: 14 },
      { x: 3, y: 15 },
      { x: 2, y: 16 },
      { x: 1, y: 16 },
    ],
    quejas: [
      '¡Me mandaron a Cardiología y vengo por un análisis!',
      '¿Dónde está Ecografía?',
      'Hace una hora que doy vueltas.',
      '¡¿Alguien sabe algo?!',
      'Dicen que se muda todo...',
    ],
    grito: '¡No sé! ¡A mí nadie me avisó de los cambios!',
    jugador: 'Ay... mi rodilla...',
  },

  desmayo: {
    textoHall: 'Te desmayaste en la sala de espera.',
    textoOtro: 'Te desmayaste en el pasillo.',
  },

  // ---------- después del desmayo ----------
  queFallo: {
    titulo: 'GESTIÓN DEL CAMBIO',
    frase: 'Cada empleado vive el cambio según el jefe que le toca.',
    linea: 'Los cambios llegaron **tarde**, **distintos** y **por rumores**.',
  },

  decision: {
    pregunta: '¿Cómo se podría haber evitado?',
    opciones: [
      {
        id: 'protocolo',
        correcta: true,
        texto:
          'Crear un **protocolo único** para comunicar cada cambio (qué cambia, por qué, cuándo, a quién afecta) y bajarlo **en cascada**: primero a los jefes con el mismo mensaje y, antes de tocar algo, avisar a todas las áreas afectadas.',
      },
      {
        id: 'recepcionistas',
        correcta: false,
        texto: 'Poner **más recepcionistas** y carteles más grandes en el pasillo.',
        porQue:
          'Atacás el síntoma. Si el área médica cambia el consultorio sin avisar, **el cartel grande sigue diciendo cualquier cosa**.',
      },
      {
        id: 'cada-jefe',
        correcta: false,
        texto: 'Que cada jefe siga avisando a su equipo como le parezca, pero **más rápido**.',
        porQue:
          'Ese es justamente el problema: **el mismo cambio llega distinto según el jefe que te toca**, y el resto se llena de rumores.',
      },
    ],
  },

  // Repetición del hospital arreglado
  arreglado: {
    titulo: 'Así sería con nuestra propuesta',
    medidorInicial: 60,
    frase: 'Traumatología: consultorio 2. ¡Nos avisaron a todos el viernes!',
    hablan: ['enfermero', 'administrativo', 'maestranza'],
    recepcion: '¡Hola! Traumato es el 2. Está en el protocolo.',
    medico: { sprite: 'traumatologo', nombre: 'Traumatólogo', x: 2, y: 7, dir: 'right', dice: '¡Hola! Pasá, veamos esa rodilla.' },
    destino: { x: 3, y: 8 },
    jugadorFinal: '¡Qué alivio!',
    puertaQueSeAbre: 'c2',
  },

  propuesta: {
    titulo: 'NUESTRA PROPUESTA',
    bloques: [
      {
        titulo: 'Protocolo único',
        texto:
          'Cada cambio se comunica con la misma plantilla: **qué cambia, por qué, cuándo, a quién afecta y qué NO cambia**. Lo arman **RRHH + Comunicación interna**.',
      },
      {
        titulo: 'Mapa de impacto',
        texto:
          'Antes de cambiar, mirar **quién pierde algo** con el cambio y **cómo se compensa** (ej: home office para los que ahora viajan más).',
      },
      {
        titulo: 'Cascada',
        texto:
          'Primero los **mandos medios**, con un **kit de mensajes**; después cada jefe a su equipo. Incluye **avisar a otras áreas antes** de cambiar algo que las afecta.',
      },
      {
        titulo: 'Extender lo que ya funciona',
        texto:
          'La **reunión con el equipo** y los **espacios de estabilidad** que ya hacen algunos jefes, como práctica de **todos** los jefes.',
      },
    ],
    materia: {
      titulo: 'De la materia',
      items: [
        '**No conocer / No poder / No querer**: acá es "no conocer", y se resuelve **comunicando**.',
        'Causas de resistencia: **miedo a lo desconocido** y **falta de información**.',
        '**Kotter**: comunicar la visión.',
        'El cerebro **busca certidumbre**.',
      ],
    },
  },

  final: {
    linea: 'Gestión del cambio: un protocolo único para comunicar cambios, bajado en cascada.',
    resumen: 'Un **protocolo único** y en **cascada**: el mismo mensaje, a todos, antes del cambio.',
  },
};
