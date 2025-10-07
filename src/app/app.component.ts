import { Component } from '@angular/core';
import { ArmDashboardComponent } from './arm-dashboard/arm-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: "./app.component.html",
  imports: [ArmDashboardComponent],
})
export class AppComponent {}
