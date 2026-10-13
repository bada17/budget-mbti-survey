import Phaser from 'phaser';
import { ATLAS_URL, ART } from '../art';
import type { Runtime } from './JourneyScene';

export class BootScene extends Phaser.Scene {
  private failed = false;
  constructor(private runtime: Runtime) { super('boot'); }
  preload() {
    this.failed = false;
    this.load.once('loaderror', () => { this.failed = true; this.runtime.onError(); });
    this.load.spritesheet('urban', ATLAS_URL, { frameWidth: ART.tileSize, frameHeight: ART.tileSize });
  }
  create() { if (!this.failed) this.scene.start('journey'); }
}
