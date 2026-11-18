// NIVEL 3 · Feedback y coaching · "Un año sin feedback"
// Jugás como Tomás, enfermero nuevo. Arriba hay un calendario que va de enero a diciembre.
// En los textos, **así** se resalta una palabra.

export default {
  id: 'feedback-coaching',
  titulo: 'FEEDBACK Y COACHING',
  subtitulo: 'Un año sin feedback',
  menu: { nombre: 'Feedback y coaching', personaje: 'Sos Tomás, enfermero nuevo.' },

  // ---------- arranque ----------
  jugador: { x: 21, y: 10, dir: 'left', sprite: 'tomas', nombre: 'Tomás', andar: 'cansado' },
  medidor: {
    nombre: 'MOTIVACIÓN',
    icono: 'batt',
    sube: false, // tipo batería: baja
    vineta: 'vignetteBlue',
    sonido: 'lowbatt',
    golpe: 'BAJÓN',
    inicial: 0, // batería llena
    porSegundo: 0.12,
    maxAntesDelColapso: 90,
    topeSegundos: 95, // si nadie llega a diciembre, diciembre llega solo
    lentitud: 0.4, // con la batería baja camina más lento
  },
  // Calendario: los meses y en qué paso arranca cada uno.
  calendario: {
    meses: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
    avanzaSoloCada: 12, // segundos: si te quedás quieto, el año pasa igual
    bajaPorMes: 6, // cuánta motivación se pierde cada mes sin feedback
  },

  // ---------- mapa ----------
  carteles: [
    { id: 'c1', texto: 'ECOGRAFÍA' },
    { id: 'c2', texto: 'TRAUMATOLOGÍA' },
    { id: 'c3', texto: 'CARDIOLOGÍA' },
    { id: 'c4', texto: 'CLÍNICA MÉDICA' },
    { id: 'adm', texto: 'FACTURACIÓN' },
    { id: 'ofi', texto: 'OFFICE' },
    { id: 'jef', titulo: 'JEFA DE', texto: 'ENFERMERÍA' },
    { id: 'reu', titulo: 'SALA DE', texto: 'REUNIONES' },
  ],
  cartelesExtra: [
    { id: 'feedback', x: 14, y: 14, w: 3, texto: 'FEEDBACK: 1 VEZ POR AÑO.\nDE ARRIBA HACIA ABAJO.', estilo: 'blanco', alto: 13, tamano: 3.4 },
  ],
  puertasCerradas: ['jef'],

  npcs: [
    { id: 'recepcionista', sprite: 'recepcionista', nombre: 'Recepcionista', x: 2, y: 11, dir: 'down' },
    { id: 'companero', sprite: 'enfermero', nombre: 'Compañero', x: 24, y: 10, dir: 'left' },
    { id: 'jefa', sprite: 'jefa', nombre: 'Jefa de Enfermería', x: 24, y: 16, dir: 'left' },
  ],

  objetos: [
    { id: 'estante', tiles: [[18, 9], [19, 9], [20, 9]], nombre: 'Estante' },
    { id: 'bandeja', x: 1, y: 7, sprite: 'tray', solido: true, nombre: 'Bandeja' },
    { id: 'bandejaOk', x: 1, y: 8, sprite: 'tray', solido: true, nombre: 'Bandeja' },
    { id: 'carrito', x: 19, y: 12, sprite: 'cart', solido: true, nombre: 'Carrito' },
    { id: 'cartelQR', tiles: [[22, 8], [23, 8]], nombre: 'Cartel' },
  ],
  carritoDestino: [{ x: 24, y: 13 }, { x: 23, y: 13 }, { x: 25, y: 12 }],

  pacientes: {
    sprites: ['pac2', 'pac5', 'pac7'],
    zona: { x: 6, y: 14, w: 7, h: 7 },
    frases: ['¿Enfermería? Me toca el control.', 'Vengo por la vacuna.', 'Qué rápido pasa el año, ¿no?'],
  },

  zonas: [
    { id: 'office', x: 18, y: 9, w: 8, h: 5 },
    { id: 'frenteDespacho', x: 15, y: 15, w: 2, h: 3 },
    { id: 'despacho', x: 18, y: 15, w: 8, h: 3 },
    { id: 'hall', x: 0, y: 11, w: 15, h: 12 },
  ],

  // ---------- guion ----------
  // mes: en qué mes del calendario arranca el paso. pasa: lo que dice la jefa al pasar caminando.
  pasos: [
    { id: 'carpeta', mes: 0, objetivo: 'Agarrá las historias clínicas del estante.', target: 'obj:estante' },
    { id: 'llevar', mes: 0, objetivo: 'Llevalas al consultorio 2 y dejalas en la bandeja.', target: 'obj:bandeja' },
    { id: 'reponer', mes: 2, pasa: 'Después hablamos.', objetivo: 'Reponé el estante del office.', target: 'obj:estante' },
    {
      id: 'idea',
      mes: 5,
      pasa: '... (mirando el celular)',
      objetivo: 'Tenés una idea: contásela a tu jefa (despacho, al fondo del pasillo).',
      target: 'puerta:jef',
      alEntrar: 'idea',
    },
    { id: 'carrito', mes: 7, pasa: 'Bien, bien, seguí.', objetivo: 'Ordená el carrito de curaciones.', target: 'obj:carrito' },
    {
      id: 'diciembre',
      mes: 11,
      objetivo: '¡Diciembre! Andá a tu evaluación anual (despacho).',
      target: 'puerta:jef',
      alEntrar: 'abrirDespacho',
    },
  ],
  // Lo que dice la jefa cuando el año avanza solo.
  pasaSolo: ['Ahora no puedo.', 'Después hablamos.', '...'],

  reglas: [
    {
      en: 'obj:estante',
      paso: 'carpeta',
      sonido: 'pickup',
      flotante: '¡Historias clínicas!',
      evento: 'agarrarCarpeta',
      ir: 'llevar',
    },
    {
      en: 'obj:bandeja',
      paso: 'llevar',
      sonido: 'paper',
      evento: 'dejarCarpeta',
      quien: 'Tomás',
      dice: ['Listo, en la bandeja.', '(¿Será esta? Nadie me dijo nada...)'],
      ir: 'reponer',
    },
    { en: 'obj:bandejaOk', paso: 'llevar', quien: 'Tomás', dice: ['¿Esta o la de al lado? Mmm... **mejor la de al lado**.'] },
    {
      en: ['zona:office', 'npc:companero'],
      paso: ['reponer', 'idea', 'carrito'],
      siNo: ['hablo:companero'],
      mira: ['companero'],
      dice: [
        { quien: 'Compañero', texto: '¿Y? ¿Lo estás haciendo bien?' },
        { quien: 'Tomás', texto: 'Ni idea. **La evaluación es en diciembre.**' },
      ],
      medidor: 6,
      marca: ['hablo:companero'],
    },
    { en: 'obj:estante', paso: 'reponer', sonido: 'pickup', flotante: '¡Estante repuesto!', ir: 'idea' },
    {
      en: ['puerta:jef', 'zona:frenteDespacho'],
      paso: 'idea',
      evento: 'apagarIdea',
      dice: [
        { quien: 'Cartel', texto: '**FEEDBACK: UNA VEZ POR AÑO. DE ARRIBA HACIA ABAJO.**' },
        { quien: 'Tomás', texto: 'Bueno... se la cuento en diciembre.' },
      ],
      medidor: 12,
      ir: 'carrito',
    },
    { en: 'obj:carrito', paso: 'carrito', flotante: '¡Carrito ordenado!', evento: 'empujarCarrito', ir: 'diciembre' },
    { en: ['zona:despacho', 'npc:jefa'], paso: 'diciembre', evento: 'evaluacion' },

    // Otros
    { en: 'puerta:jef', quien: 'Cartel', dice: ['**FEEDBACK: UNA VEZ POR AÑO. DE ARRIBA HACIA ABAJO.**'] },
    { en: 'npc:companero', dice: ['Acá cada uno aprende **como puede**.'] },
    { en: 'npc:jefa', dice: ['Ahora no puedo.'] },
    { en: 'obj:estante', quien: 'Tomás', dice: ['Historias clínicas. Muuuchas.'] },
    { en: ['obj:bandeja', 'obj:bandejaOk'], quien: 'Tomás', dice: ['Las bandejas del consultorio 2.'] },
    { en: 'obj:carrito', quien: 'Tomás', dice: ['El carrito de curaciones.'] },
    {
      en: 'obj:cartelQR',
      quien: 'Cartel',
      dice: ['**¿Te equivocaste? Reportalo y aprendemos juntos.**', { quien: 'Tomás', texto: '¿Y para saber si lo hago bien? ¿Hay un QR?' }],
    },
    { en: 'npc:recepcionista', dice: ['¡Hola, Tomás! ¿Cómo va el primer año?'] },
    { en: 'paciente', alAzar: true },
  ],

  idea: 'Si cambiamos el orden de la ronda, **ahorramos media hora**.',
  evaluacion: {
    jefa: 'Tomás, tu evaluación anual.',
    titulo: 'EVALUACIÓN ANUAL · Tomás',
    lineas: [
      'Desde **febrero** dejás las historias en la **bandeja equivocada**.',
      'En **marzo** también.',
      'En **abril** también.',
      'Y en **mayo**...',
      'Junio: ver febrero.',
      'Julio: ídem.',
      'Agosto: ¿hace falta que lo diga?',
      'Septiembre: **bandeja equivocada**.',
      'Octubre: misma bandeja. Equivocada.',
      'Noviembre: ...',
      'Ah, y tu idea de la ronda: **no nos llegó**.',
      'Continúa en la página 2...',
    ],
  },

  desmayo: {
    texto: 'Te enteraste en diciembre de lo que hacías mal desde febrero.',
  },

  // ---------- después de la derrota ----------
  queFallo: {
    titulo: 'FEEDBACK Y COACHING',
    frase: 'El feedback llega una vez por año, de arriba hacia abajo, y depende del jefe que te toque.',
    linea: 'Nadie te dijo **a tiempo** lo que hacías mal, y tu idea **no tuvo a quién llegar**.',
  },

  decision: {
    pregunta: '¿Cómo se podría haber evitado?',
    opciones: [
      {
        id: 'continuo',
        correcta: true,
        texto:
          'Un **programa de feedback continuo**: charlas 1 a 1 cortas **cada 3 meses**, jefes **capacitados** para observar, escuchar y preguntar, un canal para que el equipo **también le dé feedback al jefe**, y **coaching** con el modelo GROW para desarrollar a la gente.',
      },
      {
        id: 'semestral',
        correcta: false,
        texto: 'Volver a la **evaluación semestral** con un formulario más largo.',
        porQue: 'Ya lo probaron y **no se pudo sostener**. Más formularios **no es más conversación**.',
      },
      {
        id: 'como-salga',
        correcta: false,
        texto: 'Que cada jefe dé feedback **cuando le parezca y como le salga**.',
        porQue: 'Es lo que pasa hoy: **depende del estilo de cada jefe**. A vos te tocó **esperar un año**.',
      },
    ],
  },

  // Repetición: así sería con la propuesta
  arreglado: {
    titulo: 'Así sería con nuestra propuesta',
    medidorInicial: 45,
    jugador: { x: 20, y: 21, dir: 'right' },
    puertasCerradas: [],
    npcs: [
      { id: 'jefa', sprite: 'jefa', x: 23, y: 21, dir: 'left' },
      { id: 'companero', sprite: 'enfermero', x: 24, y: 10, dir: 'left' },
    ],
    charlas: [
      // [mes, quién, texto]
      [2, 'jefa', 'Esto lo hacés muy bien.'],
      [2, 'jefa', 'Ojo con la bandeja: es la de al lado.'],
      [2, 'jugador', '¡Gracias! No sabía.'],
      [5, 'jugador', 'Tengo una idea: cambiar el orden de la ronda.'],
      [5, 'jefa', '¡Buenísima, probémosla!'],
      [8, 'jugador', '¿Y yo te puedo dar feedback a vos?'],
      [8, 'jefa', '¡Obvio! Para eso es la charla.'],
    ],
    diciembre: 'Sin sorpresas.',
  },

  propuesta: {
    titulo: 'NUESTRA PROPUESTA',
    bloques: [
      {
        titulo: 'Charlas 1 a 1 cada 3 meses',
        texto:
          '**20 a 30 minutos** para revisar logros, dificultades y objetivos, con un **registro simple** para no sumar papeleo. **No reemplazan** la evaluación anual.',
      },
      {
        titulo: 'Capacitar a los jefes',
        texto:
          'Crear buen clima, dar **ejemplos concretos**, explicar el impacto y buscar alternativas. **Observar, escuchar e indagar**, con la regla **80/20** (escuchar el 80%, hablar el 20%).',
      },
      {
        titulo: 'Feedback de ida y vuelta',
        texto:
          'Que el equipo también pueda **darle devoluciones a su jefe**, y que se sepa **qué se hace con eso**.',
      },
      {
        titulo: 'Coaching con GROW',
        texto:
          '**Goal** (objetivo), **Reality** (situación actual), **Options** (alternativas), **Will** (compromisos y plazos).',
      },
      {
        titulo: 'Piloto de 3 meses',
        texto: 'Coordinado por **RRHH** en **un área médica y una administrativa**.',
      },
    ],
    encuesta: {
      titulo: 'Dato de la encuesta',
      texto: 'Feedback concreto: **3,92/5** · Receptividad al feedback: **3,75/5**',
      nota: '(12 respuestas)',
    },
    materia: {
      titulo: 'De la materia',
      items: ['**Feedback oportuno**.', '**Observar, escuchar, indagar.**', '**Regla 80/20.**', '**Modelo GROW.**'],
    },
  },

  final: {
    linea: 'Feedback: charlas cada 3 meses, de ida y vuelta.',
    resumen: '**Charlas cada 3 meses**, de **ida y vuelta**, y jefes que acompañan con **coaching**: nadie se entera en diciembre.',
  },
};
