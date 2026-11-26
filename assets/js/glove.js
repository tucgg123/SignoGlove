/**
 * SignoGlove – lógica compartida para la versión en español y en inglés.
 *
 * El idioma lo define el archivo de datos que se carga antes que este
 * (assets/js/data/es.js o assets/js/data/en.js), que crea window.SIGNOGLOVE.
 *
 * Flujo:
 * 1. La persona abre esta página en el celular y toca «Activar sensor».
 * 2. El navegador entrega la orientación del celular (giroscopio y acelerómetro).
 * 3. Se usa solo un eje del sensor. Por defecto es el eje X (inclinar hacia
 *    adelante o hacia atrás), igual que la micro:bit:
 *    0° = celular plano con la pantalla hacia arriba,
 *    positivo = la parte de arriba del celular sube, ±180° = boca abajo.
 *    El eje y los rangos se pueden cambiar en la página «Calibrar»
 *    (ver assets/js/tilt.js).
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

  const tilt = window.SignoTilt;

  // Eje, rangos de cada frase y tiempo de espera: la calibración guardada
  // en este celular o, si no hay, los valores por defecto (ver tilt.js).
  const calibration = tilt.load();

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

  function rangeLabel(index) {
    const range = calibration.ranges[index];
    return range ? tilt.rangeLabel(range, config.ui.rangeJoin) : '';
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

  function phraseFromTilt(angle) {
    const index = tilt.match(calibration, angle);
    return index === null ? null : config.topics[currentTopic].phrases[index];
  }

  function handleOrientation(event) {
    const reading = active ? tilt.read(event, calibration) : null;
    if (reading === null) return;

    if (!gotSensorData) {
      gotSensorData = true;
      clearTimeout(sensorTimer);
      setStatus(config.ui.connected, 'ok');
    }

    const angle = Math.round(reading);
    const now = performance.now();

    if (now - lastAngleUpdate > 120) {
      angleText.textContent = config.ui.angle + ': ' + tilt.formatDegrees(angle);
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
    if (now - candidateSince >= calibration.holdMs && (!currentPhrase || phrase.text !== currentPhrase.text)) {
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
      const answer = await tilt.requestPermission();
      if (answer !== 'granted') {
        connectButton.disabled = false;
        connectButton.textContent = config.ui.connect;
        showWarning(config.ui.denied);
        return;
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
  document.getElementById('calibration-note').hidden = !calibration.custom;
  phraseDisplay.textContent = config.ui.placeholder;
  phraseDisplay.classList.add('is-empty');
  renderTopics();
  renderPhrases();
})();
