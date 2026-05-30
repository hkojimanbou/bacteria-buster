export const NOTES: { [key: string]: number } = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00,
    'R': 0
};

type NoteObj = { note: string, dur: number };

// --- 通常版 (細菌撲滅 I / II) ---
const saikin1Song: NoteObj[] = [
    {note: 'A4', dur: 0.5}, {note: 'B4', dur: 0.5}, {note: 'C5', dur: 1}, {note: 'A4', dur: 1},
    {note: 'E5', dur: 1}, {note: 'D5', dur: 1}, {note: 'C5', dur: 1}, {note: 'B4', dur: 1},
    {note: 'A4', dur: 0.5}, {note: 'B4', dur: 0.5}, {note: 'C5', dur: 1}, {note: 'A4', dur: 1},
    {note: 'B4', dur: 1}, {note: 'G4', dur: 1}, {note: 'A4', dur: 2},
    {note: 'E5', dur: 0.5}, {note: 'D#5', dur: 0.5}, {note: 'E5', dur: 0.5}, {note: 'D#5', dur: 0.5}, {note: 'E5', dur: 1}, {note: 'B4', dur: 1},
    {note: 'D5', dur: 1}, {note: 'C5', dur: 1}, {note: 'B4', dur: 1}, {note: 'A4', dur: 1}
];

const saikin2Song: NoteObj[] = [
    {note: 'E4', dur: 1}, {note: 'A4', dur: 1}, {note: 'B4', dur: 1}, {note: 'C5', dur: 1.5},
    {note: 'B4', dur: 0.5}, {note: 'A4', dur: 1}, {note: 'B4', dur: 2}, {note: 'R', dur: 1},
    {note: 'D4', dur: 1}, {note: 'G4', dur: 1}, {note: 'A4', dur: 1}, {note: 'B4', dur: 1.5},
    {note: 'A4', dur: 0.5}, {note: 'G4', dur: 1}, {note: 'A4', dur: 2}, {note: 'R', dur: 1},
    {note: 'C5', dur: 1}, {note: 'D5', dur: 1}, {note: 'E5', dur: 2}, 
    {note: 'D5', dur: 1}, {note: 'C5', dur: 1}, {note: 'B4', dur: 2},
    {note: 'A4', dur: 1}, {note: 'B4', dur: 1}, {note: 'C5', dur: 1}, {note: 'A4', dur: 1},
    {note: 'B4', dur: 4}
];

// --- 特別版 (うさぎ紳士 / 辺境でこんにちは) ---
const usagiSong: NoteObj[] = [
    {note: 'E4', dur: 1}, {note: 'F4', dur: 1}, {note: 'G4', dur: 1},
    {note: 'E4', dur: 1}, {note: 'F4', dur: 1}, {note: 'G4', dur: 1},
    {note: 'C5', dur: 1}, {note: 'B4', dur: 1}, {note: 'A4', dur: 1},
    {note: 'G4', dur: 1}, {note: 'F4', dur: 1}, {note: 'E4', dur: 1},
    {note: 'D4', dur: 1}, {note: 'E4', dur: 1}, {note: 'F4', dur: 1},
    {note: 'D4', dur: 1}, {note: 'E4', dur: 1}, {note: 'F4', dur: 1},
    {note: 'B4', dur: 1}, {note: 'A4', dur: 1}, {note: 'G4', dur: 1},
    {note: 'F4', dur: 1}, {note: 'E4', dur: 1}, {note: 'D4', dur: 1},
    {note: 'E4', dur: 1}, {note: 'F4', dur: 1}, {note: 'G4', dur: 1},
    {note: 'E4', dur: 1}, {note: 'F4', dur: 1}, {note: 'G4', dur: 1},
    {note: 'C5', dur: 1}, {note: 'B4', dur: 1}, {note: 'A4', dur: 1},
    {note: 'G4', dur: 1}, {note: 'F4', dur: 1}, {note: 'E4', dur: 1},
    {note: 'D4', dur: 1}, {note: 'F#4', dur: 1}, {note: 'A4', dur: 1},
    {note: 'B4', dur: 1}, {note: 'C#5', dur: 1}, {note: 'D5', dur: 1},
    {note: 'E5', dur: 3}
];

const henkyoSong: NoteObj[] = [
    {note: 'G4', dur: 4}, {note: 'B4', dur: 1}, {note: 'C4', dur: 1}, {note: 'D4', dur: 1}, {note: 'B4', dur: 1},
    {note: 'A4', dur: 1}, {note: 'G4', dur: 1}, {note: 'A4', dur: 2}, {note: 'R', dur: 4},
    {note: 'G4', dur: 4}, {note: 'B4', dur: 1}, {note: 'C4', dur: 1}, {note: 'D4', dur: 1}, {note: 'B4', dur: 1},
    {note: 'A4', dur: 1}, {note: 'B4', dur: 1}, {note: 'G4', dur: 2}, {note: 'R', dur: 4},
    {note: 'C5', dur: 3}, {note: 'D5', dur: 1}, {note: 'B4', dur: 1}, {note: 'A4', dur: 1}, {note: 'G4', dur: 1}, {note: 'B4', dur: 1},
    {note: 'A4', dur: 1}, {note: 'G4', dur: 1}, {note: 'A4', dur: 2}, {note: 'R', dur: 4},
    {note: 'G4', dur: 4}, {note: 'B4', dur: 1}, {note: 'C4', dur: 1}, {note: 'D4', dur: 1}, {note: 'B4', dur: 1},
    {note: 'A4', dur: 1}, {note: 'B4', dur: 1}, {note: 'G4', dur: 2}
];

export class SoundManager {
  private ctx: AudioContext;
  private isBGMPlaying = false;
  private bgmTimeouts: any[] = [];

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
      this.playTone(1320, 'sine', 0.2, 0.18);
    } else {
      this.playTone(880, 'sine', 0.2, 0.12);
    }
  }

  /** BGMの再生開始（レベルに応じて選曲） */
  startBGM(level: number = 1): void {
    if (this.isBGMPlaying) return;
    this.isBGMPlaying = true;
    this.stopBGMInternal();

    // ユーザーインタラクション制限対策
    if (this.ctx.state === 'suspended') {
      const resumeAudio = () => {
        if (this.isBGMPlaying) {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('click', resumeAudio);
        window.removeEventListener('pointerdown', resumeAudio);
        window.removeEventListener('keydown', resumeAudio);
      };
      window.addEventListener('click', resumeAudio);
      window.addEventListener('pointerdown', resumeAudio);
      window.addEventListener('keydown', resumeAudio);
      this.ctx.resume().catch(() => {});
    }

    this.playSongLoop(level);
  }

  private playSongLoop(level: number): void {
    if (!this.isBGMPlaying) return;

    let song: NoteObj[] = [];
    let stepTime = 0;
    let waveType: OscillatorType = 'square';
    
    // 20回以降の10回ごとは特別版（うさぎ紳士 / 辺境でこんにちは）
    const isSpecial = (level >= 20 && level % 10 === 0);

    if (isSpecial) {
      waveType = 'triangle';
      if (Math.random() < 0.5) {
        song = usagiSong;
        stepTime = 60 / 130;
      } else {
        song = henkyoSong;
        stepTime = 60 / 110;
      }
    } else {
      waveType = 'square';
      if (Math.random() < 0.5) {
        song = saikin1Song;
        stepTime = 60 / 145;
      } else {
        song = saikin2Song;
        stepTime = 60 / 130;
      }
    }

    let currentTime = this.ctx.currentTime;
    
    song.forEach((noteObj) => {
      const duration = noteObj.dur * stepTime;
      if (noteObj.note !== 'R' && NOTES[noteObj.note]) {
        let t = setTimeout(() => {
          if (!this.isBGMPlaying) return;
          this.playBGMTone(NOTES[noteObj.note], duration, waveType);
        }, Math.max(0, (currentTime - this.ctx.currentTime)) * 1000);
        this.bgmTimeouts.push(t);
      }
      currentTime += duration;
    });

    // 次のループをスケジュール
    let endTimeout = setTimeout(() => {
      if (this.isBGMPlaying) {
        this.playSongLoop(level);
      }
    }, Math.max(0, (currentTime - this.ctx.currentTime)) * 1000);
    this.bgmTimeouts.push(endTimeout);
  }

  /** BGMの停止 */
  stopBGM(): void {
    this.isBGMPlaying = false;
    this.stopBGMInternal();
  }

  private stopBGMInternal(): void {
    this.bgmTimeouts.forEach(t => clearTimeout(t));
    this.bgmTimeouts = [];
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
    } catch (e) {}
  }

  /** BGM専用発音メソッド（エンベロープ調整） */
  private playBGMTone(freq: number, duration: number, type: OscillatorType): void {
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = type; 
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration - 0.02);
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
}
