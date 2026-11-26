/**
 * SignoGlove – inclinación y calibración (compartido por el comunicador y la
 * página de calibración).
 *
 * Una calibración dice qué eje del sensor se usa y qué rango de ángulos
 * corresponde a cada una de las 5 frases. La que se hace en la página
 * «Calibrar» se guarda en el navegador de ese celular (localStorage).
 * Si no hay ninguna guardada, se usa DEFAULT_CALIBRATION.
 *
 * Para cambiar los valores por defecto para todas las personas, pega aquí
 * el código que da el botón «Copiar código» de la página de calibración.
 */
(function () {
  'use strict';

  const DEFAULT_CALIBRATION = {
    // 'beta' = eje X (inclinar hacia adelante o hacia atrás), como la micro:bit.
    // 'gamma' = eje Y (inclinar hacia los lados).
    axis: 'beta',
    // true si el ángulo sale con el signo al revés en tu montaje.
    invert: false,
    // Tiempo (ms) que la mano debe quedarse en una posición antes de hablar.
    holdMs: 400,
    // Un rango por frase, en orden (frase 1 a 5). Gana el primero que coincida.
    // Si min es mayor que max, el rango pasa por ±180° (por ejemplo, 170 a −170).
    ranges: [
      { min: -25, max: 35 },
      { min: 35, max: 75 },
      { min: -75, max: -25 },
      { min: 115, max: 140 },
      { min: 150, max: 180 }
    ]
  };

  // Ejes que se pueden usar. beta da la vuelta completa (−180 a 180);
  // gamma solo va de −90 a 90.
  const AXES = {
    beta: { min: -180, max: 180, circular: true },
    gamma: { min: -90, max: 90, circular: false }
  };

  const STORAGE_KEY = 'signoglove.calibration';

  function copy(calibration) {
    return {
      axis: calibration.axis,
      invert: Boolean(calibration.invert),
      holdMs: calibration.holdMs,
      ranges: calibration.ranges.map((r) => ({ min: r.min, max: r.max }))
    };
  }

  function isValid(c) {
    return Boolean(c) &&
      Object.prototype.hasOwnProperty.call(AXES, c.axis) &&
      Number.isFinite(c.holdMs) &&
      Array.isArray(c.ranges) && c.ranges.length === 5 &&
      c.ranges.every((r) => r && Number.isFinite(r.min) && Number.isFinite(r.max));
  }

  /** Calibración actual: la guardada en este celular o la de por defecto. */
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (isValid(saved)) return Object.assign(copy(saved), { custom: true });
    } catch (error) {
      // localStorage puede no estar disponible (modo privado, etc.).
    }
    return Object.assign(copy(DEFAULT_CALIBRATION), { custom: false });
  }

  function save(calibration) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(copy(calibration)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Nada que hacer.
    }
  }

  /** Lleva un ángulo al intervalo (−180, 180]. */
  function wrap(angle) {
    const a = ((angle + 180) % 360 + 360) % 360 - 180;
    return a === -180 ? 180 : a;
  }

  /** Ángulo del eje elegido a partir de un evento deviceorientation. */
  function read(event, calibration) {
    const value = event[calibration.axis];
    if (!Number.isFinite(value)) return null;
    return calibration.invert ? -value : value;
  }

  function inRange(angle, range) {
    return range.min <= range.max
      ? angle >= range.min && angle <= range.max
      : angle >= range.min || angle <= range.max; // pasa por ±180°
  }

  /** Posición de la frase (0 a 4) para un ángulo, o null si no cae en ningún rango. */
  function match(calibration, angle) {
    for (let i = 0; i < calibration.ranges.length; i++) {
      if (inRange(angle, calibration.ranges[i])) return i;
    }
    return null;
  }

  /** Centro de un rango (tiene en cuenta los que pasan por ±180°). */
  function center(range) {
    if (range.min <= range.max) return Math.round((range.min + range.max) / 2);
    return Math.round(wrap(range.min + (range.max + 360 - range.min) / 2));
  }

  /**
   * Crea los 5 rangos a partir del ángulo guardado para cada frase.
   * Cada rango va de centro − tolerancia a centro + tolerancia, pero nunca
   * pasa de la mitad del camino hacia la posición vecina, para que dos
   * frases no se pisen.
   */
  function computeRanges(centers, axisKey, tolerance) {
    const axis = AXES[axisKey];
    const points = centers.map((c, i) => ({ c: Math.round(c), i })).sort((a, b) => a.c - b.c);
    const n = points.length;
    const ranges = new Array(n);

    points.forEach((point, k) => {
      let gapBelow;
      let gapAbove;
      if (axis.circular) {
        gapBelow = ((point.c - points[(k - 1 + n) % n].c) % 360 + 360) % 360;
        gapAbove = ((points[(k + 1) % n].c - point.c) % 360 + 360) % 360;
      } else {
        gapBelow = k > 0 ? point.c - points[k - 1].c : Infinity;
        gapAbove = k < n - 1 ? points[k + 1].c - point.c : Infinity;
      }
      const min = Math.ceil(point.c - Math.min(tolerance, gapBelow / 2));
      const max = Math.floor(point.c + Math.min(tolerance, gapAbove / 2));
      ranges[point.i] = axis.circular
        ? { min: wrap(min), max: wrap(max) }
        : { min: Math.max(axis.min, min), max: Math.min(axis.max, max) };
    });
    return ranges;
  }

  /** Diferencia más corta entre dos ángulos (para ejes que dan la vuelta). */
  function difference(a, b, axisKey) {
    return AXES[axisKey].circular ? wrap(a - b) : a - b;
  }

  /** Promedio de varias lecturas (para ejes que dan la vuelta usa seno y coseno). */
  function average(values, axisKey) {
    if (!AXES[axisKey].circular) {
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    }
    let sin = 0;
    let cos = 0;
    values.forEach((v) => {
      sin += Math.sin(v * Math.PI / 180);
      cos += Math.cos(v * Math.PI / 180);
    });
    return Math.atan2(sin, cos) * 180 / Math.PI;
  }

  function formatDegrees(value) {
    // Signo menos tipográfico (−) para que se lea mejor.
    return String(Math.round(value)).replace('-', '−') + '°';
  }

  function rangeLabel(range, joinWord) {
    return formatDegrees(range.min) + ' ' + joinWord + ' ' + formatDegrees(range.max);
  }

  /** En iPhone y iPad hay que pedir permiso; en los demás no hace falta. */
  function requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      return DeviceOrientationEvent.requestPermission();
    }
    return Promise.resolve('granted');
  }

  window.SignoTilt = {
    DEFAULT_CALIBRATION: copy(DEFAULT_CALIBRATION),
    AXES,
    load,
    save,
    clear,
    read,
    match,
    center,
    computeRanges,
    difference,
    average,
    wrap,
    formatDegrees,
    rangeLabel,
    requestPermission
  };
})();
