let audioCtx: AudioContext | null = null;

export function playDiceBounceSound(intensity: number = 1.0) {
  if (typeof window === 'undefined') return;

  try {
      const AudioContextClass = window.AudioContext || 
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const ctx = audioCtx;
    const now = ctx.currentTime;
    
    // Scale intensity
    const volume = Math.min(Math.max(intensity, 0), 1) * 0.4;
    if (volume < 0.02) return; // ignore very soft hits

    // Make a low clack / bounce sound using:
    // 1. A short, low frequency pitch drop (the body of the dice hit)
    // 2. A tiny white noise burst (the impact click)

    // 1. Body Osc
    const osc = ctx.createOscillator();
    const gainOsc = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
    
    gainOsc.gain.setValueAtTime(volume, now);
    gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gainOsc);
    gainOsc.connect(ctx.destination);
    
    // 2. Click (Noise)
    const bufferSize = ctx.sampleRate * 0.02; // 20ms of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 4;
    
    const gainNoise = ctx.createGain();
    gainNoise.gain.setValueAtTime(volume * 0.7, now);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    
    noise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
    noise.start(now);
    noise.stop(now + 0.025);
  } catch (error) {
    console.error('Failed to play dice sound:', error);
  }
}
