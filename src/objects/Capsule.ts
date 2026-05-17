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
   * 1ブロックを描画する（staticメソッド）
   * GameScene の drawLandedBlocks() からも利用する。
   */
  static drawBlock(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const pad = 2;
    const size = CELL_SIZE - pad * 2;

    // 塗りつぶし
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(x + pad, y + pad, size, size, 6);

    // ハイライト（上部の明るい半円風グラデーション表現）
    graphics.fillStyle(0xffffff, 0.25);
    graphics.fillRoundedRect(x + pad + 3, y + pad + 3, size - 6, size / 2 - 2, 4);

    // 枠線
    graphics.lineStyle(1.5, 0x000000, 0.3);
    graphics.strokeRoundedRect(x + pad, y + pad, size, size, 6);
  }

  // ────────────────────────────────────
  //  状態参照
  // ────────────────────────────────────

  /**
   * カプセルを構成する全ブロックの絶対グリッド座標と色を返す。
   * canMoveDown() や landCapsule() での衝突判定・書き込みに使う。
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
   * ドラッグ中のカプセル表示。
   * X方向はグリッド列にスナップ、Y方向はピクセル単位でオフセット表示。
   * @param pointerX  画面上のポインターX座標
   * @param pointerY  画面上のポインターY座標
   * @param offsetY   指からの上方オフセット（px）
   */
  drawAtPointer(pointerX: number, pointerY: number, offsetY: number = 60): void {
    const relX = pointerX - this.gridOffsetX;
    const pointerCol = Math.floor(relX / CELL_SIZE);
    const [off0] = ROTATION_OFFSETS[this.rotation];
    this.col = pointerCol - off0.col;
    this.clampToGrid();

    const displayPixelY = pointerY - offsetY;
    this.drawAtPixelY(displayPixelY);
  }

  /**
   * グリッド座標に基づいて描画する（通常表示）
   */
  draw(): void {
    const pixelY = this.gridOffsetY + this.row * CELL_SIZE;
    this.drawAtPixelY(pixelY);
  }

  /**
   * ポインターX座標からアンカー列を計算する（state変更なし）。
   * GameScene 側でこの値を canMoveTo() で検証してから capsule.col に代入する。
   */
  calcAnchorColFromPointerX(pointerX: number): number {
    const relX = pointerX - this.gridOffsetX;
    const pointerCol = Math.floor(relX / CELL_SIZE);
    const [off0] = ROTATION_OFFSETS[this.rotation];
    return pointerCol - off0.col;
  }

  /**
   * 現在の col/rotation を使い、指定ピクセルY座標で描画する。
   * ドラッグ中に GameScene が col を管理しつつ呼び出すために使う。
   * @param anchorPixelY  block0 のピクセルY座標
   */
  drawAtY(anchorPixelY: number): void {
    this.drawAtPixelY(anchorPixelY);
  }

  /**
   * 内部描画処理。アンカーの列座標 + 各ブロックのオフセットから描画。
   * @param anchorPixelY  block0 のピクセルY座標
   */
  private drawAtPixelY(anchorPixelY: number): void {
    const [off0, off1] = ROTATION_OFFSETS[this.rotation];

    const anchorPixelX = this.gridOffsetX + this.col * CELL_SIZE;

    Capsule.drawBlock(
      this.graphics,
      anchorPixelX + off0.col * CELL_SIZE,
      anchorPixelY + off0.row * CELL_SIZE,
      this.block0Color
    );
    Capsule.drawBlock(
      this.graphics,
      anchorPixelX + off1.col * CELL_SIZE,
      anchorPixelY + off1.row * CELL_SIZE,
      this.block1Color
    );
  }
}
