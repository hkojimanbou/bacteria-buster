import Phaser from 'phaser';
import { Capsule, CELL_SIZE, GRID_COLS, GRID_ROWS, ROTATION_OFFSETS } from '../objects/Capsule';
import { Germ } from '../objects/Germ';
import { SoundManager } from '../audio/SoundManager';

// ────────────────────────────────────
//  レイアウト定数
// ────────────────────────────────────

const GRID_OFFSET_X = (360 - GRID_COLS * CELL_SIZE) / 2; // 52px
const GRID_OFFSET_Y = 110; // 上部に 110px の情報スペースを確保 (110 + 512 = 622px, 下部余白 18px)

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
  private touchStartCol: number = 0;
  private capsuleHitArea!: Phaser.Geom.Rectangle;

  // ── 消去テンポ制御用 ─────────────────
  private clearingCells: Set<string> = new Set();
  private isBlinking: boolean = false;
  private isBlinkingVisible: boolean = true;
  private blinkTimerEvent: Phaser.Time.TimerEvent | null = null;

  // ── カウントダウン演出 ─────────────────
  private isCountingDown: boolean = false;
  private countdownText!: Phaser.GameObjects.Text;
  private countdownBg!: Phaser.GameObjects.Rectangle;
  private countdownCircle!: Phaser.GameObjects.Arc;

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
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.soundManager = new SoundManager();

    // カプセル衝突判定用ヒットエリアの初期化
    this.capsuleHitArea = new Phaser.Geom.Rectangle(0, 0, 0, 0);

    // グリッドデータの初期設定 (空盤面)
    this.grid = Array.from({ length: GRID_ROWS }, () =>
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
    if (this.isCountingDown || this.isGameOver || this.isGameClear) return;
    if (!this.capsule) return;

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
    this.isCountingDown = true;
    this.soundManager.stopBGM();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // 白背景フルスクリーン
    this.countdownBg = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0xffffff).setDepth(99);
    // 黒の丸囲み
    this.countdownCircle = this.add.arc(cx, cy, 60, 0, 360, false, 0x000000, 1).setDepth(99);

    this.countdownText = this.add.text(cx, cy, '', {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    const nums = ['③', '②', '①'];
    for (const num of nums) {
      this.countdownText.setText(num);
      this.soundManager.playTone(440, 'sine', 0.04, 0.08); // ピッ
      await this.delay(800);
    }

    // クリーンアップ
    this.countdownText.destroy();
    this.countdownBg.destroy();
    this.countdownCircle.destroy();

    this.isCountingDown = false;

    // BGMの開始
    this.soundManager.startBGM();

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
      const row = Phaser.Math.Between(8, GRID_ROWS - 1);
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

  private canRotate(): boolean {
    if (!this.capsule) return false;

    const nextRotation = (this.capsule.rotation + 1) % 4;
    const offsets = ROTATION_OFFSETS[nextRotation];

    const anchorCol = this.capsule.col;
    const anchorRow = this.capsule.row;

    for (const off of offsets) {
      const c = anchorCol + off.col;
      const r = anchorRow + off.row;
      if (c < 0 || c >= GRID_COLS) return false;
      if (r < 0 || r >= GRID_ROWS) return false;
      if (this.grid[r][c] !== null) return false;
    }
    return true;
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
    if (this.isGameOver || this.isGameClear) return;

    // ゲームオーバー判定 (注ぎ口が埋まっているか)
    if (this.grid[0][3] !== null || this.grid[0][4] !== null) {
      this.showGameOver();
      return;
    }

    const [c0, c1] = this.nextColors.shift()!;
    this.nextColors.push([
      COLORS[Math.floor(Math.random() * COLORS.length)],
      COLORS[Math.floor(Math.random() * COLORS.length)]
    ]);

    this.capsule = new Capsule(
      this,
      this.gfx,
      GRID_OFFSET_X,
      GRID_OFFSET_Y,
      3, 0,
      c0, c1
    );

    // 通常の物理速度をセット
    this.capsule.fallSpeed = this.fallSpeedNormal;
    this.redraw();
  }

  // ────────────────────────────────────
  //  着地・消去連鎖 (DSテンポ準拠)
  // ────────────────────────────────────

  private landCapsule(): void {
    if (!this.capsule) return;

    const blocks = this.capsule.getBlocks();
    blocks.forEach(({ col, row, color }) => {
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        this.grid[row][col] = color;
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

      // 実際のグリッドからブロック・細菌を削除
      toDelete.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        this.grid[r][c] = null;
        this.germCells.delete(key);
      });
      this.redraw();

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
          await this.delay(80); // 浮きブロック落下テンポ
        }
      }

      // 面クリア判定
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
        if (this.grid[row][col] !== null && this.grid[row + 1][col] === null) {
          this.grid[row + 1][col] = this.grid[row][col];
          this.grid[row][col] = null;

          const key = `${row},${col}`;
          if (this.germCells.has(key)) {
            this.germCells.delete(key);
            this.germCells.add(`${row + 1},${col}`);
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

    // NEXT表示ラベル
    this.add.text(220, 10, '次', { fontSize: '12px', color: '#aaaaaa' });
    this.add.text(290, 10, '次々', { fontSize: '12px', color: '#aaaaaa' });

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

    // 4. ボトルの「首」 (注ぎ口: 中央列 col 3, 4 の真上)
    const neckX = x + 3 * CELL_SIZE;
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
          Capsule.drawBlock(this.gfx, px, py, color);
        }
      }
    }
  }

  private drawNext(): void {
    // HUDの右側に2つのカプセルを描画する
    // 次カプセル
    const nx1 = 200;
    const ny1 = 30;
    Capsule.drawHalfCapsule(this.gfx, nx1, ny1, this.nextColors[0][0], 'left');
    Capsule.drawHalfCapsule(this.gfx, nx1 + CELL_SIZE, ny1, this.nextColors[0][1], 'right');

    // 次々カプセル
    const nx2 = 270;
    const ny2 = 30;
    Capsule.drawHalfCapsule(this.gfx, nx2, ny2, this.nextColors[1][0], 'left');
    Capsule.drawHalfCapsule(this.gfx, nx2 + CELL_SIZE, ny2, this.nextColors[1][1], 'right');
  }

  private drawHUD(): void {
    this.scoreLabelText.setText(`得点: ${this.score}点`);
    this.levelLabelText.setText(`面数: ${this.level}`);
  }

  private redraw(): void {
    this.gfx.clear();
    
    // 背景のクリア
    this.gfx.fillStyle(0x1a1a2e, 1);
    this.gfx.fillRect(0, 0, this.scale.width, this.scale.height);

    // 各セクションの描画
    this.drawGrid();
    this.drawLandedBlocks();
    this.drawNext();
    
    if (this.capsule) {
      this.capsule.draw();
    }

    this.drawHUD();
  }

  // ────────────────────────────────────
  //  タッチ・ドラッグ・タップイベント
  // ────────────────────────────────────

  private setupPointerEvents(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isCountingDown || this.isGameOver || this.isGameClear || !this.capsule) return;

      // カプセル本体外のタッチは一切無視する
      if (!this.capsuleHitArea.contains(pointer.x, pointer.y)) {
        return;
      }

      this.isDragging = true;
      this.pointerDownX = pointer.x;
      this.pointerDownY = pointer.y;
      this.touchStartCol = this.capsule.col;
      
      // タッチ中の落下減速
      this.capsule.fallSpeed = FALL_SPEED_SLOW;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.capsule) return;

      const dx = pointer.x - this.pointerDownX;
      // グリッドスナップ単位の移動計算
      const colOffset = Math.round(dx / CELL_SIZE);

      // 1列ずつ衝突判定を行い、障害物でピタッと止まるようにスライド
      let steps = Math.abs(colOffset);
      let dir = Math.sign(colOffset);
      let currentCol = this.touchStartCol;
      
      for (let i = 0; i < steps; i++) {
        let nextCol = currentCol + dir;
        if (this.canMoveTo(nextCol)) {
          currentCol = nextCol;
        } else {
          break;
        }
      }

      this.capsule.col = currentCol;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.capsule) return;

      this.isDragging = false;
      this.capsule.fallSpeed = this.fallSpeedNormal; // 通常速度に復帰

      // 移動距離からタップ判定（10px以内）
      const dx = pointer.x - this.pointerDownX;
      const dy = pointer.y - this.pointerDownY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 10) {
        if (this.canRotate()) {
          this.capsule.rotate();
          this.soundManager.playTone(330, 'sine', 0.05, 0.08); // キュッという高音
        }
      }
    });

    this.input.on('pointerout', () => {
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
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}
