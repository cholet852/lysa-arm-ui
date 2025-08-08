import { Component } from '@angular/core';
import { ArmDashboardComponent } from './arm-dashboard/arm-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ArmDashboardComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
