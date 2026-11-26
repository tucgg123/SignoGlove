/**
 * SignoGlove – lógica compartida para la versión en español y en inglés.
 *
 * El idioma lo define el archivo de datos que se carga antes que este
 * (assets/js/data/es.js o assets/js/data/en.js), que crea window.SIGNOGLOVE.
 *
 * Flujo:
 * 1. La persona abre esta página en el celular y toca «Activar sensor».
 * 2. El navegador entrega la orientación del celular (giroscopio y acelerómetro).
 * 3. Con ella se calcula la inclinación lateral (roll), igual que hacía la micro:bit:
 *    0° = celular plano con la pantalla hacia arriba,
 *    positivo = se inclina hacia la derecha, ±180° = boca abajo.
 * 4. Ese ángulo se convierte en una de las 5 frases del tema elegido,
 *    que se muestra en pantalla y se reproduce en voz alta.
 */
(function () {
  'use strict';

  const config = window.SIGNOGLOVE;
  if (!config) {
    console.error('SignoGlove: falta el archivo de datos del idioma.');
    return;
  }

  // Rangos de inclinación → posición de la frase (0 a 4).
  // Se revisan en este orden y gana el primero que coincida,
  // igual que en la versión original con la micro:bit.
  const TILT_RANGES = [
    { min: -25, max: 35, phrase: 0 },
    { min: 35, max: 75, phrase: 1 },
    { min: -75, max: -25, phrase: 2 },
    { min: 115, max: 140, phrase: 3 },
    { min: 150, max: 180, phrase: 4 }
  ];

  // Cambia a true si en tu montaje el ángulo sale con el signo al revés
  // (por ejemplo, si al inclinar a la derecha ves valores negativos).
  const INVERT_DIRECTION = false;

  // Tiempo (ms) que la mano debe quedarse en una posición antes de hablar.
  // Evita que la frase salte cuando el ángulo está justo en el borde de un rango.
  const HOLD_MS = 400;

  // Si en este tiempo (ms) no llega ningún dato, el equipo no tiene sensor.
  const SENSOR_TIMEOUT_MS = 2000;

  // Elementos de la página
  const connectButton = document.getElementById('connect');
  const statusText = document.getElementById('status');
  const angleText = document.getElementById('angle');
  const warningBox = document.getElementById('warning');
  const warningText = document.getElementById('warning-text');
  const errorBox = document.getElementById('error');
  const errorDetail = document.getElementById('error-detail');
  const topicsBlock = document.getElementById('topics');
  const phraseDisplay = document.getElementById('phrase-display');
  const phraseGrid = document.getElementById('phrase-grid');

  // Estado
  let currentTopic = 0;
  let currentPhrase = null;   // { text, audio } que se está mostrando
  let active = false;         // ¿el sensor está encendido?
  let gotSensorData = false;
  let sensorTimer = null;
  let candidate = null;       // frase que se está «sosteniendo»
  let candidateSince = 0;
  let lastAngleUpdate = 0;
  let wakeLock = null;

  /* ---------- Audio ---------- */

  // Un solo elemento de audio: en iPhone hay que «desbloquearlo» con un toque
  // de la persona; después ya puede sonar cuando cambia la inclinación.
  const audio = new Audio();
  audio.preload = 'auto';

  function play(phrase) {
    audio.pause();
    audio.src = config.audioPath + phrase.audio;
    audio.play().catch((error) => {
      // El navegador puede bloquear el audio si no hubo interacción previa.
      console.warn('No se pudo reproducir el audio:', error.message);
    });
  }

  async function unlockAudio() {
    try {
      audio.muted = true;
      audio.src = config.audioPath + config.topics[0].phrases[0].audio;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      console.warn('No se pudo preparar el audio:', error.message);
    } finally {
      audio.muted = false;
    }
  }

  /* ---------- Interfaz ---------- */

  function showPhrase(phrase, { speak = true } = {}) {
    if (speak) play(phrase);
    currentPhrase = phrase;
    phraseDisplay.textContent = phrase.text;
    phraseDisplay.classList.remove('is-empty');

    Array.from(phraseGrid.children).forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.text === phrase.text));
    });
  }

  function renderTopics() {
    topicsBlock.replaceChildren();
    config.topics.forEach((topic, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'topic';
      button.textContent = topic.name;
      button.setAttribute('aria-pressed', String(index === currentTopic));
      button.addEventListener('click', () => {
        currentTopic = index;
        candidate = null;
        Array.from(topicsBlock.children).forEach((item, i) => {
          item.setAttribute('aria-pressed', String(i === currentTopic));
        });
        renderPhrases();
      });
      topicsBlock.append(button);
    });
  }

  function formatDegrees(value) {
    // Usa el signo menos tipográfico (−) para que se lea mejor.
    return String(value).replace('-', '−') + '°';
  }

  function rangeLabel(index) {
    const range = TILT_RANGES.find((r) => r.phrase === index);
    if (!range) return '';
    return formatDegrees(range.min) + ' ' + config.ui.rangeJoin + ' ' + formatDegrees(range.max);
  }

  function renderPhrases() {
    phraseGrid.replaceChildren();
    config.topics[currentTopic].phrases.forEach((phrase, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'phrase';
      button.dataset.text = phrase.text;

      const label = document.createElement('span');
      label.textContent = phrase.text;
      const range = document.createElement('span');
      range.className = 'phrase-range';
      range.textContent = rangeLabel(index);
      button.append(label, range);

      button.setAttribute('aria-pressed', String(currentPhrase !== null && currentPhrase.text === phrase.text));
      button.addEventListener('click', () => showPhrase(phrase));
      phraseGrid.append(button);
    });
  }

  function setStatus(text, state) {
    statusText.textContent = text;
    statusText.dataset.state = state || '';
  }

  function showWarning(message) {
    warningText.textContent = message;
    warningBox.hidden = false;
  }

  function showError(message) {
    errorDetail.textContent = message;
    errorBox.hidden = false;
  }

  /* ---------- Sensor del celular ---------- */

  /**
   * Calcula la inclinación lateral (roll) a partir de los ángulos que da el
   * navegador: beta (adelante/atrás, −180 a 180) y gamma (izquierda/derecha,
   * −90 a 90). Gamma por sí solo no llega a 180°, así que se combinan los dos
   * para obtener un ángulo de −180 a 180, como el de la micro:bit.
   */
  function rollFromOrientation(beta, gamma) {
    const b = beta * Math.PI / 180;
    const g = gamma * Math.PI / 180;
    const roll = Math.atan2(Math.cos(b) * Math.sin(g), Math.cos(b) * Math.cos(g)) * 180 / Math.PI;
    return INVERT_DIRECTION ? -roll : roll;
  }

  function phraseFromTilt(angle) {
    const range = TILT_RANGES.find((r) => angle >= r.min && angle <= r.max);
    return range ? config.topics[currentTopic].phrases[range.phrase] : null;
  }

  function handleOrientation(event) {
    if (!active || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;

    if (!gotSensorData) {
      gotSensorData = true;
      clearTimeout(sensorTimer);
      setStatus(config.ui.connected, 'ok');
    }

    const angle = Math.round(rollFromOrientation(event.beta, event.gamma));
    const now = performance.now();

    if (now - lastAngleUpdate > 120) {
      angleText.textContent = config.ui.angle + ': ' + formatDegrees(angle);
      lastAngleUpdate = now;
    }

    const phrase = phraseFromTilt(angle);
    if (!phrase) {
      // Fuera de todos los rangos: se mantiene la última frase.
      candidate = null;
      return;
    }
    if (!candidate || candidate.text !== phrase.text) {
      candidate = phrase;
      candidateSince = now;
      return;
    }
    // Solo se habla cuando la frase cambia y la mano se quedó quieta un momento.
    if (now - candidateSince >= HOLD_MS && (!currentPhrase || phrase.text !== currentPhrase.text)) {
      showPhrase(phrase);
    }
  }

  async function requestWakeLock() {
    // Mantiene la pantalla encendida mientras se usa (si el navegador lo permite).
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (error) {
      console.warn('No se pudo mantener la pantalla encendida:', error.message);
    }
  }

  function stop() {
    active = false;
    clearTimeout(sensorTimer);
    window.removeEventListener('deviceorientation', handleOrientation);
    if (wakeLock) wakeLock.release().catch(() => {});
    connectButton.textContent = config.ui.connect;
    connectButton.disabled = false;
    angleText.textContent = '';
    setStatus('', '');
  }

  async function start() {
    warningBox.hidden = true;
    errorBox.hidden = true;

    if (!window.isSecureContext) {
      showWarning(config.ui.insecure);
      return;
    }
    if (!('DeviceOrientationEvent' in window)) {
      showWarning(config.ui.unsupported);
      return;
    }

    connectButton.disabled = true;
    connectButton.textContent = config.ui.connecting;

    try {
      // El audio y el permiso del sensor deben pedirse en el mismo toque,
      // antes de cualquier espera; por eso se lanzan los dos a la vez.
      const audioReady = unlockAudio();

      // iPhone y iPad piden permiso para usar el sensor.
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const answer = await DeviceOrientationEvent.requestPermission();
        if (answer !== 'granted') {
          connectButton.disabled = false;
          connectButton.textContent = config.ui.connect;
          showWarning(config.ui.denied);
          return;
        }
      }

      await audioReady;

      active = true;
      gotSensorData = false;
      candidate = null;
      window.addEventListener('deviceorientation', handleOrientation);
      requestWakeLock();

      connectButton.disabled = false;
      connectButton.textContent = config.ui.stop;
      setStatus(config.ui.waiting, 'busy');

      // Con el celular en la mano, deja la frase a la vista en la pantalla.
      phraseDisplay.closest('.bubble').scrollIntoView({ behavior: 'smooth', block: 'center' });

      sensorTimer = setTimeout(() => {
        if (!gotSensorData) {
          stop();
          showWarning(config.ui.noSensor);
        }
      }, SENSOR_TIMEOUT_MS);
    } catch (error) {
      console.error(error);
      stop();
      showError(error.message);
    }
  }

  function onConnectClick() {
    if (active) stop();
    else start();
  }

  // Al volver a la página, la pantalla se puede volver a apagar: se pide de nuevo.
  document.addEventListener('visibilitychange', () => {
    if (active && document.visibilityState === 'visible') requestWakeLock();
  });

  /* ---------- Inicio ---------- */

  connectButton.textContent = config.ui.connect;
  document.getElementById('error-title').textContent = config.ui.errorTitle;
  document.getElementById('error-hint').textContent = config.ui.errorHint;
  connectButton.addEventListener('click', onConnectClick);
  phraseDisplay.textContent = config.ui.placeholder;
  phraseDisplay.classList.add('is-empty');
  renderTopics();
  renderPhrases();
})();
