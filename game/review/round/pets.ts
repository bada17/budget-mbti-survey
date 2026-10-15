import Phaser from 'phaser';
import { petPoseAt, type PetKind } from './pet-motion';

/** Review art only. Each pet stays within a few steps of its original spot. */
export class RoundPet {
  readonly root:Phaser.GameObjects.Container;
  private body:Phaser.GameObjects.Container;
  private head:Phaser.GameObjects.Container;
  private tail:Phaser.GameObjects.Container;
  private paw:Phaser.GameObjects.Ellipse;
  private tongue:Phaser.GameObjects.Ellipse;
  private feet:Phaser.GameObjects.Ellipse[];
  private eyes:Phaser.GameObjects.Arc[];
  private clock=0;
  constructor(scene:Phaser.Scene,readonly kind:PetKind,private anchor:{x:number;y:number},scale=1){
    const s=scene.add,cat=kind==='cat',fur=cat?0xe4aa76:0xd3b087,cream=0xfff2dc;
    const tailArt=s.graphics();
    if(cat){
      const curve=new Phaser.Curves.Path(0,0).cubicBezierTo(5,-13,9,-1,10,-11);
      tailArt.lineStyle(5,fur).strokePoints(curve.getPoints(14),false).fillStyle(fur).fillCircle(5,-13,2.5);
    }else tailArt.fillStyle(0xa77960).fillEllipse(0,-6,6,14);
    this.tail=s.container(11,-7,[tailArt]);
    this.feet=[-7,7].map(x=>s.ellipse(x,-1,9,5,cream));
    const ears=s.graphics();
    if(cat){
      ears.fillStyle(fur).fillTriangle(-14,-5,-12,-18,-3,-9).fillTriangle(3,-9,12,-18,14,-5);
      ears.fillStyle(0xe9a6a0).fillTriangle(-11,-8,-11,-14,-6,-9).fillTriangle(6,-9,11,-14,11,-8);
    }else ears.fillStyle(0xa77960).fillEllipse(-13,0,10,20).fillEllipse(13,0,10,20);
    const face=s.graphics();
    face.fillStyle(0xeca49b,.65).fillEllipse(-10,3,5,3).fillEllipse(10,3,5,3);
    face.fillStyle(cat?0xb87879:0x6c5148).fillEllipse(0,3,3.5,2.8);
    face.lineStyle(.9,0x805b51).beginPath().arc(0,5.3,2.8,.1,Math.PI-.1).strokePath();
    if(cat)face.lineStyle(.7,0x805b51,.65).lineBetween(-13,2,-9,3).lineBetween(9,3,13,2);
    this.eyes=[-5,5].map(x=>s.circle(x,-2,1.65,0x39313b));
    this.tongue=s.ellipse(0,6.5,3,3,0xe5959e).setVisible(false);
    this.head=s.container(0,-25,[ears,s.ellipse(0,-1,29,25,fur),
      ...(cat?[]:[s.ellipse(5,0,12,16,cream,.5)]),
      s.ellipse(0,4.5,cat?12:16,8,cream),...this.eyes,face,this.tongue]);
    this.paw=s.ellipse(cat?-7:7,-1,7,5,cream).setVisible(false);
    this.body=s.container(0,0,[this.tail,s.ellipse(0,-10,24,21,fur),s.ellipse(0,-9,13,14,cream,.8),
      ...this.feet,this.head,this.paw]);
    this.root=s.container(anchor.x,anchor.y,[s.ellipse(0,1,28,7,0x756956,.15),this.body])
      .setScale(scale).setDepth(anchor.y).setName('round-pet-'+kind);
    this.reset();
  }
  reset(time=this.kind==='cat'?0:9000){this.clock=time;this.step(0,false);}
  step(deltaMs:number,reduced:boolean){
    if(!reduced&&Number.isFinite(deltaMs))this.clock+=Math.max(0,Math.min(deltaMs,50));
    const pose=petPoseAt(this.clock,this.kind,reduced);
    this.root.setPosition(this.anchor.x+pose.dx*this.root.scaleX,this.anchor.y);
    this.body.setY(pose.bodyY).setScale(1-pose.breath*.4,1+pose.breath);
    this.head.setY(-25+pose.headY).setAngle(pose.headAngle);this.tail.setAngle(pose.tailAngle);
    this.feet.forEach((foot,i)=>foot.setY(-1+(i?pose.rightFoot:pose.leftFoot))
      .setAlpha(i===(this.kind==='cat'?0:1)?1-pose.groom:1));
    this.paw.setVisible(pose.groom>0).setAlpha(pose.groom).setPosition(pose.pawX,pose.pawY).setAngle(pose.pawAngle);
    this.tongue.setVisible(this.kind==='cat'&&pose.groom>.5);
    this.eyes.forEach(eye=>eye.setScale(1,pose.eyes));
  }
}
