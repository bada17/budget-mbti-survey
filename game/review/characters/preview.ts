import './style.css';
import Phaser from 'phaser';
import { drawRoom } from '../../draw';
import { layoutRoom } from '../../room';
import { ROUTE } from '../../content';
import { Avatar, registerParts } from './avatar';
import { PRESETS, COLORS, HAIR_NAMES, TOP_NAMES, BOTTOM_NAMES, SHOE_NAMES, FACE_NAMES, readLook, type Look } from './model';

const headReview=!new URLSearchParams(location.search).has('legacy');
const W=Math.min(360,innerWidth),H=innerWidth<=650?Math.max(460,Math.min(640,innerHeight)):640,dpr=Math.min(devicePixelRatio||1,2),KEY=headReview?'budget-game-head-review-v1':'budget-game-character-preview-v2';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLElement>('.world')!.style.aspectRatio=`${W}/${H}`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let saved:Look|undefined;
try{saved=readLook(localStorage.getItem(KEY));}catch{/* The preview also works when storage is unavailable. */}
let selected=0,walking=!reduced,editing=false,zoomed=false,manual=false,tab='hair';
if(!headReview){document.querySelector('.heading h1')!.textContent='동글형 주민 열두 명';document.querySelector('.world-title b')!.textContent='동네 입구 · 광장';document.querySelector('.world-title p')!.textContent='주민을 고르고 빈 곳을 누르면 걸어요.';document.querySelector('.note')!.textContent='주민을 고르고 머리·얼굴·옷의 조합을 확인해요.';}
$('compare').hidden=!headReview;
const keys=new Set<string>();
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(scene.actors[selected].look));}catch{}};

class PreviewScene extends Phaser.Scene {
  actors:Avatar[]=[];
  anchors:{x:number;y:number}[]=[];
  target?:{x:number;y:number};
  marker!:Phaser.GameObjects.Ellipse;
  clock=0;
  constructor(){super('character-preview');}
  preload(){
    this.load.image('raw0',new URL('./parts.png',import.meta.url).href);
    this.load.image('raw1',new URL('./parts-extra.png',import.meta.url).href);
    this.load.image('head-bob',new URL('./head-bob-v3.png',import.meta.url).href);
    this.load.on('loaderror',()=>{$('ready').textContent='그림을 불러오지 못했어요. 다시 열어 주세요.';});
  }
  create(){
    this.cameras.main.setOrigin(0,0).setZoom(dpr);
    registerParts(this);
    const headTexture=this.textures.get('head-bob'),headImage=headTexture.getSourceImage() as HTMLImageElement;
    const canvas=document.createElement('canvas');canvas.width=headImage.width;canvas.height=headImage.height;
    const context=canvas.getContext('2d')!;context.drawImage(headImage,0,0);
    const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=0,bottom=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(rgba[(y*canvas.width+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(left>right||top>bottom)throw new Error('얼굴 그림을 불러오지 못했어요.');
    headTexture.add('head',0,left,top,right-left+1,bottom-top+1);
    const art=drawRoom(this,layoutRoom(W,H),0,ROUTE[0].ids[0],0,'광장');
    // The first-room background is static in this character review. Bake it once at device resolution.
    const background=this.add.renderTexture(0,0,W*dpr,H*dpr).setOrigin(0,0).setScale(1/dpr).setDepth(-100000);
    art.box.setScale(dpr);background.draw(art.box);background.render();art.destroy();
    const xs=(headReview?[.3,.7]:[.17,.39,.61,.83]).map(x=>x*W),ys=(headReview?[.6]:[.47,.65,.83]).map(y=>y*H);
    (headReview?[PRESETS[1],PRESETS[1]]:PRESETS).forEach((look,i)=>{
      const at={x:xs[i%xs.length],y:ys[Math.floor(i/xs.length)]};this.anchors.push(at);
      const actor=new Avatar(this,i===0&&saved?saved:look,at.x,at.y,headReview,headReview&&i===0);actor.setSize(56);this.actors.push(actor);
      if(headReview)actor.root.add(this.add.text(0,11,i===0?'동글형':'이전 시안',{fontFamily:'Malgun Gothic, sans-serif',fontSize:'11px',color:'#68594c',backgroundColor:'#fff8e8',padding:{x:6,y:3}}).setOrigin(.5,0).setResolution(dpr));
    });
    this.marker=this.add.ellipse(0,0,35,12).setStrokeStyle(1.5,0x658f95,.85).setDepth(9000);
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      if(editing)return;
      const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const hit=this.actors.findIndex(actor=>Math.hypot(actor.root.x-p.x,actor.root.y-25-p.y)<23);
      if(hit>=0){
        const previous=this.actors[selected],phase=(this.clock+selected*437)%7600,k=Math.min(phase/3800,1);
        this.anchors[selected]={x:previous.root.x-Math.sin(k*Math.PI*2)*13,y:previous.root.y-Math.sin(k*Math.PI)*14};
        selected=hit;manual=false;this.target=undefined;updateWho();return;
      }
      manual=true;this.target={x:Phaser.Math.Clamp(p.x,22,W-22),y:Phaser.Math.Clamp(p.y,216,H-62)};
    });
    $('ready').hidden=true;
    Object.assign(window,{__characterPreview:this});
    updateWho();
  }
  update(time:number,delta:number){
    if(!this.actors.length)return;
    this.clock=time;
    for(let i=0;i<this.actors.length;i++){
      const actor=this.actors[i],old={x:actor.root.x,y:actor.root.y};let moving=false;
      if(!editing && i===selected && (!headReview || manual || keys.size || this.target)){
        let dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
        if(dx||dy)this.target=undefined;
        else if(this.target){dx=this.target.x-old.x;dy=this.target.y-old.y;if(Math.hypot(dx,dy)<4){this.target=undefined;dx=dy=0;}}
        const length=Math.hypot(dx,dy),step=115*Math.min(delta,40)/1000;
        if(length){actor.place(Phaser.Math.Clamp(old.x+dx/length*Math.min(step,length),22,W-22),Phaser.Math.Clamp(old.y+dy/length*Math.min(step,length),216,H-62));moving=true;}
      }else if(!editing && walking && !reduced){
        const phase=(time+i*437)%7600,k=Math.min(phase/3800,1),at=this.anchors[i];
        actor.place(at.x+Math.sin(k*Math.PI*2)*13,at.y+Math.sin(k*Math.PI)*14);moving=phase<3800;
      }
      actor.animate(time+i*331,moving,reduced,actor.root.x-old.x,actor.root.y-old.y);
    }
    const me=this.actors[selected];this.marker.setPosition(me.root.x,me.root.y+3);
  }
  frameEditor(){
    const camera=this.cameras.main,actor=this.actors[selected];
    const mobile=innerWidth<=650,zoom=editing?2.5:zoomed?1.75:1;
    const center=mobile?Math.max(70,(H-$('editor').offsetHeight)/2):H*.43;
    camera.setZoom(dpr*zoom);
    camera.setScroll(editing?actor.root.x-W/2/zoom:zoomed?W/2-W/2/zoom:0,editing?actor.root.y-27-center/zoom:zoomed?H*.6-27-H*.47/zoom:0);
  }
}
const scene=new PreviewScene();
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',backgroundColor:'#e4e5ca',width:W*dpr,height:H*dpr,scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true},audio:{noAudio:true},banner:false,scene});
window.addEventListener('keydown',event=>{if(!editing&&event.key.startsWith('Arrow')){event.preventDefault();manual=true;keys.add(event.key);}});
window.addEventListener('keyup',event=>keys.delete(event.key));window.addEventListener('blur',()=>keys.clear());
window.addEventListener('resize',()=>{if(scene.actors.length)scene.frameEditor();});

function updateWho(){
  $('who').textContent=headReview?(selected===0?'동글형 · 단발':'이전 시안 · 단발'):`주민 ${selected+1}`;
  $('edit').textContent=headReview?(selected===0?'동글형 확대 · 옷 바꾸기':'이전 시안 확대 · 옷 바꾸기'):`주민 ${selected+1} 꾸미기`;
}
function openEditor(open:boolean){
  if(!scene.actors.length)return;
  editing=open;$('editor').hidden=!open;document.querySelector('.world')!.classList.toggle('editing',open);keys.clear();scene.target=undefined;
  if(open){if(scene.actors[selected].revisedHead && (tab==='hair'||tab==='face'))tab='clothes';renderChoices();}else persist();
  scene.frameEditor();
}
function change(next:Partial<Look>){
  scene.actors[selected].setLook({...scene.actors[selected].look,...next});persist();renderChoices();scene.frameEditor();
}
function group(title:string){
  const section=document.createElement('section');section.className='choice-group';
  const heading=document.createElement('h3');heading.textContent=title;section.append(heading);$('choices').append(section);return section;
}
function thumbnail(kind:string,index:number){
  const frame=scene.textures.getFrame(`parts${index>=4&&['hair','top','sleeve'].includes(kind)?1:0}`,`${kind}${index}`);
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=64;
  const ctx=canvas.getContext('2d')!,source=frame.source.image as HTMLCanvasElement;
  const scale=Math.min(70/frame.cutWidth,58/frame.cutHeight);
  ctx.drawImage(source,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,(80-frame.cutWidth*scale)/2,(64-frame.cutHeight*scale)/2,frame.cutWidth*scale,frame.cutHeight*scale);return canvas;
}
function parts(title:string,key:'hair'|'top'|'bottom'|'shoe'|'face',names:string[]){
  const section=group(title),grid=document.createElement('div');grid.className='grid';section.append(grid);
  names.forEach((name,index)=>{
    const button=document.createElement('button');button.type='button';button.className=`part ${key==='face'?'face ':''}${scene.actors[selected].look[key]===index?'on':''}`;
    button.setAttribute('aria-label',`${title}: ${name}`);button.setAttribute('aria-pressed',String(scene.actors[selected].look[key]===index));button.dataset.choice=key;button.dataset.value=String(index);
    if(key!=='face')button.append(thumbnail(key,index));
    const label=document.createElement('span');label.textContent=name;button.append(label);button.onclick=()=>change({[key]:index});grid.append(button);
  });
}
function swatches(title:string,key:keyof typeof COLORS){
  const section=group(title),line=document.createElement('div');line.className='swatches';section.append(line);
  COLORS[key].forEach((color,index)=>{
    const button=document.createElement('button');button.className=`swatch ${scene.actors[selected].look[key]===index?'on':''}`;button.style.background=`#${color.toString(16).padStart(6,'0')}`;
    button.setAttribute('aria-label',`${title} ${index+1}`);button.setAttribute('aria-pressed',String(scene.actors[selected].look[key]===index));button.dataset.choice=key;button.dataset.value=String(index);button.onclick=()=>change({[key]:index});line.append(button);
  });
}
function renderChoices(){
  $('choices').replaceChildren();
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>{button.hidden=scene.actors[selected].revisedHead&&(button.dataset.tab==='hair'||button.dataset.tab==='face');button.setAttribute('aria-selected',String(button.dataset.tab===tab));});
  if(tab==='hair'){parts('헤어스타일','hair',HAIR_NAMES);swatches('머리 색','hairTone');}
  if(tab==='clothes'){parts('상의','top',TOP_NAMES);parts('하의','bottom',BOTTOM_NAMES);parts('신발','shoe',SHOE_NAMES);}
  if(tab==='face'){
    parts('표정','face',FACE_NAMES);swatches('피부 색','skin');const section=group('안경'),button=document.createElement('button');button.className='part face';button.textContent=scene.actors[selected].look.glasses?'안경 벗기':'동그란 안경 쓰기';button.setAttribute('aria-pressed',String(scene.actors[selected].look.glasses));button.onclick=()=>change({glasses:!scene.actors[selected].look.glasses});section.append(button);
  }
  if(tab==='colors'){swatches('상의 색','topTone');swatches('하의 색','bottomTone');swatches('신발 색','shoeTone');}
}
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>{button.onclick=()=>{tab=button.dataset.tab!;renderChoices();$('choices').scrollTop=0;scene.frameEditor();};});
$('edit').onclick=()=>openEditor(true);$('close').onclick=$('done').onclick=()=>openEditor(false);
$('walk').onclick=()=>{walking=!walking;$('walk').setAttribute('aria-pressed',String(walking));$('walk').textContent=walking?'산책 멈추기':'산책 시작하기';};
$('compare').onclick=()=>{
  zoomed=!zoomed;
  if(zoomed){keys.clear();scene.target=undefined;manual=false;scene.actors.forEach((actor,i)=>{const at={x:W*(i===0?.3:.7),y:H*.6};scene.anchors[i]=at;actor.place(at.x,at.y);});}
  $('compare').setAttribute('aria-pressed',String(zoomed));$('compare').textContent=zoomed?'실제 크기로':'크게 비교';scene.frameEditor();
};
$('reset').onclick=()=>change(PRESETS[headReview?1:selected]);
$('shuffle').onclick=()=>{
  const pick=(max:number)=>Math.floor(Math.random()*max);
  change({hair:pick(8),top:pick(8),bottom:pick(4),shoe:pick(4),face:pick(3),hairTone:pick(6),topTone:pick(8),bottomTone:pick(6),shoeTone:pick(4)});
};
