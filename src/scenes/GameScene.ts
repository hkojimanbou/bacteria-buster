import Phaser from 'phaser';
import { Capsule, CELL_SIZE, GRID_COLS, GRID_ROWS, ROTATION_OFFSETS } from '../objects/Capsule';
import { Germ } from '../objects/Germ';
import { SoundManager } from '../audio/SoundManager';

// ────────────────────────────────────
//  定数（Step 1〜2 から変更禁止）
// ────────────────────────────────────

const GRID_OFFSET_X = (360 - GRID_COLS * CELL_SIZE) / 2; // 52px
const GRID_OFFSET_Y = (640 - GRID_ROWS * CELL_SIZE) / 2; // 64px
const TAP_THRESHOLD = 10;
const DRAG_OFFSET_Y = 60;

/** カラーパレット（赤・黄・青） */
const COLORS = [0xe74c3c, 0xf1c40f, 0x3498db];

// ────────────────────────────────────
//  Step 6: レベルテーブル
// ────────────────────────────────────

const LEVEL_TABLE: { germCount: number; fallDelay: number }[] = [
  { germCount: 4,  fallDelay: 800 },  // Level 1
  { germCount: 6,  fallDelay: 700 },  // Level 2
  { germCount: 8,  fallDelay: 600 },  // Level 3
  { germCount: 10, fallDelay: 500 },  // Level 4
  { germCount: 12, fallDelay: 400 },  // Level 5
  { germCount: 12, fallDelay: 300 },  // Level 6以上
];

function getLevelConfig(level: number) {
  const idx = Math.min(level - 1, LEVEL_TABLE.length - 1);
  return LEVEL_TABLE[idx];
}

// ────────────────────────────────────
//  GameScene
// ────────────────────────────────────

export class GameScene extends Phaser.Scene {
  private capsule: Capsule | null = null;
  private gfx!: Phaser.GameObjects.Graphics;

  // ── Step 2 プロパティ ─────────────────

  /** 着地済みブロックの色データ。grid[row][col] = 0xRRGGBB or null */
  private grid: (number | null)[][] = [];

  /** 自動落下タイマー */
  private fallTimer!: Phaser.Time.TimerEvent;

  /** ドラッグ中の最新ポインターY座標（redraw用） */
  private lastPointerY: number = 0;

  // ── Step 3 プロパティ ─────────────────

  /**
   * 細菌セルの座標セット。キー形式："row,col"
   * drawLandedBlocks() で Germ.drawGerm() を使うかどうかの判定に使う。
   */
  private germCells: Set<string> = new Set();

  // ── Step 5 プロパティ ─────────────────

  private nextColors: [number, number] = [0xe74c3c, 0xf1c40f];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  // ── Step 6 プロパティ ─────────────────

  private level: number = 1;
  private score: number = 0;
  private chainCount: number = 0;
  private soundManager!: SoundManager;
  private levelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private chainText!: Phaser.GameObjects.Text;

  // ── Step 1 引き継ぎプロパティ ──────────

  private isDragging: boolean = false;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private totalMoveDist: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  // ────────────────────────────────────
  //  Phaser ライフサイクル
  // ────────────────────────────────────

  create(): void {
    this.gfx = this.add.graphics();

    // グリッドデータ初期化（全 null）
    this.grid = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill(null)
    );

    // Step 5: NEXT用の色を初期化
    this.nextColors = [
      COLORS[Math.floor(Math.random() * COLORS.length)],
      COLORS[Math.floor(Math.random() * COLORS.length)]
    ];

    // Step 6: HUDとサウンド初期化
    this.soundManager = new SoundManager();
    this.levelText  = this.add.text(8, GRID_OFFSET_Y, 'LV.1', { fontSize: '14px', color: '#ffffff' });
    this.add.text(8, GRID_OFFSET_Y + 30, 'SCORE', { fontSize: '11px', color: '#aaaaaa' });
    this.scoreText  = this.add.text(8, GRID_OFFSET_Y + 44, '0', { fontSize: '16px', color: '#f1c40f' });
    this.chainText  = this.add.text(180, 320, '', { fontSize: '32px', color: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);

    // NEXTの固定テキストを一度だけ追加
    const nx = GRID_OFFSET_X + GRID_COLS * CELL_SIZE + 12;
    const ny = GRID_OFFSET_Y;
    this.add.text(nx, ny, 'NEXT', { fontSize: '16px', color: '#ffffff' });

    // Step 3: 細菌を初期配置（grid 初期化後・spawnCapsule 前）
    this.initGerms();

    this.drawGrid();
    this.setupPointerEvents();
    this.spawnCapsule();
  }

  // ────────────────────────────────────
  //  Step 3: 細菌初期配置
  // ────────────────────────────────────

  /**
   * グリッド下半分（row 8〜15）にランダムで GERM_COUNT 個の細菌を配置する。
   * grid[][] に色を書き込み、germCells にキーを追加する。
   */
  private initGerms(): void {
    let placed = 0;
    const { germCount } = getLevelConfig(this.level);

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
  //  Step 3: 衝突判定
  // ────────────────────────────────────

  /**
   * カプセルが targetCol に移動できるか判定する。
   * 壁・着地済みブロック・細菌すべてを対象とする。
   * @param targetCol アンカーブロック（block0）の移動先グリッド列
   */
  private canMoveTo(targetCol: number): boolean {
    if (!this.capsule) return false;

    // 一時的に col を変えてブロック位置を計算（state を汚さない）
    const originalCol = this.capsule.col;
    this.capsule.col = targetCol;
    const blocks = this.capsule.getBlocks();
    this.capsule.col = originalCol;

    for (const b of blocks) {
      if (b.col < 0 || b.col >= GRID_COLS) return false;  // 壁
      if (b.row < 0 || b.row >= GRID_ROWS) return false;  // 上下境界
      if (this.grid[b.row][b.col] !== null) return false; // ブロック or 細菌
    }
    return true;
  }

  // ────────────────────────────────────
  //  Step 4: 回転時の衝突判定
  // ────────────────────────────────────

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

  // ────────────────────────────────────
  //  カプセル生成
  // ────────────────────────────────────

  private spawnCapsule(): void {
    // Step 5: ゲームオーバー判定
    if (this.grid[0][3] !== null || this.grid[0][4] !== null) {
      this.showGameOver();
      return;
    }

    const c0 = this.nextColors[0];
    const c1 = this.nextColors[1];

    this.nextColors = [
      COLORS[Math.floor(Math.random() * COLORS.length)],
      COLORS[Math.floor(Math.random() * COLORS.length)]
    ];

    this.capsule = new Capsule(
      this,
      this.gfx,
      GRID_OFFSET_X,
      GRID_OFFSET_Y,
      3, 0,
      c0, c1
    );

    const { fallDelay } = getLevelConfig(this.level);
    this.fallTimer = this.time.addEvent({
      delay: fallDelay,
      callback: this.stepDown,
      callbackScope: this,
      loop: true,
    });

    this.redraw();
  }

  // ────────────────────────────────────
  //  自動落下
  // ────────────────────────────────────

  private stepDown(): void {
    if (this.isDragging) return;
    if (!this.capsule) return;

    if (this.canMoveDown()) {
      this.capsule.row += 1;
      this.redraw();
    } else {
      this.landCapsule();
    }
  }

  /**
   * カプセルがあと1行落下できるか判定する。
   * 細菌も grid[][] に入っているので自動的に衝突対象になる。
   */
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
  //  着地処理
  // ────────────────────────────────────

  private landCapsule(): void {
    if (!this.capsule) return;

    this.fallTimer.remove();

    // 2ブロックを独立して grid に書き込む（ちぎれ挙動の実体）
    const blocks = this.capsule.getBlocks();
    blocks.forEach(({ col, row, color }) => {
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        this.grid[row][col] = color;
      }
    });

    this.capsule = null;
    this.redraw();

    this.soundManager.playLand();
    this.chainStep();
  }

  // ────────────────────────────────────
  //  Step 4: 消去と連鎖
  // ────────────────────────────────────

  private chainStep(): void {
    const cleared = this.checkAndClear();

    if (cleared > 0) {
      this.chainCount++;
      const addScore = (cleared * 100) + (this.chainCount * 50);
      this.score += addScore;

      if (this.chainCount >= 2) {
        this.chainText.setText(`${this.chainCount} CHAIN!`);
        this.chainText.setVisible(true);
        this.soundManager.playChain(this.chainCount);
      } else {
        this.soundManager.playClear();
      }

      this.redraw();
      this.time.delayedCall(200, () => {
        const applyGravityAll = () => {
          const moved = this.applyGravity();
          this.redraw();
          if (moved) {
            this.time.delayedCall(80, applyGravityAll, [], this);
          } else {
            // Step 5: クリア判定
            if (this.germCells.size === 0) {
              this.showClear();
              return;
            }
            this.time.delayedCall(200, this.chainStep, [], this);
          }
        };
        applyGravityAll();
      }, [], this);
    } else {
      this.chainCount = 0;
      this.chainText.setVisible(false);
      this.time.delayedCall(300, this.spawnCapsule, [], this);
    }
  }

  private checkAndClear(): number {
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

    if (toDelete.size === 0) return 0;

    toDelete.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      this.grid[r][c] = null;
      this.germCells.delete(key);
    });

    return toDelete.size;
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

  // ────────────────────────────────────
  //  描画
  // ────────────────────────────────────

  private drawGrid(): void {
    const gfx = this.gfx;
    const x = GRID_OFFSET_X;
    const y = GRID_OFFSET_Y;
    const w = GRID_COLS * CELL_SIZE;
    const h = GRID_ROWS * CELL_SIZE;

    gfx.fillStyle(0x0d1b3e, 1);
    gfx.fillRect(x, y, w, h);

    gfx.lineStyle(0.5, 0x8899aa, 0.3);
    for (let col = 0; col <= GRID_COLS; col++) {
      gfx.lineBetween(x + col * CELL_SIZE, y, x + col * CELL_SIZE, y + h);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      gfx.lineBetween(x, y + row * CELL_SIZE, x + w, y + row * CELL_SIZE);
    }

    gfx.lineStyle(2, 0x4a90d9, 0.8);
    gfx.strokeRect(x, y, w, h);
  }

  /**
   * 着地済みブロックと細菌を全て描画する。
   * germCells に含まれるセルは Germ.drawGerm()、それ以外は Capsule.drawBlock() を使う。
   */
  private drawLandedBlocks(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const color = this.grid[row][col];
        if (color === null) continue;

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

  /**
   * NEXT表示を描画する。
   */
  private drawNext(): void {
    const gfx = this.gfx;
    const nx = GRID_OFFSET_X + GRID_COLS * CELL_SIZE + 12;
    const ny = GRID_OFFSET_Y + 24; // NEXTテキストの下
    const size = 20;

    gfx.fillStyle(0x000000, 0.5);
    gfx.fillRect(nx - 4, ny - 4, size * 2 + 8, size + 8);
    gfx.lineStyle(1, 0xffffff, 0.8);
    gfx.strokeRect(nx - 4, ny - 4, size * 2 + 8, size + 8);

    gfx.fillStyle(this.nextColors[0], 1);
    gfx.fillRect(nx, ny, size, size);
    gfx.strokeRect(nx, ny, size, size);

    gfx.fillStyle(this.nextColors[1], 1);
    gfx.fillRect(nx + size, ny, size, size);
    gfx.strokeRect(nx + size, ny, size, size);
  }

  private drawHUD(): void {
    this.levelText.setText(`LV.${this.level}`);
    this.scoreText.setText(`${this.score}`);
  }

  /**
   * 全体再描画。
   * ドラッグ中は GameScene が管理する col を使い drawAtY() で描画する。
   */
  private redraw(): void {
    this.gfx.clear();
    this.drawGrid();
    this.drawLandedBlocks();
    this.drawNext();

    if (this.capsule) {
      if (this.isDragging) {
        // GameScene が col を管理済み。ピクセルY だけを渡して描画。
        const pixelY = this.lastPointerY - DRAG_OFFSET_Y;
        this.capsule.drawAtY(pixelY);
      } else {
        this.capsule.draw();
      }
    }

    this.drawHUD();
  }

  // ────────────────────────────────────
  //  入力イベント
  // ────────────────────────────────────

  private setupPointerEvents(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.pointerDownX = pointer.x;
      this.pointerDownY = pointer.y;
      this.totalMoveDist = 0;
      this.lastPointerY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.capsule) return;

      this.lastPointerY = pointer.y;

      const dx = pointer.x - this.pointerDownX;
      const dy = pointer.y - this.pointerDownY;
      this.totalMoveDist = Math.sqrt(dx * dx + dy * dy);

      // Step 3: ポインターX から希望列を計算し、衝突判定後に適用
      const desiredCol = this.capsule.calcAnchorColFromPointerX(pointer.x);
      if (this.canMoveTo(desiredCol)) {
        this.capsule.col = desiredCol;
      }

      this.redraw();
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;

      if (this.totalMoveDist <= TAP_THRESHOLD) {
        if (this.canRotate()) {
          this.capsule?.rotate();
        }
      }

      // 指を離した位置のグリッド行に capsule.row を同期する
      if (this.capsule) {
        const displayY = pointer.y - DRAG_OFFSET_Y;
        const relativeY = displayY - GRID_OFFSET_Y;
        const snappedRow = Math.floor(relativeY / CELL_SIZE);
        this.capsule.row = Phaser.Math.Clamp(snappedRow, 0, GRID_ROWS - 1);
        this.capsule.clampToGrid();
      }

      this.isDragging = false;
      this.redraw();
    });

    this.input.on('pointerout', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.redraw();
      }
    });
  }

  // ────────────────────────────────────
  //  Step 5: クリア・ゲームオーバー・リトライ
  // ────────────────────────────────────

  private showClear(): void {
    if (this.fallTimer) this.fallTimer.remove();

    this.level += 1;
    this.soundManager.playGameClear();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
    overlay.setInteractive();
    
    const text1 = this.add.text(cx, cy - 20, 'CLEAR!', { fontSize: '48px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    const text2 = this.add.text(cx, cy + 30, 'タップしてもう一度', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    this.overlayObjects.push(overlay, text1, text2);

    overlay.once('pointerdown', () => this.restartGame());
  }

  private showGameOver(): void {
    if (this.fallTimer) this.fallTimer.remove();

    this.soundManager.playGameOver();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
    overlay.setInteractive();

    const text1 = this.add.text(cx, cy - 20, 'GAME OVER', { fontSize: '48px', color: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5);
    const text2 = this.add.text(cx, cy + 30, 'タップしてもう一度', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    this.overlayObjects.push(overlay, text1, text2);

    overlay.once('pointerdown', () => this.restartGame());
  }

  private restartGame(): void {
    this.overlayObjects.forEach(obj => obj.destroy());
    this.overlayObjects = [];

    this.score = 0;
    this.chainCount = 0;
    this.chainText.setVisible(false);

    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.germCells.clear();
    this.capsule = null;
    
    this.nextColors = [
      COLORS[Math.floor(Math.random() * COLORS.length)],
      COLORS[Math.floor(Math.random() * COLORS.length)]
    ];

    if (this.fallTimer) this.fallTimer.remove();

    this.initGerms();
    this.spawnCapsule();
  }
}
