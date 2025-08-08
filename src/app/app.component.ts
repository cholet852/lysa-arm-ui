import { Component } from '@angular/core';
import { ArmDashboardComponent } from './arm-dashboard/arm-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ArmDashboardComponent],
  template: `<div class='container'><h2>Lysa Arm Control</h2><app-arm-dashboard/></div>`,
})
export class AppComponent {}
