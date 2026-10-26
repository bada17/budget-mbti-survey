// 실제 figure와 굽기를 함께 보는 검토판. 원래의 정적 시안(1020-options)은 그대로 둔다.
import '@fontsource/jua/400.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import Phaser from 'phaser';
import { Dude } from '../draw';
import { REWARDS, fullPick, wearing, toLook } from '../look';

await document.fonts.load('800 16px "Pretendard Variable"');
const stage = document.querySelector<HTMLElement>('#stage')!;
const width = stage.clientWidth, columns = width < 700 ? 2 : 4;
const height = Math.ceil(4 / columns) * 250;
const dudes: Dude[] = [];
let walking = false, direction = 1;
const game = new Phaser.Game({
  type: Phaser.CANVAS, parent: stage, width, height, backgroundColor: '#fff9eb',
  banner: false, audio: { noAudio: true }, render: { antialias: true },
  scene: {
    create(this: Phaser.Scene) {
      for (let i = 0; i < 4; i++) {
        const x = (i % columns + 0.5) * width / columns, y = Math.floor(i / columns) * 250;
        const look = toLook(wearing(fullPick([0, 1, 7, 0]), REWARDS[5 + i]));
        look.top = 'shirt';
        this.add.text(x, y + 20, REWARDS[5 + i].name, { fontFamily: 'Pretendard Variable', fontSize: '16px', fontStyle: 'bold', color: '#0d1c26' }).setOrigin(0.5, 0);
        const scale = Math.min(2.6, width / columns / 65);
        dudes.push(new Dude(this, look, x, y + 174, scale, 0), new Dude(this, look, x, y + 237, 1, 3));
      }
      Object.assign(window, { __accessoryReview: { game, scene: this, dudes } });
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => { document.body.dataset.ready = 'true'; });
    },
    update(_time: number, dt: number) {
      for (const dude of dudes) { dude.walk(dt, walking, !walking); dude.look(direction, 0.25); }
    },
  },
});
document.querySelector<HTMLButtonElement>('#walk')!.onclick = () => { walking = !walking; };
document.querySelector<HTMLButtonElement>('#look')!.onclick = () => { direction *= -1; };
