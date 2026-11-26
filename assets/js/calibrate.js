/**
 * SignoGlove – página «Calibrar».
 *
 * Muestra en vivo lo que mide el sensor del celular y permite guardar,
 * para cada una de las 5 frases, la posición de la mano que resulte cómoda.
 * Con esas posiciones se calculan los rangos, que se guardan en el navegador
 * de este celular y usa el comunicador (ver tilt.js).
 */
(function () {
  'use strict';

  const config = window.SIGNOGLOVE;
  const tilt = window.SignoTilt;
  if (!config || !tilt) {
    console.error('SignoGlove: faltan los archivos de datos o tilt.js.');
    return;
  }
  const text = config.calibrate;

  const CAPTURE_MS = 1000;     // cuánto se mide al guardar una posición
  const MAX_SPREAD = 12;       // grados que se permite mover la mano mientras se mide
  const MIN_GAP = 15;          // si dos posiciones están más cerca, se avisa
  const SENSOR_TIMEOUT_MS = 2000;
  const DEFAULT_TOLERANCE = 20;
  const PLACEHOLDER_GAMMA = [-60, -30, 0, 30, 60];

  const $ = (id) => document.getElementById(id);

  // Elementos de la página
  const connectButton = $('connect');
  const statusText = $('status');
  const warningBox = $('warning');
  const warningText = $('warning-text');
  const errorBox = $('error');
  const errorDetail = $('error-detail');
  const axisInputs = Array.from(document.querySelectorAll('input[name="axis"]'));
  const liveAngle = $('live-angle');
  const livePhrase = $('live-phrase');
  const gaugeBands = $('gauge-bands');
  const gaugeMarker = $('gauge-marker');
  const gaugeScale = $('gauge-scale');
  const valueAlpha = $('value-alpha');
  const valueBeta = $('value-beta');
  const valueGamma = $('value-gamma');
  const valueMin = $('value-min');
  const valueMax = $('value-max');
  const resetExtremesButton = $('reset-extremes');
  const positionsList = $('positions');
  const gapWarning = $('gap-warning');
  const toleranceInput = $('tolerance');
  const toleranceValue = $('tolerance-value');
  const holdInput = $('hold');
  const holdValue = $('hold-value');
  const saveButton = $('save');
  const restoreButton = $('restore');
  const saveStatus = $('save-status');
  const codeBlock = $('code');
  const copyButton = $('copy-code');

  // Estado
  const saved = tilt.load();
  let axis = saved.axis;
  let invert = saved.invert;
  let holdMs = saved.holdMs;
  let tolerance = DEFAULT_TOLERANCE;
  let ranges = saved.ranges;
  let centers = saved.ranges.map(tilt.center);
  let defined = centers.map(() => true); // ¿cada posición tiene un ángulo válido?
  let edited = false;                    // hasta que se cambie algo, se muestran los rangos guardados tal cual

  let active = false;
  let gotSensorData = false;
  let sensorTimer = null;
  let wakeLock = null;
  let extremes = { min: null, max: null };
  let capture = null;  // { index, values } mientras se mide una posición
  let lastPaint = 0;
  let lastValues = null;

  /* ---------- Utilidades ---------- */

  function fmt(value) {
    return value === null || value === undefined || !Number.isFinite(value) ? '—' : tilt.formatDegrees(value);
  }

  function axisInfo() {
    return tilt.AXES[axis];
  }

  function percent(angle) {
    const info = axisInfo();
    const clamped = Math.min(info.max, Math.max(info.min, angle));
    return (clamped - info.min) / (info.max - info.min) * 100;
  }

  function setStatus(message, state) {
    statusText.textContent = message;
    statusText.dataset.state = state || '';
  }

  function showWarning(message) {
    warningText.textContent = message;
    warningBox.hidden = false;
  }

  function phraseText(index) {
    return config.topics[0].phrases[index].text;
  }

  function quoted(value) {
    return text.quotes[0] + value + text.quotes[1];
  }

  /* ---------- Rangos ---------- */

  function recompute() {
    if (edited) ranges = tilt.computeRanges(centers, axis, tolerance);
    renderPositions();
    renderGauge();
    renderCode();
    renderGapWarning();
    saveButton.disabled = !defined.every(Boolean);
    if (saveButton.disabled) saveStatus.textContent = text.missing;
    else if (saveStatus.textContent === text.missing) saveStatus.textContent = '';
  }

  function renderGapWarning() {
    let closest = null;
    for (let a = 0; a < centers.length; a++) {
      for (let b = a + 1; b < centers.length; b++) {
        const gap = Math.abs(tilt.difference(centers[a], centers[b], axis));
        if (!closest || gap < closest.gap) closest = { a, b, gap };
      }
    }
    if (closest && closest.gap < MIN_GAP && defined[closest.a] && defined[closest.b]) {
      gapWarning.textContent = text.tooClose
        .replace('{a}', closest.a + 1)
        .replace('{b}', closest.b + 1)
        .replace('{gap}', tilt.formatDegrees(closest.gap));
      gapWarning.hidden = false;
    } else {
      gapWarning.hidden = true;
    }
  }

  /* ---------- Posiciones ---------- */

  function buildPositions() {
    positionsList.replaceChildren();
    centers.forEach((_, index) => {
      const item = document.createElement('li');
      item.className = 'position';

      const head = document.createElement('p');
      head.className = 'position-head';
      const number = document.createElement('span');
      number.className = 'position-number';
      number.textContent = index + 1;
      const name = document.createElement('span');
      name.textContent = text.phrase + ' ' + (index + 1);
      const example = document.createElement('span');
      example.className = 'position-example';
      example.textContent = text.example + ' ' + quoted(phraseText(index));
      head.append(number, name, example);

      const controls = document.createElement('div');
      controls.className = 'position-controls';

      const label = document.createElement('label');
      label.className = 'position-angle';
      label.append(text.angleLabel + ' ');
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.step = '1';
      input.addEventListener('change', () => {
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        const info = axisInfo();
        centers[index] = Math.round(info.circular ? tilt.wrap(value) : Math.min(info.max, Math.max(info.min, value)));
        defined[index] = true;
        edited = true;
        recompute();
      });
      label.append(input, '°');

      const range = document.createElement('span');
      range.className = 'position-range';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-small';
      button.textContent = text.capture;
      button.addEventListener('click', () => startCapture(index));

      controls.append(label, range, button);

      const message = document.createElement('p');
      message.className = 'position-message';
      message.setAttribute('aria-live', 'polite');

      item.append(head, controls, message);
      positionsList.append(item);
    });
  }

  function positionItem(index) {
    return positionsList.children[index];
  }

  function renderPositions() {
    Array.from(positionsList.children).forEach((item, index) => {
      const input = item.querySelector('input');
      const info = axisInfo();
      input.min = info.min;
      input.max = info.max;
      if (document.activeElement !== input) input.value = defined[index] ? centers[index] : '';
      item.querySelector('.position-range').textContent = defined[index]
        ? tilt.rangeLabel(ranges[index], config.ui.rangeJoin)
        : '';
      item.classList.toggle('is-missing', !defined[index]);
    });
  }

  function setCaptureButtonsDisabled(disabled) {
    positionsList.querySelectorAll('button').forEach((button) => { button.disabled = disabled; });
  }

  function startCapture(index) {
    const message = positionItem(index).querySelector('.position-message');
    if (!active || !gotSensorData) {
      message.textContent = text.startFirst;
      return;
    }
    capture = { index, values: [] };
    setCaptureButtonsDisabled(true);
    positionItem(index).querySelector('button').textContent = text.measuring;
    message.textContent = '';
    setTimeout(finishCapture, CAPTURE_MS);
  }

  function finishCapture() {
    if (!capture) return;
    const { index, values } = capture;
    capture = null;
    const item = positionItem(index);
    const message = item.querySelector('.position-message');
    item.querySelector('button').textContent = text.capture;
    setCaptureButtonsDisabled(false);

    if (values.length < 3) {
      message.textContent = text.noData;
      return;
    }
    const mean = tilt.average(values, axis);
    const spread = Math.max(...values.map((v) => Math.abs(tilt.difference(v, mean, axis))));
    if (spread > MAX_SPREAD) {
      message.textContent = text.unsteady;
      return;
    }
    centers[index] = Math.round(axisInfo().circular ? tilt.wrap(mean) : mean);
    defined[index] = true;
    edited = true;
    message.textContent = text.captured + ' ' + tilt.formatDegrees(centers[index]);
    saveStatus.textContent = '';
    recompute();
  }

  /** Frase que diría con este ángulo, sin contar las posiciones aún sin guardar. */
  function matchDefined(reading) {
    for (let i = 0; i < ranges.length; i++) {
      if (defined[i] && tilt.match({ ranges: [ranges[i]] }, reading) === 0) return i;
    }
    return null;
  }

  /* ---------- Medidor ---------- */

  function renderGauge() {
    gaugeBands.replaceChildren();
    const info = axisInfo();
    ranges.forEach((range, index) => {
      if (!defined[index]) return;
      const pieces = range.min <= range.max
        ? [[range.min, range.max]]
        : [[range.min, info.max], [info.min, range.max]];
      pieces.forEach(([from, to]) => {
        const band = document.createElement('div');
        band.className = 'gauge-band';
        band.dataset.index = index;
        band.style.left = percent(from) + '%';
        band.style.width = Math.max(percent(to) - percent(from), 0.6) + '%';
        band.textContent = index + 1;
        gaugeBands.append(band);
      });
    });

    gaugeScale.replaceChildren();
    const step = (info.max - info.min) / 4;
    for (let i = 0; i <= 4; i++) {
      const value = info.min + step * i;
      const tick = document.createElement('span');
      tick.style.left = percent(value) + '%';
      tick.textContent = tilt.formatDegrees(value);
      gaugeScale.append(tick);
    }
  }

  function paint(values, reading) {
    valueAlpha.textContent = fmt(values.alpha);
    valueBeta.textContent = fmt(values.beta);
    valueGamma.textContent = fmt(values.gamma);
    valueMin.textContent = fmt(extremes.min);
    valueMax.textContent = fmt(extremes.max);

    liveAngle.textContent = fmt(reading);
    gaugeMarker.hidden = false;
    gaugeMarker.style.left = percent(reading) + '%';

    const index = matchDefined(reading);
    livePhrase.textContent = text.now + ': ' + (index === null
      ? text.none
      : text.phrase + ' ' + (index + 1) + ' · ' + quoted(phraseText(index)));

    Array.from(positionsList.children).forEach((item, i) => item.classList.toggle('is-active', i === index));
    Array.from(gaugeBands.children).forEach((band) => band.classList.toggle('is-active', Number(band.dataset.index) === index));
  }

  /* ---------- Código para copiar ---------- */

  function renderCode() {
    const lines = ranges.map((r, i) =>
      '    { min: ' + r.min + ', max: ' + r.max + ' }' + (i < ranges.length - 1 ? ',' : ' ') + ' // ' + text.codeComment + ' ' + (i + 1));
    const code = [
      '{',
      "  axis: '" + axis + "',",
      '  invert: ' + invert + ',',
      '  holdMs: ' + holdMs + ',',
      '  ranges: [',
      ...lines,
      '  ]',
      '}'
    ].join('\n');
    codeBlock.textContent = code;
    copyButton.dataset.copy = code;
  }

  /* ---------- Sensor ---------- */

  function handleOrientation(event) {
    if (!active) return;
    const reading = tilt.read(event, { axis, invert });
    if (reading === null) return;

    if (!gotSensorData) {
      gotSensorData = true;
      clearTimeout(sensorTimer);
      setStatus(config.ui.connected, 'ok');
    }

    if (capture) capture.values.push(reading);
    extremes.min = extremes.min === null ? reading : Math.min(extremes.min, reading);
    extremes.max = extremes.max === null ? reading : Math.max(extremes.max, reading);

    lastValues = { alpha: event.alpha, beta: event.beta, gamma: event.gamma, reading };
    const now = performance.now();
    if (now - lastPaint > 100) {
      paint(lastValues, reading);
      lastPaint = now;
    }
  }

  async function requestWakeLock() {
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
    capture = null;
    clearTimeout(sensorTimer);
    window.removeEventListener('deviceorientation', handleOrientation);
    if (wakeLock) wakeLock.release().catch(() => {});
    connectButton.textContent = config.ui.connect;
    connectButton.disabled = false;
    setCaptureButtonsDisabled(false);
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
      const answer = await tilt.requestPermission();
      if (answer !== 'granted') {
        stop();
        showWarning(config.ui.denied);
        return;
      }
      active = true;
      gotSensorData = false;
      window.addEventListener('deviceorientation', handleOrientation);
      requestWakeLock();
      connectButton.disabled = false;
      connectButton.textContent = config.ui.stop;
      setStatus(config.ui.waiting, 'busy');
      sensorTimer = setTimeout(() => {
        if (!gotSensorData) {
          stop();
          showWarning(config.ui.noSensor);
        }
      }, SENSOR_TIMEOUT_MS);
    } catch (error) {
      console.error(error);
      stop();
      errorDetail.textContent = error.message;
      errorBox.hidden = false;
    }
  }

  /* ---------- Controles ---------- */

  function setAxis(newAxis) {
    if (newAxis === axis) return;
    axis = newAxis;
    if (axis === saved.axis) {
      centers = saved.ranges.map(tilt.center);
      defined = centers.map(() => true);
    } else if (axis === tilt.DEFAULT_CALIBRATION.axis) {
      centers = tilt.DEFAULT_CALIBRATION.ranges.map(tilt.center);
      defined = centers.map(() => true);
    } else {
      centers = PLACEHOLDER_GAMMA.slice();
      defined = centers.map(() => false);
    }
    edited = true;
    extremes = { min: null, max: null };
    positionsList.querySelectorAll('.position-message').forEach((p) => { p.textContent = ''; });
    saveStatus.textContent = '';
    recompute();
    if (lastValues) {
      const reading = tilt.read(lastValues, { axis, invert });
      if (reading !== null) paint(lastValues, reading);
    }
  }

  function syncControls() {
    axisInputs.forEach((input) => { input.checked = input.value === axis; });
    toleranceInput.value = tolerance;
    toleranceValue.textContent = '±' + tolerance + '°';
    holdInput.value = holdMs;
    holdValue.textContent = holdMs + ' ms';
  }

  axisInputs.forEach((input) => {
    input.addEventListener('change', () => { if (input.checked) setAxis(input.value); });
  });

  toleranceInput.addEventListener('input', () => {
    tolerance = Number(toleranceInput.value);
    toleranceValue.textContent = '±' + tolerance + '°';
    edited = true;
    saveStatus.textContent = '';
    recompute();
  });

  holdInput.addEventListener('input', () => {
    holdMs = Number(holdInput.value);
    holdValue.textContent = holdMs + ' ms';
    saveStatus.textContent = '';
    renderCode();
  });

  resetExtremesButton.addEventListener('click', () => {
    extremes = { min: null, max: null };
    valueMin.textContent = '—';
    valueMax.textContent = '—';
  });

  saveButton.addEventListener('click', () => {
    const ok = tilt.save({ axis, invert, holdMs, ranges });
    saveStatus.textContent = ok ? text.saved : text.saveFailed;
  });

  restoreButton.addEventListener('click', () => {
    tilt.clear();
    const defaults = tilt.DEFAULT_CALIBRATION;
    saved.axis = defaults.axis;
    saved.ranges = defaults.ranges;
    axis = defaults.axis;
    invert = defaults.invert;
    holdMs = defaults.holdMs;
    tolerance = DEFAULT_TOLERANCE;
    ranges = defaults.ranges;
    centers = ranges.map(tilt.center);
    defined = centers.map(() => true);
    edited = false;
    positionsList.querySelectorAll('.position-message').forEach((p) => { p.textContent = ''; });
    syncControls();
    recompute();
    saveStatus.textContent = text.restored;
  });

  connectButton.addEventListener('click', () => (active ? stop() : start()));

  document.addEventListener('visibilitychange', () => {
    if (active && document.visibilityState === 'visible') requestWakeLock();
  });

  /* ---------- Inicio ---------- */

  connectButton.textContent = config.ui.connect;
  $('error-title').textContent = config.ui.errorTitle;
  $('error-hint').textContent = config.ui.errorHint;
  buildPositions();
  syncControls();
  recompute();
  saveStatus.textContent = '';
})();
