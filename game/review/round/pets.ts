import Phaser from 'phaser';
import { petPoseAt, type PetKind } from './pet-motion';

/** Preserve draw.ts's public cat face: small eyes, short head, whiskers and stripes. */
function petHead(scene:Phaser.Scene,kind:PetKind,fur:number){
  const s=scene.add,cat=kind==='cat',face=s.graphics();
  if(cat){
    face.fillStyle(fur).fillTriangle(-11,-1,-10,-11,-3,-5).fillTriangle(5,-5,12,-11,13,0);
    face.fillStyle(0xe9a4a1).fillTriangle(-9,-4,-9,-8,-6,-5).fillTriangle(7,-5,11,-8,11,-4);
    face.fillStyle(0x514651,.4).fillRoundedRect(-3,-7,2,4,1).fillRoundedRect(1,-7,2,4,1);
    face.lineStyle(1,0x514651,.7).lineBetween(-10,3,-6,4).lineBetween(7,4,11,3);
  }
  face.lineStyle(1,0x514651,.7).lineBetween(0,5,-2,6).lineBetween(0,5,2,6);
  const eyes=[-4.5,4.5].map(x=>s.circle(x,0,1.2,0x332e38));
  const tongue=s.ellipse(0,6.5,1.6,1.5,0xe5959e).setVisible(false);
  const ears=cat?[]:[s.ellipse(-11.5,0,8,15,0xa38167),s.ellipse(11.5,0,8,15,0xa38167)];
  const root=s.container(0,0,[...ears,s.ellipse(0,0,24,20,fur),
    ...(cat?[]:[s.ellipse(0,4,11,7,0xfff5e6,.8)]),face,...eyes,
    s.ellipse(-8,3,4,2.5,0xef9d99,.7),s.ellipse(9,3,4,2.5,0xef9d99,.7),
    cat?s.triangle(0,4,0,0,3,0,1.5,2,0xb96f76):s.ellipse(0,3.4,3.2,2.5,0x665047),tongue]);
  return {root,eyes,tongue};
}

/** Seated public-game proportions; every action stays at the original spot. */
export class RoundPet {
  readonly root:Phaser.GameObjects.Container;
  private body:Phaser.GameObjects.Container;
  private head:ReturnType<typeof petHead>;
  private tail:Phaser.GameObjects.Rectangle;
  private paw:Phaser.GameObjects.Ellipse;
  private feet:Phaser.GameObjects.Ellipse[];
  private clock=0;
  constructor(scene:Phaser.Scene,readonly kind:PetKind,private anchor:{x:number;y:number},scale=1){
    const s=scene.add,cat=kind==='cat',fur=cat?0xf0a04b:0xc9a27c,cream=0xfff5e6;
    this.tail=s.rectangle(10,-3,5,cat?16:11,fur).setRounded(2.5).setOrigin(.5,1);
    this.feet=[-7,5].map(x=>s.ellipse(x,-2,7,4,cream,.9));
    this.head=petHead(scene,kind,fur);
    this.paw=s.ellipse(-7,-2,5,4,cream,.9).setVisible(false);
    this.body=s.container(0,0,[this.tail,s.ellipse(1,-8,22,18,fur),s.ellipse(0,-7,12,12,cream,.7),
      this.head.root,...this.feet,this.paw]);
    this.root=s.container(anchor.x,anchor.y,[s.ellipse(0,1,27,7,0x756956,.15),this.body])
      .setScale(scale).setDepth(anchor.y).setName('round-pet-'+kind);
    this.reset();
  }
  reset(time=this.kind==='cat'?0:9000){this.clock=time;this.step(0,false);}
  step(deltaMs:number,reduced:boolean){
    if(!reduced&&Number.isFinite(deltaMs))this.clock+=Math.max(0,Math.min(deltaMs,50));
    const pose=petPoseAt(this.clock,this.kind,reduced);
    this.root.setPosition(this.anchor.x,this.anchor.y);
    this.body.setScale(1-pose.breath*.4,1+pose.breath);
    this.head.root.setPosition(-2,-18+pose.headY).setAngle(pose.headAngle);
    this.tail.setAngle(pose.tailAngle);
    this.feet.forEach((foot,i)=>foot.setAlpha(i===(this.kind==='cat'?0:1)?.9*(1-pose.groom):.9));
    this.paw.setVisible(pose.groom>0).setAlpha(pose.groom*.9).setPosition(pose.pawX,pose.pawY).setAngle(pose.pawAngle);
    this.head.tongue.setVisible(this.kind==='cat'&&pose.groom>.5);
    this.head.eyes.forEach(eye=>eye.setScale(1,pose.eyes));
  }
}
