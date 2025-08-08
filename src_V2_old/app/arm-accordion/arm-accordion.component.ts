import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-arm-accordion',
  standalone: true,
  imports: [NgIf],
  templateUrl: './arm-accordion.component.html',
  styleUrls: ['./arm-accordion.component.scss']
})
export class ArmAccordionComponent{
  @Input() title = 'Arm';
  @Input() disabled = false;
  @Input() defaultOpen = false;
  open = this.defaultOpen;
  toggle(){ if(!this.disabled) this.open = !this.open; }
}
