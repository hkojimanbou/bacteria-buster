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

const DEG_TO_RAD = Math.PI / 180;

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
   * 1ブロックを描画する（ちぎれて単体ブロックになった際、または細菌のフォールバック）
   */
  static drawBlock(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    originalDir?: 'left' | 'right' | 'top' | 'bottom' | null
  ): void {
    if (originalDir) {
      Capsule.drawSingleBlock(graphics, x, y, color, originalDir);
      return;
    }

    const pad = 1.5;
    const size = CELL_SIZE - pad * 2;

    // 塗りつぶし（完全な円）
    graphics.fillStyle(color, 1);
    graphics.fillCircle(x + CELL_SIZE / 2, y + CELL_SIZE / 2, size / 2);

    // ハイライト（上部に白 alpha 0.35）
    graphics.fillStyle(0xffffff, 0.35);
    graphics.beginPath();
    graphics.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, size / 2 - 3, DEG_TO_RAD * 180, DEG_TO_RAD * 360, true);
    graphics.closePath();
    graphics.fillPath();

    // 枠線（太枠）
    graphics.lineStyle(2.5, 0x050510, 1);
    graphics.strokeCircle(x + CELL_SIZE / 2, y + CELL_SIZE / 2, size / 2);
  }

  /**
   * ちぎれた単体ブロックのドーム型（卵型）描画
   */
  static drawSingleBlock(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    originalDir: 'left' | 'right' | 'top' | 'bottom'
  ): void {
    const pad = 1.5;
    const size = CELL_SIZE - pad * 2;
    const r = size / 2;

    graphics.fillStyle(color, 1);

    if (originalDir === 'left' || originalDir === 'right') {
      // 横長ドーム型（左右両端が丸い卵型）
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 90, DEG_TO_RAD * 270, false);
      graphics.arc(x + CELL_SIZE - pad - r, y + pad + r, r, DEG_TO_RAD * 270, DEG_TO_RAD * 90, false);
      graphics.closePath();
      graphics.fillPath();

      // L字ハイライト
      graphics.lineStyle(2.5, 0xffffff, 0.45);
      graphics.beginPath();
      graphics.moveTo(x + CELL_SIZE - pad - r, y + pad + 3);
      graphics.lineTo(x + pad + r, y + pad + 3);
      graphics.arc(x + pad + r, y + pad + r, r - 3, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.strokePath();

      // 太い外枠（滑らかな1つの太線）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 90, DEG_TO_RAD * 270, false);
      graphics.arc(x + CELL_SIZE - pad - r, y + pad + r, r, DEG_TO_RAD * 270, DEG_TO_RAD * 90, false);
      graphics.closePath();
      graphics.strokePath();
    } else {
      // 縦長ドーム型（上下両端が丸い卵型）
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 180, DEG_TO_RAD * 360, false);
      graphics.arc(x + pad + r, y + CELL_SIZE - pad - r, r, DEG_TO_RAD * 0, DEG_TO_RAD * 180, false);
      graphics.closePath();
      graphics.fillPath();

      // L字ハイライト
      graphics.lineStyle(2.5, 0xffffff, 0.45);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r - 3, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad + 3, y + CELL_SIZE - pad - r);
      graphics.strokePath();

      // 太い外枠
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 180, DEG_TO_RAD * 360, false);
      graphics.arc(x + pad + r, y + CELL_SIZE - pad - r, r, DEG_TO_RAD * 0, DEG_TO_RAD * 180, false);
      graphics.closePath();
      graphics.strokePath();
    }
  }

  /**
   * カプセルの半球（ハーフカプセル）を描画する（連結時）
   */
  static drawHalfCapsule(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    position: 'left' | 'right' | 'top' | 'bottom'
  ): void {
    const pad = 1.5;
    const size = CELL_SIZE - pad * 2;
    const r = size / 2;

    graphics.fillStyle(color, 1);

    if (position === 'left') {
      // 塗りつぶし：左丸み・右平ら
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 90, DEG_TO_RAD * 270, true);
      graphics.lineTo(x + CELL_SIZE, y + pad);
      graphics.lineTo(x + CELL_SIZE, y + pad + size);
      graphics.closePath();
      graphics.fillPath();

      // L字ハイライト（上フチ ＆ 左丸み）
      graphics.lineStyle(2.5, 0xffffff, 0.45);
      graphics.beginPath();
      graphics.moveTo(x + CELL_SIZE, y + pad + 3);
      graphics.lineTo(x + pad + r, y + pad + 3);
      graphics.arc(x + pad + r, y + pad + r, r - 3, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.strokePath();

      // 太い外枠（右端の縦線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 90, DEG_TO_RAD * 270, false);
      graphics.lineTo(x + CELL_SIZE, y + pad);
      graphics.moveTo(x + pad + r, y + pad + size);
      graphics.lineTo(x + CELL_SIZE, y + pad + size);
      graphics.strokePath();

    } else if (position === 'right') {
      // 塗りつぶし：左平ら・右丸み
      graphics.beginPath();
      graphics.arc(x + CELL_SIZE - pad - r, y + pad + r, r, DEG_TO_RAD * 270, DEG_TO_RAD * 90, true);
      graphics.lineTo(x, y + pad + size);
      graphics.lineTo(x, y + pad);
      graphics.closePath();
      graphics.fillPath();

      // 上フチの直線ハイライト
      graphics.lineStyle(2.5, 0xffffff, 0.45);
      graphics.beginPath();
      graphics.moveTo(x, y + pad + 3);
      graphics.lineTo(x + CELL_SIZE - pad - r, y + pad + 3);
      graphics.strokePath();

      // 太い外枠（左端の縦線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.arc(x + CELL_SIZE - pad - r, y + pad + r, r, DEG_TO_RAD * 270, DEG_TO_RAD * 90, false);
      graphics.lineTo(x, y + pad + size);
      graphics.moveTo(x + CELL_SIZE - pad - r, y + pad);
      graphics.lineTo(x, y + pad);
      graphics.strokePath();

      // スリット（中央境界部の細い黒スリット線）
      graphics.lineStyle(1.5, 0x050510, 0.85);
      graphics.beginPath();
      graphics.moveTo(x, y + pad);
      graphics.lineTo(x, y + pad + size);
      graphics.strokePath();

    } else if (position === 'top') {
      // 塗りつぶし：上丸み・下平ら
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 180, DEG_TO_RAD * 360, true);
      graphics.lineTo(x + pad + size, y + CELL_SIZE);
      graphics.lineTo(x + pad, y + CELL_SIZE);
      graphics.closePath();
      graphics.fillPath();

      // L字ハイライト（上丸み ＆ 左フチ）
      graphics.lineStyle(2.5, 0xffffff, 0.45);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r - 3, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad + 3, y + CELL_SIZE);
      graphics.strokePath();

      // 太い外枠（下端の横線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + pad + r, r, DEG_TO_RAD * 180, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + pad + size, y + CELL_SIZE);
      graphics.moveTo(x + pad, y + pad + r);
      graphics.lineTo(x + pad, y + CELL_SIZE);
      graphics.strokePath();

    } else if (position === 'bottom') {
      // 塗りつぶし：上平ら・下丸み
      graphics.beginPath();
      graphics.arc(x + pad + r, y + CELL_SIZE - pad - r, r, DEG_TO_RAD * 0, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad, y);
      graphics.lineTo(x + pad + size, y);
      graphics.closePath();
      graphics.fillPath();

      // 左フチの直線ハイライト
      graphics.lineStyle(2.5, 0xffffff, 0.45);
      graphics.beginPath();
      graphics.moveTo(x + pad + 3, y);
      graphics.lineTo(x + pad + 3, y + CELL_SIZE - pad - r);
      graphics.strokePath();

      // 太い外枠（上端の横線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.arc(x + pad + r, y + CELL_SIZE - pad - r, r, DEG_TO_RAD * 0, DEG_TO_RAD * 180, false);
      graphics.lineTo(x + pad, y);
      graphics.moveTo(x + pad + size, y + CELL_SIZE - pad - r);
      graphics.lineTo(x + pad + size, y);
      graphics.strokePath();

      // スリット（中央境界部の細い黒スリット線）
      graphics.lineStyle(1.5, 0x050510, 0.85);
      graphics.beginPath();
      graphics.moveTo(x + pad, y);
      graphics.lineTo(x + pad + size, y);
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
