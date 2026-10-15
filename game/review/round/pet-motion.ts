export type PetKind='cat'|'dog';

/** A quiet 18-second loop: rest, groom, rest, a few steps, rest. */
export function petPoseAt(timeMs:number,kind:PetKind,reduced:boolean){
  const time=reduced?0:Math.max(0,Number.isFinite(timeMs)?timeMs:0),phase=time%18000;
  const action=phase>=5000&&phase<8000?'groom':phase>=11000&&phase<15000?'walk':'idle';
  const groom=action==='groom'?Math.max(0,Math.min(1,(phase-5000)/350,(8000-phase)/350)):0;
  const progress=action==='walk'?(phase-11000)/4000:0;
  const walking=Math.sin(progress*Math.PI),stride=Math.sin((phase-11000)/180*Math.PI)*walking;
  const cat=kind==='cat',wash=Math.sin(time/(cat?120:85));
  return {
    action,groom,
    dx:action==='walk'?(cat?1:-1)*14*walking*walking:0,
    bodyY:reduced?0:-Math.abs(stride)*1.1,
    breath:reduced?0:Math.sin(time/950)*.018,
    headAngle:reduced?0:groom*((cat?-12:9)+wash*3)+walking*(progress<.5?2:-2),
    headY:groom*(cat?1:0),
    pawX:(cat?-7:7)+groom*(cat?3:5),
    pawY:-1+groom*(-19+wash*(cat?1.5:3)),
    pawAngle:groom*((cat?-20:20)+wash*12),
    tailAngle:reduced?0:Math.sin(time/(cat?650:210))*(cat?12:20),
    leftFoot:-Math.max(0,stride)*2,
    rightFoot:-Math.max(0,-stride)*2,
    eyes:reduced?1:groom>0?1-groom*.72:time%4200>4050?.15:1,
  };
}
