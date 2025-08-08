import { Component, EventEmitter, Input, Output, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-angle-knob',
  standalone: true,
  templateUrl: './angle-knob.component.html',
  styleUrls: ['./angle-knob.component.scss'],
  imports: [DecimalPipe], // (pas de NgIf -> plus de warning NG8113)
})
export class AngleKnobComponent implements AfterViewInit {
  @Input() value = 0;            // ° dans [min..max]
  @Input() min = -180;
  @Input() max = 180;
  @Input() step = 5;
  @Input() label = 'Angle';
  @Input() zeroAt: 'right'|'top'|'bottom' = 'right'; // 0° affiché où ?
  @Input() clockwise = true;

  @Output() valueChange = new EventEmitter<number>(); // preview live (drag/molette)
  @Output() commit = new EventEmitter<number>();      // un seul envoi à la fin

  majors = Array.from({length: 12}, (_,i) => i*30);                  // 30°
  mids   = Array.from({length: 36}, (_,i) => i*10).filter(a=>a%30);  // 10°
  minors = Array.from({length: 72}, (_,i) => i*5 ).filter(a=>a%10);  // 5°

  private dragging = false;
  private bbox?: DOMRect;

  constructor(private el:ElementRef){}

  ngAfterViewInit(){
    const svg = (this.el.nativeElement as HTMLElement).querySelector('svg')!;
    this.bbox = svg.getBoundingClientRect();
  }

  // ---- Helpers normalisation
  private norm360(x:number){ return (x % 360 + 360) % 360; }

  // Offset d’affichage: 0°=top, 90°=right, 180°=bottom, 270°=left
  private get displayOffset(){
    return this.zeroAt === 'top' ? 0
        : this.zeroAt === 'right' ? 90
        : this.zeroAt === 'bottom' ? 180
        : 270; // left
  }

  // ----- Valeur (°) -> angle d’AFFICHAGE (0 en haut, horaire)
  valueToDisplay(v:number){
    const a = (this.clockwise ? v : -v) + this.displayOffset;
    return this.norm360(a); // 0..360
  }

  // ----- angle d’AFFICHAGE (0 en haut, horaire) -> Valeur (°)
  displayToValue(aDisp:number){
    // retire l’offset, applique le sens
    let a = this.clockwise ? (aDisp - this.displayOffset) : -(aDisp - this.displayOffset);

    // ramener dans [-180, 180] SANS faire 180 -> -180
    while (a < -180) a += 360;
    while (a >  180) a -= 360;

    // clamp dans les bornes du composant
    if (a < this.min) a = this.min;
    if (a > this.max) a = this.max;
    return a;
  }

  // ----- Curseur (rotation en degrés)
  get handleRotation(){ return this.valueToDisplay(this.value); } // 0 -> haut

  
  // trig pour labels en coordonnées affichage
  private radFromDisplay(aDisp:number){ return (aDisp - 90) * Math.PI/180; }
  labelXDisp(aDisp:number, r=96, cx=110){ const t=this.radFromDisplay(aDisp); return cx + r*Math.cos(t); }
  labelYDisp(aDisp:number, r=96, cy=110){ const t=this.radFromDisplay(aDisp); return cy + r*Math.sin(t); }


  // ticks colorés 0 -> valeur (dégradé vert->rouge)
  tickColor(aDisp:number): string {
    const vTick = this.displayToValue(aDisp);
    const cur   = this.value;
    const within = (cur >= 0) ? (vTick >= 0 && vTick <= cur) : (vTick <= 0 && vTick >= cur);
    if (!within || cur === 0) return '#2a3146';
    const t = Math.min(1, Math.max(0, Math.abs(vTick) / Math.max(1, Math.abs(cur))));
    return heat(t);
  }

  // labels dynamiques selon [min..max], pas figés
  get labelVals(): number[] {
    const out:number[] = [];
    const start = Math.ceil(this.min / 30) * 30;
    for (let v = start; v <= this.max; v += 30) out.push(v);
    if (!out.includes(0) && this.min < 0 && this.max > 0) out.push(0);
    return out.sort((a,b)=>a-b);
  }

  clickLabelValue(v:number, ev:MouseEvent){
  ev.stopPropagation();
  const vv = Math.max(this.min, Math.min(this.max, this.roundToStep(v)));
  this.setValue(vv, true);
  this.commit.emit(this.value);
  }

  // ---------- Interaction ----------
  @HostListener('window:mouseup') onUp(){
    if(this.dragging){ this.dragging=false; this.commit.emit(this.value); }
  }
  @HostListener('window:mousemove', ['$event']) onMove(e:MouseEvent){
    if(!this.dragging) return;
    this.setFromPointer(e.clientX, e.clientY, true);
  }

  startDrag(e: MouseEvent | TouchEvent){
    this.dragging = true;
    const p = ('touches' in e ? e.touches[0] : e);
    this.setFromPointer(p.clientX, p.clientY, true);
  }
  tapOnce(e: MouseEvent){ this.startDrag(e); this.dragging=false; this.commit.emit(this.value); }

  onWheel(e:WheelEvent){
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    this.setValue(this.roundToStep(this.value - dir*this.step), true);
    this.commit.emit(this.value);
  }
  onKey(e: KeyboardEvent){
    if(e.key==='ArrowLeft' || e.key==='ArrowDown'){ this.nudge(-1); }
    else if(e.key==='ArrowRight' || e.key==='ArrowUp'){ this.nudge(+1); }
  }
  nudge(sign:number){
    this.setValue(this.roundToStep(this.value + sign*this.step), true);
    this.commit.emit(this.value);
  }

  private setFromPointer(clientX:number, clientY:number, fire:boolean)
  {
    if(!this.bbox)
    {
      const svg = (this.el.nativeElement as HTMLElement).querySelector('svg')!;
      this.bbox = svg.getBoundingClientRect();
    }

    const r = this.bbox!;
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = clientX - cx, dy = clientY - cy;

    // angle d’AFFICHAGE 0..360 : 0 = haut, sens horaire
    let aDisp = Math.atan2(dy, dx) * 180/Math.PI; // -180..180, 0 = droite
    aDisp = this.norm360(aDisp + 90);             // 0 = haut

    const v = this.roundToStep(this.displayToValue(aDisp));
    this.setValue(v, fire);
  }

  private setValue(v:number, fire:boolean){
    const clamped = Math.max(this.min, Math.min(this.max, v));
    this.value = clamped;
    if(fire) this.valueChange.emit(this.value);
  }
  private roundToStep(v:number){ const s=this.step||1; return Math.round(v/s)*s; }
}

/** Dégradé vert->jaune->orange->rouge selon t [0..1] */
function heat(t:number): string {
  if(t<=0.33) return lerpColor('#22c55e','#84cc16', t/0.33);
  if(t<=0.66) return lerpColor('#84cc16','#f59e0b', (t-0.33)/0.33);
  return lerpColor('#f59e0b','#ef4444', (t-0.66)/0.34);
}
function lerpColor(a:string, b:string, t:number){
  const A = hex(a), B = hex(b);
  const r = Math.round(A[0] + (B[0]-A[0])*t);
  const g = Math.round(A[1] + (B[1]-A[1])*t);
  const b2= Math.round(A[2] + (B[2]-A[2])*t);
  return `rgb(${r},${g},${b2})`;
}
function hex(s:string){ s=s.replace('#',''); return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)] as const; }
