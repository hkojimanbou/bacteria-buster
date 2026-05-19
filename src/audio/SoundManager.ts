export class SoundManager {
  private ctx: AudioContext;
  private bgmTimer: any = null;
  private bgmIndex = 0;
  private isBGMPlaying = false;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /** カプセル着地音：短い低音 */
  playLand(): void {
    this.playTone(180, 'sine', 0.08, 0.12);
  }

  /** ブロック消去音：明るい高音 */
  playClear(): void {
    this.playTone(880, 'square', 0.12, 0.18);
  }

  /** 連鎖音：消去音より高く */
  playChain(chainCount: number): void {
    const freq = 880 + chainCount * 220;
    this.playTone(freq, 'square', 0.15, 0.2);
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

  /** BGMの再生開始 */
  startBGM(): void {
    if (this.isBGMPlaying) return;
    this.isBGMPlaying = true;
    this.bgmIndex = 0;

    const notes = [523.25, 659.25, 783.99, 659.25]; // C4, E4, G4, E4
    const tempoDelay = 667; // 約90BPM (60000 / 90)

    const tick = () => {
      if (!this.isBGMPlaying) return;
      const freq = notes[this.bgmIndex];
      this.playBGMTone(freq, 0.5); // 音の長さ 0.5秒
      this.bgmIndex = (this.bgmIndex + 1) % notes.length;
      this.bgmTimer = setTimeout(tick, tempoDelay);
    };

    tick();
  }

  /** BGMの停止 */
  stopBGM(): void {
    this.isBGMPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /** BGM用の滑らかなフェードイン・アウト付き音 */
  private playBGMTone(frequency: number, duration: number): void {
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      const vol = 0.03; // 耳に優しい音量
      const t = this.ctx.currentTime;

      // フェードイン (50ms)
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.05);

      // フェードアウト (100ms)
      gain.gain.setValueAtTime(vol, t + duration - 0.1);
      gain.gain.linearRampToValueAtTime(0.001, t + duration);

      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {
      // エラー無視
    }
  }

  public playTone(
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
      // エラー無視
    }
  }
}
