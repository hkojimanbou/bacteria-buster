import { CELL_SIZE } from './Capsule';

export class Germ {
  /**
   * 細菌を描画する（staticメソッド）
   * Capsule.drawBlock と同じシグネチャで使える。
   * @param graphics Phaser.GameObjects.Graphics
   * @param x セル左上のpx座標
   * @param y セル左上のpx座標
   * @param color 0xRRGGBB
   */
  static drawGerm(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const cx = x + CELL_SIZE / 2; // セル中心X
    const cy = y + CELL_SIZE / 2; // セル中心Y
    const r = 12;                 // 本体半径

    // 本体（円）
    graphics.fillStyle(color, 1);
    graphics.fillCircle(cx, cy, r);

    // 輪郭
    graphics.lineStyle(1.5, 0x000000, 0.4);
    graphics.strokeCircle(cx, cy, r);

    // 目（白丸×2）
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(cx - 4, cy - 3, 3);
    graphics.fillCircle(cx + 4, cy - 3, 3);

    // 瞳（黒丸×2）
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(cx - 4, cy - 3, 1.5);
    graphics.fillCircle(cx + 4, cy - 3, 1.5);
  }
}
