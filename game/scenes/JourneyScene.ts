import Phaser from 'phaser';
import { ROUTE, DESTINATION } from '../content';
import { currentQuestion, type JourneyState, type Command } from '../flow';
import { displayOptions, type DisplaySide } from '../response';
import { ART, tile } from '../art';
import { FEEL } from '../feel';
import { WORLD, THEMES, movePlayer, residentPosition, type Point } from '../world';
import type { MovementInput } from '../input';

export type Runtime = {
  state: () => JourneyState;
  send: (command: Omit<Command, 'at'> | Record<string, unknown>) => void;
  input: MovementInput;
  visible: (id: string) => void;
  onReady: () => void;
  onError: () => void;
};

export class JourneyScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private point: Point = { ...WORLD.spawn };
  private target?: Point;
  private stageIndex = -1;
  private residents: Phaser.GameObjects.Image[] = [];
  private markers: Phaser.GameObjects.Text[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private lastQuestion = -1;
  private needsSeparation = false;
  private facing = ART.face.down as number;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private runtime: Runtime) { super('journey'); }

  create() {
    this.buildStage();
    const resize = () => this.resizeCamera(true);
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => this.scale.off('resize', resize));
    this.runtime.onReady();
  }

  private sprite(x: number, y: number, frame: number, scale = FEEL.sceneryScale) {
    return this.add.image(x, y, 'urban', frame).setOrigin(0).setScale(scale);
  }

  private tree(x: number, y: number) {
    ART.tree.forEach((frame, i) => this.sprite(x, y + i * ART.tileSize * FEEL.sceneryScale, frame));
  }

  private building(cx: number, y: number, roofRow: number) {
    const scale = FEEL.sceneryScale; const size = ART.tileSize * scale;
    const x = cx - size * 1.5;
    // Roof and facade are composed from the original urban atlas; labels carry place identity.
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      this.sprite(x + col * size, y + row * size, tile([17, 18, 22][col], roofRow + row));
    }
    for (let col = 0; col < 3; col++) this.sprite(x + col * size, y + 2 * size, tile(11 + col, 10));
    this.sprite(x + size, y + 2 * size, tile(11, 14));
  }

  private buildStage() {
    this.children.removeAll(true);
    const state = this.runtime.state(); this.stageIndex = state.stageIndex;
    this.lastQuestion = -1; this.target = undefined; this.needsSeparation = false;
    this.residents = []; this.markers = []; this.labels = [];
    const theme = THEMES[this.stageIndex];
    this.cameras.main.setBackgroundColor(theme.grass);
    const graphics = this.add.graphics();
    graphics.fillStyle(theme.grass).fillRect(0, 0, WORLD.width, WORLD.height);
    // A continuous walkable road, with separate meeting plazas. Scenery stays off the road.
    graphics.fillStyle(theme.path).fillRect(142, 0, 76, WORLD.height);
    graphics.lineStyle(2, 0xffffff, 0.25).strokeRect(140, 0, 80, WORLD.height);
    for (let y = 30; y < WORLD.height; y += 64) {
      graphics.fillStyle(0xffffff, 0.1).fillRect(148, y, 64, 2);
    }
    if (theme.water) {
      graphics.fillStyle(0x80b9c0).fillRect(0, 0, 52, WORLD.height);
      for (let y = 0; y < WORLD.height; y += 32) graphics.lineStyle(1, 0xc1e5dc, 0.7).lineBetween(7, y, 42, y);
    }
    for (let y = 40; y < WORLD.height; y += 160) {
      this.tree(theme.water ? 54 : 9, y); this.tree(316, y + 55);
    }
    const route = ROUTE[this.stageIndex];
    const stateForQuestions = { ...state };
    WORLD.stops.forEach((y, index) => {
      stateForQuestions.questionIndex = index;
      const question = currentQuestion(stateForQuestions)!;
      graphics.fillStyle(theme.path).fillRoundedRect(66, y - 40, 228, 92, 12);
      graphics.fillStyle(0x738462, 0.2).fillEllipse(181, y - 115, 105, 15);
      this.building(180, y - 182, theme.roof);
      if (question.place === '공원' || question.place === '둑') {
        this.tree(92, y - 154); this.tree(244, y - 150);
      }
      const sign = this.add.text(180, y - 72, question.place, {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#263e35',
        backgroundColor: '#f6f0db', padding: { x: 9, y: 5 },
      }).setOrigin(0.5).setDepth(3);
      this.labels.push(sign);
      for (const option of displayOptions(state.sessionId, question)) {
        const point = residentPosition(index, option.side);
        this.add.ellipse(point.x, point.y + 7, 28, 9, 0x4c604e, 0.25);
        const row = ART.residents[this.stageIndex][index];
        const actor = this.add.image(point.x, point.y, 'urban', tile(ART.face.down, row)).setScale(FEEL.actorScale).setOrigin(0.5, 0.8).setDepth(point.y);
        this.residents.push(actor);
        const marker = this.add.text(point.x, point.y - 43, '···', { fontSize: '15px', color: '#274a3e', backgroundColor: '#fbf8e9', padding: { x: 6, y: 0 } }).setOrigin(0.5).setDepth(point.y + 1);
        this.markers.push(marker);
      }
      this.sprite(50, y + 27, ART.bench[0]); this.sprite(82, y + 27, ART.bench[1]);
    });
    this.add.text(180, WORLD.exit.y - 37, this.stageIndex === ROUTE.length - 1 ? DESTINATION.name : '다음 동네 ↑', {
      fontSize: '13px', fontFamily: 'system-ui, sans-serif', color: '#294b3a', backgroundColor: '#f6f0db', padding: { x: 10, y: 7 },
    }).setOrigin(0.5);
    graphics.lineStyle(3, theme.accent, 0.5).lineBetween(145, WORLD.exit.y + 8, 215, WORLD.exit.y + 8);
    this.point = { ...WORLD.spawn };
    this.shadow = this.add.ellipse(this.point.x, this.point.y + 7, 26, 9, 0x324b3b, 0.25).setDepth(2000);
    this.player = this.add.image(this.point.x, this.point.y, 'urban', tile(ART.face.up, ART.playerRow)).setScale(FEEL.actorScale).setOrigin(0.5, 0.8).setDepth(2001);
    this.add.text(180, WORLD.spawn.y + 45, route.area, { fontFamily: 'system-ui', fontSize: '11px', color: '#526744' }).setOrigin(0.5);
    this.resizeCamera(true);
    if (!this.reduced && FEEL.effectsEnabled) this.cameras.main.fadeIn(FEEL.transitionMs);
  }

  private resizeCamera(snap = false) {
    const camera = this.cameras.main;
    const zoom = Math.max(0.5, this.scale.width / WORLD.width);
    camera.setZoom(zoom).setBounds(0, 0, WORLD.width, WORLD.height);
    const desired = this.point.y - this.scale.height / zoom * FEEL.cameraLookAhead;
    if (snap) camera.centerOn(WORLD.width / 2, desired);
    else camera.centerOn(WORLD.width / 2, Phaser.Math.Linear(camera.midPoint.y, desired, FEEL.cameraFollow));
  }

  moveToResident(side: DisplaySide) {
    const state = this.runtime.state();
    if (state.phase !== 'question' || state.paused) return;
    const resident = residentPosition(state.questionIndex, side);
    this.target = { x: resident.x, y: resident.y + FEEL.interactionRadius * 0.55 };
  }

  releaseResident() { this.target = undefined; this.needsSeparation = true; }

  update(time: number, delta: number) {
    const state = this.runtime.state();
    if (!this.player || state.phase === 'intro' || state.phase === 'arrived') return;
    if (state.stageIndex !== this.stageIndex) this.buildStage();
    if (state.paused) { this.target = undefined; return; }
    const question = currentQuestion(state);
    if (this.lastQuestion !== state.questionIndex) {
      this.lastQuestion = state.questionIndex; this.target = undefined;
      this.markers.forEach((marker, i) => marker.setVisible(Math.floor(i / 2) === state.questionIndex));
      this.labels.forEach((label, i) => label.setAlpha(i < state.questionIndex ? 0.55 : 1));
    }
    if (state.phase === 'reply') { this.runtime.input.reset(); return; }
    let vector = this.runtime.input.read();
    if (vector.x || vector.y) this.target = undefined;
    if (this.target) {
      const dx = this.target.x - this.point.x; const dy = this.target.y - this.point.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 2) this.target = undefined;
      else vector = { x: dx / distance, y: dy / distance };
    }
    const before = this.point;
    this.point = movePlayer(this.point, vector, delta, state.questionIndex);
    const walking = before.x !== this.point.x || before.y !== this.point.y;
    if (walking) this.facing = Math.abs(vector.x) > Math.abs(vector.y) ? (vector.x < 0 ? ART.face.left : ART.face.right) : (vector.y < 0 ? ART.face.up : ART.face.down);
    const bob = walking && !this.reduced ? Math.sin(time / FEEL.walkCycleMs * Math.PI * 2) * FEEL.walkBobPx : 0;
    this.player.setPosition(this.point.x, this.point.y + bob).setFrame(tile(this.facing, ART.playerRow));
    this.shadow.setPosition(this.point.x, this.point.y + 7);
    this.resizeCamera();
    if (question && state.phase === 'walking' && Math.abs(this.point.y - WORLD.stops[state.questionIndex]) < FEEL.questionRevealDistance) {
      this.runtime.visible(question.id);
    }
    if (question && state.phase === 'question') {
      const near = (['left', 'right'] as const).find(side => {
        const resident = residentPosition(state.questionIndex, side);
        return Math.hypot(resident.x - this.point.x, resident.y - this.point.y) < FEEL.interactionRadius;
      });
      if (!near) this.needsSeparation = false;
      if (near && !this.needsSeparation) {
        this.target = undefined;
        this.runtime.send({ type: 'approach', questionId: question.id, side: near });
      }
    }
    if (!question && Math.hypot(this.point.x - WORLD.exit.x, this.point.y - WORLD.exit.y) <= FEEL.arrivalRadius) {
      this.runtime.send({ type: 'exit', stageIndex: state.stageIndex });
    }
  }
}
