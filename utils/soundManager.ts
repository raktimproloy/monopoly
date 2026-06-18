import { Howl, Howler } from 'howler';
import { SOUND_CONFIG, SoundEvent } from './soundConfig';

class SoundManager {
  private sounds: Map<SoundEvent, Howl> = new Map();
  private isMuted: boolean = SOUND_CONFIG.isMuted;
  private globalVolume: number = SOUND_CONFIG.globalVolume;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Apply global configuration
    Howler.mute(this.isMuted);
    Howler.volume(this.globalVolume);

    // Preload sounds
    for (const [event, path] of Object.entries(SOUND_CONFIG.events)) {
      const howl = new Howl({
        src: [path],
        preload: true,
        volume: 0.85,
      });
      this.sounds.set(event as SoundEvent, howl);
    }
  }

  public playEventSound(event: SoundEvent, intensity: number = 1.0) {
    if (typeof window === 'undefined') return;
    if (this.isMuted) return;

    const sound = this.sounds.get(event);
    if (sound) {
      // For spatial/intensity variations if needed
      const id = sound.play();
      sound.volume(Math.min(Math.max(intensity, 0), 1) * this.globalVolume, id);
    } else {
      console.warn(`Sound for event ${event} not found in config.`);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    Howler.mute(mute);
  }

  public getMute() {
    return this.isMuted;
  }

  public setGlobalVolume(volume: number) {
    this.globalVolume = volume;
    Howler.volume(volume);
  }
}

// Export a singleton instance
export const soundManager = new SoundManager();
