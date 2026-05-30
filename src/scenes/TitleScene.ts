import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const titleText = this.add.text(cx, cy - 80, '細菌撲滅', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      padding: { top: 12, bottom: 12, left: 10, right: 10 }
    }).setOrigin(0.5);

    const subTitleText = this.add.text(cx, cy - 20, 'BACTERIA BUSTER', {
      fontSize: '16px',
      color: '#8899aa',
    }).setOrigin(0.5);

    const startText = this.add.text(cx, cy + 230, '画面をタッチしてスタート', {
      fontSize: '20px',
      color: '#f1c40f',
      padding: { top: 6, bottom: 6 }
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      titleText.destroy();
      subTitleText.destroy();
      startText.destroy();

      this.showDifficultySelection();
    });
  }

  private showDifficultySelection(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 120, '難易度を選択してください', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const options = [
      { text: 'かんたん', key: 'easy', color: '#2ecc71', y: cy - 30 },
      { text: 'ふつう', key: 'normal', color: '#f1c40f', y: cy + 30 },
      { text: 'むずかしい', key: 'hard', color: '#e74c3c', y: cy + 90 }
    ];

    let canSelect = false;
    this.time.delayedCall(300, () => {
      canSelect = true;
    });

    options.forEach(opt => {
      const btnBg = this.add.rectangle(cx, opt.y, 220, 48, 0x112244, 0.8)
        .setStrokeStyle(2, 0x4a90d9)
        .setInteractive();

      const btnText = this.add.text(cx, opt.y, opt.text, {
        fontSize: '18px',
        color: opt.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => {
        btnBg.setStrokeStyle(3, 0xffffff);
        btnBg.setScale(1.05);
        btnText.setScale(1.05);
      });

      btnBg.on('pointerout', () => {
        btnBg.setStrokeStyle(2, 0x4a90d9);
        btnBg.setScale(1.0);
        btnText.setScale(1.0);
      });

      btnBg.on('pointerdown', () => {
        if (!canSelect) return;
        this.scene.start('GameScene', { difficulty: opt.key });
      });
    });
  }
}
