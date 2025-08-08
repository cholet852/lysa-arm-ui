
import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-arm-accordion',
  standalone: true,
  imports: [NgIf],
  template: `
  <div class="card">
    <button class="head" (click)="toggle()" [disabled]="disabled">
      <span>{{title}}</span>
      <span class="chev" [class.open]="open">▾</span>
    </button>
    <div *ngIf="open" class="body"><ng-content/></div>
  </div>`,
  styles:[`
  .head{ width:100%; text-align:left; display:flex; justify-content:space-between; align-items:center;
         padding:.8rem 1rem; background:#15192a; color:var(--text); border:1px solid #2a3146; border-radius:.8rem; cursor:pointer; }
  .head:disabled{ opacity:.5; cursor:not-allowed; }
  .body{ margin-top:.6rem; display:grid; gap:1rem; }
  .chev{ transition:transform .2s ease; }
  .chev.open{ transform:rotate(180deg); }
  `]
})
export class ArmAccordionComponent{
  @Input() title='Arm'; @Input() disabled=false; @Input() defaultOpen=false;
  open=this.defaultOpen;
  toggle(){ if(!this.disabled) this.open=!this.open; }
}
