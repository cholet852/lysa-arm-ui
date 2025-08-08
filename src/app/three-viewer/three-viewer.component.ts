
import { Component, AfterViewInit, ElementRef, Input, OnChanges, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JointState } from '../models';

@Component({
  selector: 'app-three-viewer',
  standalone: true,
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements AfterViewInit, OnChanges{
  @Input() states: Record<number,JointState> = {};
  private scene = new THREE.Scene();
  private cam!:THREE.PerspectiveCamera;
  private renderer!:THREE.WebGLRenderer;
  private host?:HTMLElement;
  private controls!:OrbitControls;
  private parts: {[k:string]:THREE.Object3D} = {};

  constructor(private el:ElementRef){}

  ngAfterViewInit(){
    this.host = this.el.nativeElement.querySelector('.viewer');
    const w = this.host!.clientWidth, h = Math.max(520, this.host!.clientWidth*0.6);
    this.cam = new THREE.PerspectiveCamera(50, w/h, 0.1, 100);
    this.cam.position.set(2.8, 2.4, 5.2);
    this.scene.background = new THREE.Color(0x0a0a0a);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0.9);
    const dir  = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(3,6,4);
    this.scene.add(hemi, dir);

    const grid = new THREE.GridHelper(12, 24, 0x2bd4ff, 0x2bd4ff);
    (grid.material as any).opacity = 0.15; (grid.material as any).transparent = true;
    this.scene.add(grid);

    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.host!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.cam, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.05;
    this.controls.target.set(0,1.1,0);

    this.buildHumanoid();

    const render = ()=>{ requestAnimationFrame(render); this.controls.update(); this.renderer.render(this.scene, this.cam); };
    render();
    this.applyStateToRig();
    window.addEventListener('resize', ()=> this.onResize());
  }

  @HostListener('window:resize') onResize(){
    if(!this.host || !this.renderer || !this.cam) return;
    const w = this.host.clientWidth, h = Math.max(520, this.host.clientWidth*0.6);
    this.cam.aspect = w/h; this.cam.updateProjectionMatrix(); this.renderer.setSize(w, h);
  }

  ngOnChanges(){ this.applyStateToRig(); }

  private buildHumanoid(){
    const mat = new THREE.MeshStandardMaterial({metalness:0.1, roughness:0.8, color:0xb0b0b0});
    const dark = new THREE.MeshStandardMaterial({metalness:0.2, roughness:0.5, color:0x7f7f7f});

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.4), mat); pelvis.position.set(0, 1.0, 0); this.scene.add(pelvis);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.35), mat); spine.position.set(0, 0.575, 0); pelvis.add(spine);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.45), mat); chest.position.set(0, 0.65, 0); spine.add(chest);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16), dark); neck.position.set(0, 0.4, 0); chest.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), dark); head.position.set(0, 0.25, 0); neck.add(head);

    this.parts['pelvis']=pelvis; this.parts['spine']=spine; this.parts['chest']=chest;

    const makeArm = (side:'R'|'L')=>{
      const sign = side==='R' ? -1 : 1; // RIGHT is negative X in our view
      const shoulderPivot = new THREE.Object3D(); shoulderPivot.position.set(0.55*sign, 0.2, 0); chest.add(shoulderPivot);
      const upperArmPitch = new THREE.Object3D(); shoulderPivot.add(upperArmPitch);
      const upperLen = 0.8;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, upperLen, 0.22), mat); upper.position.set(0, -upperLen/2, 0); upperArmPitch.add(upper);
      const elbowPivot = new THREE.Object3D(); elbowPivot.position.set(0, -upperLen, 0); upperArmPitch.add(elbowPivot);
      const foreLen = 0.7;
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.2, foreLen, 0.2), mat); fore.position.set(0, -foreLen/2, 0); elbowPivot.add(fore);
      const wristPivot = new THREE.Object3D(); wristPivot.position.set(0, -foreLen, 0); elbowPivot.add(wristPivot);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.26), dark); hand.position.set(0, -0.09, 0); wristPivot.add(hand);

      this.parts[(side==='R'?'r':'l')+'Shoulder'] = shoulderPivot;
      this.parts[(side==='R'?'r':'l')+'UpperPitch'] = upperArmPitch;
      this.parts[(side==='R'?'r':'l')+'Elbow'] = elbowPivot;
      this.parts[(side==='R'?'r':'l')+'Wrist'] = wristPivot;
    };
    makeArm('R'); makeArm('L');

    const makeLeg = (side:'R'|'L')=>{
      const sign = side==='R' ? -1 : 1;
      const hip = new THREE.Object3D(); hip.position.set(0.23*sign, -0.2, 0); pelvis.add(hip);
      const upperLen = 1.0;
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.26, upperLen, 0.26), mat); thigh.position.set(0, -upperLen/2, 0); hip.add(thigh);
      const knee = new THREE.Object3D(); knee.position.set(0, -upperLen, 0); hip.add(knee);
      const shinLen = 1.0;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.24, shinLen, 0.24), mat); shin.position.set(0, -shinLen/2, 0); knee.add(shin);
      const ankle = new THREE.Object3D(); ankle.position.set(0, -shinLen, 0); knee.add(ankle);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.5), dark); foot.position.set(0, -0.05, 0.12); ankle.add(foot);
    };
    makeLeg('R'); makeLeg('L');
  }

  private applyStateToRig()
  {
    const d2r = THREE.MathUtils.degToRad;

    // états
    const a0 = this.states[0]?.target ?? this.states[0]?.angle ?? 0; // Shoulder
    const a1 = this.states[1]?.target ?? this.states[1]?.angle ?? 0; // Upper
    const a2 = this.states[2]?.target ?? this.states[2]?.angle ?? 0; // Elbow
    const a3 = this.states[3]?.target ?? this.states[3]?.angle ?? 0; // Wrist

    // noeuds
    const n = {
      rShoulder:   this.parts['rShoulder'],     // pivot épaule avant/arrière (X)
      rUpperPitch: this.parts['rUpperPitch'],   // pivot épaule latéral (Z)
      rElbow:      this.parts['rElbow'],
      rWrist:      this.parts['rWrist'],
    };

    // ---------- Mapping articulations -> (node, axis, sign) ----------
    // 0 Shoulder: pitch (X)  — signe à -1 si tu veux que +angle aille vers l'avant
    // 1 Upper:    latéral (Z)
    // 2 Elbow:    flexion (X)
    // 3 Wrist:    pitch (X)
    const MAP: Record<number, {node:keyof typeof n, axis:'x'|'y'|'z', sign:number, val:number}> = {
      0: { node: 'rShoulder',   axis: 'x', sign: -1, val: a0 }, // avant(+)/arrière(-) -> ajuste sign si besoin
      1: { node: 'rUpperPitch',   axis: 'z', sign: -1, val: a1 }, // droite(+)/gauche(-)
      2: { node: 'rElbow',      axis: 'x', sign: -1, val: a2 }, // flexion
      3: { node: 'rWrist',      axis: 'x', sign: +1, val: a3 }, // poignet
    };

    // applique
    for (const k of Object.keys(MAP)){
      const j = Number(k);
      const cfg = MAP[j];
      const obj = n[cfg.node];
      if(!obj) continue;
      const rad = d2r(cfg.sign * cfg.val);
      if (cfg.axis === 'x') (obj as any).rotation.x = rad;
      if (cfg.axis === 'y') (obj as any).rotation.y = rad;
      if (cfg.axis === 'z') (obj as any).rotation.z = rad;
    }
  }
}
