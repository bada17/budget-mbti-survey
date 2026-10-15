import '../characters/style.css';
import './roster.css';
import Phaser from 'phaser';
import { drawRoom } from '../../draw';
import { layoutRoom } from '../../room';
import { ROUTE } from '../../content';
import { FEEL } from '../../feel';
import { toLook, type Pick } from '../../look';
import { RoundResident, type ResidentDesign, type HairPattern } from './avatar';

const showAdults=location.pathname.endsWith('/adults.html');
const residents:{name:string;description:string;pick:Pick;design:ResidentDesign}[]=[
  {name:'단발 · 가디건',description:'볼이 드러나는 둥근 단발과 앞이 열린 가디건.',pick:[3,1,8,0],design:{}},
  {name:'웨이브 · 줄무늬',description:'짧고 부드러운 웨이브, 넓은 줄무늬 맨투맨.',pick:[1,2,1,1],design:{hairStyle:'wave',hairPattern:'streak',top:'stripes',pants:0x718397}},
  {name:'곱슬 · 후드',description:'몽글몽글한 곱슬머리, 둥근 후드와 앞주머니. 젊고 편안한 느낌의 차림이에요.',pick:[1,0,5,2],design:{hairStyle:'curls',hairColor:0xb9beca,top:'hoodie',pants:0x747c89}},
  {name:'올림머리 · 앞치마',description:'위로 묶은 머리와 밝은 소매, 초록 앞치마.',pick:[2,1,3,1],design:{hairStyle:'bun',top:'apron',pants:0x9a8c79}},
  {name:'가르마 · 점퍼',description:'옆으로 넘긴 머리, 깃과 지퍼가 있는 점퍼.',pick:[1,0,7,0],design:{hairStyle:'part',top:'jacket',pants:0x677580}},
  {name:'둥근 파마 · 조끼',description:'둥근 파마와 안경, 블라우스 위의 조끼.',pick:[1,1,4,1],design:{hairStyle:'cloud',hairColor:0xb9beca,top:'vest',pants:0x82756f,shoes:0x756159,glasses:true,brows:true}},
];
if(showAdults)residents.push(
  {name:'넓은 이마 · 셔츠',description:'이마를 드러낸 짧은 머리와 단정한 눈썹, 셔츠 차림의 중년.',pick:[1,1,10,1],design:{hairStyle:'forehead',top:'shirt',pants:0x777b83,brows:true,smileLines:true}},
  {name:'어깨 단발 · 재킷',description:'어깨 쪽으로 둥글게 내려오는 단발과 재킷, 부드러운 미소선.',pick:[3,1,9,0],design:{hairStyle:'shoulder',hairPattern:'streak',top:'blazer',pants:0x767584,brows:true,smileLines:true}},
  {name:'웨이브 · 니트',description:'부드러운 웨이브와 둥근 니트. 안경을 쓴 중년 주민.',pick:[1,0,5,2],design:{hairStyle:'wave',hairPattern:'mixed',top:'knit',pants:0x7f7c76,glasses:true,brows:true,smileLines:true}},
  {name:'짧은 수염 · 점퍼',description:'짧게 정리한 머리와 작은 턱수염, 편안한 점퍼를 입은 중년.',pick:[1,1,3,1],design:{hairStyle:'crop',top:'jacket',pants:0x737987,brows:true,beard:true}},
  {name:'낮은 묶음 · 앞치마',description:'낮게 묶은 머리와 밝은 앞치마, 부드러운 미소.',pick:[2,0,2,1],design:{hairStyle:'lowTie',hairColor:0xeee9df,top:'apron',pants:0x8e8074,brows:true,smileLines:true}},
  {name:'짧은 파마 · 가디건',description:'짧은 파마, 안경과 가디건의 포근한 중년.',pick:[1,1,7,0],design:{hairStyle:'curls',hairPattern:'temples',top:'cardigan',pants:0x81766c,glasses:true,brows:true,smileLines:true}},
);
const hairColors:{color:number;label:string}[]=[
  {color:0x2e2e3a,label:'검정'},{color:0x3b2b25,label:'흑갈색'},{color:0x6b4a32,label:'갈색'},
  {color:0xa67b55,label:'밝은갈색'},{color:0xcaa665,label:'금색'},{color:0x8a3d2e,label:'적갈색'},
  {color:0x80465b,label:'버건디'},{color:0xd69aaa,label:'분홍'},{color:0xa795c8,label:'보라'},
  {color:0x7393bf,label:'파랑'},{color:0x86b9a5,label:'민트'},
  {color:0xb9beca,label:'은색'},{color:0xeee9df,label:'흰색'},
];
const hairPatterns:{value:HairPattern;label:string}[]=[
  {value:'solid',label:'전체 단색'},{value:'streak',label:'앞머리 한 줄'},
  {value:'mixed',label:'고루 섞기'},{value:'temples',label:'양옆 포인트'},
];
const hairStyles:{value:NonNullable<ResidentDesign['hairStyle']>;label:string}[]=[
  {value:'bob',label:'단발'},{value:'wave',label:'웨이브'},{value:'curls',label:'곱슬'},
  {value:'bun',label:'올림머리'},{value:'part',label:'가르마'},{value:'cloud',label:'둥근 파마'},
  {value:'forehead',label:'넓은 이마'},{value:'shoulder',label:'어깨 단발'},
  {value:'crop',label:'짧은 머리'},{value:'lowTie',label:'낮은 묶음'},
];
const tops:{value:NonNullable<ResidentDesign['top']>;label:string}[]=[
  {value:'cardigan',label:'가디건'},{value:'stripes',label:'줄무늬'},{value:'hoodie',label:'후드'},
  {value:'apron',label:'앞치마'},{value:'jacket',label:'점퍼'},{value:'vest',label:'조끼'},
  {value:'shirt',label:'셔츠'},{value:'blazer',label:'정장 재킷'},{value:'knit',label:'니트'},
];
const headAccessories:{value:NonNullable<ResidentDesign['headAccessory']>;label:string}[]=[
  {value:'none',label:'없음'},{value:'headband',label:'머리띠'},{value:'hairpin',label:'머리핀'},
  {value:'ribbon',label:'작은 리본'},{value:'cap',label:'모자'},
];
const W=Math.min(360,innerWidth),H=showAdults?640:innerWidth<=650?Math.max(460,Math.min(640,innerHeight)):640;
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
      const anchor={x:W*[.2,.5,.8][i%3],y:showAdults?H*.42+Math.floor(i/3)*(H-88-H*.42)/3:H*(i<3?.53:.77)};
      const actor=this.makeActor(resident,anchor.x,anchor.y);
      this.entries.push({actor,anchor,manual:false});
    });
    this.marker=this.add.ellipse(0,0,36,9).setStrokeStyle(1.2,0x799d96,.9).setDepth(9000);
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const hit=this.entries.findIndex(({actor})=>actor.root.visible&&Math.hypot(p.x-actor.root.x,p.y-(actor.root.y-27))<25);
      if(hit>=0){select(hit);return;}
      const entry=this.entries[selected];entry.manual=true;
      entry.target={x:Phaser.Math.Clamp(p.x,26,W-26),y:Phaser.Math.Clamp(p.y,showAdults?H*.42:220,H-76)};
    });
    $('ready').hidden=true;select(showAdults?2:0);
  }
  makeActor(resident:typeof residents[number],x:number,y:number){
    const actor=new RoundResident(this,toLook(resident.pick),x,y,resident.design);
    // Keep body/face proportions identical; an updo may naturally stand a little taller.
    actor.root.setScale(56/64);actor.place(x,y);
    const label=this.add.text(0,15/actor.root.scaleY,resident.name,{fontFamily:'Malgun Gothic, sans-serif',fontSize:'9px',color:'#68594c',backgroundColor:'#fff8e8',padding:{x:4,y:3}}).setOrigin(.5,0).setResolution(dpr);
    label.setScale(1/actor.root.scaleX);actor.root.add(label);return actor;
  }
  changeDesign(patch:Partial<ResidentDesign>){
    const entry=this.entries[selected];if(!entry)return;
    const resident=residents[selected];Object.assign(resident.design,patch);
    resident.name=`${hairStyles.find(option=>option.value===(resident.design.hairStyle??'bob'))!.label} · ${tops.find(option=>option.value===(resident.design.top??'cardigan'))!.label}`;
    resident.description='머리·옷·안경·머리 장식을 각각 고른 모습이에요. 눈썹·수염·미소선은 그대로예요.';
    const {x,y}=entry.actor.root;entry.actor.root.destroy();
    entry.actor=this.makeActor(residents[selected],x,y);this.frame();
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
        x=Phaser.Math.Clamp(x+dx/length*distance,26,W-26);y=Phaser.Math.Clamp(y+dy/length*distance,showAdults?H*.42:220,H-76);
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
    this.entries.forEach((entry,i)=>entry.actor.root.setVisible(!zoomed||i===selected));
    const zoom=zoomed?2.8:1;
    this.cameras.main.setZoom(dpr*zoom).setScroll(zoomed?actor.root.x-W/2/zoom:0,zoomed?actor.root.y-28-H*.46/zoom:0);
  }
  reset(){this.clock=0;keys.clear();for(const entry of this.entries){entry.manual=false;entry.target=undefined;entry.actor.place(entry.anchor.x,entry.anchor.y);}}
}
const scene=new RosterScene();
for(const [id,options,key] of [['hair-style',hairStyles,'hairStyle'],['top-style',tops,'top'],['hair-pattern',hairPatterns,'hairPattern'],['head-accessory',headAccessories,'headAccessory']] as const){
  const selectElement=$(id) as HTMLSelectElement;
  options.forEach(({value,label})=>selectElement.add(new Option(label,value)));
  selectElement.onchange=()=>{
    const value=options.find(option=>option.value===selectElement.value)?.value;if(!value)return;
    scene.changeDesign({[key]:value});select(selected);
    if(zoomed&&innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
  };
}

$('glasses').onchange=()=>{
  scene.changeDesign({glasses:($('glasses') as HTMLSelectElement).value==='round'});select(selected);
  if(zoomed&&innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
};
for(const key of ['hairColor','hairAccent'] as const){
  const base=key==='hairColor',container=$(base?'hair-colors':'hair-accents');
  const options=base?[{color:undefined,label:'원래색'},...hairColors]:hairColors;
  for(const {color,label} of options){
    const button=document.createElement('button');button.type='button';
    const value=color===undefined?'natural':color.toString(16).padStart(6,'0');
    if(base)button.dataset.hairColor=value;else button.dataset.hairAccent=value;
    button.setAttribute('aria-label',`${base?'바탕색':'포인트 색'} ${label}`);button.title=label;
    const dot=document.createElement('span');dot.className='color-dot';dot.setAttribute('aria-hidden','true');
    dot.style.background=color===undefined?'#3b2b25':`#${value}`;
    button.append(dot,document.createTextNode(label));
    button.onclick=()=>{
      scene.changeDesign({[key]:color});select(selected);
      if(zoomed&&innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
    };container.append(button);
  }
}
residents.forEach((resident,i)=>{
  const button=document.createElement('button');button.type='button';button.dataset.resident=String(i);
  button.textContent=`${i+1} · ${resident.name}`;button.onclick=()=>{
    select(i);
    if(zoomed&&innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
  };$('residents').append(button);
});
function select(index:number){
  selected=index;keys.clear();$('who').textContent=residents[index].name;$('description').textContent=residents[index].description;
  document.querySelectorAll<HTMLButtonElement>('[data-resident]').forEach(button=>{
    const i=Number(button.dataset.resident);button.setAttribute('aria-pressed',String(i===index));
    button.textContent=`${i+1} · ${residents[i].name}`;
  });
  ($('hair-style') as HTMLSelectElement).value=residents[index].design.hairStyle??'bob';
  ($('top-style') as HTMLSelectElement).value=residents[index].design.top??'cardigan';
  ($('glasses') as HTMLSelectElement).value=residents[index].design.glasses?'round':'none';
  ($('head-accessory') as HTMLSelectElement).value=residents[index].design.headAccessory??'none';
  updateHair();
  if(zoomed)scene.frame();
}
function updateHair(){
  const resident=residents[selected],design=resident.design,pattern=design.hairPattern??'solid';
  const color=design.hairColor,accent=design.hairAccent??0xeee9df;
  const value=color===undefined?'natural':color.toString(16).padStart(6,'0');
  document.querySelectorAll<HTMLButtonElement>('[data-hair-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hairColor===value)));
  document.querySelector<HTMLElement>('[data-hair-color="natural"] .color-dot')!.style.background=`#${toLook(resident.pick).hair.toString(16).padStart(6,'0')}`;
  document.querySelectorAll<HTMLButtonElement>('[data-hair-accent]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hairAccent===accent.toString(16).padStart(6,'0'))));
  ($('hair-pattern') as HTMLSelectElement).value=pattern;
  $('hair-accent-controls').hidden=pattern==='solid';
  const colorName=color===undefined?'원래색':hairColors.find(option=>option.color===color)!.label;
  const accentName=hairColors.find(option=>option.color===accent)!.label;
  $('hair-status').textContent=`${colorName} · ${hairPatterns.find(option=>option.value===pattern)!.label}${pattern==='solid'?'':` · 포인트 ${accentName}`}`;
}
function updateWalk(){$('walk').setAttribute('aria-pressed',String(walking));$('walk').textContent=walking?'산책 멈추기':'산책 시작하기';}
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',backgroundColor:'#e4e5ca',width:W*dpr,height:H*dpr,scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true},audio:{noAudio:true},banner:false,scene});
$('walk').onclick=()=>{walking=!walking;scene.reset();updateWalk();};
$('zoom').onclick=()=>{
  zoomed=!zoomed;$('zoom').setAttribute('aria-pressed',String(zoomed));$('zoom').textContent=zoomed?'모두 같이 보기':'크게 보기';scene.frame();
  if(innerWidth<=650)document.querySelector('.world')!.scrollIntoView({block:'start'});
};
$('reset').onclick=()=>scene.reset();
window.addEventListener('keydown',event=>{if(event.target instanceof HTMLSelectElement)return;if(event.key.startsWith('Arrow')){event.preventDefault();keys.add(event.key);}});
window.addEventListener('keyup',event=>keys.delete(event.key));window.addEventListener('blur',()=>keys.clear());
reduced.addEventListener('change',()=>{walking=!reduced.matches;scene.reset();updateWalk();});updateWalk();
