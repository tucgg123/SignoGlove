/**
 * Phrases and interface text in English.
 * Each topic has 5 phrases: order matters, because each position
 * maps to a phone tilt range (see glove.js).
 */
window.SIGNOGLOVE = {
  audioPath: '../assets/audio/en/',

  ui: {
    connect: 'Start sensor',
    connecting: 'Starting…',
    stop: 'Pause sensor',
    waiting: 'Waiting for the sensor…',
    connected: 'Sensor on: move your hand',
    angle: 'Tilt',
    rangeJoin: 'to',
    unsupported: 'This browser can’t read the motion sensor. Open the page in Chrome (Android) or Safari (iPhone).',
    insecure: 'The sensor only works when the page is opened over https (for example, from GitHub Pages).',
    noSensor: 'No sensor data is coming in. Open this page on a phone or tablet with a gyroscope.',
    denied: 'Permission to use the motion sensor was not given. Reload the page and tap “Allow”.',
    errorTitle: 'The sensor couldn’t start.',
    errorHint: 'Reload the page and try again.',
    placeholder: 'Start the sensor or tap a phrase to hear it.'
  },

  // Text for the “Calibrate” page (assets/js/calibrate.js).
  calibrate: {
    phrase: 'Phrase',
    example: 'e.g.',
    angleLabel: 'Angle',
    capture: 'Save position',
    measuring: 'Hold still… measuring',
    captured: 'Position saved:',
    unsteady: 'You moved too much while measuring. Hold still and try again.',
    noData: 'No sensor data came in. Start the sensor and try again.',
    startFirst: 'First tap “Start sensor” (above).',
    now: 'It would say',
    none: 'nothing (the last phrase stays)',
    tooClose: 'Phrases {a} and {b} are very close ({gap}): they’ll be easy to mix up.',
    missing: 'You changed the axis: save all 5 positions before using the calibration.',
    saved: 'Done. The communicator now uses this calibration on this phone.',
    saveFailed: 'Couldn’t save in this browser (private mode?). You can copy the code instead.',
    restored: 'Back to the original values.',
    quotes: ['“', '”'],
    codeComment: 'phrase'
  },

  topics: [
    {
      name: 'Personal relationships',
      phrases: [
        { text: 'How are you?', audio: 'how-are-you.mp3' },
        { text: 'I miss you', audio: 'i-miss-you.mp3' },
        { text: 'I’m sorry', audio: 'im-sorry.mp3' },
        { text: 'Thank you', audio: 'thank-you.mp3' },
        { text: 'I love you', audio: 'i-love-you.mp3' }
      ]
    },
    {
      name: 'Work and studies',
      phrases: [
        { text: 'What should be done?', audio: 'what-should-be-done.mp3' },
        { text: 'What time is the meeting?', audio: 'what-time-is-the-meeting.mp3' },
        { text: 'I need help', audio: 'i-need-help.mp3' },
        { text: 'I’m done', audio: 'im-done.mp3' },
        { text: 'What comes next?', audio: 'what-comes-next.mp3' }
      ]
    },
    {
      name: 'Health and wellness',
      phrases: [
        { text: 'It hurts', audio: 'it-hurts.mp3' },
        { text: 'Where is the pharmacy?', audio: 'where-is-the-pharmacy.mp3' },
        { text: 'I’m tired', audio: 'i-am-tired.mp3' },
        { text: 'Do you have anything for the pain?', audio: 'do-you-have-anything-for-the-pain.mp3' },
        { text: 'I can’t sleep', audio: 'i-cant-sleep.mp3' }
      ]
    },
    {
      name: 'Decision-making',
      phrases: [
        { text: 'What do you prefer?', audio: 'what-do-you-prefer.mp3' },
        { text: 'Yes or no?', audio: 'yes-or-no.mp3' },
        { text: 'Let’s give it a try', audio: 'lets-give-it-a-try.mp3' },
        { text: 'What is the best option?', audio: 'what-is-the-best-option.mp3' },
        { text: 'You decide', audio: 'you-decide.mp3' }
      ]
    },
    {
      name: 'Everyday life',
      phrases: [
        { text: 'What time is it?', audio: 'what-time-is-it.mp3' },
        { text: 'Where is the bathroom?', audio: 'where-is-the-bathroom.mp3' },
        { text: 'I’m hungry', audio: 'im-hungry.mp3' },
        { text: 'Let’s go', audio: 'lets-go.mp3' },
        { text: 'Where is he?', audio: 'where-is-he.mp3' }
      ]
    }
  ]
};
