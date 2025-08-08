export interface JointFlags { ok:boolean; openLoad:boolean; otw:boolean; ot:boolean; stall:boolean; homing:boolean; closedLoop:boolean; calib:boolean; }
export interface JointState { joint:number; angle:number; target:number; speed:number; micro:number; current_mA:number; accel:number; flags:JointFlags; }
export interface Command { type:string; joint:number; [k:string]:any; }
