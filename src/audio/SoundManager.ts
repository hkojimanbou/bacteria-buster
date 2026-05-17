export class SoundManager {
  private ctx: AudioContext;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /** カプセル着地音：短い低音 */
  playLand(): void {
    this.playTone(180, 'sine', 0.08, 0.12);
  }

  /** ブロック消去音：明るい高音 */
  playClear(): void {
    this.playTone(880, 'square', 0.15, 0.18);
  }

  /** 連鎖音：消去音より高く */
  playChain(chainCount: number): void {
    const freq = 880 + chainCount * 220;
    this.playTone(freq, 'square', 0.18, 0.2);
  }

  /** クリア音：明るい和音風 */
  playGameClear(): void {
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.2, 0.4), i * 120);
    });
  }

  /** ゲームオーバー音：暗い下降音 */
  playGameOver(): void {
    [400, 300, 200].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.2, 0.3), i * 150);
    });
  }

  private playTone(
    frequency: number,
    type: OscillatorType,
    volume: number,
    duration: number
  ): void {
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // AudioContext が使えない環境では無視
    }
  }
}
