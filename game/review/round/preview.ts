import '../characters/style.css';
import Phaser from 'phaser';
import { Dude, drawRoom } from '../../draw';
import { layoutRoom } from '../../room';
import { ROUTE } from '../../content';
import { FEEL } from '../../feel';
import { toLook } from '../../look';
import { RoundResident } from './avatar';

const W=Math.min(360,innerWidth),H=innerWidth<=650?Math.max(460,Math.min(640,innerHeight)):640;
const dpr=Math.min(devicePixelRatio||1,2),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const $=(id:string)=>document.getElementById(id)!;
document.querySelector<HTMLElement>('.world')!.style.aspectRatio=`${W}/${H}`;
let walking=!reduced.matches,zoomed=false,manual=false;
const keys=new Set<string>();

class ReviewScene extends Phaser.Scene {
  original!:Dude;
  revised!:RoundResident;
  position={x:0,y:0};
  private strollClock=0;
  target?:{x:number;y:number};
  marker!:Phaser.GameObjects.Ellipse;
  constructor(){super('journey');}
  create(){
    this.cameras.main.setOrigin(0,0).setZoom(dpr);
    const art=drawRoom(this,layoutRoom(W,H),0,ROUTE[0].ids[0],0,'광장');
    const background=this.add.renderTexture(0,0,W*dpr,H*dpr).setOrigin(0,0).setScale(1/dpr).setDepth(-100000);
    art.box.setScale(dpr);background.draw(art.box);background.render();art.destroy();
    // Keep the same first-room drawing branch used by the public game, after baking its background.
    this.data.set('character-preview-room',{active:true});
    const look=toLook([3,1,8,0]);
    this.original=new Dude(this,look,W*.3,H*.6);
    this.revised=new RoundResident(this,look,W*.7,H*.6);
    for(const [actor,text] of [[this.original,'공개판'],[this.revised,'새 동글형']] as const){
      const height=actor.root.getBounds().height;
      actor.root.setScale(56/height);
      const label=this.add.text(0,13/actor.root.scaleY,text,{fontFamily:'Malgun Gothic, sans-serif',fontSize:'11px',color:'#68594c',backgroundColor:'#fff8e8',padding:{x:6,y:3}}).setOrigin(.5,0).setResolution(dpr);
      label.setScale(1/actor.root.scaleX);actor.root.add(label);
    }
    this.marker=this.add.ellipse(0,0,34,9).setStrokeStyle(1,0x799d96,.8).setDepth(9000);
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const lane=p.x<W*.5?W*.3:W*.7;
      this.target={x:Phaser.Math.Clamp(p.x-lane,-W*.105,W*.105),y:Phaser.Math.Clamp(p.y-H*.6,220-H*.6,H-80-H*.6)};
      manual=true;
    });
    $('ready').hidden=true;
  }
  update(_time:number,rawDelta:number){
    if(!this.original)return;
    const dt=Math.min(rawDelta,FEEL.maxDeltaMs),old={...this.position};let moving=false;
    let dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
    const keyboard=Boolean(dx||dy);
    if(keyboard){manual=true;this.target=undefined;}
    else if(this.target){dx=this.target.x-this.position.x;dy=this.target.y-this.position.y;if(Math.hypot(dx,dy)<1){this.target=undefined;dx=dy=0;}}
    if(dx||dy){
      const length=Math.hypot(dx,dy),step=keyboard?FEEL.walkSpeed*dt/1000:Math.min(FEEL.walkSpeed*dt/1000,length);
      this.position.x=Phaser.Math.Clamp(this.position.x+dx/length*step,-W*.105,W*.105);
      this.position.y=Phaser.Math.Clamp(this.position.y+dy/length*step,220-H*.6,H-80-H*.6);
      moving=Math.hypot(this.position.x-old.x,this.position.y-old.y)>.01;
    }else if(walking&&!manual&&!reduced.matches){
      const t=(this.strollClock+=dt)/3800*Math.PI*2;
      this.position={x:Math.sin(t)*24,y:Math.sin(t*2)*14};moving=true;
    }
    const actors=[this.original,this.revised];
    actors.forEach((actor,i)=>{
      const x=W*(i?.7:.3)+this.position.x,y=H*.6+this.position.y;
      if(actor instanceof Dude)actor.place({x,y});else actor.place(x,y);
      actor.look(this.position.x-old.x,this.position.y-old.y);actor.walk(dt,moving,reduced.matches);
    });
    this.marker.setPosition(this.revised.root.x,this.revised.root.y+2);
    if(zoomed)this.frame();
  }
  frame(){
    const zoom=zoomed?1.8:1;
    this.cameras.main.setZoom(dpr*zoom).setScroll(zoomed?W/2+this.position.x-W/2/zoom:0,zoomed?H*.6+this.position.y-28-H*.48/zoom:0);
  }
  reset(){this.position={x:0,y:0};this.strollClock=0;this.target=undefined;manual=false;keys.clear();}
}
const scene=new ReviewScene();
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',backgroundColor:'#e4e5ca',width:W*dpr,height:H*dpr,scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true},audio:{noAudio:true},banner:false,scene});
function updateWalk(){
  $('walk').setAttribute('aria-pressed',String(walking));$('walk').textContent=walking?'산책 멈추기':'산책 시작하기';
}
$('walk').onclick=()=>{walking=!walking;scene.reset();updateWalk();};
$('zoom').onclick=()=>{zoomed=!zoomed;$('zoom').setAttribute('aria-pressed',String(zoomed));$('zoom').textContent=zoomed?'실제 크기로':'크게 비교';scene.frame();};
$('reset').onclick=()=>scene.reset();
window.addEventListener('keydown',event=>{if(event.key.startsWith('Arrow')){event.preventDefault();keys.add(event.key);}});
window.addEventListener('keyup',event=>keys.delete(event.key));window.addEventListener('blur',()=>keys.clear());
reduced.addEventListener('change',()=>{walking=!reduced.matches;scene.reset();updateWalk();});updateWalk();
