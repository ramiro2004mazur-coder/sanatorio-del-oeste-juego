// NIVEL 2 · Seguridad psicológica · "El error de la factura"
// Jugás como Lucía, administrativa de Facturación (primer año en el sanatorio).
// En los textos, **así** se resalta una palabra.

export default {
  id: 'seguridad-psicologica',
  titulo: 'SEGURIDAD PSICOLÓGICA',
  subtitulo: 'El error de la factura',
  menu: { nombre: 'Seguridad psicológica', personaje: 'Sos Lucía, administrativa de Facturación.' },

  // ---------- arranque ----------
  jugador: { x: 23, y: 7, dir: 'up', sprite: 'lucia', nombre: 'Lucía', andar: 'tiembla' },
  medidor: {
    nombre: 'MIEDO',
    icono: 'fear',
    sube: true,
    vineta: 'vignetteDark', // la pantalla se oscurece por los bordes
    colores: [0x8fd0ff, 0x7f9fe0, 0x8a6ad0, 0x5a3a9a],
    sonido: 'error',
    golpe: '¡GLUP!',
    inicial: 6,
    porSegundo: 0.12,
    maxAntesDelColapso: 90, // el máximo llega con la bola de nieve...
    topeSegundos: 88, // ...o sí o sí, por tiempo
    lentitud: 0.3,
  },

  // ---------- mapa ----------
  carteles: [
    { id: 'c1', texto: 'ECOGRAFÍA' },
    { id: 'c2', texto: 'TRAUMATOLOGÍA' },
    { id: 'c3', texto: 'CARDIOLOGÍA' },
    { id: 'c4', texto: 'CLÍNICA MÉDICA' },
    { id: 'adm', texto: 'FACTURACIÓN' },
    { id: 'ofi', texto: 'OFFICE' },
    { id: 'jef', texto: 'JEFATURA' },
    { id: 'reu', titulo: 'SALA DE', texto: 'REUNIONES' },
  ],
  cartelesExtra: [{ x: 18, y: 0, w: 3, texto: 'ERROR =\nSANCIÓN', estilo: 'rojo', alto: 14, tamano: 4.6 }],
  puertasCerradas: ['c2', 'jef'],

  npcs: [
    { id: 'recepcionista', sprite: 'recepcionista', nombre: 'Recepcionista', x: 2, y: 11, dir: 'down' },
    { id: 'companero', sprite: 'companero', nombre: 'Compañero', x: 20, y: 3, dir: 'up' },
    { id: 'companera', sprite: 'companera', nombre: 'Compañera', x: 20, y: 5, dir: 'down' },
    { id: 'enfermera', sprite: 'enfermera', nombre: 'Enfermera', x: 18, y: 10, dir: 'left' },
    { id: 'jefe', sprite: 'jefe', nombre: 'Jefe de Administración', x: 24, y: 16, dir: 'left' },
  ],

  // Cosas con las que se interactúa (con A o tocándolas)
  objetos: [
    { id: 'escritorio', x: 23, y: 6, nombre: 'Tu escritorio' },
    { id: 'fichero', tiles: [[18, 1], [19, 1]], nombre: 'Fichero' },
    { id: 'impresora', x: 24, y: 1, nombre: 'Impresora' },
    { id: 'cartelQR', tiles: [[22, 8], [23, 8]], nombre: 'Cartel' },
    { id: 'carrito', x: 24, y: 12, sprite: 'cart', solido: true, nombre: 'Carrito' },
  ],

  pacientes: {
    sprites: ['pac1', 'pac4', 'pac6'],
    zona: { x: 6, y: 14, w: 7, h: 7 },
    frases: ['¿Facturación? Me cobraron dos veces.', 'Vengo a retirar un estudio.', '¿Esto es la cola?'],
  },

  zonas: [
    { id: 'salida', x: 18, y: 1, w: 2, h: 7 }, // la salida de Administración
    { id: 'pasilloOffice', x: 15, y: 9, w: 2, h: 5 }, // pasillo frente al office de enfermería
    { id: 'puertaJefe', x: 15, y: 15, w: 2, h: 3 }, // frente a Jefatura
    { id: 'hall', x: 0, y: 11, w: 15, h: 12 },
  ],

  // ---------- guion ----------
  pasos: [
    {
      id: 'facturas',
      objetivo: 'Cargá las 3 facturas del día.',
      target: ['obj:escritorio', 'obj:fichero', 'obj:impresora'],
      contador: ['hecho:obj:escritorio', 'hecho:obj:fichero', 'hecho:obj:impresora'],
      completo: { flags: ['hecho:obj:escritorio', 'hecho:obj:fichero', 'hecho:obj:impresora'], ir: 'error' },
    },
    { id: 'error', objetivo: 'Uy...', alEntrar: 'errorFactura' },
    { id: 'avisar', objetivo: 'Avisale a tu jefe: Jefatura, al fondo del pasillo.', target: 'puerta:jef' },
    { id: 'esconder', objetivo: 'Escondé el error: guardalo en el cajón de tu escritorio.', target: 'obj:escritorio' },
    { id: 'bola', objetivo: 'Atendé el teléfono.', target: 'obj:escritorio', alEntrar: 'bolaDeNieve' },
  ],

  reglas: [
    // Las 3 facturas (en cualquier orden). La tercera sale mal.
    ...['escritorio', 'fichero', 'impresora'].map((id) => ({
      en: `obj:${id}`,
      paso: 'facturas',
      siNo: [`hecho:obj:${id}`],
      sonido: 'ding',
      flotante: '¡Factura cargada!',
      marca: [`hecho:obj:${id}`],
    })),
    { en: ['obj:escritorio', 'obj:fichero', 'obj:impresora'], paso: 'facturas', quien: 'Lucía', dice: ['Esa ya la cargué.'] },

    // Los compañeros te frenan en la salida
    {
      en: ['zona:salida', 'npc:companero', 'npc:companera'],
      paso: 'avisar',
      siNo: ['hablo:companeros'],
      mira: ['companero', 'companera'],
      dice: [
        { quien: 'Compañero', texto: '¿Te enteraste? **A Gómez lo suspendieron** por un error de facturación.' },
        { quien: 'Compañera', texto: 'Yo que vos no digo nada. Acá el que se equivoca, **la paga**.' },
        { quien: 'Lucía', texto: '(Y encima ese cartel: **ERROR = SANCIÓN**...)' },
      ],
      medidor: 18,
      marca: ['hablo:companeros'],
    },
    { en: 'npc:companero', dice: ['Dale, que hoy cierra el mes.'] },
    { en: 'npc:companera', dice: ['Ojo con las obras sociales, que **cambiaron los códigos**.'] },

    // El contraste: en Enfermería el error se reporta
    {
      en: ['zona:pasilloOffice', 'npc:enfermera'],
      paso: 'avisar',
      siNo: ['hablo:enfermera'],
      mira: ['enfermera'],
      dice: [
        {
          quien: 'Enfermera',
          texto: 'Yo ayer me equivoqué con una medicación. **Lo reporté con el QR**, lo vimos en el comité y **cambiamos el proceso**.',
        },
        { quien: 'Enfermera', texto: 'Nadie me retó.' },
        { quien: 'Lucía', texto: '¿Y por qué en Administración **no es así**?' },
      ],
      medidor: -6,
      marca: ['hablo:enfermera'],
    },
    { en: 'npc:enfermera', dice: ['Acá si te equivocás, lo reportás con el QR. **Así aprendemos.**'] },
    {
      en: 'obj:cartelQR',
      quien: 'Cartel',
      dice: ['**¿Te equivocaste? Reportalo y aprendemos juntos.**', '(Es el QR de Enfermería. En Administración no hay.)'],
    },

    // El despacho del jefe
    { en: ['zona:puertaJefe', 'puerta:jef'], paso: 'avisar', evento: 'jefeGrita' },
    { en: 'puerta:jef', quien: 'Cartel', dice: ['JEFATURA. "No molestar."'] },

    // Esconder el error
    {
      en: 'obj:escritorio',
      paso: 'esconder',
      sonido: 'drawer',
      antes: 'esconder',
      quien: 'Lucía',
      dice: ['Lo guardo en el cajón y listo. **Nadie se va a enterar.**', '...'],
      medidor: -8,
      ir: 'bola',
    },
    { en: 'obj:escritorio', paso: 'bola', evento: 'atender' },
    { en: 'obj:impresora', paso: 'bola', quien: 'Impresora', dice: ['RECHAZO · RECHAZO · RECHAZO · RECHAZO...'] },
    { en: 'obj:escritorio', quien: 'Lucía', dice: ['Mi escritorio. Ordenadito... por ahora.'] },
    { en: 'obj:fichero', quien: 'Lucía', dice: ['Carpetas y más carpetas.'] },
    { en: 'obj:impresora', quien: 'Lucía', dice: ['La impresora. Hace ruido de cansada.'] },
    { en: 'npc:recepcionista', dice: ['Hola, Lucía. ¿Todo bien? Estás pálida.'] },
    { en: 'paciente', alAzar: true },
  ],

  // Llamadas durante la bola de nieve
  telefono: [
    'La obra social **rechazó la factura**.',
    'Rechazaron **otras 12**.',
    'Hay que **refacturar todo el mes**.',
  ],
  pacienteEnojado: '¡Me dicen que **no tengo cobertura**!',

  desmayo: {
    texto: 'El error era chiquito.\nEl miedo lo hizo gigante.',
  },

  // ---------- después de la derrota ----------
  queFallo: {
    titulo: 'SEGURIDAD PSICOLÓGICA',
    frase: 'En lo médico el error se reporta y se aprende. En lo administrativo, se esconde.',
    linea: 'Por **miedo a la sanción**, el error se **escondió** y se hizo **bola de nieve**.',
  },

  decision: {
    pregunta: '¿Cómo se podría haber evitado?',
    opciones: [
      {
        id: 'criterio',
        correcta: true,
        texto:
          'Acordar entre gerentes y RRHH un **criterio común para tratar los errores** en todas las áreas (no es lo mismo un error humano, una falla del proceso o una negligencia), **formar a los jefes** para escuchar sin humillar y sumar **reuniones cortas para hablar de problemas** sin buscar culpables.',
      },
      {
        id: 'sanciones',
        correcta: false,
        texto: 'Poner **sanciones más duras**, así nadie se vuelve a equivocar.',
        porQue:
          'El error no desaparece: **se esconde mejor**. Las sanciones solo generan miedo, y el que se equivoca **la próxima vez lo tapa**.',
      },
      {
        id: 'buzon',
        correcta: false,
        texto: 'Poner un **buzón anónimo** en Administración y listo.',
        porQue:
          'Ayuda, pero no alcanza. Reportar anónimo no es lo mismo que **animarte a hablar con tu jefe** cara a cara. Lo que falta es **confianza**.',
      },
    ],
  },

  // Repetición: así sería con la propuesta
  arreglado: {
    titulo: 'Así sería con nuestra propuesta',
    medidorInicial: 70,
    jugador: { x: 16, y: 12, dir: 'down' },
    puertasCerradas: ['c2'],
    npcs: [
      { id: 'recepcionista', sprite: 'recepcionista', x: 2, y: 11, dir: 'down' },
      { id: 'companero', sprite: 'companero', x: 20, y: 3, dir: 'up' },
      { id: 'companera', sprite: 'companera', x: 20, y: 5, dir: 'down' },
      { id: 'jefe', sprite: 'jefe', x: 24, y: 16, dir: 'left' },
    ],
    destino: { x: 22, y: 16 },
    lucia: 'Jefe, me equivoqué con una factura.',
    jefe: 'Gracias por avisar. Veamos **dónde falló el proceso**.',
    telefono: 'Factura corregida.',
    reunion: [
      ['jefe', '¿Qué aprendimos?'],
      ['companera', '¡Sumemos un control antes de enviar!'],
      ['jugador', '¡Y lo charlamos sin buscar culpables!'],
    ],
  },

  propuesta: {
    titulo: 'NUESTRA PROPUESTA',
    bloques: [
      {
        titulo: 'Acordar criterios',
        texto:
          'Definir con **gerentes y RRHH** cómo distinguir **error humano, falla del proceso, negligencia** e **incumplimiento deliberado**, y cómo responder en cada caso.',
      },
      {
        titulo: 'Formar a los líderes',
        texto:
          '**Escucha activa**, feedback **sin humillación**, preguntas abiertas y análisis de incidentes **para aprender**, sin dejar de exigir resultados.',
      },
      {
        titulo: 'Crear espacios para hablar',
        texto:
          'Mantener los **reportes anónimos** y sumar **reuniones breves de aprendizaje** donde el equipo plantee problemas **sin buscar culpables**.',
      },
      {
        titulo: 'Medir y corregir',
        texto:
          'Repetir en la **encuesta de clima** las preguntas sobre errores y desacuerdos, y seguir **acciones concretas**.',
      },
    ],
    encuesta: {
      titulo: 'Dato de la encuesta',
      texto: 'Cerca del **83%** dice que puede reconocer errores **sin miedo**. ¿Y el resto?',
      nota: '(12 respuestas: sirve como indicio, no para generalizar)',
    },
    materia: {
      titulo: 'De la materia',
      items: [
        '**Lencioni**: la ausencia de **confianza** es la primera disfunción de un equipo.',
        '**Liderazgo postheroico**: el líder escucha y deja participar.',
        '**Biología cultural**: lo asistencial es integral/transformador; lo administrativo tira a **resultadista/ansiógeno**.',
      ],
    },
  },

  final: {
    linea: 'Seguridad psicológica: un criterio común para tratar el error, sin miedo.',
    resumen: 'Un **criterio común** para tratar el error y **jefes que escuchan**: el que se equivoca habla, y el equipo **aprende**.',
  },
};
