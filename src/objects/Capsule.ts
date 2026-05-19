/**
 * カプセルの回転パターン（時計回り4段階）
 *
 * パターン0（初期）: [左][右]   横並び
 * パターン1:        [左]        縦並び（上が元の左ブロック）
 *                   [右]
 * パターン2:        [右][左]    横並び（左右反転）
 * パターン3:        [右]        縦並び（上が元の右ブロック）
 *                   [左]
 */

/** グリッド上のオフセット（col, row の相対差分） */
export interface BlockOffset {
  col: number;
  row: number;
}

/** カプセルの2ブロック分のオフセット定義（rotation=0〜3） */
export const ROTATION_OFFSETS: [BlockOffset, BlockOffset][] = [
  // パターン0: 横並び [左][右]  →  block0 = (0,0), block1 = (+1,0)
  [{ col: 0, row: 0 }, { col: 1, row: 0 }],
  // パターン1: 縦並び 上が左ブロック → block0 = (0,0), block1 = (0,+1)
  [{ col: 0, row: 0 }, { col: 0, row: 1 }],
  // パターン2: 横並び（左右反転）[右][左]
  [{ col: 0, row: 0 }, { col: -1, row: 0 }],
  // パターン3: 縦並び（上が右ブロック）
  [{ col: 0, row: 0 }, { col: 0, row: -1 }],
];

export const CELL_SIZE = 32;
export const GRID_COLS = 8;
export const GRID_ROWS = 16;

/** getBlocks() の戻り値型 */
export interface BlockInfo {
  col: number;
  row: number;
  color: number;
}

export class Capsule {
  /** アンカーブロック（block0）のグリッド列 */
  public col: number;
  /** アンカーブロック（block0）のグリッド行 */
  public row: number;
  /** 回転状態 0〜3 */
  public rotation: number;

  /** 落下進捗 (0.0〜1.0) */
  public fallProgress: number = 0.0;
  /** 落下速度 (行/ms) */
  public fallSpeed: number = 1 / 800;

  /** block0 の色（元の「左」ブロック） */
  public readonly block0Color: number;
  /** block1 の色（元の「右」ブロック） */
  public readonly block1Color: number;

  private graphics: Phaser.GameObjects.Graphics;
  private gridOffsetX: number;
  private gridOffsetY: number;

  constructor(
    _scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    gridOffsetX: number,
    gridOffsetY: number,
    col: number,
    row: number,
    block0Color: number = 0xe74c3c, // 赤
    block1Color: number = 0xf1c40f  // 黄
  ) {
    this.col = col;
    this.row = row;
    this.rotation = 0;
    this.block0Color = block0Color;
    this.block1Color = block1Color;
    this.graphics = graphics;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
  }

  // ────────────────────────────────────
  //  静的描画ユーティリティ（GameScene からも呼び出し可能）
  // ────────────────────────────────────

  /**
   * 1ブロックを描画する（staticメソッド） - ちぎれたカプセル薬（球体）
   */
  static drawBlock(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const pad = 2;
    const size = CELL_SIZE - pad * 2;

    // 塗りつぶし（完全な円）
    graphics.fillStyle(color, 1);
    graphics.fillCircle(x + CELL_SIZE / 2, y + CELL_SIZE / 2, size / 2);

    // ハイライト（上部に白 alpha 0.3）
    graphics.fillStyle(0xffffff, 0.3);
    graphics.beginPath();
    graphics.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, size / 2 - 3, Phaser.Math.DEG_TO_RAD * 180, Phaser.Math.DEG_TO_RAD * 360, true);
    graphics.closePath();
    graphics.fillPath();

    // 枠線
    graphics.lineStyle(1.5, 0x000000, 0.4);
    graphics.strokeCircle(x + CELL_SIZE / 2, y + CELL_SIZE / 2, size / 2);
  }

  /**
   * カプセルの半球（ハーフカプセル）を描画する
   */
  static drawHalfCapsule(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    position: 'left' | 'right' | 'top' | 'bottom'
  ): void {
    const pad = 2;
    const size = CELL_SIZE - pad * 2;
    const r = size / 2;

    graphics.fillStyle(color, 1);

    if (position === 'left') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 90, Phaser.Math.DEG_TO_RAD * 270, true);
      graphics.closePath();
      graphics.fillPath();
      graphics.fillRect(x + pad + r, y + pad, r, size);
    } else if (position === 'right') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 270, Phaser.Math.DEG_TO_RAD * 90, true);
      graphics.closePath();
      graphics.fillPath();
      graphics.fillRect(x + pad, y + pad, r, size);
    } else if (position === 'top') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 180, Phaser.Math.DEG_TO_RAD * 360, true);
      graphics.closePath();
      graphics.fillPath();
      graphics.fillRect(x + pad, y + pad + r, size, r);
    } else if (position === 'bottom') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 0, Phaser.Math.DEG_TO_RAD * 180, true);
      graphics.closePath();
      graphics.fillPath();
      graphics.fillRect(x + pad, y + pad, size, r);
    }

    // ハイライト
    graphics.fillStyle(0xffffff, 0.3);
    if (position === 'left') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r - 3, Phaser.Math.DEG_TO_RAD * 180, Phaser.Math.DEG_TO_RAD * 270, true);
      graphics.closePath();
      graphics.fillPath();
      graphics.fillRect(x + pad + r, y + pad + 3, r - 3, size / 2 - 2);
    } else if (position === 'right') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r - 3, Phaser.Math.DEG_TO_RAD * 270, Phaser.Math.DEG_TO_RAD * 360, true);
      graphics.closePath();
      graphics.fillPath();
      graphics.fillRect(x + pad + 3, y + pad + 3, r - 3, size / 2 - 2);
    } else if (position === 'top') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r - 3, Phaser.Math.DEG_TO_RAD * 180, Phaser.Math.DEG_TO_RAD * 360, true);
      graphics.closePath();
      graphics.fillPath();
    } else if (position === 'bottom') {
      graphics.fillRect(x + pad + 3, y + pad + 3, size - 6, size / 2 - 2);
    }

    // 枠線
    graphics.lineStyle(1.5, 0x000000, 0.4);
    if (position === 'left') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 90, Phaser.Math.DEG_TO_RAD * 270, false);
      graphics.lineTo(x + pad + size, y + pad);
      graphics.moveTo(x + pad + r, y + pad + size);
      graphics.lineTo(x + pad + size, y + pad + size);
      graphics.strokePath();
    } else if (position === 'right') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 270, Phaser.Math.DEG_TO_RAD * 90, false);
      graphics.lineTo(x + pad, y + pad + size);
      graphics.moveTo(x + pad + r, y + pad);
      graphics.lineTo(x + pad, y + pad);
      graphics.strokePath();
    } else if (position === 'top') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 180, Phaser.Math.DEG_TO_RAD * 360, false);
      graphics.lineTo(x + pad + size, y + pad + size);
      graphics.moveTo(x + pad, y + pad + r);
      graphics.lineTo(x + pad, y + pad + size);
      graphics.strokePath();
    } else if (position === 'bottom') {
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, Phaser.Math.DEG_TO_RAD * 0, Phaser.Math.DEG_TO_RAD * 180, false);
      graphics.lineTo(x + pad, y + pad);
      graphics.moveTo(x + pad + size, y + pad + r);
      graphics.lineTo(x + pad + size, y + pad);
      graphics.strokePath();
    }
  }

  // ────────────────────────────────────
  //  状態参照
  // ────────────────────────────────────

  /**
   * カプセルを構成する全ブロックの絶対グリッド座標と色を返す。
   */
  getBlocks(): BlockInfo[] {
    const [off0, off1] = ROTATION_OFFSETS[this.rotation];
    return [
      {
        col: this.col + off0.col,
        row: this.row + off0.row,
        color: this.block0Color,
      },
      {
        col: this.col + off1.col,
        row: this.row + off1.row,
        color: this.block1Color,
      },
    ];
  }

  // ────────────────────────────────────
  //  回転・クランプ
  // ────────────────────────────────────

  /** 回転状態を1つ進める（時計回り） */
  rotate(): void {
    this.rotation = (this.rotation + 1) % 4;
    this.clampToGrid();
  }

  /** グリッド範囲外に出ないようにアンカー列をクランプ */
  clampToGrid(): void {
    const [off0, off1] = ROTATION_OFFSETS[this.rotation];

    const cols = [this.col + off0.col, this.col + off1.col];
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    if (minCol < 0) {
      this.col -= minCol;
    }
    if (maxCol >= GRID_COLS) {
      this.col -= maxCol - (GRID_COLS - 1);
    }

    const rows = [this.row + off0.row, this.row + off1.row];
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);

    if (minRow < 0) {
      this.row -= minRow;
    }
    if (maxRow >= GRID_ROWS) {
      this.row -= maxRow - (GRID_ROWS - 1);
    }
  }

  // ────────────────────────────────────
  //  描画
  // ────────────────────────────────────

  /**
   * グリッド座標に基づいて描画する（通常表示）
   */
  draw(): void {
    const pixelY = this.gridOffsetY + (this.row + this.fallProgress) * CELL_SIZE;
    this.drawAtPixelY(pixelY);
  }

  /**
   * 現在の col/rotation を使い、指定ピクセルY座標で描画する。
   */
  drawAtY(anchorPixelY: number): void {
    this.drawAtPixelY(anchorPixelY);
  }

  /**
   * 内部描画処理。アンカーの列座標 + 各ブロックのオフセットから描画。
   */
  private drawAtPixelY(anchorPixelY: number): void {
    const [off0, off1] = ROTATION_OFFSETS[this.rotation];
    const anchorPixelX = this.gridOffsetX + this.col * CELL_SIZE;

    const x0 = anchorPixelX + off0.col * CELL_SIZE;
    const y0 = anchorPixelY + off0.row * CELL_SIZE;
    const x1 = anchorPixelX + off1.col * CELL_SIZE;
    const y1 = anchorPixelY + off1.row * CELL_SIZE;

    let pos0: 'left' | 'right' | 'top' | 'bottom' = 'left';
    let pos1: 'left' | 'right' | 'top' | 'bottom' = 'right';

    if (this.rotation === 0) {
      pos0 = 'left';
      pos1 = 'right';
    } else if (this.rotation === 1) {
      pos0 = 'top';
      pos1 = 'bottom';
    } else if (this.rotation === 2) {
      pos0 = 'right';
      pos1 = 'left';
    } else if (this.rotation === 3) {
      pos0 = 'bottom';
      pos1 = 'top';
    }

    Capsule.drawHalfCapsule(this.graphics, x0, y0, this.block0Color, pos0);
    Capsule.drawHalfCapsule(this.graphics, x1, y1, this.block1Color, pos1);
  }
}
