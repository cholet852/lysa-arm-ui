
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import { CanBridgeService } from '../can-bridge.service';
import { JointState } from '../models';
import { AngleKnobComponent } from '../angle-knob/angle-knob.component';

@Component({
  selector: 'app-joint-card',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, DecimalPipe, AngleKnobComponent],
  templateUrl: './joint-card.component.html',
  styleUrls: ['./joint-card.component.scss']
})
export class JointCardComponent implements OnChanges{
  @Input() joint=0; @Input() title='Joint'; @Input() s?: JointState; 
  @Input() min = -180;
  @Input() max =  180;

  targetDeg=0; speed=30; accel=50000; current=1000; micro=32;
  micros=[1,2,4,8,16,32,64,128,256];
  steps=[1,5,10,15,30,45,90];
  stepSel=5;

  editing = { angle:false, speed:false, accel:false, current:false, micro:false };

  constructor(public bus: CanBridgeService){}

  ngOnChanges(){
    if(!this.s) return;
    if(!this.editing.angle)  this.targetDeg = this.s.target ?? this.s.angle ?? this.targetDeg;
    if(!this.editing.speed && this.s.speed   !== undefined) this.speed = this.s.speed;
    if(!this.editing.accel && this.s.accel   !== undefined) this.accel = this.s.accel;
    if(!this.editing.current && this.s.current_mA !== undefined) this.current = this.s.current_mA;
    if(!this.editing.micro && this.s.micro   !== undefined) this.micro = this.s.micro;
  }

  // Angle via knob or inputs
  onKnobChange(v:number){ this.editing.angle=true; this.targetDeg = v; }       // live UI
  onKnobCommit(v:number){ this.editing.angle=false; this.commitAngle(); }      // one send

  //commitAngle(){ const v=Number(this.targetDeg); if(Number.isFinite(v)) this.send('move',{deg:v}); }

  commitAngle(){
    let v = Number(this.targetDeg);
    if(!Number.isFinite(v)) return;
    // clamp UI avant envoi
    v = Math.min(this.max, Math.max(this.min, v));
    this.targetDeg = v;
    this.send('move', { deg: v });
  }

  commitSpeed(){ const v=Number(this.speed);     if(Number.isFinite(v)) this.send('speed',{v}); }
  commitAccel(){ const v=Number(this.accel);     if(Number.isFinite(v)) this.send('accel',{a:v}); }
  commitCurrent(){ const v=Number(this.current); if(Number.isFinite(v)) this.send('current',{mA:v}); }
  commitMicro(){ this.send('micro',{u:Number(this.micro)}); }

  bumpSign(sign:number){
    const s = this.stepSel || 5;
    this.targetDeg = Math.round((this.targetDeg + sign*s));
    this.commitAngle();
  }

  preset(v:number){ this.targetDeg = v; this.commitAngle(); }

  send(type:string, payload:any){ this.bus.send({type, joint:this.joint, ...payload}); }
}
