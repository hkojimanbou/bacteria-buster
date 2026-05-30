export class SoundManager {
  private ctx: AudioContext;
  private isBGMPlaying = false;
  private bgmAudio: HTMLAudioElement | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /** カプセル着地音：短い低音（音量と発音を最適化） */
  playLand(): void {
    this.playTone(180, 'sine', 0.15, 0.15);
  }

  /** ブロック消去音：明るい高音 */
  playClear(): void {
    this.playTone(880, 'square', 0.12, 0.18);
  }

  /** 連鎖音：消去音より高く */
  playChain(chainCount: number): void {
    const freq = 880 + chainCount * 220;
    this.playTone(freq, 'square', 0.12, 0.2);
  }

  /** クリア音：明るい和音風 */
  playGameClear(): void {
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.15, 0.4), i * 120);
    });
  }

  /** ゲームオーバー音：暗い下降音 */
  playGameOver(): void {
    [400, 300, 200].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.15, 0.3), i * 150);
    });
  }

  /** カウントダウン電子音の完全再現 */
  playCountdownBeep(isStart: boolean): void {
    if (isStart) {
      // START音: 少し高いピッチ (1320Hz, 音量も十分に引き上げ)
      this.playTone(1320, 'sine', 0.2, 0.18);
    } else {
      // 3・2・1音: 澄んだ同じ高音電子音 (880Hz)
      this.playTone(880, 'sine', 0.2, 0.12);
    }
  }

  /** BGMの再生開始（mp3ランダム切替 ＆ ループ再生 ＆ 音量引き上げ） */
  startBGM(): void {
    if (this.isBGMPlaying) return;
    this.isBGMPlaying = true;

    // 既存のBGMを確実に停止
    this.stopBGMInternal();

    // ランダムで曲を選択
    const bgmFiles = ['assets/audio/bgm_ds.mp3', 'assets/audio/bgm_motto.mp3'];
    const selectedBGM = bgmFiles[Math.floor(Math.random() * bgmFiles.length)];

    console.log(`[SoundManager] Starting BGM: ${selectedBGM}`);
    this.bgmAudio = new Audio(selectedBGM);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.35; // BGM音量を大幅に引き上げて十分に聞こえるように調整

    // ブラウザのタッチジェスチャ制限対策を含めた再生処理
    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        console.log('[SoundManager] BGM playback blocked. Waiting for user interaction.');
        // ユーザーインタラクションがあった際に自動再生
        const playOnInteraction = () => {
          if (this.isBGMPlaying && this.bgmAudio) {
            this.bgmAudio.play().catch(() => {});
          }
          window.removeEventListener('click', playOnInteraction);
          window.removeEventListener('pointerdown', playOnInteraction);
          window.removeEventListener('keydown', playOnInteraction);
        };
        window.addEventListener('click', playOnInteraction);
        window.addEventListener('pointerdown', playOnInteraction);
        window.addEventListener('keydown', playOnInteraction);
      });
    }
  }

  /** BGMの停止 */
  stopBGM(): void {
    this.isBGMPlaying = false;
    this.stopBGMInternal();
  }

  private stopBGMInternal(): void {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch (e) {
        // エラー無視
      }
      this.bgmAudio = null;
    }
  }

  /** 低遅延効果音用 Web Audio API 発音関数 */
  public playTone(
    frequency: number,
    type: OscillatorType,
    volume: number,
    duration: number
  ): void {
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
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
