import { CELL_SIZE } from './Capsule';

export class Germ {
  /**
   * 細菌を描画する（staticメソッド）
   * @param graphics Phaser.GameObjects.Graphics
   * @param x セル左上のpx座標
   * @param y セル左上のpx座標
   * @param color 0xRRGGBB (0xe74c3c=赤, 0xf1c40f=黄, 0x3498db=青)
   */
  static drawGerm(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const cx = x + CELL_SIZE / 2; // セル中心X
    const cy = y + CELL_SIZE / 2; // セル中心Y
    const r = 16;                 // CELL_SIZE=48に合わせて本体半径を12から16へ拡大

    // ────────────────────────────────────
    //  ベースの形状（ツノ・耳・トゲ）の描画
    // ────────────────────────────────────
    graphics.fillStyle(color, 1);
    graphics.lineStyle(3, 0x050510, 1); // 太めの外枠線

    if (color === 0xe74c3c) {
      // 1. 赤系：尖った耳（左右上部）
      // 左耳
      graphics.beginPath();
      graphics.moveTo(cx - 16, cy - 8);
      graphics.lineTo(cx - 14, cy - 24);
      graphics.lineTo(cx - 5, cy - 13);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

      // 右耳
      graphics.beginPath();
      graphics.moveTo(cx + 5, cy - 13);
      graphics.lineTo(cx + 14, cy - 24);
      graphics.lineTo(cx + 16, cy - 8);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

    } else if (color === 0xf1c40f) {
      // 2. 黄系：頭部トゲ（3本）
      // 中央トゲ
      graphics.beginPath();
      graphics.moveTo(cx - 4, cy - 15);
      graphics.lineTo(cx, cy - 26);
      graphics.lineTo(cx + 4, cy - 15);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

      // 左トゲ
      graphics.beginPath();
      graphics.moveTo(cx - 13, cy - 10);
      graphics.lineTo(cx - 13, cy - 22);
      graphics.lineTo(cx - 7, cy - 13);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

      // 右トゲ
      graphics.beginPath();
      graphics.moveTo(cx + 7, cy - 13);
      graphics.lineTo(cx + 13, cy - 22);
      graphics.lineTo(cx + 13, cy - 10);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

    } else if (color === 0x3498db) {
      // 3. 青系：丸いツノ（2本）
      const hornR = 5;
      // 左ツノ
      graphics.fillCircle(cx - 10, cy - 16, hornR);
      graphics.strokeCircle(cx - 10, cy - 16, hornR);
      // 右ツノ
      graphics.fillCircle(cx + 10, cy - 16, hornR);
      graphics.strokeCircle(cx + 10, cy - 16, hornR);
    }

    // ────────────────────────────────────
    //  本体（円）の描画
    // ────────────────────────────────────
    graphics.fillStyle(color, 1);
    graphics.fillCircle(cx, cy, r);
    graphics.strokeCircle(cx, cy, r);

    // ぷっくりハイライト光沢（ウイルスにもぷっくりした質感を付与）
    graphics.fillStyle(0xffffff, 0.22);
    graphics.fillCircle(cx - 5, cy - 6, 6);

    // ────────────────────────────────────
    //  目・瞳の描画（色ごとの表情描き分け）
    // ────────────────────────────────────
    // 白目（共通：白丸×2）
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(cx - 6, cy - 3, 4.5);
    graphics.fillCircle(cx + 6, cy - 3, 4.5);

    graphics.lineStyle(1.5, 0x050510, 0.8);
    graphics.strokeCircle(cx - 6, cy - 3, 4.5);
    graphics.strokeCircle(cx + 6, cy - 3, 4.5);

    // 瞳（黒丸×2）
    graphics.fillStyle(0x050510, 1);
    if (color === 0x3498db) {
      // 青系（悪巧みジト目：瞳を少し内側かつジト目気味に）
      graphics.fillCircle(cx - 4.5, cy - 2, 2);
      graphics.fillCircle(cx + 4.5, cy - 2, 2);
    } else {
      graphics.fillCircle(cx - 6, cy - 3, 2);
      graphics.fillCircle(cx + 6, cy - 3, 2);
    }

    // ────────────────────────────────────
    //  特徴的なまぶた・眉毛・口の描画
    // ────────────────────────────────────
    graphics.lineStyle(2.5, 0x050510, 1);

    if (color === 0xe74c3c) {
      // 赤系：愛嬌口（にっこりした円弧）
      graphics.beginPath();
      graphics.arc(cx, cy + 4, 5, 0, Math.PI, false);
      graphics.strokePath();

    } else if (color === 0xf1c40f) {
      // 黄系：不機嫌つり眉 ＆ への字口
      // つり眉
      graphics.beginPath();
      graphics.moveTo(cx - 11, cy - 9);
      graphics.lineTo(cx - 3, cy - 6);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(cx + 3, cy - 6);
      graphics.lineTo(cx + 11, cy - 9);
      graphics.strokePath();

      // への字口
      graphics.beginPath();
      graphics.moveTo(cx - 6, cy + 7);
      graphics.lineTo(cx, cy + 3);
      graphics.lineTo(cx + 6, cy + 7);
      graphics.strokePath();

    } else if (color === 0x3498db) {
      // 青系：ジト目まぶた ＆ 右上がりのニヤリ口
      // ジト目まぶた（目の上半分を黒水平線で隠す）
      graphics.beginPath();
      graphics.moveTo(cx - 11, cy - 4.5);
      graphics.lineTo(cx - 1, cy - 4.5);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(cx + 1, cy - 4.5);
      graphics.lineTo(cx + 11, cy - 4.5);
      graphics.strokePath();

      // ニヤリ口（右上がり）
      graphics.beginPath();
      graphics.moveTo(cx - 6, cy + 5);
      graphics.lineTo(cx, cy + 7);
      graphics.lineTo(cx + 6, cy + 3);
      graphics.strokePath();
    }
  }
}
