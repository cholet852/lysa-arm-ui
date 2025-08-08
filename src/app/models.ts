
export interface JointFlags { ok:boolean; openLoad:boolean; otw:boolean; ot:boolean; stall:boolean; homing:boolean; closedLoop:boolean; calib:boolean; }
export interface JointState { joint:number; angle:number; target:number; speed:number; micro:number; current_mA:number; accel:number; flags:JointFlags; }

export type Command =
  | { type:'move';   joint:number; deg:number }
  | { type:'speed';  joint:number; v:number }
  | { type:'accel';  joint:number; a:number }
  | { type:'current';joint:number; mA:number }
  | { type:'micro';  joint:number; u:number }
  | { type:'home'|'reset'; joint:number };
