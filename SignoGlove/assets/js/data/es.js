/**
 * Frases y textos de la interfaz en español.
 * Cada tema tiene 5 frases: el orden importa, porque cada posición
 * corresponde a un rango de inclinación del guante (ver glove.js).
 */
window.SIGNOGLOVE = {
  audioPath: '../assets/audio/es/',

  ui: {
    connect: 'Conectar guante',
    connecting: 'Conectando…',
    connected: 'Guante conectado',
    reconnecting: 'Se perdió la conexión. Reconectando…',
    unsupported: 'Este navegador no puede usar Bluetooth. Abre la página en Chrome o Edge en un computador o un celular Android.',
    errorTitle: 'No se pudo conectar el guante.',
    errorHint: 'Revisa que la micro:bit esté encendida y cerca, y vuelve a intentarlo.',
    placeholder: 'Conecta el guante o toca una frase para escucharla.'
  },

  topics: [
    {
      name: 'Relaciones personales',
      phrases: [
        { text: '¿Cómo estás?', audio: 'como-estas.mp3' },
        { text: 'Te extraño', audio: 'te-extrano.mp3' },
        { text: 'Lo siento', audio: 'lo-siento.mp3' },
        { text: 'Gracias', audio: 'gracias.mp3' },
        { text: 'Te quiero', audio: 'te-quiero.mp3' }
      ]
    },
    {
      name: 'Trabajo y estudios',
      phrases: [
        { text: '¿Qué hay que hacer?', audio: 'que-hay-que-hacer-ahora.mp3' },
        { text: '¿A qué hora es la reunión?', audio: 'a-que-hora-es-la-reunion.mp3' },
        { text: 'Necesito ayuda, por favor', audio: 'necesito-ayuda.mp3' },
        { text: 'Ya terminé', audio: 'ya-termine.mp3' },
        { text: '¿Qué sigue?', audio: 'que-sigue.mp3' }
      ]
    },
    {
      name: 'Salud y bienestar',
      phrases: [
        { text: 'Me duele', audio: 'me-duele.mp3' },
        { text: '¿Dónde está la farmacia?', audio: 'donde-esta-la-farmacia.mp3' },
        { text: 'Estoy cansado', audio: 'estoy-cansado.mp3' },
        { text: '¿Tienes algo para el dolor?', audio: 'tienes-algo-para-el-dolor.mp3' },
        { text: 'No puedo dormir', audio: 'no-puedo-dormir.mp3' }
      ]
    },
    {
      name: 'Toma de decisiones',
      phrases: [
        { text: '¿Qué prefieres?', audio: 'que-prefieres.mp3' },
        { text: '¿Sí o no?', audio: 'si-o-no.mp3' },
        { text: 'Vamos a intentarlo', audio: 'vamos-a-intentarlo.mp3' },
        { text: '¿Cuál es la mejor opción?', audio: 'cual-es-la-mejor-opcion.mp3' },
        { text: 'Decide tú', audio: 'decide-tu.mp3' }
      ]
    },
    {
      name: 'Vida cotidiana',
      phrases: [
        { text: '¿Qué hora es?', audio: 'que-hora-es.mp3' },
        { text: '¿Dónde está el baño?', audio: 'donde-esta-el-bano.mp3' },
        { text: 'Tengo hambre', audio: 'tengo-hambre.mp3' },
        { text: 'Vamos', audio: 'vamos.mp3' },
        { text: '¿Dónde está?', audio: 'donde-estas-o-donde-estan.mp3' }
      ]
    }
  ]
};
