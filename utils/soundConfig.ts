// soundConfig.ts
// Centralized configuration for all game sounds.
// You can easily change the file paths here to use your own MP3 or WAV files.
// Place your custom sound files in the client/public/sounds/ directory.

export const SOUND_CONFIG = {
  // Global setting to toggle all sounds
  isMuted: false,

  // Global volume (0.0 to 1.0)
  globalVolume: 1.0,

  // Event to Audio File mapping
  // Replace these paths with your own custom MP3s when you are ready.
  // Example: 'GAME_START': '/sounds/my-custom-start.mp3'
  events: {
    'GAME_START': '/sounds/start.wav',
    'DICE_ROLL': '/sounds/dice-roll.wav',
    'BUY_PROPERTY': '/sounds/buy.wav',
    'BUILD_HOUSE': '/sounds/build.wav',
    'RECEIVE_CARD': '/sounds/card.wav',
    // Add more events here as needed
  }
};

export type SoundEvent = keyof typeof SOUND_CONFIG.events;
