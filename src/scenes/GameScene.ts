import Phaser from 'phaser';
import { Capsule, CELL_SIZE, GRID_COLS, GRID_ROWS, ROTATION_OFFSETS } from '../objects/Capsule';
import { Germ } from '../objects/Germ';
import { SoundManager } from '../audio/SoundManager';

// ────────────────────────────────────
//  レイアウト定数
// ────────────────────────────────────

const GRID_OFFSET_X = (360 - GRID_COLS * CELL_SIZE) / 2; // 36px (6列×48px=288px)
const GRID_OFFSET_Y = 130; // 上部に 130px の情報スペースを確保 (130 + 528 = 658px)

/** カラーパレット（赤・黄・青） */
const COLORS = [0xe74c3c, 0xf1c40f, 0x3498db];

// ────────────────────────────────────
//  速度定数
// ────────────────────────────────────
const FALL_SPEED_SLOW = 1 / 2000; // タッチ中の減速 (2000msで1行)

export class GameScene extends Phaser.Scene {
  private capsule: Capsule | null = null;
  private gfx!: Phaser.GameObjects.Graphics;

  // ── 状態・物理変数 ─────────────────
  private grid: (number | null)[][] = [];
  private germCells: Set<string> = new Set();
  private difficulty: string = 'normal';
  private fallSpeedNormal: number = 1 / 800; // 通常の落下速度 (800msで1行)
  
  // ── タッチ操作 ─────────────────
  private isDragging: boolean = false;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private touchColOffset: number = 0;
  private capsuleHitArea!: Phaser.Geom.Rectangle;

  // ── 単体ブロックのドラッグ操作用 ─────────────────
  private draggingBlock: { row: number; col: number; color: number; dir: 'left' | 'right' | 'top' | 'bottom' | null } | null = null;

  // ── 消去テンポ制御用 ─────────────────
  private clearingCells: Set<string> = new Set();
  private isBlinking: boolean = false;
  private isBlinkingVisible: boolean = true;
  private blinkTimerEvent: Phaser.Time.TimerEvent | null = null;
  private gridDirs: ('left' | 'right' | 'top' | 'bottom' | null)[][] = [];

  // ── 消去残像エフェクト ─────────────────
  private fadingEffects: { row: number; col: number; color: number; dir: 'left' | 'right' | 'top' | 'bottom' | null; type: 'capsule' | 'germ'; alpha: number }[] = [];

  // ── カウントダウン演出 ─────────────────
  private isCountingDown: boolean = false;
  private countdownText!: Phaser.GameObjects.Text;
  private countdownBg!: Phaser.GameObjects.Rectangle;
  private countdownCircle!: Phaser.GameObjects.Graphics;

  // ── HUD & HUD Objects ─────────────────
  private nextColors: [number, number][] = [];
  private score: number = 0;
  private level: number = 1;
  private chainCount: number = 0;
  
  private scoreLabelText!: Phaser.GameObjects.Text;
  private levelLabelText!: Phaser.GameObjects.Text;
  private chainText!: Phaser.GameObjects.Text;

  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private soundManager!: SoundManager;

  private isGameOver: boolean = false;
  private isGameClear: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  // ────────────────────────────────────
  //  Phaser ライフサイクル
  // ────────────────────────────────────

  init(data: { difficulty?: string; level?: number }): void {
    this.difficulty = data.difficulty || 'normal';
    this.level = data.level || 1;

    // 難易度による物理パラメータ・細菌数割り当て
    if (this.difficulty === 'easy') {
      this.fallSpeedNormal = 1 / 1200; // 緩やか
    } else if (this.difficulty === 'hard') {
      this.fallSpeedNormal = 1 / 400;  // 急速
    } else {
      this.fallSpeedNormal = 1 / 800;  // ふつう
    }

    this.score = 0;
    this.chainCount = 0;
    this.isGameOver = false;
    this.isGameClear = false;
    this.isDragging = false;
    this.isBlinking = false;
    this.fadingEffects = [];
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.soundManager = new SoundManager((this.sound as any).context as AudioContext);

    // カプセル衝突判定用ヒットエリアの初期化
    this.capsuleHitArea = new Phaser.Geom.Rectangle(0, 0, 0, 0);

    // グリッドデータの初期設定 (空盤面)
    this.grid = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill(null)
    );
    this.gridDirs = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill(null)
    );

    // NEXTカプセルの色初期化 (2枠分)
    this.nextColors = [
      [COLORS[Math.floor(Math.random() * COLORS.length)], COLORS[Math.floor(Math.random() * COLORS.length)]],
      [COLORS[Math.floor(Math.random() * COLORS.length)], COLORS[Math.floor(Math.random() * COLORS.length)]]
    ];

    // HUDの生成
    this.createHUD();

    // 細細菌の初期配置
    this.initGerms();

    // タッチイベントのセットアップ
    this.setupPointerEvents();

    // 白背景カウントダウン③②①の開始
    this.runCountdown();
  }

  update(_time: number, delta: number): void {
    // 消去残像エフェクトの進行（ゲームが一時停止していてもエフェクトは減衰・消去する）
    if (this.fadingEffects.length > 0) {
      let changed = false;
      this.fadingEffects.forEach(eff => {
        eff.alpha -= delta / 150; // 約150msで消滅
        if (eff.alpha <= 0) changed = true;
      });
      if (changed) {
        this.fadingEffects = this.fadingEffects.filter(eff => eff.alpha > 0);
      }
      this.redraw();
    }

    if (this.isCountingDown || this.isGameOver || this.isGameClear) return;
    if (!this.capsule) return;

    // すぐ下が床や他のブロックであれば、沈み込ませずに即座に着地させる（重なりバグ完全解消）
    if (!this.canMoveDown()) {
      this.capsule.fallProgress = 0.0;
      this.landCapsule();
      return;
    }

    // 1. カプセル物理落下 (時間経過による進捗)
    this.capsule.fallProgress += this.capsule.fallSpeed * delta;

    if (this.capsule.fallProgress >= 1.0) {
      if (this.canMoveDown()) {
        this.capsule.row += 1;
        this.capsule.fallProgress -= 1.0;
      } else {
        // 底・ブロックへの接触
        this.capsule.fallProgress = 0.0;
        this.landCapsule();
      }
    }

    // 2. カプセルヒットエリア(バウンディングボックス)の毎フレーム更新
    if (this.capsule) {
      const blocks = this.capsule.getBlocks();
      const cols = blocks.map(b => b.col);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      const px = GRID_OFFSET_X + minCol * CELL_SIZE;
      const py = GRID_OFFSET_Y + (this.capsule.row + this.capsule.fallProgress) * CELL_SIZE;
      const w = (maxCol - minCol + 1) * CELL_SIZE;
      const h = (this.capsule.rotation === 1 || this.capsule.rotation === 3) ? CELL_SIZE * 2 : CELL_SIZE;

      this.capsuleHitArea.setTo(px, py, w, h);
    }

    // 3. 盤面の再描画
    this.redraw();
  }

  // ────────────────────────────────────
  //  非同期カウントダウン演出
  // ────────────────────────────────────

  private async runCountdown(): Promise<void> {
    console.log('[DEBUG] runCountdown started');
    this.isCountingDown = true;
    this.soundManager.stopBGM();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // 白背景フルスクリーン
    this.countdownBg = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0xffffff).setDepth(99);
    
    // 黒の丸囲みと白いリングをGraphicsで描画 (半径を160へ大幅に拡大して画面いっぱいに)
    const radius = 160;
    this.countdownCircle = this.add.graphics().setDepth(99);
    this.countdownCircle.fillStyle(0x000000, 1);
    this.countdownCircle.fillCircle(cx, cy, radius);
    this.countdownCircle.lineStyle(10, 0xffffff, 1); // 白い美しいリング（太さ10px）
    this.countdownCircle.strokeCircle(cx, cy, radius - 15);

    // 数字のサイズを画面いっぱいに超巨大化 (84pxから240pxへ)
    this.countdownText = this.add.text(cx, cy, '', {
      fontSize: '240px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      padding: { top: 40, bottom: 40, left: 40, right: 40 }
    }).setOrigin(0.5).setDepth(100);

    // 3・2・1 → 同じ高音電子音
    const nums = ['3', '2', '1'];
    for (const num of nums) {
      console.log('[DEBUG] Countdown set number:', num);
      this.countdownText.setText(num);
      this.soundManager.playCountdownBeep(false); // ピッ (880Hz)
      await this.delay(800);
    }

    // START → 少し高い音程で鳴らす！
    this.countdownText.setFontSize(110); // STARTの文字幅に合わせてフォントサイズを縮小
    this.countdownText.setText('START');
    this.soundManager.playCountdownBeep(true); // ポーン (1320Hz)
    await this.delay(800);

    console.log('[DEBUG] Countdown loop finished');

    // クリーンアップ
    this.countdownText.destroy();
    this.countdownBg.destroy();
    this.countdownCircle.destroy();
    console.log('[DEBUG] Countdown UI destroyed');

    this.isCountingDown = false;

    // BGMの開始
    this.soundManager.startBGM(this.level);
    console.log('[DEBUG] BGM started');

    // 最初のカプセル生成
    this.spawnCapsule();
  }

  // ────────────────────────────────────
  //  細菌初期配置
  // ────────────────────────────────────

  private initGerms(): void {
    let placed = 0;
    
    // 細菌数の決定：簡単 (Level*2), 普通 (Level*3), 難しい (Level*4)
    let germCount = this.level * 3;
    if (this.difficulty === 'easy') {
      germCount = this.level * 2;
    } else if (this.difficulty === 'hard') {
      germCount = this.level * 4;
    }
    germCount = Math.max(germCount, 2); // 最低2個

    while (placed < germCount) {
      // 11行になったため、ウイルスの配置範囲を row = 5 から GRID_ROWS - 1 (下部6行) に変更
      const row = Phaser.Math.Between(5, GRID_ROWS - 1);
      const col = Phaser.Math.Between(0, GRID_COLS - 1);

      if (this.grid[row][col] === null) {
        const color = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
        this.grid[row][col] = color;
        this.germCells.add(`${row},${col}`);
        placed++;
      }
    }
  }

  // ────────────────────────────────────
  //  操作用衝突判定
  // ────────────────────────────────────

  private canMoveTo(targetCol: number): boolean {
    if (!this.capsule) return false;

    const originalCol = this.capsule.col;
    this.capsule.col = targetCol;
    const blocks = this.capsule.getBlocks();
    this.capsule.col = originalCol;

    for (const b of blocks) {
      if (b.col < 0 || b.col >= GRID_COLS) return false;
      if (b.row < 0 || b.row >= GRID_ROWS) return false;
      if (this.grid[b.row][b.col] !== null) return false;
    }
    return true;
  }

  private tryRotate(): boolean {
    if (!this.capsule) return false;

    const originalRotation = this.capsule.rotation;
    const originalCol = this.capsule.col;
    const originalRow = this.capsule.row;

    // 1. カプセルを回転させ、グリッド内に押し戻す（Wall Kick適用）
    this.capsule.rotate(); // この中で rotation が進み、clampToGrid() が走る

    // 2. 衝突判定
    let canRotate = true;
    const blocks = this.capsule.getBlocks();
    for (const b of blocks) {
      if (b.col < 0 || b.col >= GRID_COLS || b.row < 0 || b.row >= GRID_ROWS) {
        canRotate = false;
        break;
      }
      if (this.grid[b.row][b.col] !== null) {
        canRotate = false;
        break;
      }
    }

    if (!canRotate) {
      // 衝突した場合は回転をキャンセルし、元の状態に完全復元する
      this.capsule.rotation = originalRotation;
      this.capsule.col = originalCol;
      this.capsule.row = originalRow;
      return false;
    }

    return true; // 回転成功！
  }

  private canMoveDown(): boolean {
    if (!this.capsule) return false;
    const blocks = this.capsule.getBlocks();
    for (const { col, row } of blocks) {
      if (row + 1 >= GRID_ROWS) return false;
      if (this.grid[row + 1][col] !== null) return false;
    }
    return true;
  }

  // ────────────────────────────────────
  //  カプセル生成
  // ────────────────────────────────────

  private spawnCapsule(): void {
    console.log('[DEBUG] spawnCapsule called');
    if (this.isGameOver || this.isGameClear) {
      console.log('[DEBUG] spawnCapsule aborted due to game over or clear');
      return;
    }

    // ゲームオーバー判定 (注ぎ口 col=2, 3 が埋まっているか)
    if (this.grid[0][2] !== null || this.grid[0][3] !== null) {
      console.log('[DEBUG] spawnCapsule failed: bottleneck filled');
      this.showGameOver();
      return;
    }

    const [c0, c1] = this.nextColors.shift()!;
    this.nextColors.push([
      COLORS[Math.floor(Math.random() * COLORS.length)],
      COLORS[Math.floor(Math.random() * COLORS.length)]
    ]);

    // col=2 にスポーンさせる (GRID_COLS=6 用に調整)
    this.capsule = new Capsule(
      this,
      this.gfx,
      GRID_OFFSET_X,
      GRID_OFFSET_Y,
      2, 0,
      c0, c1
    );

    // 通常の物理速度をセット
    this.capsule.fallSpeed = this.fallSpeedNormal;
    console.log('[DEBUG] Capsule spawned, triggering first redraw');
    this.redraw();
  }

  // ────────────────────────────────────
  //  着地・消去連鎖 (DSテンポ準拠)
  // ────────────────────────────────────

  private landCapsule(): void {
    if (!this.capsule) return;

    const blocks = this.capsule.getBlocks();
    
    // カプセルの回転状態に基づく各ブロックの元の位置タイプ (left, right, top, bottom) を取得
    let pos0: 'left' | 'right' | 'top' | 'bottom' = 'left';
    let pos1: 'left' | 'right' | 'top' | 'bottom' = 'right';
    if (this.capsule.rotation === 0) {
      pos0 = 'left'; pos1 = 'right';
    } else if (this.capsule.rotation === 1) {
      pos0 = 'top'; pos1 = 'bottom';
    } else if (this.capsule.rotation === 2) {
      pos0 = 'right'; pos1 = 'left';
    } else if (this.capsule.rotation === 3) {
      pos0 = 'bottom'; pos1 = 'top';
    }
    const poses = [pos0, pos1];

    blocks.forEach(({ col, row, color }, idx) => {
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        this.grid[row][col] = color;
        this.gridDirs[row][col] = poses[idx];
      }
    });

    this.capsule = null;
    this.isDragging = false;
    this.redraw();

    this.soundManager.playLand();

    // 0ms：消去対象の検出開始
    this.chainStepAsync();
  }

  private async chainStepAsync(): Promise<void> {
    const toDelete = this.checkAndClear();

    if (toDelete.size > 0) {
      this.chainCount++;

      // 点滅シーケンスの開始 (80msで点滅開始、220msで消去)
      this.clearingCells = toDelete;
      this.isBlinking = true;

      // 80msおきにトグルする点滅タイマー
      this.isBlinkingVisible = true;
      this.blinkTimerEvent = this.time.addEvent({
        delay: 80,
        callback: () => {
          this.isBlinkingVisible = !this.isBlinkingVisible;
          this.redraw();
        },
        loop: true
      });

      if (this.chainCount >= 2) {
        this.chainText.setText(`${this.chainCount} 連鎖!`);
        this.chainText.setVisible(true);
        this.soundManager.playChain(this.chainCount);
      } else {
        this.soundManager.playClear();
      }

      // 消滅ウエイト (着地後 220ms で消滅)
      await this.delay(220);

      // 点滅タイマー停止と消滅処理
      if (this.blinkTimerEvent) {
        this.blinkTimerEvent.remove();
        this.blinkTimerEvent = null;
      }
      this.isBlinking = false;

      // 実際のグリッドからブロック・細菌を削除（削除前に残像エフェクトを登録）
      toDelete.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        if (this.grid[r][c] !== null) {
          const isGerm = this.germCells.has(key);
          this.fadingEffects.push({
            row: r,
            col: c,
            color: this.grid[r][c]!,
            dir: this.gridDirs[r][c],
            type: isGerm ? 'germ' : 'capsule',
            alpha: 0.7 // 初期アルファ値（半透明）
          });
        }
        this.grid[r][c] = null;
        this.gridDirs[r][c] = null;
        this.germCells.delete(key);
      });
      this.redraw();

      // 細菌が全滅したか即座に判定（ちぎれブロックの落下やスコア演出を待たずに即クリア！）
      if (this.germCells.size === 0) {
        const addScore = (toDelete.size * 100) + (this.chainCount * 50);
        this.score += addScore;
        this.showScorePopup(toDelete, addScore);
        
        // 残像が綺麗に見えるように200msだけ待ってから即クリア！
        await this.delay(200);
        this.showClear();
        return;
      }

      // スコア計算・ポップアップ表示 (着地後 300ms)
      await this.delay(80); // (220ms + 80ms = 300ms)
      const addScore = (toDelete.size * 100) + (this.chainCount * 50);
      this.score += addScore;
      this.showScorePopup(toDelete, addScore);

      // 浮きブロック落下開始 (着地後 400ms)
      await this.delay(100); // (300ms + 100ms = 400ms)

      let moved = true;
      while (moved) {
        moved = this.applyGravity();
        if (moved) {
          this.redraw();
          await this.delay(600); // 浮きブロック落下テンポを80msから600msに減速してプレイヤーの操作猶予を確保！
        }
      }

      // 面クリア判定（連鎖の過程で全滅した際のためのセーフティ）
      if (this.germCells.size === 0) {
        this.showClear();
        return;
      }

      // 再び消去チェック（連鎖）
      this.chainStepAsync();

    } else {
      // 連鎖終了
      this.chainCount = 0;
      this.chainText.setVisible(false);
      
      // 300ms ウエイトのあと次カプセルスポーン
      await this.delay(300);
      this.spawnCapsule();
    }
  }

  private checkAndClear(): Set<string> {
    const toDelete = new Set<string>();

    // 横方向スキャン
    for (let row = 0; row < GRID_ROWS; row++) {
      let count = 1;
      for (let col = 1; col < GRID_COLS; col++) {
        const cur = this.grid[row][col];
        const prev = this.grid[row][col - 1];
        if (cur !== null && cur === prev) {
          count++;
        } else {
          if (count >= 4) {
            for (let k = col - count; k < col; k++) toDelete.add(`${row},${k}`);
          }
          count = 1;
        }
      }
      if (count >= 4) {
        for (let k = GRID_COLS - count; k < GRID_COLS; k++) toDelete.add(`${row},${k}`);
      }
    }

    // 縦方向スキャン
    for (let col = 0; col < GRID_COLS; col++) {
      let count = 1;
      for (let row = 1; row < GRID_ROWS; row++) {
        const cur = this.grid[row][col];
        const prev = this.grid[row - 1][col];
        if (cur !== null && cur === prev) {
          count++;
        } else {
          if (count >= 4) {
            for (let k = row - count; k < row; k++) toDelete.add(`${k},${col}`);
          }
          count = 1;
        }
      }
      if (count >= 4) {
        for (let k = GRID_ROWS - count; k < GRID_ROWS; k++) toDelete.add(`${k},${col}`);
      }
    }

    return toDelete;
  }

  private applyGravity(): boolean {
    let moved = false;
    for (let row = GRID_ROWS - 2; row >= 0; row--) {
      for (let col = 0; col < GRID_COLS; col++) {
        const key = `${row},${col}`;
        
        // 細菌（ウイルス）は固定オブジェクトであるため、絶対に落下移動処理をスキップする (ウイルス落下禁止徹底)
        if (this.germCells.has(key)) {
          continue;
        }

        // 下が空であり、かつ現在セルが空でなく、細菌でもない場合のみ落下移動
        if (
          this.grid[row][col] !== null &&
          this.grid[row + 1][col] === null
        ) {
          this.grid[row + 1][col] = this.grid[row][col];
          this.gridDirs[row + 1][col] = this.gridDirs[row][col];
          this.grid[row][col] = null;
          this.gridDirs[row][col] = null;

          // ドラッグ中の単体ブロックの座標を追従させる
          if (this.draggingBlock && this.draggingBlock.row === row && this.draggingBlock.col === col) {
            this.draggingBlock.row = row + 1;
          }

          moved = true;
        }
      }
    }
    return moved;
  }

  private showScorePopup(clearing: Set<string>, addScore: number): void {
    if (clearing.size === 0) return;
    let sumX = 0;
    let sumY = 0;
    clearing.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      sumX += GRID_OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2;
      sumY += GRID_OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;
    });
    const avgX = sumX / clearing.size;
    const avgY = sumY / clearing.size;

    const popup = this.add.text(avgX, avgY, `+${addScore}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: popup,
      y: avgY - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => popup.destroy()
    });
  }

  // ────────────────────────────────────
  //  UI 描画処理
  // ────────────────────────────────────

  private createHUD(): void {
    // 得点・面数・難易度表示用の左側HUD
    this.scoreLabelText = this.add.text(12, 20, '得点: 0点', { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });
    this.levelLabelText = this.add.text(12, 50, '面数: 1', { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });
    
    let diffName = 'ふつう';
    if (this.difficulty === 'easy') diffName = 'かんたん';
    if (this.difficulty === 'hard') diffName = 'むずかしい';
    this.add.text(12, 80, `難易度: ${diffName}`, { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });

    // NEXT表示ラベル (DS版準拠の黄色NEXT文字)
    this.add.text(132, 45, 'NEXT', { fontSize: '15px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);

    // 連鎖演出用テキスト
    this.chainText = this.add.text(180, GRID_OFFSET_Y + 180, '', {
      fontSize: '32px',
      color: '#e74c3c',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 4
    }).setOrigin(0.5).setVisible(false).setDepth(40);
  }

  private drawGrid(): void {
    const gfx = this.gfx;
    const x = GRID_OFFSET_X;
    const y = GRID_OFFSET_Y;
    const w = GRID_COLS * CELL_SIZE;
    const h = GRID_ROWS * CELL_SIZE;

    // 1. ボトル内部の黄色背景
    gfx.fillStyle(0xf5e642, 1);
    gfx.fillRoundedRect(x, y, w, h, 16);

    // 2. 内側のうっすらグリッド線
    gfx.lineStyle(1, 0xd4c311, 0.4);
    for (let col = 1; col < GRID_COLS; col++) {
      gfx.lineBetween(x + col * CELL_SIZE, y, x + col * CELL_SIZE, y + h);
    }
    for (let row = 1; row < GRID_ROWS; row++) {
      gfx.lineBetween(x, y + row * CELL_SIZE, x + w, y + row * CELL_SIZE);
    }

    // 3. ボトルの太い縁取り
    gfx.lineStyle(6, 0x5a5410, 1);
    gfx.strokeRoundedRect(x, y, w, h, 16);

    // 4. ボトルの「首」 (注ぎ口: 中央列 col 2, 3 の真上)
    const neckX = x + 2 * CELL_SIZE;
    const neckY = y - 20;
    const neckW = CELL_SIZE * 2;
    const neckH = 20;

    gfx.fillStyle(0xf5e642, 1);
    gfx.fillRect(neckX, neckY, neckW, neckH + 5);

    gfx.lineStyle(6, 0x5a5410, 1);
    gfx.beginPath();
    gfx.moveTo(neckX, y + 3);
    gfx.lineTo(neckX, neckY);
    gfx.lineTo(neckX + neckW, neckY);
    gfx.lineTo(neckX + neckW, y + 3);
    gfx.strokePath();
  }

  private drawLandedBlocks(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const color = this.grid[row][col];
        if (color === null) continue;

        // 点滅消去中セルで非表示ターンのときは描画スキップ
        if (this.isBlinking && this.clearingCells.has(`${row},${col}`) && !this.isBlinkingVisible) {
          continue;
        }

        const px = GRID_OFFSET_X + col * CELL_SIZE;
        const py = GRID_OFFSET_Y + row * CELL_SIZE;

        if (this.germCells.has(`${row},${col}`)) {
          Germ.drawGerm(this.gfx, px, py, color);
        } else {
          const originalDir = this.gridDirs[row][col];
          
          // 隣に相方が生存しているか（ちぎれていない連結カプセルか）チェック
          let isConnected = false;
          if (originalDir) {
            if (originalDir === 'left') {
              isConnected = (col + 1 < GRID_COLS && this.grid[row][col + 1] !== null && this.gridDirs[row][col + 1] === 'right');
            } else if (originalDir === 'right') {
              isConnected = (col - 1 >= 0 && this.grid[row][col - 1] !== null && this.gridDirs[row][col - 1] === 'left');
            } else if (originalDir === 'top') {
              isConnected = (row + 1 < GRID_ROWS && this.grid[row + 1][col] !== null && this.gridDirs[row + 1][col] === 'bottom');
            } else if (originalDir === 'bottom') {
              isConnected = (row - 1 >= 0 && this.grid[row - 1][col] !== null && this.gridDirs[row - 1][col] === 'top');
            }
          }

          if (isConnected && originalDir) {
            // まだ連結している：ハーフカプセルとして描画
            Capsule.drawHalfCapsule(this.gfx, px, py, color, originalDir);
          } else {
            // ちぎれた：元の向きを考慮したドーム型（卵型）ブロックとして描画！
            Capsule.drawBlock(this.gfx, px, py, color, originalDir);
          }
        }
      }
    }

    // 消去残像エフェクトの描画 (カラーブレンドによる安全な半透明表現。setAlphaバグの完全解消)
    this.fadingEffects.forEach(eff => {
      const px = GRID_OFFSET_X + eff.col * CELL_SIZE;
      const py = GRID_OFFSET_Y + eff.row * CELL_SIZE;
      
      // ボトル背景の黄色 (0xf5e642) と残像カラーをブレンド
      const ratio = Math.min(Math.max(eff.alpha * 0.8, 0), 1);
      const blendedColor = this.blendColors(eff.color, 0xf5e642, ratio);

      if (eff.type === 'germ') {
        Germ.drawGerm(this.gfx, px, py, blendedColor);
      } else {
        Capsule.drawBlock(this.gfx, px, py, blendedColor, eff.dir);
      }
    });
  }

  private drawNext(): void {
    // HUDの右側に2つのカプセルを描画する
    // 次カプセル (中央 col=2 の真上: 36 + 2*48 = 132px)
    const nx1 = 132;
    const ny1 = 70;
    Capsule.drawHalfCapsule(this.gfx, nx1, ny1, this.nextColors[0][0], 'left');
    Capsule.drawHalfCapsule(this.gfx, nx1 + CELL_SIZE, ny1, this.nextColors[0][1], 'right');

    // 次々カプセル (右隣にバランスよく配置)
    const nx2 = 210;
    const ny2 = 70;
    Capsule.drawHalfCapsule(this.gfx, nx2, ny2, this.nextColors[1][0], 'left');
    Capsule.drawHalfCapsule(this.gfx, nx2 + CELL_SIZE, ny2, this.nextColors[1][1], 'right');
  }

  private drawHUD(): void {
    this.scoreLabelText.setText(`得点: ${this.score}点`);
    this.levelLabelText.setText(`面数: ${this.level}`);
  }

  private redraw(): void {
    console.log('[DEBUG] redraw called');
    this.gfx.clear();
    
    // 背景のクリア
    this.gfx.fillStyle(0x1a1a2e, 1);
    this.gfx.fillRect(0, 0, this.scale.width, this.scale.height);

    console.log('[DEBUG] redraw - calling drawGrid');
    this.drawGrid();
    
    console.log('[DEBUG] redraw - calling drawLandedBlocks');
    this.drawLandedBlocks();
    
    console.log('[DEBUG] redraw - calling drawNext');
    this.drawNext();
    
    if (this.capsule) {
      console.log('[DEBUG] redraw - calling capsule.draw');
      this.capsule.draw();
    }

    console.log('[DEBUG] redraw - calling drawHUD');
    this.drawHUD();
    console.log('[DEBUG] redraw finished');
  }

  // ────────────────────────────────────
  //  タッチ・ドラッグ・タップイベント
  // ────────────────────────────────────

  private setupPointerEvents(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isCountingDown || this.isGameOver || this.isGameClear) return;

      // 1. 通常のカプセル（連結カプセル）が操作可能な場合
      if (this.capsule) {
        // 画面上部（HUD領域）以外の場所をタップした場合は、すべてカプセルのドラッグ開始とみなす（操作性の劇的向上）
        if (pointer.y > 60) {
          this.isDragging = true;
          this.pointerDownX = pointer.x;
          this.pointerDownY = pointer.y;

          // 指の下にある列と現在のカプセル列の差分（ドラッグ用オフセット）を計算
          const gridX = pointer.x - GRID_OFFSET_X;
          const colUnderPointer = Math.floor(gridX / CELL_SIZE);
          this.touchColOffset = this.capsule.col - colUnderPointer;
          
          // タッチ中の落下減速
          this.capsule.fallSpeed = FALL_SPEED_SLOW;
          return; // 連結カプセルのドラッグが開始されたので終了
        }
      }

      // 2. 連結カプセルが操作されていない、または存在しない場合：
      // 分離して落下中（または浮いている）カプセルブロックをタッチしたか判定
      const gridX = pointer.x - GRID_OFFSET_X;
      const gridY = pointer.y - GRID_OFFSET_Y;
      const clickCol = Math.floor(gridX / CELL_SIZE);
      const clickRow = Math.floor(gridY / CELL_SIZE);

      // タッチした座標の周囲1マス（自分自身を含む最大9マス）を走査して、最も近い「落下可能なブロック」を探す（操作性を高めるための余裕を持たせる）
      let bestBlock: { row: number; col: number; dist: number } | null = null;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = clickRow + dr;
          const c = clickCol + dc;
          if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            const color = this.grid[r][c];
            // カプセル由来のブロック（細菌以外）であること
            if (color !== null && !this.germCells.has(`${r},${c}`)) {
              // 下が空（＝落下可能なブロック）
              const isFloating = (r + 1 < GRID_ROWS && this.grid[r + 1][c] === null);
              if (isFloating) {
                // タッチされたグリッド中心からの距離を計算
                const dx = (clickCol + 0.5) - (c + 0.5);
                const dy = (clickRow + 0.5) - (r + 0.5);
                const dist = dx * dx + dy * dy;

                if (!bestBlock || dist < bestBlock.dist) {
                  bestBlock = { row: r, col: c, dist: dist };
                }
              }
            }
          }
        }
      }

      if (bestBlock) {
        const { row, col } = bestBlock;
        this.draggingBlock = {
          row: row,
          col: col,
          color: this.grid[row][col]!,
          dir: this.gridDirs[row][col]
        };
        this.pointerDownX = pointer.x;
        this.pointerDownY = pointer.y;

        // 指の下にある列と現在の単体ブロックの列の差分を計算
        const colUnderPointer = Math.floor(gridX / CELL_SIZE);
        this.touchColOffset = col - colUnderPointer;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // A. 通常のカプセルをドラッグしている場合
      if (this.isDragging && this.capsule) {
        // 下フリック（高速落下）の検知：縦ドラッグが下方向に30px以上なら高速落下
        const dy = pointer.y - this.pointerDownY;
        if (dy > 30) {
          this.capsule.fallSpeed = 1 / 150; // サッと高速落下（150ms/行）
        } else {
          this.capsule.fallSpeed = FALL_SPEED_SLOW; // 通常タッチ減速
        }

        // 指の現在X座標に基づく直接ドラッグ移動（吸い付くドラッグ）
        const gridX = pointer.x - GRID_OFFSET_X;
        const colUnderPointer = Math.floor(gridX / CELL_SIZE);
        let targetCol = colUnderPointer + this.touchColOffset;

        // 回転状態に応じた最大・最小オフセットから、アンカーcolの可動域を正確にクランプ！ (180度回転最右列バグ完全解消)
        const [off0, off1] = ROTATION_OFFSETS[this.capsule.rotation];
        const minOffsetCol = Math.min(off0.col, off1.col);
        const maxOffsetCol = Math.max(off0.col, off1.col);

        if (targetCol + minOffsetCol < 0) {
          targetCol = -minOffsetCol;
        }
        if (targetCol + maxOffsetCol >= GRID_COLS) {
          targetCol = GRID_COLS - 1 - maxOffsetCol;
        }

        // 現在列からtargetColまで1列ずつ障害物をチェックしながら吸い付く
        let dir = Math.sign(targetCol - this.capsule.col);
        let steps = Math.abs(targetCol - this.capsule.col);
        let currentCol = this.capsule.col;

        for (let i = 0; i < steps; i++) {
          let nextCol = currentCol + dir;
          if (this.canMoveTo(nextCol)) {
            currentCol = nextCol;
          } else {
            break;
          }
        }

        this.capsule.col = currentCol;
        return;
      }

      // B. 単体ブロックをドラッグしている場合
      if (this.draggingBlock) {
        const gridX = pointer.x - GRID_OFFSET_X;
        const colUnderPointer = Math.floor(gridX / CELL_SIZE);
        let targetCol = colUnderPointer + this.touchColOffset;
        targetCol = Math.min(Math.max(targetCol, 0), GRID_COLS - 1);

        const { row, col, color, dir } = this.draggingBlock;

        if (targetCol !== col) {
          // カプセル同様、1マスずつ障害物をチェックしながら吸い付くように移動させる（堅牢なコリジョン）
          let stepDir = Math.sign(targetCol - col);
          let steps = Math.abs(targetCol - col);
          let currentCol = col;

          for (let i = 0; i < steps; i++) {
            let nextCol = currentCol + stepDir;
            // 移動先が空であり、細菌でないこと
            if (this.grid[row][nextCol] === null) {
              currentCol = nextCol;
            } else {
              break;
            }
          }

          if (currentCol !== col) {
            // 元の位置をクリア
            this.grid[row][col] = null;
            this.gridDirs[row][col] = null;

            // 新しい位置へ移動
            this.grid[row][currentCol] = color;
            this.gridDirs[row][currentCol] = dir;

            // ドラッグ対象座標を更新
            this.draggingBlock.col = currentCol;
            
            // 再描画
            this.redraw();
          }
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // 単体ブロックのドラッグ終了
      if (this.draggingBlock) {
        this.draggingBlock = null;
        return;
      }

      if (!this.isDragging || !this.capsule) return;

      this.isDragging = false;
      this.capsule.fallSpeed = this.fallSpeedNormal; // 通常速度に復帰

      // 移動距離からタップ判定（10px以内）
      const dx = pointer.x - this.pointerDownX;
      const dy = pointer.y - this.pointerDownY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 10) {
        if (this.tryRotate()) {
          this.soundManager.playTone(330, 'sine', 0.05, 0.08); // キュッという高音
        }
      }
    });

    this.input.on('pointerout', () => {
      if (this.draggingBlock) {
        this.draggingBlock = null;
      }
      if (this.isDragging && this.capsule) {
        this.isDragging = false;
        this.capsule.fallSpeed = this.fallSpeedNormal;
      }
    });
  }

  // ────────────────────────────────────
  //  クリア・ゲームオーバー画面
  // ────────────────────────────────────

  private showClear(): void {
    this.isGameClear = true;
    this.soundManager.stopBGM();
    this.soundManager.playGameClear();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7).setDepth(200);
    overlay.setInteractive();

    const text1 = this.add.text(cx, cy - 30, '撲滅完了', {
      fontSize: '48px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(201);

    const text2 = this.add.text(cx, cy + 30, 'タッチして次のレベルへ', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(201);

    this.overlayObjects.push(overlay, text1, text2);

    overlay.once('pointerdown', () => {
      this.level += 1;
      this.restartGame();
    });
  }

  private showGameOver(): void {
    this.isGameOver = true;
    this.soundManager.stopBGM();
    this.soundManager.playGameOver();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7).setDepth(200);
    overlay.setInteractive();

    const text1 = this.add.text(cx, cy - 30, '撲滅失敗', {
      fontSize: '48px',
      color: '#e74c3c',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(201);

    const text2 = this.add.text(cx, cy + 30, 'タッチしてもう一度', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(201);

    this.overlayObjects.push(overlay, text1, text2);

    overlay.once('pointerdown', () => {
      this.score = 0;
      this.level = 1;
      this.restartGame();
    });
  }

  private restartGame(): void {
    this.overlayObjects.forEach(obj => obj.destroy());
    this.overlayObjects = [];

    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.gridDirs = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.germCells.clear();
    this.capsule = null;
    this.isDragging = false;
    this.isBlinking = false;
    this.isGameOver = false;
    this.isGameClear = false;

    this.nextColors = [
      [COLORS[Math.floor(Math.random() * COLORS.length)], COLORS[Math.floor(Math.random() * COLORS.length)]],
      [COLORS[Math.floor(Math.random() * COLORS.length)], COLORS[Math.floor(Math.random() * COLORS.length)]]
    ];

    // 再度難易度による速度設定
    if (this.difficulty === 'easy') {
      this.fallSpeedNormal = 1 / 1200;
    } else if (this.difficulty === 'hard') {
      this.fallSpeedNormal = 1 / 400;
    } else {
      this.fallSpeedNormal = 1 / 800;
    }

    this.initGerms();
    this.runCountdown();
  }

  // ────────────────────────────────────
  //  共通ユーティリティ
  // ────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, () => resolve()));
  }

  /**
   * 2つのカラーコードを比率に基づいてブレンドするヘルパー関数（不透明度1.0のまま半透明を表現）
   */
  private blendColors(c1: number, c2: number, ratio: number): number {
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    
    const r = Math.min(Math.max(Math.round(r1 * ratio + r2 * (1 - ratio)), 0), 255);
    const g = Math.min(Math.max(Math.round(g1 * ratio + g2 * (1 - ratio)), 0), 255);
    const b = Math.min(Math.max(Math.round(b1 * ratio + b2 * (1 - ratio)), 0), 255);
    
    return (r << 16) | (g << 8) | b;
  }
}
