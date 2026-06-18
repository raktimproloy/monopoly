// soundConfig.ts
// Centralized configuration for all game sounds.
// You can easily change the file paths here to use your own MP3 or WAV files.
// Place your custom sound files in the client/public/sounds/ directory.

export const SOUND_CONFIG = {
  // Global setting to toggle all sounds
  isMuted: false,

  // Global volume (0.0 to 1.0)
  globalVolume: 0.35,

  // Event to Audio File mapping
  events: {
    'GAME_START': '/sounds/Match Started.mp3',
    'PLAYER_JOIN': '/sounds/Player Join.mp3',
    'YOUR_TURN': '/sounds/Your Turn.mp3',
    'DICE_ROLL': '/sounds/Dice Role.mp3',
    'BUY_PROPERTY': '/sounds/Purchase.mp3',
    'BUILD_HOUSE': '/sounds/Build House.mp3',
    'BUILD_HOTEL': '/sounds/Build Hotel.mp3',
    'TRADE_OPEN': '/sounds/Trade Open.mp3',
    'TRADE_ACCEPT': '/sounds/Trade Accept.mp3',
    'TRADE_DECLINED': '/sounds/Trade Declined.mp3',
    'RECEIVE_CARD': '/sounds/Purchase.mp3', // Fallback for card
    'CARD_FLIP': '/sounds/Card Flip.mp3',
    'MONEY_TRANSACTION': '/sounds/Money.mp3',
    'PRISON_SOUND': '/sounds/Prison.mp3',
    'COMPLETE_SET': '/sounds/Build House.mp3'
  }
};

export type SoundEvent = keyof typeof SOUND_CONFIG.events;
