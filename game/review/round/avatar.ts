import Phaser from 'phaser';
import { FEEL } from '../../feel';
import type { Look } from '../../look';

export type HairPattern = 'solid'|'streak'|'mixed'|'temples';

export type ResidentDesign = {
  hairStyle?: 'bob'|'wave'|'curls'|'bun'|'part'|'cloud'|'forehead'|'shoulder'|'crop'|'lowTie';
  top?: 'cardigan'|'stripes'|'hoodie'|'apron'|'jacket'|'vest'|'shirt'|'blazer'|'knit';
  pants?: number;
  shoes?: number;
  glasses?: boolean;
  headAccessory?: 'none'|'headband'|'hairpin'|'ribbon'|'cap';
  hairColor?: number;
  hairAccent?: number;
  hairPattern?: HairPattern;
  brows?: boolean;
  beard?: boolean;
  smileLines?: boolean;
};

/** Flat shapes like the public game, with one shared round silhouette and walking rig. */
export class RoundResident {
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Container;
  private legs: Phaser.GameObjects.Container[];
  private eyes: Phaser.GameObjects.Arc[];
  private walkClock = 0;
  private idleClock = 0;
  constructor(scene: Phaser.Scene, look: Look, x: number, y: number, design: ResidentDesign = {}) {
    const s = scene.add;
    const pattern=design.hairPattern??'solid',accent=design.hairAccent??0xeee9df;
    let hair=design.hairColor??look.hair;
    if(pattern==='mixed')hair=Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(hair),Phaser.Display.Color.ValueToColor(accent),100,38).color;
    const skin=look.skin,coat=look.coat;
    const hairStyle=design.hairStyle??'bob',top=design.top??'cardigan';
    const back = s.graphics().fillStyle(hair);
    const backPath=new Phaser.Curves.Path(-17,-43)
      .cubicBezierTo(0,-61,-18,-56,-10,-61).cubicBezierTo(18,-42,13,-61,18,-53).lineTo(18,-32)
      .cubicBezierTo(8,-28,18,-26,12,-25).lineTo(-9,-28).cubicBezierTo(-18,-35,-16,-25,-19,-28).closePath();
    back.fillPoints(backPath.getPoints(18),true);
    if(hairStyle!=='bob') {
      back.clear().fillStyle(hair);
      if(hairStyle==='bun')back.fillCircle(2,-62,7.5).fillEllipse(0,-49,31,23);
      if(hairStyle==='cloud')back.fillCircle(-13,-43,6).fillCircle(13,-43,6).fillCircle(-10,-35,5).fillCircle(10,-35,5);
      if(hairStyle==='shoulder') {
        const shoulder=new Phaser.Curves.Path(-17,-43).cubicBezierTo(0,-61,-18,-57,-10,-61)
          .cubicBezierTo(18,-42,13,-61,18,-53).lineTo(19,-30)
          .cubicBezierTo(10,-26,21,-25,14,-24).lineTo(-11,-26)
          .cubicBezierTo(-19,-31,-17,-24,-21,-26).closePath();
        back.fillPoints(shoulder.getPoints(18),true);
      }
      if(hairStyle==='lowTie')back.fillEllipse(0,-49,31,24).fillEllipse(13,-31,12,11).fillCircle(16,-33,4);
    }
    this.legs = [-6,6].map(lx => s.container(lx,-6,[
      s.rectangle(0,0,10.5,8,design.pants??0x9e8574).setRounded(4),
      s.ellipse(0,5.5,12,5,design.shoes??0xfff8e8),
      s.rectangle(0,6.6,9,1.2,0xd3c2a9).setRounded(.6),
    ]));
    const sleeves = [-1,1].map(sign => {
      const arm = s.container(sign*12,-25);
      arm.add([
        s.ellipse(sign*2,6.5,10,18,top==='apron'?0xfff8e8:top==='vest'?0xf1c7bd:coat).setAngle(-sign*23),
        s.circle(sign*5,15,3.5,skin),
      ]);
      return arm;
    });
    const torso = s.ellipse(0,-18,32,26,top==='apron'?0xfff8e8:coat);
    const cardigan = s.graphics();
    const opening=new Phaser.Curves.Path(-4,-30).cubicBezierTo(-4,-9,-5,-24,-4,-17).lineTo(4,-9)
      .cubicBezierTo(4,-30,4,-17,5,-24).closePath();
    cardigan.fillStyle(0xfff8e8).fillPoints(opening.getPoints(12),true);
    cardigan.fillStyle(0xb56e5e,.65);
    for (const cy of [-24,-18,-12]) cardigan.fillCircle(7,cy,1.25);
    cardigan.fillStyle(0x755548,.09).fillEllipse(-7,-8,11,2).fillEllipse(9,-8,9,2);
    if(top!=='cardigan') {
      cardigan.clear();
      if(top==='stripes') {
        cardigan.fillStyle(0xfff8e8,.95);
        for(const [y,width] of [[-26,24],[-20,31],[-14,26]])cardigan.fillRoundedRect(-width/2,y,width,3.3,1.1);
      }
      if(top==='hoodie') {
        cardigan.fillStyle(0xfff8e8,.75).fillEllipse(0,-28,17,8);
        cardigan.fillStyle(coat).fillEllipse(0,-27,11,5);
        cardigan.lineStyle(1,0xfff8e8,.8).lineBetween(-3,-25,-3,-20).lineBetween(3,-25,3,-20);
        cardigan.fillStyle(0xffffff,.18).fillRoundedRect(-8,-16,16,7,3);
        cardigan.lineStyle(.8,0xffffff,.4).lineBetween(-5,-15,-7,-12).lineBetween(5,-15,7,-12);
      }
      if(top==='apron') {
        cardigan.fillStyle(coat).fillEllipse(0,-15,27,21).fillRoundedRect(-7,-28,14,17,3);
        cardigan.lineStyle(2,0xf5e8d0).lineBetween(-6,-29,-10,-17).lineBetween(6,-29,10,-17);
        cardigan.fillStyle(0xffffff,.3).fillRoundedRect(-5,-17,10,6,2);
      }
      if(top==='jacket') {
        cardigan.fillStyle(0xfff8e8,.85).fillTriangle(-8,-30,0,-26,-4,-22).fillTriangle(8,-30,0,-26,4,-22);
        cardigan.lineStyle(1.25,0xfff8e8,.85).lineBetween(0,-27,0,-7);
        cardigan.lineStyle(1.1,0x5d7f79,.45).lineBetween(-8,-18,-10,-12).lineBetween(8,-18,10,-12);
        cardigan.fillStyle(0xf8e8cb).fillCircle(0,-22,1.3);
      }
      if(top==='vest') {
        cardigan.fillStyle(0xfff8e8).fillTriangle(-7,-30,7,-30,0,-21);
        cardigan.fillStyle(0xf1c7bd).fillTriangle(-6,-30,0,-26,-3,-24).fillTriangle(6,-30,0,-26,3,-24);
        cardigan.fillStyle(0x8e697d,.7).fillCircle(0,-18,1.5).fillCircle(0,-12,1.5);
      }
    }
    if(top==='shirt') {
      cardigan.fillStyle(0xfff8e8,.9).fillTriangle(-8,-30,0,-25,-4,-21).fillTriangle(8,-30,0,-25,4,-21);
      cardigan.lineStyle(.8,0x8a725d,.4).lineBetween(0,-25,0,-7);
      cardigan.fillStyle(0x8a725d,.65);for(const cy of [-21,-16,-11])cardigan.fillCircle(0,cy,.9);
      cardigan.lineStyle(.8,0x8a725d,.35).strokeRoundedRect(5,-21,6,5,1);
    }
    if(top==='blazer') {
      cardigan.fillStyle(0xfff8e8).fillTriangle(-4,-30,4,-30,0,-8);
      cardigan.fillStyle(0xffffff,.25).fillTriangle(-10,-28,-4,-30,-2,-15).fillTriangle(10,-28,4,-30,2,-15);
      cardigan.fillStyle(0x5b6574,.55).fillCircle(3,-18,1.2).fillCircle(3,-12,1.2);
      cardigan.lineStyle(1,0x5b6574,.35).lineBetween(-11,-13,-6,-13).lineBetween(6,-13,11,-13);
    }
    if(top==='knit') {
      cardigan.lineStyle(2,0xfff8e8,.75).beginPath().arc(0,-31,6,0,Math.PI).strokePath();
      cardigan.lineStyle(1.2,0xfff8e8,.4).lineBetween(-8,-8,8,-8);
    }
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
    if(hairStyle!=='bob') {
      fringe.clear().fillStyle(hair);
      if(hairStyle==='wave') {
        const wave=new Phaser.Curves.Path(-16,-44).cubicBezierTo(-9,-57,-19,-51,-14,-57)
          .cubicBezierTo(4,-61,-10,-62,-2,-64).cubicBezierTo(15,-54,9,-65,17,-59)
          .cubicBezierTo(13,-41,21,-49,17,-42).lineTo(11,-47)
          .cubicBezierTo(2,-48,7,-51,5,-52).cubicBezierTo(-8,-47,-1,-44,-6,-45)
          .lineTo(-12,-41).closePath();
        fringe.fillPoints(wave.getPoints(18),true);
      }
      if(hairStyle==='curls') {
        for(const [cx,cy,r] of [[-14,-47,5],[-14,-54,5.5],[-8,-59,6],[0,-60,6],[8,-58,6],[14,-53,5.5],[14,-46,4.5]])fringe.fillCircle(cx,cy,r);
        fringe.fillEllipse(0,-52,28,14).fillCircle(-5,-47.5,3).fillCircle(5,-47.5,3);
      }
      if(hairStyle==='bun') {
        const pulled=new Phaser.Curves.Path(-15,-43).cubicBezierTo(0,-59,-16,-55,-8,-60)
          .cubicBezierTo(15,-44,12,-59,17,-51).lineTo(12,-43)
          .cubicBezierTo(-7,-48,9,-50,2,-54).lineTo(-13,-41).closePath();
        fringe.fillPoints(pulled.getPoints(18),true);
      }
      if(hairStyle==='part') {
        const parted=new Phaser.Curves.Path(-16,-43).cubicBezierTo(4,-60,-16,-56,-8,-62)
          .cubicBezierTo(15,-42,17,-60,18,-48).lineTo(12,-46)
          .cubicBezierTo(8,-54,10,-48,8,-51).cubicBezierTo(-12,-44,4,-48,-5,-45)
          .lineTo(-14,-39).closePath();
        fringe.fillPoints(parted.getPoints(18),true);
      }
      if(hairStyle==='cloud') {
        for(const [cx,cy,r] of [[-14,-49,6],[-10,-56,6.5],[-3,-59,6.5],[5,-58,6.5],[12,-54,6.5],[15,-47,5.5]])fringe.fillCircle(cx,cy,r);
        fringe.fillEllipse(0,-52,26,14);
      }
    }
    if(hairStyle==='forehead') {
      const forehead=new Phaser.Curves.Path(-16,-42).cubicBezierTo(-12,-55,-18,-47,-17,-53)
        .cubicBezierTo(11,-56,-7,-60,5,-60).cubicBezierTo(16,-42,17,-54,18,-47)
        .lineTo(12,-45).cubicBezierTo(-12,-45,12,-57,-10,-57).closePath();
      fringe.fillPoints(forehead.getPoints(18),true);
    }
    if(hairStyle==='shoulder') {
      const sweep=new Phaser.Curves.Path(-17,-43).cubicBezierTo(5,-60,-18,-56,-8,-63)
        .cubicBezierTo(17,-42,16,-59,19,-50).lineTo(13,-40)
        .cubicBezierTo(8,-54,13,-46,11,-51).cubicBezierTo(-13,-43,4,-49,-8,-46)
        .lineTo(-15,-38).closePath();
      fringe.fillPoints(sweep.getPoints(18),true);
    }
    if(hairStyle==='crop') {
      const crop=new Phaser.Curves.Path(-16,-43).cubicBezierTo(-10,-57,-17,-51,-15,-56)
        .cubicBezierTo(10,-57,-5,-60,5,-60).cubicBezierTo(16,-43,16,-55,18,-49)
        .lineTo(12,-44).lineTo(10,-51).cubicBezierTo(-11,-51,4,-53,-5,-53)
        .lineTo(-13,-42).closePath();
      fringe.fillPoints(crop.getPoints(18),true);
    }
    if(hairStyle==='lowTie') {
      const tied=new Phaser.Curves.Path(-16,-44).cubicBezierTo(2,-60,-17,-55,-7,-62)
        .cubicBezierTo(16,-43,15,-59,19,-50).lineTo(13,-39).lineTo(10,-49)
        .cubicBezierTo(-12,-46,4,-52,-4,-48).lineTo(-14,-39).closePath();
      fringe.fillPoints(tied.getPoints(18),true);
    }
    const openHairline=hairStyle==='forehead'||hairStyle==='crop';
    const curly=hairStyle==='curls'||hairStyle==='cloud';
    if(pattern==='streak') {
      const sidePart=hairStyle==='part'||hairStyle==='shoulder'||hairStyle==='lowTie';
      const x=sidePart?5:0,y=curly?-64:hairStyle==='wave'?-61:-59;
      const endX=sidePart?-9:-6,endY=openHairline?-53:hairStyle==='bob'?-47:-49;
      const streak=new Phaser.Curves.Path(x-1.5,y).lineTo(x+1.8,y+.4)
        .cubicBezierTo(endX+1.4,endY,x+1,y+5,endX+3,endY-3)
        .lineTo(endX-1.3,endY-1).cubicBezierTo(x-1.5,y,endX,endY-5,x-2,y+4).closePath();
      fringe.fillStyle(accent).fillPoints(streak.getPoints(16),true);
    }
    if(pattern==='mixed') {
      // Small broken locks follow the crown; exposed foreheads keep a shorter texture.
      const y=openHairline?-56.5:curly?-61:-57;
      fringe.lineStyle(1.15,accent,.75);
      for(const [x,dy] of [[-11,2],[-6,0],[0,-1],[6,0],[11,2]]) {
        const length=openHairline?1.7:4.5;
        const lock=new Phaser.Curves.Path(x,y+dy).cubicBezierTo(x-2,y+dy+length,x-.2,y+dy+1,x-1,y+dy+length-1);
        fringe.strokePoints(lock.getPoints(8),false);
      }
      if(!openHairline)for(const x of [-8,1,9])fringe.lineBetween(x,-53,x-1.2,-50.5);
      if(hairStyle==='bob'||hairStyle==='shoulder')back.lineStyle(1.3,accent,.8).lineBetween(-16,-39,-15,-33).lineBetween(16,-37,15,-31);
      if(hairStyle==='bun')back.lineStyle(1.4,accent,.8).lineBetween(1,-67,-1,-63).lineBetween(6,-65,4,-61);
      if(hairStyle==='lowTie')back.lineStyle(1.4,accent,.8).lineBetween(13,-35,16,-31);
    }
    if(pattern==='temples') {
      for(const sign of [-1,1]) {
        const temple=new Phaser.Curves.Path(sign*14.5,-48).lineTo(sign*12,-47)
          .cubicBezierTo(sign*13,-41,sign*12,-44,sign*12,-42).lineTo(sign*15,-43).closePath();
        fringe.fillStyle(accent).fillPoints(temple.getPoints(10),true);
      }
    }
    const accessory=s.graphics(),decoration=design.headAccessory??'none';
    const crown=hairStyle==='curls'||hairStyle==='cloud'?-64:hairStyle==='wave'?-63:hairStyle==='bun'?-62:-60;
    if(decoration==='headband'){
      const band=new Phaser.Curves.Path(-16,crown+13)
        .cubicBezierTo(16,crown+13,-15,crown-3,15,crown-3).lineTo(13,crown+15)
        .cubicBezierTo(-13,crown+15,13,crown+1,-13,crown+1).closePath();
      accessory.fillStyle(0xce8c91).fillPoints(band.getPoints(18),true);
    }
    if(decoration==='hairpin'){
      accessory.fillStyle(0xe2b561).fillRoundedRect(8,crown+10,9,3.5,1.75);
      accessory.lineStyle(.7,0xfff2cb).lineBetween(10,crown+11.3,15,crown+11.3);
    }
    if(decoration==='ribbon'){
      accessory.fillStyle(0xc98591).fillTriangle(-12,crown+3,-9,crown+4,-14,crown+9)
        .fillTriangle(-9,crown+4,-7,crown+3,-5,crown+9);
      accessory.fillStyle(0xe5a5ac).fillEllipse(-13,crown+2,8,7).fillEllipse(-6,crown+2,8,7);
      accessory.fillStyle(0xc98591).fillRoundedRect(-11,crown,4,4,1.4);
    }
    if(decoration==='cap'){
      const cap=new Phaser.Curves.Path(-18,crown+9)
        .cubicBezierTo(0,crown-8,-18,crown-3,-9,crown-8)
        .cubicBezierTo(18,crown+9,10,crown-8,18,crown-2).closePath();
      accessory.fillStyle(0x85a7b8).fillPoints(cap.getPoints(18),true);
      accessory.fillStyle(0x678d9f).fillRoundedRect(-18,crown+7,36,4,2).fillEllipse(8,crown+11,29,5);
      accessory.fillStyle(0xf7e5bf).fillRoundedRect(-3,crown-2,6,5,1.5);
    }
    this.eyes = [-4.8,4.8].map(ex => s.circle(ex,-41.5,1.75,0x39313b));
    const face = s.graphics();
    face.fillStyle(0xee9b90,.7).fillEllipse(-9.5,-37.4,6,4.5).fillEllipse(9.5,-37.4,6,4.5);
    face.fillStyle(0xe7a384,.7).fillCircle(0,-38.8,1);
    face.lineStyle(1.1,0x85554b).beginPath().arc(0,-36.2,2.3,.15,Math.PI-.15).strokePath();
    if(design.brows)face.lineStyle(1.25,look.hair,.8).lineBetween(-8,-46,-3.5,-46.4).lineBetween(3.5,-46.4,8,-46);
    if(design.smileLines)face.lineStyle(.65,0x98745f,.48).lineBetween(-9,-34.8,-8.1,-33.3).lineBetween(8.1,-33.3,9,-34.8);
    if(design.beard) {
      const beard=new Phaser.Curves.Path(-9,-34.7).cubicBezierTo(9,-34.7,-5,-31,5,-31)
        .cubicBezierTo(0,-29.3,7,-30.5,3,-29).cubicBezierTo(-9,-34.7,-3,-29,-7,-30.5).closePath();
      face.fillStyle(look.hair,.65).fillPoints(beard.getPoints(12),true);
    }
    if(design.glasses)face.lineStyle(.85,0x8b796a).strokeCircle(-4.8,-41.5,3.5).strokeCircle(4.8,-41.5,3.5).lineBetween(-1.3,-41.5,1.3,-41.5);
    this.body = s.container(0,0,[back,...this.legs,...sleeves,torso,cardigan,neck,...ears,head,fringe,accessory,...this.eyes,face]);
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
