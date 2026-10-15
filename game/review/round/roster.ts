import '../characters/style.css';
import './roster.css';
import Phaser from 'phaser';
import { drawRoom } from '../../draw';
import { layoutRoom } from '../../room';
import { ROUTE } from '../../content';
import { FEEL } from '../../feel';
import { toLook, type Pick } from '../../look';
import { RoundResident, type ResidentDesign } from './avatar';

const residents:{name:string;description:string;pick:Pick;design:ResidentDesign}[]=[
  {name:'단발 · 가디건',description:'볼이 드러나는 둥근 단발과 앞이 열린 가디건.',pick:[3,1,8,0],design:{}},
  {name:'웨이브 · 줄무늬',description:'짧고 부드러운 웨이브, 넓은 줄무늬 맨투맨.',pick:[1,2,1,1],design:{hairStyle:'wave',top:'stripes',pants:0x718397}},
  {name:'곱슬 · 후드',description:'몽글몽글한 곱슬머리, 둥근 후드와 앞주머니.',pick:[1,0,5,2],design:{hairStyle:'curls',top:'hoodie',pants:0x747c89}},
  {name:'올림머리 · 앞치마',description:'위로 묶은 머리와 밝은 소매, 초록 앞치마.',pick:[2,1,3,1],design:{hairStyle:'bun',top:'apron',pants:0x9a8c79}},
  {name:'가르마 · 점퍼',description:'옆으로 넘긴 머리, 깃과 지퍼가 있는 점퍼.',pick:[1,0,7,0],design:{hairStyle:'part',top:'jacket',pants:0x677580}},
  {name:'은빛 파마 · 조끼',description:'둥근 은빛 파마와 안경, 블라우스 위의 조끼.',pick:[1,3,4,1],design:{hairStyle:'silver',top:'vest',pants:0x82756f,shoes:0x756159,glasses:true}},
];
const W=Math.min(360,innerWidth),H=innerWidth<=650?Math.max(460,Math.min(640,innerHeight)):640;
const dpr=Math.min(devicePixelRatio||1,2),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const $=(id:string)=>document.getElementById(id)!;
document.querySelector<HTMLElement>('.world')!.style.aspectRatio=`${W}/${H}`;
let walking=!reduced.matches,zoomed=false,selected=0;
const keys=new Set<string>();
type ResidentEntry={actor:RoundResident;anchor:{x:number;y:number};manual:boolean;target?:{x:number;y:number}};

class RosterScene extends Phaser.Scene {
  entries:ResidentEntry[]=[];
  private clock=0;
  marker!:Phaser.GameObjects.Ellipse;
  constructor(){super('round-roster');}
  create(){
    this.cameras.main.setOrigin(0,0).setZoom(dpr);
    const art=drawRoom(this,layoutRoom(W,H),0,ROUTE[0].ids[0],0,'광장');
    const background=this.add.renderTexture(0,0,W*dpr,H*dpr).setOrigin(0,0).setScale(1/dpr).setDepth(-100000);
    art.box.setScale(dpr);background.draw(art.box);background.render();art.destroy();
    residents.forEach((resident,i)=>{
      const anchor={x:W*[.2,.5,.8][i%3],y:H*(i<3?.53:.77)};
      const actor=new RoundResident(this,toLook(resident.pick),anchor.x,anchor.y,resident.design);
      // Keep body/face proportions identical; an updo may naturally stand a little taller.
      actor.root.setScale(56/64);
      const label=this.add.text(0,15/actor.root.scaleY,resident.name,{fontFamily:'Malgun Gothic, sans-serif',fontSize:'9px',color:'#68594c',backgroundColor:'#fff8e8',padding:{x:4,y:3}}).setOrigin(.5,0).setResolution(dpr);
      label.setScale(1/actor.root.scaleX);actor.root.add(label);
      this.entries.push({actor,anchor,manual:false});
    });
    this.marker=this.add.ellipse(0,0,36,9).setStrokeStyle(1.2,0x799d96,.9).setDepth(9000);
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const hit=this.entries.findIndex(({actor})=>Math.hypot(p.x-actor.root.x,p.y-(actor.root.y-27))<25);
      if(hit>=0){select(hit);return;}
      const entry=this.entries[selected];entry.manual=true;
      entry.target={x:Phaser.Math.Clamp(p.x,26,W-26),y:Phaser.Math.Clamp(p.y,220,H-76)};
    });
    $('ready').hidden=true;select(0);
  }
  update(_time:number,rawDelta:number){
    const dt=Math.min(rawDelta,FEEL.maxDeltaMs);this.clock+=dt;
    this.entries.forEach((entry,i)=>{
      const actor=entry.actor,old={x:actor.root.x,y:actor.root.y};let x=old.x,y=old.y,moving=false;
      let dx=i===selected?(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0):0;
      let dy=i===selected?(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0):0;
      const keyboard=Boolean(dx||dy);
      if(keyboard){entry.manual=true;entry.target=undefined;}
      else if(entry.target){dx=entry.target.x-x;dy=entry.target.y-y;if(Math.hypot(dx,dy)<1){entry.target=undefined;dx=dy=0;}}
      if(dx||dy){
        const length=Math.hypot(dx,dy),distance=keyboard?FEEL.walkSpeed*dt/1000:Math.min(FEEL.walkSpeed*dt/1000,length);
        x=Phaser.Math.Clamp(x+dx/length*distance,26,W-26);y=Phaser.Math.Clamp(y+dy/length*distance,220,H-76);
        moving=Math.hypot(x-old.x,y-old.y)>.01;
      }else if(walking&&!entry.manual&&!reduced.matches){
        const phase=this.clock/4200*Math.PI*2*(1+i*.06);
        x=entry.anchor.x+Math.sin(phase)*9;y=entry.anchor.y+Math.sin(phase*2)*6;moving=true;
      }
      actor.place(x,y);actor.look(x-old.x,y-old.y);actor.walk(dt,moving,reduced.matches);
    });
    const actor=this.entries[selected]?.actor;
    if(actor){this.marker.setPosition(actor.root.x,actor.root.y+2);if(zoomed)this.frame();}
  }
  frame(){
    const actor=this.entries[selected]?.actor;if(!actor)return;
    const zoom=zoomed?2.8:1;
    this.cameras.main.setZoom(dpr*zoom).setScroll(zoomed?actor.root.x-W/2/zoom:0,zoomed?actor.root.y-28-H*.46/zoom:0);
  }
  reset(){this.clock=0;keys.clear();for(const entry of this.entries){entry.manual=false;entry.target=undefined;entry.actor.place(entry.anchor.x,entry.anchor.y);}}
}
const scene=new RosterScene();
residents.forEach((resident,i)=>{
  const button=document.createElement('button');button.type='button';button.dataset.resident=String(i);
  button.textContent=`${i+1} · ${resident.name}`;button.onclick=()=>{
    select(i);
    if(zoomed&&innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
  };$('residents').append(button);
});
function select(index:number){
  selected=index;keys.clear();$('who').textContent=residents[index].name;$('description').textContent=residents[index].description;
  document.querySelectorAll<HTMLButtonElement>('[data-resident]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.resident)===index)));
  if(zoomed)scene.frame();
}
function updateWalk(){$('walk').setAttribute('aria-pressed',String(walking));$('walk').textContent=walking?'산책 멈추기':'산책 시작하기';}
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',backgroundColor:'#e4e5ca',width:W*dpr,height:H*dpr,scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true},audio:{noAudio:true},banner:false,scene});
$('walk').onclick=()=>{walking=!walking;scene.reset();updateWalk();};
$('zoom').onclick=()=>{
  zoomed=!zoomed;$('zoom').setAttribute('aria-pressed',String(zoomed));$('zoom').textContent=zoomed?'여섯 명 같이 보기':'크게 보기';scene.frame();
  if(innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
};
$('reset').onclick=()=>scene.reset();
window.addEventListener('keydown',event=>{if(event.key.startsWith('Arrow')){event.preventDefault();keys.add(event.key);}});
window.addEventListener('keyup',event=>keys.delete(event.key));window.addEventListener('blur',()=>keys.clear());
reduced.addEventListener('change',()=>{walking=!reduced.matches;scene.reset();updateWalk();});updateWalk();
