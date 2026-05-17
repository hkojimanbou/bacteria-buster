import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 40, '細菌撲滅', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'BACTERIA BUSTER', {
      fontSize: '16px',
      color: '#8899aa',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 120, 'タップしてスタート', {
      fontSize: '20px',
      color: '#f1c40f',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
