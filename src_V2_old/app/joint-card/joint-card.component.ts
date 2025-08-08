import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import { CanBridgeService } from '../can-bridge.service';
import { JointState } from '../models';

@Component({
  selector: 'app-joint-card',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, DecimalPipe],
  templateUrl: './joint-card.component.html',
  styleUrls: ['./joint-card.component.scss']
})
export class JointCardComponent implements OnChanges{
  @Input() joint=0; @Input() title='Joint'; @Input() s?: JointState;

  targetDeg=0; speed=30; accel=50000; current=1000; micro=32;
  micros=[1,2,4,8,16,32,64,128,256];

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

 // Validations (Enter/blur)
  commitAngle(){ const v=Number(this.targetDeg); if(Number.isFinite(v)) this.send('move',{deg:v}); }
  commitSpeed(){ const v=Number(this.speed);     if(Number.isFinite(v)) this.send('speed',{v}); }
  commitAccel(){ const v=Number(this.accel);     if(Number.isFinite(v)) this.send('accel',{a:v}); }
  commitCurrent(){ const v=Number(this.current); if(Number.isFinite(v)) this.send('current',{mA:v}); }
  commitMicro(){ this.send('micro',{u:Number(this.micro)}); }

  send(type:string, payload:any){ this.bus.send({type, joint:this.joint, ...payload}); }
  bump(d:number){ this.targetDeg = Math.round((this.targetDeg + d)*10)/10; this.commitAngle(); }

  startAngleSlider()
  {
    this.editing.angle = true;          // bloque la synchro télémétrie -> UI pendant le drag
  }

onAngleSliderInput()
{
  // on ne spamme pas le bus pendant le glissé; l’UI et le viewer bougent déjà (ngModel)
}

endAngleSlider()
{
  this.editing.angle = false;         // on débloque la synchro
  this.commitAngle();                 // envoie UN seul move à la fin
}
}
