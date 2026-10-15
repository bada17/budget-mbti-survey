import '../characters/style.css';
import './roster.css';
import Phaser from 'phaser';
import { drawRoom } from '../../draw';
import { layoutRoom } from '../../room';
import { ROUTE } from '../../content';
import { RoundPet } from './pets';

const W=Math.min(360,innerWidth),H=640,dpr=Math.min(devicePixelRatio||1,2);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const $=(id:string)=>document.getElementById(id)!;
document.querySelector<HTMLElement>('.world')!.style.aspectRatio=String(W)+'/'+String(H);
let resting=false;
class PetScene extends Phaser.Scene {
  pets:RoundPet[]=[];
  constructor(){super('pet-review');}
  create(){
    this.cameras.main.setOrigin(0,0).setZoom(dpr);
    const art=drawRoom(this,layoutRoom(W,H),0,ROUTE[0].ids[0],0,'광장');
    art.cat?.root.setVisible(false);
    const background=this.add.renderTexture(0,0,W*dpr,H*dpr).setOrigin(0,0).setScale(1/dpr).setDepth(-100000);
    art.box.setScale(dpr);background.draw(art.box);background.render();art.destroy();
    this.pets=[new RoundPet(this,'cat',{x:W*.22,y:H*.64},Math.min(2.3,W/150)),new RoundPet(this,'dog',{x:W*.78,y:H*.64},Math.min(2.3,W/150))];
    for(const [index,label] of ['고양이','강아지'].entries())this.add.text(W*(index?.78:.22),H*.64+23,label,
      {fontFamily:'Malgun Gothic, sans-serif',fontSize:'13px',color:'#68594c',backgroundColor:'#fff8e8',padding:{x:8,y:5}})
      .setOrigin(.5,0).setResolution(dpr);
    $('ready').hidden=true;
    this.pets.forEach(pet=>pet.step(0,reduced.matches));
  }
  update(_time:number,dt:number){this.pets.forEach(pet=>pet.step(dt,reduced.matches||resting));}
}
const scene=new PetScene();
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',backgroundColor:'#e4e5ca',width:W*dpr,height:H*dpr,
  scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true},audio:{noAudio:true},banner:false,scene});
function show(action:'natural'|'groom'|'rest'){
  resting=action==='rest';
  scene.pets.forEach(pet=>pet.reset(action==='natural'?undefined:action==='groom'?5000:0));
  $('motion-status').textContent=reduced.matches?'모션 줄이기 설정에 따라 편안히 쉬고 있어요.':
    action==='rest'?'잠깐 쉬고 있어요.':action==='groom'?'고양이는 앞발 세수, 강아지는 귀 긁기.':
    '한자리에서 쉬기와 그루밍을 각자의 속도로 반복해요.';
}
for(const action of ['natural','groom','rest'] as const)$(action).onclick=()=>show(action);
reduced.addEventListener('change',()=>show('natural'));
if(reduced.matches)$('motion-status').textContent='모션 줄이기 설정에 따라 편안히 쉬고 있어요.';
