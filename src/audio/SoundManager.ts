export const NOTES: { [key: string]: number } = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00,
    'R': 0
};

type NoteObj = { note: string, dur: number };

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
  private activeOscillators: OscillatorNode[] = [];
  private loopTimeoutId: any = null;
  private nextStartTime: number = 0;

  constructor(audioContext?: AudioContext) {
    this.ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Fallback: unlock on first interaction if still suspended
    const unlock = () => {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('click', unlock);
  }

  playLand(): void {
    this.playTone(180, 'sine', 0.15, 0.15);
  }

  playClear(): void {
    this.playTone(880, 'square', 0.12, 0.18);
  }

  playChain(chainCount: number): void {
    const freq = 880 + chainCount * 220;
    this.playTone(freq, 'square', 0.12, 0.2);
  }

  playGameClear(): void {
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.15, 0.4), i * 120);
    });
  }

  playGameOver(): void {
    [400, 300, 200].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.15, 0.3), i * 150);
    });
  }

  playCountdownBeep(isStart: boolean): void {
    if (isStart) {
      this.playTone(1320, 'sine', 0.2, 0.18);
    } else {
      this.playTone(880, 'sine', 0.2, 0.12);
    }
  }

  startBGM(level: number = 1): void {
    if (this.isBGMPlaying) return;
    this.isBGMPlaying = true;
    this.stopBGMInternal();

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Initialize nextStartTime to slightly in the future to ensure clean playback
    this.nextStartTime = this.ctx.currentTime + 0.05;
    console.log('[SoundManager] Starting BGM loop, level:', level, 'nextStart:', this.nextStartTime);
    this.scheduleSongLoop(level);
  }

  private scheduleSongLoop(level: number): void {
    if (!this.isBGMPlaying) return;

    let song: NoteObj[] = [];
    let stepTime = 0;
    let waveType: OscillatorType = 'square';
    
    const isSpecial = (level >= 20 && level % 10 === 0);

    if (isSpecial) {
      waveType = 'square';
      if (Math.random() < 0.5) {
        song = saikin1Song;
        stepTime = 60 / 145;
      } else {
        song = saikin2Song;
        stepTime = 60 / 130;
      }
    } else {
      waveType = 'triangle';
      if (Math.random() < 0.5) {
        song = usagiSong;
        stepTime = 60 / 130;
      } else {
        song = henkyoSong;
        stepTime = 60 / 110;
      }
    }

    // If context is still suspended, currentTime will be 0. We must ensure nextStartTime is at least 0.
    if (this.nextStartTime < this.ctx.currentTime) {
      this.nextStartTime = this.ctx.currentTime + 0.05;
    }

    song.forEach((noteObj) => {
      const duration = noteObj.dur * stepTime;
      if (noteObj.note !== 'R' && NOTES[noteObj.note]) {
        this.scheduleBGMTone(NOTES[noteObj.note], this.nextStartTime, duration, waveType);
      }
      this.nextStartTime += duration;
    });

    // We schedule the next loop slightly before the current one finishes.
    const lookaheadTime = 0.5; // schedule next loop 0.5 seconds before it starts
    const timeUntilNextLoop = this.nextStartTime - this.ctx.currentTime - lookaheadTime;
    
    this.loopTimeoutId = setTimeout(() => {
      if (this.isBGMPlaying) {
        this.scheduleSongLoop(level);
      }
    }, Math.max(0, timeUntilNextLoop * 1000));
  }

  pauseBGM(): void {
    if (this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  resumeBGM(): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  stopBGM(): void {
    this.isBGMPlaying = false;
    this.stopBGMInternal();
  }

  private stopBGMInternal(): void {
    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    
    // Stop all actively scheduled oscillators instantly
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.activeOscillators = [];
  }

  public playTone(frequency: number, type: OscillatorType, volume: number, duration: number): void {
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
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

  private scheduleBGMTone(freq: number, startTime: number, duration: number, type: OscillatorType): void {
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = type; 
      osc.frequency.value = freq;
      
      // Ensure positive ramp start to avoid exponentialRampToValueAtTime zero constraint
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      
      const endTime = startTime + duration - 0.02;
      if (endTime > startTime + 0.02) {
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
      } else {
        gainNode.gain.setValueAtTime(0.001, startTime + duration);
      }
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);

      this.activeOscillators.push(osc);
      
      osc.onended = () => {
        const idx = this.activeOscillators.indexOf(osc);
        if (idx > -1) {
          this.activeOscillators.splice(idx, 1);
        }
        osc.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      console.error('BGM Scheduling Error', e);
    }
  }
}
