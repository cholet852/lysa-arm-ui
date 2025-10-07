
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { JointState } from '../models';
import { CanBridgeService } from '../can-bridge.service';
import { ArmAccordionComponent } from '../arm-accordion/arm-accordion.component';
import { JointCardComponent } from '../joint-card/joint-card.component';
import { ThreeViewerComponent } from '../three-viewer/three-viewer.component';

@Component({
  selector: 'app-arm-dashboard',
  standalone: true,
  imports: [ArmAccordionComponent, JointCardComponent, ThreeViewerComponent],
  templateUrl: "./arm-dashboard.component.html",
})

export class ArmDashboardComponent implements OnInit, OnDestroy
{
  states: Record<number, JointState> = {};
  sub: Subscription = new Subscription();

  constructor(public bus: CanBridgeService) {}

  ngOnInit()
  { 
    this.bus.connect(); 
    this.sub = this.bus.states$.subscribe(s=> this.states = s); 
  }
  
  ngOnDestroy()
  { 
    this.sub.unsubscribe(); 
  }
}
