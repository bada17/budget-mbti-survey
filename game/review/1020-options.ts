// 검토 전용: 본편의 모습 값·보상·그림 함수는 바꾸지 않고 현재 캐릭터 위에 후보를 얹는다.
import '@fontsource/jua/400.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import Phaser from 'phaser';
import { Dude, toLook } from '../draw';

new Phaser.Game({
  type: Phaser.CANVAS, parent: 'characters', width: 1128, height: 300,
  backgroundColor: '#fff9eb', banner: false, audio: { noAudio: true },
  render: { antialias: true },
  scene: { create(this: Phaser.Scene) {
    const look = { ...toLook([0, 1, 7, 0]), accessory: 'none' as const, top: 'shirt' as const };
    for (let i = 0; i < 4; i++) {
      const x = 141 + i * 282;
      this.add.ellipse(x, 189, 164, 23, 0xe7dec7, 0.45);
      for (const [y, scale] of [[184, 2.6], [276, 1]] as const) {
        new Dude(this, look, x, y, scale, 0).root.setDepth(y);
        const g = this.add.graphics().setPosition(x, y).setScale(scale * 56 / 64).setDepth(y + 1);
        if (i === 0) {
          g.lineStyle(6, 0x765b45).lineBetween(20, -23, 29, -10);
          g.fillStyle(0xc8e8ed).fillCircle(18, -30, 10);
          g.lineStyle(3, 0x557b7c).strokeCircle(18, -30, 10);
          g.lineStyle(2, 0xffffff).lineBetween(14, -34, 18, -37);
          g.fillStyle(look.skin).fillCircle(23, -18, 3.5);
        } else if (i === 1) {
          g.fillStyle(0x008ebd).fillTriangle(2, -18, 7, -18, 2, -9).fillTriangle(6, -18, 11, -18, 12, -9);
          g.fillStyle(0xfffcf3).fillCircle(7, -23, 7);
          g.fillStyle(0x00afec).fillCircle(7, -23, 5.5);
          g.fillStyle(0xfffcf3).fillCircle(7, -23, 2);
        } else if (i === 2) {
          g.lineStyle(3, 0x8c6650).lineBetween(-10, -29, 12, -9);
          g.fillStyle(0x9b7156).fillRoundedRect(5, -19, 19, 17, 4);
          g.fillStyle(0xe8c790).fillRoundedRect(6, -20, 19, 9, 3);
          g.fillStyle(0x6d5746).fillRoundedRect(13, -13, 4, 4, 1);
        } else {
          g.fillStyle(0xa87e56).fillRoundedRect(12, -31, 18, 25, 2);
          g.fillStyle(0xfffcf3).fillRoundedRect(14, -28, 14, 19, 1);
          g.fillStyle(0x708b86).fillRoundedRect(17, -33, 8, 6, 2);
          g.lineStyle(2.2, 0x638b61).beginPath().moveTo(17, -19).lineTo(20, -16).lineTo(25, -22).strokePath();
          g.lineStyle(1.3, 0xb7c7c1).lineBetween(17, -12, 25, -12);
          g.fillStyle(look.skin).fillCircle(13, -16, 3.5);
        }
      }
    }
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => { this.game.loop.sleep(); document.body.dataset.ready = 'true'; });
  } },
});
