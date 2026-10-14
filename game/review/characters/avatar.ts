import Phaser from 'phaser';
import { COLORS, poseAt, type Look } from './model';

const ATLAS_ROWS = [[0,.24,.423,.625,.875,1],[0,.425,.705,1]];
/** Generated sheets stay unchanged; derive tinted frames once, then reuse their GPU textures. */
export function registerParts(scene: Phaser.Scene) {
  for (let sheet=0;sheet<2;sheet++) {
    const image = scene.textures.get(`raw${sheet}`).getSourceImage() as HTMLImageElement;
    const texture = scene.textures.createCanvas(`parts${sheet}`, image.width, image.height)!;
    const ctx = texture.context;
    ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,image.width,image.height), pixels=data.data;
    for (let p=0;p<pixels.length;p+=4) {
      const hi=Math.max(pixels[p],pixels[p+1],pixels[p+2]), lo=Math.min(pixels[p],pixels[p+1],pixels[p+2]);
      if (hi-lo>35 || pixels[p+3]<100) { pixels[p+3]=0; continue; }
      // Pale neutral source gives each chosen pastel its own hue while retaining illustrated shading.
      const v=Math.round(125+(pixels[p]+pixels[p+1]+pixels[p+2])/3*.51);
      pixels[p]=pixels[p+1]=pixels[p+2]=v;
    }
    ctx.putImageData(data,0,0);texture.refresh();
    const rows=ATLAS_ROWS[sheet];
    for(let row=0;row<rows.length-1;row++) for(let col=0;col<4;col++) {
      const x0=Math.floor(col*image.width/4),x1=Math.floor((col+1)*image.width/4), y0=Math.floor(rows[row]*image.height),y1=Math.floor(rows[row+1]*image.height);
      const xs=new Uint16Array(x1-x0),ys=new Uint16Array(y1-y0);
      for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(pixels[(y*image.width+x)*4+3]>160){xs[x-x0]++;ys[y-y0]++;}
      const activeX=Array.from(xs, (n,i)=>n>Math.max(3,(y1-y0)*.012)?i:-1).filter(n=>n>=0);
      const activeY=Array.from(ys, (n,i)=>n>Math.max(3,(x1-x0)*.012)?i:-1).filter(n=>n>=0);
      if(!activeX.length || !activeY.length) throw new Error(`그림 조각을 찾지 못했어요: ${sheet}/${row}/${col}`);
      let x=x0+activeX[0],y=y0+activeY[0],w=activeX.at(-1)!-activeX[0]+1,h=activeY.at(-1)!-activeY[0]+1;
      const kind=['hair','top','sleeve','bottom','shoe'][row],name=`${kind}${col+(sheet?4:0)}`;
      // The generated torso panels retain sleeve edges; use the middle and animate separate sleeves.
      if(kind==='top'){x+=Math.floor(w*.21);w=Math.floor(w*.58);}
      texture.add(name,0,x,y,w,h);
      if(kind==='bottom' || kind==='shoe') {
        texture.add(`${name}L`,0,x,y,Math.floor(w/2),h);
        texture.add(`${name}R`,0,x+Math.floor(w/2),y,w-Math.floor(w/2),h);
      }
    }
  }
}

export class Avatar {
  root: Phaser.GameObjects.Container;
  body!: Phaser.GameObjects.Container;
  look: Look;
  private legs: Phaser.GameObjects.Container[]=[];
  private arms: Phaser.GameObjects.Container[]=[];
  private eyes: Phaser.GameObjects.Ellipse[]=[];
  constructor(private scene: Phaser.Scene, look:Look, x:number,y:number,readonly revisedHead=false,readonly cuteBody=false) {
    this.look={...look};this.root=scene.add.container(x,y).setDepth(y);
    this.root.add(scene.add.ellipse(0,2,27,6,0x66574e,.16));
    this.rebuild();
  }
  private image(kind:string,part:number,x:number,y:number,w:number,h:number,tint:number) {
    return this.scene.add.image(x,y,`parts${['hair','top','sleeve'].includes(kind) && part>=4?1:0}`,`${kind}${part%(['hair','top','sleeve'].includes(kind)?8:4)}`).setDisplaySize(w,h).setTint(tint);
  }
  setLook(look:Look) {this.look={...look};this.rebuild();}
  private rebuild() {
    this.body?.destroy();this.legs=[];this.arms=[];this.eyes=[];
    const s=this.scene.add,l=this.look,skin=COLORS.skin[l.skin];
    this.body=s.container(0,0);this.root.add(this.body);
    if(this.cuteBody){
      const coat=COLORS.topTone[l.topTone],bottom=COLORS.bottomTone[l.bottomTone],hand=0xffd3b0;
      for(let i=0;i<2;i++){
        const leg=s.container(i?5:-5,0);
        leg.add(s.rectangle(0,-3,[9,7,7,9.5][l.bottom],10,l.bottom===2?hand:bottom).setRounded(3.8));
        leg.add(s.ellipse(0,2,l.shoe===1?9:10,4.8,COLORS.shoeTone[l.shoeTone]));
        if(l.shoe===2)leg.add(s.rectangle(0,1,6,1,0x9d8272));
        this.legs.push(leg);this.body.add(leg);
      }
      if(l.bottom===2)this.body.add(s.rectangle(0,-6,27,14,bottom).setRounded(5));
      for(let i=0;i<2;i++){
        const arm=s.container(i?13:-13,-21);
        arm.add([s.rectangle(0,3,8,14,l.top===2?0xfff5df:coat).setRounded(4).setAngle(i?-10:10),s.circle(i?1:-1,11,3.7,hand)]);
        this.arms.push(arm);this.body.add(arm);
      }
      this.body.add(s.rectangle(0,-16,27,23,coat).setRounded(11));
      const details=s.graphics();
      if(l.top===0){details.fillStyle(0xfff7e7,.8);for(const y of [-22,-17,-12])details.fillRoundedRect(-11,y,22,2.5,1);}
      if(l.top===1||l.top===7){
        details.fillStyle(0xfff6e5).fillRoundedRect(-3,-26,6,18,2);
        details.fillStyle(coat).fillRoundedRect(0,-25,3,18,1);
        details.fillStyle(0x9b775c,.55);for(const y of [-21,-16,-11])details.fillCircle(4.5,y,1.1);
        if(l.top===7)details.fillStyle(0xffffff,.25).fillRoundedRect(-10,-20,5,5,1.5);
      }
      if(l.top===2||l.top===5)details.fillStyle(0xfff5df).fillTriangle(-7,-27,0,-23,-2,-19).fillTriangle(7,-27,0,-23,2,-19);
      if(l.top===3){details.lineStyle(1.4,0xfff6e5,.9).lineBetween(0,-25,0,-7);details.fillStyle(0xe8dac6).fillCircle(0,-21,1.5);}
      if(l.top===4){details.fillStyle(0xfff5df,.55).fillEllipse(0,-26,16,7);details.fillStyle(coat).fillEllipse(0,-24,10,5);details.fillStyle(0xffffff,.18).fillRoundedRect(-8,-13,16,5,2);}
      if(l.top===6)details.lineStyle(1.7,0xfff5df,.65).beginPath().arc(0,-27,6,0,Math.PI).strokePath();
      details.fillStyle(0x775d4c,.1).fillRoundedRect(-8,-6,16,1.5,1);
      this.body.add(details);
    }else{
    for(let i=0;i<2;i++) {
      const side=i?'R':'L',x=i?5.5:-5.5;
      const leg=s.container(x,0,[s.rectangle(0,-3,5,7,skin).setRounded(2)]);
      if(l.bottom!==2)leg.add(s.image(0,-7,'parts0',`bottom${l.bottom}${side}`).setDisplaySize(10.8,16).setTint(COLORS.bottomTone[l.bottomTone]));
      leg.add(s.image(0,1,'parts0',`shoe${l.shoe}${side}`).setDisplaySize(10.8,5.5).setTint(COLORS.shoeTone[l.shoeTone]));
      this.legs.push(leg);this.body.add(leg);
    }
    if(l.bottom===2)this.body.add(this.image('bottom',2,0,-7,24,17,COLORS.bottomTone[l.bottomTone]));
    for(let i=0;i<2;i++) {
      const sign=i?1:-1,arm=s.container(sign*9,-28);
      const sleeve=this.image('sleeve',l.top,sign*3,0,7,18,COLORS.topTone[l.topTone]).setOrigin(.5,0).setFlipX(!!i);
      arm.add([sleeve,s.circle(sign*4,18,3,skin)]);this.arms.push(arm);this.body.add(arm);
    }
    this.body.add(this.image('top',l.top,0,-19,21,23,COLORS.topTone[l.topTone]));
    }
    if(this.revisedHead){
      // Keep the complete approved face and hair in one texture, with its original aspect ratio and colours.
      const head=s.image(0,this.cuteBody?-24:-27,'head-bob','head').setOrigin(.5,1);
      head.setScale((this.cuteBody?42:36)/head.frame.width);
      this.body.add(head);
      return;
    }
    this.body.add([s.ellipse(0,-30,7,7,skin),s.ellipse(-14,-40,5,7,skin),s.ellipse(14,-40,5,7,skin),s.ellipse(0,-40,29,27,skin)]);
    const hairH=[24,30,28,35,30,37,40,41][l.hair];
    this.body.add(this.image('hair',l.hair,0,-59+hairH/2,32,hairH,COLORS.hairTone[l.hairTone]));
    const eyeY=-39.5,eyeH=l.face===2?2.9:3.8;
    this.eyes=[-4.9,4.9].map(x=>s.ellipse(x,eyeY,2.8,eyeH,0x3c3335));
    const face=s.graphics();
    face.lineStyle(.85,0x785b4d,.8).lineBetween(-7,-43.4,-3,-43.9).lineBetween(3,-43.9,7,-43.4);
    face.fillStyle(0xefaa98,.6).fillEllipse(-9.2,-35.9,5.3,3.3).fillEllipse(9.2,-35.9,5.3,3.3);
    face.fillStyle(0xd48c6b,.55).fillCircle(0,-36.6,1.1);
    if(l.face===1)face.fillStyle(0x9c6455).fillEllipse(0,-33.7,4.5,3.1).fillStyle(0xffe1c9).fillEllipse(0,-32.8,2.4,1.2);
    else face.lineStyle(1,0x83594c).beginPath().arc(0,-34,2.1,.15,Math.PI-.15,false).strokePath();
    if(l.glasses)face.lineStyle(.9,0x725f57).strokeRoundedRect(-8.5,-42,7,6,2.6).strokeRoundedRect(1.5,-42,7,6,2.6).lineBetween(-1.5,-39.8,1.5,-39.8);
    this.body.add([...this.eyes,face]);
  }
  setSize(size:number){this.root.setScale(size/62);}
  place(x:number,y:number){this.root.setPosition(x,y).setDepth(y);}
  animate(time:number,moving:boolean,reduced:boolean,dx=0,dy=0){
    const pose=poseAt(time,moving,reduced);
    this.legs[0].y=pose.leftFoot;this.legs[1].y=pose.rightFoot;
    this.arms[0].angle=pose.arm;this.arms[1].angle=-pose.arm;
    const length=Math.hypot(dx,dy)||1;
    this.eyes.forEach((eye,i)=>{eye.x=(i?4.9:-4.9)+dx/length*2.2;eye.y=-39.5+dy/length*1.4;});
    this.body.y=pose.bob;
    this.body.setScale(pose.scaleX,pose.scaleY);
  }
}
