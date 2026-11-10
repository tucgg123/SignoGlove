/**
 * Phrases and interface text in English.
 * Each topic has 5 phrases: order matters, because each position
 * maps to a glove tilt range (see glove.js).
 */
window.SIGNOGLOVE = {
  audioPath: '../assets/audio/en/',

  ui: {
    connect: 'Connect glove',
    connecting: 'Connecting…',
    connected: 'Glove connected',
    reconnecting: 'Connection lost. Reconnecting…',
    unsupported: 'This browser can’t use Bluetooth. Open the page in Chrome or Edge on a computer or an Android phone.',
    errorTitle: 'The glove couldn’t connect.',
    errorHint: 'Make sure the micro:bit is on and nearby, then try again.',
    placeholder: 'Connect the glove or tap a phrase to hear it.'
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
