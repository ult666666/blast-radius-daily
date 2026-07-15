import { AUTO, Game, Scale, type Types } from 'phaser';
import { DailyGame } from './scenes/DailyGame';
import { Result } from './scenes/Result';

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#06111d',
  render: {
    antialias: true,
    roundPixels: true,
  },
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
    width: 1100,
    height: 720,
  },
  scene: [DailyGame, Result],
};

document.addEventListener('DOMContentLoaded', () => {
  new Game(config);
});
