import { Component, AfterViewInit, ElementRef, Input, OnChanges, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JointState } from '../models';

/**
 * Humanoid viewer:
 * - Full body (pelvis, spine, chest, neck, head, L/R legs, L/R arms)
 * - Arms start "along the body" (down).
 * - Right arm driven by states[0..3]:
 *    0: shoulder pitch (+ forward raise), 1: shoulder roll (+ to the side),
 *    2: elbow flex (+ bend), 3: wrist flex.
 */
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

  // articulated parts
  private parts: {[k:string]:THREE.Object3D} = {};

  constructor(private el:ElementRef){}

  ngAfterViewInit(){
    this.host = this.el.nativeElement.querySelector('.viewer');
    const w = this.host!.clientWidth, h = Math.max(500, this.host!.clientWidth*0.62);

    this.cam = new THREE.PerspectiveCamera(50, w/h, 0.1, 100);
    this.cam.position.set(2.8, 2.4, 5.2);

    this.scene.background = new THREE.Color(0x0a0a0a);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0.9);
    const dir  = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(3,6,4);
    this.scene.add(hemi, dir);

    const grid = new THREE.GridHelper(12, 24);
    (grid.material as THREE.Material).opacity = 0.15; (grid.material as any).transparent = true;
    this.scene.add(grid);

    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.host!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.cam, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0,1.1,0);

    this.buildHumanoid();

    const render = ()=>{
      requestAnimationFrame(render);
      this.controls.update();
      this.renderer.render(this.scene, this.cam);
    };
    render();

    this.applyStateToRig();
    window.addEventListener('resize', ()=> this.onResize());
  }

  @HostListener('window:resize') onResize(){
    if(!this.host || !this.renderer || !this.cam) return;
    const w = this.host.clientWidth, h = Math.max(500, this.host.clientWidth*0.62);
    this.cam.aspect = w/h; this.cam.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  ngOnChanges(){ this.applyStateToRig(); }

  private buildHumanoid(){
    const mat = new THREE.MeshStandardMaterial({metalness:0.1, roughness:0.8});
    const dark = new THREE.MeshStandardMaterial({metalness:0.2, roughness:0.5, color:0x888888});

    // ---- Torso core ----
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.4), mat);
    pelvis.position.set(0, 1.0, 0);
    this.scene.add(pelvis);

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.35), mat);
    spine.position.set(0, 0.575, 0);
    pelvis.add(spine);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.45), mat);
    chest.position.set(0, 0.65, 0);
    spine.add(chest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16), dark);
    neck.position.set(0, 0.4, 0);
    chest.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), dark);
    head.position.set(0, 0.25, 0);
    neck.add(head);

    // Save references
    this.parts['pelvis'] = pelvis;
    this.parts['spine']  = spine;
    this.parts['chest']  = chest;

    // ---- Arms (right & left) ----
    // Helper to create an arm with pivots so 0° = along body (down)
    const makeArm = (side:'R'|'L')=>{
      const sign = side==='R' ? -1 : 1;
      const shoulderPivot = new THREE.Object3D();
      shoulderPivot.position.set(0.55*sign, 0.2, 0); // attach on chest sides
      chest.add(shoulderPivot);

      // roll around Z at shoulderPivot, then upperArmPitch pivots the upper segment
      const upperArmPitch = new THREE.Object3D();
      // Place pivot where the arm attaches; geometry hangs down -Y
      upperArmPitch.position.set(0, 0, 0);
      shoulderPivot.add(upperArmPitch);

      const upperLen = 0.8;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, upperLen, 0.22), mat);
      upper.position.set(0, -upperLen/2, 0); // hang down
      upperArmPitch.add(upper);

      const elbowPivot = new THREE.Object3D();
      elbowPivot.position.set(0, -upperLen, 0); // at end of upper arm
      upperArmPitch.add(elbowPivot);

      const foreLen = 0.7;
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.2, foreLen, 0.2), mat);
      fore.position.set(0, -foreLen/2, 0);
      elbowPivot.add(fore);

      const wristPivot = new THREE.Object3D();
      wristPivot.position.set(0, -foreLen, 0);
      elbowPivot.add(wristPivot);

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.26), dark);
      hand.position.set(0, -0.09, 0);
      wristPivot.add(hand);

      // store
      this.parts[(side==='R'?'r':'l')+'Shoulder'] = shoulderPivot;
      this.parts[(side==='R'?'r':'l')+'UpperPitch'] = upperArmPitch;
      this.parts[(side==='R'?'r':'l')+'Elbow'] = elbowPivot;
      this.parts[(side==='R'?'r':'l')+'Wrist'] = wristPivot;
    };

    makeArm('R');
    makeArm('L');

    // ---- Legs (static for now) ----
    const makeLeg = (side:'R'|'L')=>{
      const sign = side==='R' ? 1 : -1;
      const hip = new THREE.Object3D();
      hip.position.set(0.23*sign, -0.2, 0);
      pelvis.add(hip);

      const upperLen = 1.0;
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.26, upperLen, 0.26), mat);
      thigh.position.set(0, -upperLen/2, 0);
      hip.add(thigh);

      const knee = new THREE.Object3D(); knee.position.set(0, -upperLen, 0); hip.add(knee);
      const shinLen = 1.0;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.24, shinLen, 0.24), mat);
      shin.position.set(0, -shinLen/2, 0);
      knee.add(shin);

      const ankle = new THREE.Object3D(); ankle.position.set(0, -shinLen, 0); knee.add(ankle);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.5), dark);
      foot.position.set(0, -0.05, 0.12);
      ankle.add(foot);
    };
    makeLeg('R'); makeLeg('L');
  }

  private applyStateToRig(){
  // États du bras droit
  const s0 = this.states[0]?.target ?? this.states[0]?.angle ?? 0; // shoulder pitch (R)
  const s1 = this.states[1]?.target ?? this.states[1]?.angle ?? 0; // shoulder roll  (R)
  const s2 = this.states[2]?.target ?? this.states[2]?.angle ?? 0; // elbow (R)
  const s3 = this.states[3]?.target ?? this.states[3]?.angle ?? 0; // wrist (R)

  // Conventions & signes (ajustés) :
  //  - Pitch (+) = bras vers l'avant → on inverse le signe sur X
  //  - Roll  (+) = bras qui s'écarte sur le côté (sens OK)
  const d2r = THREE.MathUtils.degToRad;
  const SIGN = {
    r: { pitch: -1, roll: 1 },  // <- le point clé: pitch inversé pour aller vers l'avant
  };

  const rShoulder = this.parts['rShoulder'];
  const rUpper    = this.parts['rUpperPitch'];
  const rElbow    = this.parts['rElbow'];
  const rWrist    = this.parts['rWrist'];

  if (rShoulder) (rShoulder as any).rotation.z = d2r(SIGN.r.roll  * s1); // roll (écartement)
  if (rUpper)    (rUpper   as any).rotation.x = d2r(SIGN.r.pitch * s0); // pitch (avant/arrière)
  if (rElbow)    (rElbow   as any).rotation.x = d2r(s2);                // flexion coude
  if (rWrist)    (rWrist   as any).rotation.x = d2r(s3);                // flexion poignet
}

}
