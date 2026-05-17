import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: '#1a1a2e',
  scene: [TitleScene, GameScene],
  input: {
    activePointers: 1, // シングルタッチ
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
