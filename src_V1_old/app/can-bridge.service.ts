import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { JointState, Command } from './models';

@Injectable({providedIn:'root'})
export class CanBridgeService{
  private ws?: WebSocket;
  // Change hostname if needed: e.g. ws://192.168.1.60:81/
  private url = 'ws://192.168.1.14:81/';
  states$ = new BehaviorSubject<Record<number,JointState>>({});
  logs$ = new Subject<string>();

  connect(){
    if(this.ws && (this.ws.readyState===WebSocket.OPEN || this.ws.readyState===WebSocket.CONNECTING)) return;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = _=> this.logs$.next('WS connected');
    this.ws.onclose = _=> { this.logs$.next('WS closed – retry in 2s'); setTimeout(()=>this.connect(),2000); };
    this.ws.onmessage = (ev)=>{
      try{
        const msg = JSON.parse(ev.data);
        if(msg.type==='state'){
          const s: JointState = { joint: msg.j, angle: msg.a, target: msg.t, speed: msg.s, micro: msg.u, current_mA: msg.i, accel: msg.acc, flags: decodeFlags(msg.f) };
          const cur = {...this.states$.value};
          cur[s.joint] = s; this.states$.next(cur);
        }
      }catch(e){ this.logs$.next('Bad JSON: '+ev.data); }
    };
  }

  send(cmd: Command){ if(!this.ws || this.ws.readyState!==WebSocket.OPEN) return; this.ws.send(JSON.stringify(cmd)); }
}

function decodeFlags(f:number){
  return { ok:!!(f&1), openLoad:!!(f&2), otw:!!(f&4), ot:!!(f&8), stall:!!(f&16), homing:!!(f&32), closedLoop:!!(f&64), calib:!!(f&128) };
}
