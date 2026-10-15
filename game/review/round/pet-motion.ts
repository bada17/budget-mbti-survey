export type PetKind='cat'|'dog';

/** Always seated in one place: quiet pauses, occasional grooming, tail and blink. */
export function petPoseAt(timeMs:number,kind:PetKind,reduced:boolean){
  const time=reduced?0:Math.max(0,Number.isFinite(timeMs)?timeMs:0),phase=time%14000;
  const action=phase>=5000&&phase<8000?'groom':'idle';
  const groom=action==='groom'?Math.max(0,Math.min(1,(phase-5000)/350,(8000-phase)/350)):0;
  const cat=kind==='cat',wash=Math.sin(time/(cat?120:85));
  return {
    action,groom,dx:0,
    breath:reduced?0:Math.sin(time/950)*.012,
    headAngle:groom*((cat?-10:7)+wash*2),headY:groom*(cat?1:0),
    pawX:(cat?-7:5)+groom*(cat?3:6),
    pawY:-2+groom*(-10+wash*(cat?1:2)),
    pawAngle:groom*((cat?-20:20)+wash*10),
    tailAngle:cat?(reduced?20:2.5+Math.cos(time/650)*17.5):(reduced?25:25+Math.sin(time/240)*15),
    eyes:reduced?1:groom>0?1-groom*.6:time%4200>4050?.2:1,
  };
}
