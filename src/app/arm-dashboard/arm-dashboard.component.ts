
import { Component, OnInit } from '@angular/core';
import { JointState } from '../models';
import { CanBridgeService } from '../can-bridge.service';
import { ArmAccordionComponent } from '../arm-accordion/arm-accordion.component';
import { JointCardComponent } from '../joint-card/joint-card.component';
import { ThreeViewerComponent } from '../three-viewer/three-viewer.component';

@Component({
  selector: 'app-arm-dashboard',
  standalone: true,
  imports: [ArmAccordionComponent, JointCardComponent, ThreeViewerComponent],
  template: `
  <div class="split">
    <div class="left">
      <app-arm-accordion title="Right Arm" [defaultOpen]="true">
        <app-joint-card [joint]="0" title="Shoulder"   [s]="states[0]" [min]="-30" [max]="180"></app-joint-card>
        <app-joint-card [joint]="1" title="Upper Arm"  [s]="states[1]" [min]="-5"  [max]="180"></app-joint-card>
        <app-joint-card [joint]="2" title="Elbow"      [s]="states[2]" [min]="0"   [max]="150"></app-joint-card>
        <app-joint-card [joint]="3" title="Wrist"      [s]="states[3]" [min]="-90" [max]="90"></app-joint-card>

      </app-arm-accordion>
      <app-arm-accordion title="Left Arm (bientôt)" [disabled]="true"></app-arm-accordion>
    </div>
    <div class="right">
      <app-three-viewer [states]="states"></app-three-viewer>
    </div>
  </div>
  `
})
export class ArmDashboardComponent implements OnInit{
  states: Record<number, JointState> = {};
  constructor(public bus: CanBridgeService) {}
  ngOnInit(){ this.bus.connect(); this.bus.states$.subscribe(s=> this.states = s); }
}
