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

  constructor(public bus: CanBridgeService){}
  ngOnChanges(){ if(this.s){ this.targetDeg = this.s.target ?? 0; this.speed = this.s.speed ?? 30; this.micro = this.s.micro ?? 32; this.current = this.s.current_mA ?? 1000; this.accel = this.s.accel ?? 50000; }}

  send(type:string, payload:any){ this.bus.send({type, joint:this.joint, ...payload}); }
  move(){ this.send('move',{deg:+this.targetDeg}); }
  bump(d:number){ this.targetDeg = Math.round((this.targetDeg + d)*10)/10; this.move(); }
}
