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

// DS版『もっと脳トレ』の「細菌撲滅」仕様にボトルサイズを変更し、スマホ用にセルを拡大
export const CELL_SIZE = 48; // 32から48へ一回り大幅に拡大 (スマホ視認性向上)
export const GRID_COLS = 6;  // DS版準拠の6列仕様
export const GRID_ROWS = 11; // DS版準拠の11行仕様

const DEG_TO_RAD = Math.PI / 180;
const CORNER_RADIUS = 5; // CELL_SIZE拡大に伴い、角丸半径もバランス良く3から5へ調整

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

    // 塗りつぶし（完全なベタ塗り四角形、角丸）
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(x + pad, y + pad, size, size, CORNER_RADIUS);

    // ぷっくり光沢の重ね合わせ（上半分の淡い白グラデーション）
    graphics.fillStyle(0xffffff, 0.12);
    graphics.fillRoundedRect(x + pad, y + pad, size, size / 2, CORNER_RADIUS);

    // 上部の白いハイライト光沢帯
    graphics.fillStyle(0xffffff, 0.35);
    graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

    // 枠線（太枠）
    graphics.lineStyle(3, 0x050510, 1);
    graphics.strokeRoundedRect(x + pad, y + pad, size, size, CORNER_RADIUS);
  }

  /**
   * ちぎれた単体ブロックの「四角寄りドーム型（弾丸型）」描画
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

    graphics.fillStyle(color, 1);

    if (originalDir === 'left') {
      // 元々左側：右端（切断面）は真っ平ら、左端の上下角だけ丸い（四角いドーム）
      graphics.beginPath();
      graphics.moveTo(x + CELL_SIZE, y + pad);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 90, true);
      graphics.lineTo(x + CELL_SIZE, y + pad + size);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 外枠（完全に閉じた太線）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x + CELL_SIZE, y + pad);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 90, true);
      graphics.lineTo(x + CELL_SIZE, y + pad + size);
      graphics.closePath();
      graphics.strokePath();

    } else if (originalDir === 'right') {
      // 元々右側：左端（切断面）は真っ平ら、右端の上下角だけ丸い
      graphics.beginPath();
      graphics.moveTo(x, y + pad);
      graphics.lineTo(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + CELL_SIZE - pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x, y + pad + size);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 外枠
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x, y + pad);
      graphics.lineTo(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + CELL_SIZE - pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x, y + pad + size);
      graphics.closePath();
      graphics.strokePath();

    } else if (originalDir === 'top') {
      // 元々上側：下端（切断面）は真っ平ら、上端の左右角だけ丸い
      graphics.beginPath();
      graphics.moveTo(x + pad, y + CELL_SIZE);
      graphics.lineTo(x + pad, y + pad + CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 270, false);
      graphics.lineTo(x + pad + size - CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + pad + size, y + CELL_SIZE);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 外枠
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x + pad, y + CELL_SIZE);
      graphics.lineTo(x + pad, y + pad + CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 270, false);
      graphics.lineTo(x + pad + size - CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + pad + size, y + CELL_SIZE);
      graphics.closePath();
      graphics.strokePath();

    } else if (originalDir === 'bottom') {
      // 元々下側：上端（切断面）は真っ平ら、下端の左右角だけ丸い
      graphics.beginPath();
      graphics.moveTo(x + pad, y);
      graphics.lineTo(x + pad + size, y);
      graphics.lineTo(x + pad + size, y + CELL_SIZE - pad - CORNER_RADIUS);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 90, DEG_TO_RAD * 180, false);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 外枠
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x + pad, y);
      graphics.lineTo(x + pad + size, y);
      graphics.lineTo(x + pad + size, y + CELL_SIZE - pad - CORNER_RADIUS);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 90, DEG_TO_RAD * 180, false);
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

    graphics.fillStyle(color, 1);

    if (position === 'left') {
      // 塗りつぶし：左角丸・右直角
      graphics.beginPath();
      graphics.moveTo(x + CELL_SIZE, y + pad);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 90, true);
      graphics.lineTo(x + CELL_SIZE, y + pad + size);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 太い外枠（右端の縦線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x + CELL_SIZE, y + pad);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 180, true);
      graphics.lineTo(x + pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 90, true);
      graphics.lineTo(x + CELL_SIZE, y + pad + size);
      graphics.strokePath();

    } else if (position === 'right') {
      // 塗りつぶし：左直角・右角丸
      graphics.beginPath();
      graphics.moveTo(x, y + pad);
      graphics.lineTo(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + CELL_SIZE - pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x, y + pad + size);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 太い外枠（左端の縦線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x, y + pad);
      graphics.lineTo(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + CELL_SIZE - pad, y + pad + size - CORNER_RADIUS);
      graphics.arc(x + CELL_SIZE - pad - CORNER_RADIUS, y + pad + size - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x, y + pad + size);
      graphics.strokePath();

      // スリット（中央境界部の細い黒スリット線）
      graphics.lineStyle(1.5, 0x050510, 0.85);
      graphics.beginPath();
      graphics.moveTo(x, y + pad);
      graphics.lineTo(x, y + pad + size);
      graphics.strokePath();

    } else if (position === 'top') {
      // 塗りつぶし：上角丸・下直角
      graphics.beginPath();
      graphics.moveTo(x + pad, y + CELL_SIZE);
      graphics.lineTo(x + pad, y + pad + CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 270, false);
      graphics.lineTo(x + pad + size - CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + pad + size, y + CELL_SIZE);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 太い外枠（下端の横線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x + pad, y + CELL_SIZE);
      graphics.lineTo(x + pad, y + pad + CORNER_RADIUS);
      graphics.arc(x + pad + CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 180, DEG_TO_RAD * 270, false);
      graphics.lineTo(x + pad + size - CORNER_RADIUS, y + pad);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + pad + CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 270, DEG_TO_RAD * 360, false);
      graphics.lineTo(x + pad + size, y + CELL_SIZE);
      graphics.strokePath();

    } else if (position === 'bottom') {
      // 塗りつぶし：上直角・下角丸
      graphics.beginPath();
      graphics.moveTo(x + pad, y);
      graphics.lineTo(x + pad + size, y);
      graphics.lineTo(x + pad + size, y + CELL_SIZE - pad - CORNER_RADIUS);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 90, DEG_TO_RAD * 180, false);
      graphics.lineTo(x + pad, y);
      graphics.closePath();
      graphics.fillPath();

      // ぷっくり光沢の重ね合わせ
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + pad, y + pad, size, size / 2);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(x + pad + 4, y + pad + 4, size - 8, 4, 2);

      // 太い外枠（上端の横線は描かない）
      graphics.lineStyle(3, 0x050510, 1);
      graphics.beginPath();
      graphics.moveTo(x + pad + size, y);
      graphics.lineTo(x + pad + size, y + CELL_SIZE - pad - CORNER_RADIUS);
      graphics.arc(x + pad + size - CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 0, DEG_TO_RAD * 90, false);
      graphics.lineTo(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad);
      graphics.arc(x + pad + CORNER_RADIUS, y + CELL_SIZE - pad - CORNER_RADIUS, CORNER_RADIUS, DEG_TO_RAD * 90, DEG_TO_RAD * 180, false);
      graphics.lineTo(x + pad, y);
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
   * カプセルを構成する全ブロック of 絶対グリッド座標と色を返す。
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
