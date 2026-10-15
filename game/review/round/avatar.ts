import Phaser from 'phaser';
import { FEEL } from '../../feel';
import type { Look } from '../../look';

/** One review resident: flat shapes like the public game, with the approved round silhouette. */
export class RoundResident {
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Container;
  private legs: Phaser.GameObjects.Container[];
  private eyes: Phaser.GameObjects.Arc[];
  private walkClock = 0;
  private idleClock = 0;
  constructor(scene: Phaser.Scene, look: Look, x: number, y: number) {
    const s = scene.add;
    const hair = look.hair, skin = look.skin, coat = look.coat;
    const back = s.graphics().fillStyle(hair);
    const backPath=new Phaser.Curves.Path(-17,-43)
      .cubicBezierTo(0,-61,-18,-56,-10,-61).cubicBezierTo(18,-42,13,-61,18,-53).lineTo(18,-32)
      .cubicBezierTo(8,-28,18,-26,12,-25).lineTo(-9,-28).cubicBezierTo(-18,-35,-16,-25,-19,-28).closePath();
    back.fillPoints(backPath.getPoints(18),true);
    this.legs = [-6,6].map(lx => s.container(lx,-6,[
      s.rectangle(0,0,10.5,8,0x9e8574).setRounded(4),
      s.ellipse(0,5.5,12,5,0xfff8e8),
      s.rectangle(0,6.6,9,1.2,0xd3c2a9).setRounded(.6),
    ]));
    const sleeves = [-1,1].map(sign => {
      const arm = s.container(sign*12,-25);
      arm.add([
        s.ellipse(sign*2,6.5,10,18,coat).setAngle(-sign*23),
        s.circle(sign*5,15,3.5,skin),
      ]);
      return arm;
    });
    const torso = s.ellipse(0,-18,32,26,coat);
    const cardigan = s.graphics();
    const opening=new Phaser.Curves.Path(-4,-30).cubicBezierTo(-4,-9,-5,-24,-4,-17).lineTo(4,-9)
      .cubicBezierTo(4,-30,4,-17,5,-24).closePath();
    cardigan.fillStyle(0xfff8e8).fillPoints(opening.getPoints(12),true);
    cardigan.fillStyle(0xb56e5e,.65);
    for (const cy of [-24,-18,-12]) cardigan.fillCircle(7,cy,1.25);
    cardigan.fillStyle(0x755548,.09).fillEllipse(-7,-8,11,2).fillEllipse(9,-8,9,2);
    const neck = s.ellipse(0,-30,8,5,skin);
    const ears = [-14,14].map(ex => s.circle(ex,-40,3.5,skin));
    const head = s.ellipse(0,-42,29,26,skin);
    const fringe = s.graphics().fillStyle(hair);
    const fringePath=new Phaser.Curves.Path(-17,-43)
      .cubicBezierTo(0,-61,-17,-56,-10,-61).cubicBezierTo(17,-43,12,-61,17,-53).lineTo(14,-38)
      .cubicBezierTo(8,-48,13,-42,10,-43).cubicBezierTo(2,-42,8,-41,5,-40)
      .cubicBezierTo(-3,-50,0,-43,-2,-47).cubicBezierTo(-12,-42,-5,-45,-9,-44)
      .lineTo(-14,-38).closePath();
    fringe.fillPoints(fringePath.getPoints(18),true);
    this.eyes = [-4.8,4.8].map(ex => s.circle(ex,-41.5,1.75,0x39313b));
    const face = s.graphics();
    face.fillStyle(0xee9b90,.7).fillEllipse(-9.5,-37.4,6,4.5).fillEllipse(9.5,-37.4,6,4.5);
    face.fillStyle(0xe7a384,.7).fillCircle(0,-38.8,1);
    face.lineStyle(1.1,0x85554b).beginPath().arc(0,-36.2,2.3,.15,Math.PI-.15).strokePath();
    this.body = s.container(0,0,[back,...this.legs,...sleeves,torso,cardigan,neck,...ears,head,fringe,...this.eyes,face]);
    this.root = s.container(x,y,[s.ellipse(0,0,32,7,0x756956,.17),this.body]);
  }
  place(x:number,y:number) { this.root.setPosition(x,y).setDepth(y); }
  look(dx:number,dy:number) {
    const length=Math.hypot(dx,dy)||1;
    this.eyes.forEach((eye,i)=>eye.setPosition((i?4.8:-4.8)+dx/length*2.2,-41.5+dy/length*1.4));
  }
  /** Match Dude.walk's existing feet, breathing and bounce; keep the arms quiet. */
  walk(dtMs:number,moving:boolean,reduced:boolean) {
    if(!moving||reduced) {
      this.walkClock=0;this.legs.forEach(leg=>leg.setY(-6));
      const breath=reduced?0:Math.sin((this.idleClock+=dtMs)/520)*.025;
      this.body.setY(0).setScale(1-breath*.5,1+breath);return;
    }
    this.walkClock+=dtMs;
    const phase=this.walkClock/FEEL.stepMs*Math.PI*2;
    this.legs[0].setY(-6-Math.max(0,Math.sin(phase))*3);
    this.legs[1].setY(-6-Math.max(0,-Math.sin(phase))*3);
    this.body.setY(-Math.abs(Math.sin(phase))*FEEL.bobPx);
    this.body.setScale(1+Math.cos(phase*2)*FEEL.squash*.5,1);
  }
}
