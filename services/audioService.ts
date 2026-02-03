
class AudioService {
  private context: AudioContext | null = null;

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playSuccess() {
    this.initContext();
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.context.currentTime); // A5
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + 0.2);
  }

  playError() {
    this.initContext();
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + 0.3);
  }
}

export const audioService = new AudioService();
