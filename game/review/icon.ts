/** 승인된 그림을 그대로 재사용한다. 개발 서버에서 icon.html을 열면 다섯 PNG를 같은 원본에서 얻는다. */
import Phaser from 'phaser';
import { Dude, tree, toLook } from '../draw';
import { Pet } from '../pets';

new Phaser.Game({
  type: Phaser.CANVAS, parent: 'icon', width: 512, height: 512,
  backgroundColor: '#d6e6b6', render: { antialias: true }, audio: { noAudio: true }, banner: false,
  scene: { create(this: Phaser.Scene) {
    tree(this, 355, 350, 0x79a96a).setScale(7);
    tree(this, 70, 400, 0x8cc07a).setScale(4.8);
    this.add.ellipse(260, 481, 610, 184, 0xc5d79c).setDepth(400);
    new Dude(this, toLook([0, 1, 0, 0]), 211, 455).root.setScale(5.6).setDepth(455);
    new Pet(this, 'cat', { x: 364, y: 455 }, 3.3).step(0, true);
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      const pngs: Record<string, string> = {};
      for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180], ['icon-128.png', 128], ['favicon-32.png', 32]] as const) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d')!; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(this.game.canvas, 0, 0, size, size);
        pngs[file] = canvas.toDataURL('image/png');
        if (size === 128 || size === 32) { const img = new Image(size, size); img.src = pngs[file]; img.alt = size + 'px 아이콘'; document.querySelector('#sizes')!.append(img); }
      }
      Object.assign(window, { iconPngs: pngs });
      this.game.loop.sleep();
    });
  } },
});
