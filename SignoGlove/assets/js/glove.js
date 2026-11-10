/**
 * SignoGlove – lógica compartida para la versión en español y en inglés.
 *
 * El idioma lo define el archivo de datos que se carga antes que este
 * (assets/js/data/es.js o assets/js/data/en.js), que crea window.SIGNOGLOVE.
 *
 * Flujo:
 * 1. La persona conecta el guante (micro:bit) por Web Bluetooth.
 * 2. La micro:bit envía un número (inclinación de la mano) como texto.
 * 3. Ese número se convierte en una de las 5 frases del tema elegido,
 *    que se muestra en pantalla y se reproduce en voz alta.
 */
(function () {
  'use strict';

  const config = window.SIGNOGLOVE;
  if (!config) {
    console.error('SignoGlove: falta el archivo de datos del idioma.');
    return;
  }

  // Servicio UART de la micro:bit (Nordic UART Service).
  const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

  // Rangos de inclinación → posición de la frase (0 a 4).
  // Se revisan en este orden y gana el primero que coincida,
  // igual que en la versión original del proyecto.
  const TILT_RANGES = [
    { min: -25, max: 35, phrase: 0 },
    { min: 35, max: 75, phrase: 1 },
    { min: -75, max: -25, phrase: 2 },
    { min: 115, max: 140, phrase: 3 },
    { min: 150, max: 180, phrase: 4 }
  ];

  // Elementos de la página
  const connectButton = document.getElementById('connect');
  const statusText = document.getElementById('status');
  const warningBox = document.getElementById('warning');
  const errorBox = document.getElementById('error');
  const errorDetail = document.getElementById('error-detail');
  const topicsBlock = document.getElementById('topics');
  const phraseDisplay = document.getElementById('phrase-display');
  const phraseGrid = document.getElementById('phrase-grid');

  // Estado
  let currentTopic = 0;
  let currentPhrase = null; // { text, audio } que se está mostrando
  let device = null;
  let characteristic = null;
  let currentAudio = null;
  const audioCache = new Map();

  /* ---------- Audio ---------- */

  function getAudio(fileName) {
    if (!audioCache.has(fileName)) {
      audioCache.set(fileName, new Audio(config.audioPath + fileName));
    }
    return audioCache.get(fileName);
  }

  function play(phrase) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentAudio = getAudio(phrase.audio);
    currentAudio.play().catch((error) => {
      // El navegador puede bloquear el audio si no hubo interacción previa.
      console.warn('No se pudo reproducir el audio:', error.message);
    });
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
        Array.from(topicsBlock.children).forEach((item, i) => {
          item.setAttribute('aria-pressed', String(i === currentTopic));
        });
        renderPhrases();
      });
      topicsBlock.append(button);
    });
  }

  function renderPhrases() {
    phraseGrid.replaceChildren();
    config.topics[currentTopic].phrases.forEach((phrase) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'phrase';
      button.dataset.text = phrase.text;
      button.textContent = phrase.text;
      button.setAttribute('aria-pressed', String(currentPhrase !== null && currentPhrase.text === phrase.text));
      button.addEventListener('click', () => showPhrase(phrase));
      phraseGrid.append(button);
    });
  }

  function setStatus(text, state) {
    statusText.textContent = text;
    statusText.dataset.state = state || '';
  }

  function showError(message) {
    errorDetail.textContent = message;
    errorBox.hidden = false;
  }

  function resetConnectButton() {
    connectButton.hidden = false;
    connectButton.disabled = false;
    connectButton.textContent = config.ui.connect;
  }

  /* ---------- Bluetooth ---------- */

  function phraseFromTilt(value) {
    const number = Number(value);
    if (Number.isNaN(number)) return null;
    const range = TILT_RANGES.find((r) => number >= r.min && number <= r.max);
    return range ? config.topics[currentTopic].phrases[range.phrase] : null;
  }

  function handleGloveData(event) {
    const view = event.target.value;
    let text = '';
    for (let i = 0; i < view.byteLength; i++) {
      text += String.fromCharCode(view.getUint8(i));
    }

    const phrase = phraseFromTilt(text.trim());
    // Solo se habla cuando la frase cambia, para no repetirla sin parar.
    if (phrase && (!currentPhrase || phrase.text !== currentPhrase.text)) {
      showPhrase(phrase);
    }
  }

  async function connect() {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);

    if (characteristic) {
      characteristic.removeEventListener('characteristicvaluechanged', handleGloveData);
    }
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    characteristic.addEventListener('characteristicvaluechanged', handleGloveData);
    await characteristic.startNotifications();
  }

  async function handleDisconnect() {
    setStatus(config.ui.reconnecting, 'busy');
    try {
      await connect();
      setStatus(config.ui.connected, 'ok');
    } catch (error) {
      device = null;
      setStatus('', '');
      resetConnectButton();
      showError(error.message);
    }
  }

  async function onConnectClick() {
    if (!navigator.bluetooth) {
      warningBox.hidden = false;
      connectButton.hidden = true;
      return;
    }

    errorBox.hidden = true;

    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'BBC micro:bit' }],
        optionalServices: [SERVICE_UUID]
      });
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      connectButton.disabled = true;
      connectButton.textContent = config.ui.connecting;

      await connect();

      connectButton.hidden = true;
      setStatus(config.ui.connected, 'ok');
    } catch (error) {
      console.error(error);
      if (device) device.removeEventListener('gattserverdisconnected', handleDisconnect);
      device = null;
      resetConnectButton();
      // Si la persona cierra la ventana de selección no es un error real.
      if (error.name !== 'NotFoundError') showError(error.message);
    }
  }

  /* ---------- Inicio ---------- */

  connectButton.textContent = config.ui.connect;
  document.getElementById('warning-text').textContent = config.ui.unsupported;
  document.getElementById('error-title').textContent = config.ui.errorTitle;
  document.getElementById('error-hint').textContent = config.ui.errorHint;
  connectButton.addEventListener('click', onConnectClick);
  phraseDisplay.textContent = config.ui.placeholder;
  phraseDisplay.classList.add('is-empty');
  renderTopics();
  renderPhrases();
})();
