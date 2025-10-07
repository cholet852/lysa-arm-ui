
import { Component, AfterViewInit, ElementRef, Input, OnChanges, HostListener, Output, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { JointState } from '../models';

type Axis = 'x'|'y'|'z';

@Component({
  selector: 'app-three-viewer',
  standalone: true,
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements AfterViewInit, OnChanges{

  @Input() states: Record<number,JointState> = {};
  @Output() statesChange = new EventEmitter<Record<number,JointState>>();

  private effFrame!: THREE.Object3D; // repère local (attaché au torse)

  private scene = new THREE.Scene();
  private cam!:THREE.PerspectiveCamera;
  private renderer!:THREE.WebGLRenderer;
  private host?:HTMLElement;
  private controls!:OrbitControls;

  // rig parts
  private parts: {[k:string]:THREE.Object3D} = {};

  // === IK additions ===
  private target!: THREE.Mesh;
  private tcontrols!: TransformControls;
  private dragging = false;

  // limites et mapping cohérents avec applyStateToRig()
  // 0 Shoulder: X (sign -1) | 1 Upper: Z (sign -1) | 2 Elbow: X (sign -1) | 3 Wrist: X (sign +1)
  private IK_CFG = [
    { name:'rShoulder',   axis:'x' as Axis, min:-180, max:  30 },
    { name:'rUpperPitch', axis:'z' as Axis, min:-180, max:   5 },
    { name:'rElbow',      axis:'x' as Axis, min:-150, max:   0 },
    { name:'rWrist',      axis:'x' as Axis, min: -90, max:  90 },
  ];

  private lastEmit = 0;
  private readonly EMIT_DT = 40; // ms ~25 Hz pour ne pas spammer

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
    this.addIKTargetAndControls();   // <<<<<<<<<<  effector + TransformControls

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

  // ---------------- IK: effector + controls ----------------
  private addIKTargetAndControls() 
  {
    // Repère local pour l’effecteur : même repère que le torse
    this.effFrame = new THREE.Object3D();
    const chest = this.getNode('chest');
    chest.add(this.effFrame);
    this.effFrame.position.set(0, 0, 0);
    this.effFrame.quaternion.identity();
    this.effFrame.updateMatrixWorld(true);

    // Sphère "effector" — ATTENTION: parentée à effFrame (pas à scene)
    const g = new THREE.SphereGeometry(0.06, 16, 16);
    const m = new THREE.MeshBasicMaterial({ wireframe: true });
    this.target = new THREE.Mesh(g, m);

    this.effFrame.add(this.target);

    // Positionner la cible exactement sur la main (en coords locales effFrame)
    this.placeTargetOnRightHand();

    // TransformControls en repère LOCAL (celui d'effFrame/chest)
    this.tcontrols = new TransformControls(this.cam, this.renderer.domElement);
    this.tcontrols.setMode('translate');

    this.tcontrols.setSpace('local');     // <<< clé : repère du torse
    this.tcontrols.showY = true;         // bloque Y pour éviter “lever le bras”
    this.tcontrols.showX = true;
    this.tcontrols.showZ = true;

    this.scene.add(this.tcontrols.getHelper());
    this.tcontrols.attach(this.target);

    // Conflits d'inputs
    this.tcontrols.addEventListener('dragging-changed', (e: any) => {
    this.dragging = e.value;
    this.controls.enabled = !this.dragging;
    if (!this.dragging) 
    {
      this.lastEmit = 0;
      this.statesChange.emit(this.states); // ← nouvelle ref finale
    }
    });

    // Résoudre IK uniquement pendant le drag
    this.tcontrols.addEventListener('change', () => {
      if (!this.dragging) return; // pas d'IK au simple survol

      const targetW = this.target.getWorldPosition(new THREE.Vector3());
      this.solveIKToTarget(targetW); // -> met angle & target à jour

      // Émettre pendant le drag (throttle) pour rafraîchir les champs/knobs
      const now = performance.now();
      if (now - this.lastEmit > this.EMIT_DT) {
        this.lastEmit = now;
        // nouvelle référence pour que l’UI détecte le changement même en OnPush
        this.statesChange.emit({ ...this.states });
      }
    });

    // Évite les events parasites
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if ((this.tcontrols as any).axis) e.stopPropagation();
    });
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (this.dragging) e.stopPropagation();
    });

    // (Option) Si “avant” te semble inversé, décommente une de ces lignes :
    //this.effFrame.rotateY(Math.PI);      // inverse le Z avant/arrière
    this.effFrame.rotateY(Math.PI * 0.5); // si ton modèle a +X = avant
  }

  // Place la cible sur le bout de la main droite en coordonnées locales d'effFrame
  private placeTargetOnRightHand() 
  {
     // forcer la MAJ des world matrices
    this.scene.updateMatrixWorld(true);
    this.effFrame.updateMatrixWorld(true);

    const pWorld = this.getEndEffectorWorldPos();          // position monde du tip
    const pLocal = this.effFrame.worldToLocal(pWorld.clone()); // converti vers repère torse
    this.target.position.copy(pLocal);
    this.target.updateMatrixWorld(true);
  }


  // utilitaires
  private getNode(name:string){ return this.parts[name]; }
  private clamp(v:number,min:number,max:number){ return Math.max(min, Math.min(max, v)); }

  private getEndEffectorWorldPos(): THREE.Vector3 {
    // bout de la “main” droite: 6 cm sous le pivot du poignet
    const wrist = this.getNode('rWrist');
    const localTip = new THREE.Vector3(0, -0.06, 0);
    return wrist.localToWorld(localTip.clone());
  }

  private jointAxisWorld(j: THREE.Object3D, axis: Axis): THREE.Vector3 {
    const m = new THREE.Matrix4().extractRotation(j.matrixWorld);
    const ax = new THREE.Vector3(axis==='x'?1:0, axis==='y'?1:0, axis==='z'?1:0);
    return ax.applyMatrix4(m).normalize();
  }

  private getJointAngleDeg(j: THREE.Object3D, axis: Axis): number {
    const e = (j as any).rotation as THREE.Euler;
    const rad = axis==='x' ? e.x : axis==='y' ? e.y : e.z;
    return THREE.MathUtils.radToDeg(rad);
  }

  private setJointAngleDeg(j: THREE.Object3D, axis: Axis, deg: number){
    const e = (j as any).rotation as THREE.Euler;
    const rad = THREE.MathUtils.degToRad(deg);
    if (axis==='x') e.x = rad;
    if (axis==='y') e.y = rad;
    if (axis==='z') e.z = rad;
  }

  private normalizeDeg(a:number){ 
    // renvoie dans [-180, 180)
    return ((a + 180) % 360 + 360) % 360 - 180; 
  }


  // une passe CCD (du poignet vers l’épaule)
  private ikIterateOnce(targetW: THREE.Vector3){
    let endW = this.getEndEffectorWorldPos();
    const chain = this.IK_CFG.slice().reverse(); // rWrist -> rShoulder

    for (const link of chain){
      const joint = this.getNode(link.name);
      if (!joint) continue;

      const jPos = new THREE.Vector3();
      joint.getWorldPosition(jPos);

      const vEnd = endW.clone().sub(jPos);
      const vTar = targetW.clone().sub(jPos);
      if (vEnd.lengthSq()<1e-8 || vTar.lengthSq()<1e-8) continue;

      const axisW = this.jointAxisWorld(joint, link.axis);
      const vEndP = vEnd.clone().sub(axisW.clone().multiplyScalar(vEnd.dot(axisW)));
      const vTarP = vTar.clone().sub(axisW.clone().multiplyScalar(vTar.dot(axisW)));
      if (vEndP.lengthSq()<1e-10 || vTarP.lengthSq()<1e-10) continue;
      vEndP.normalize(); vTarP.normalize();

      const cross = new THREE.Vector3().crossVectors(vEndP, vTarP);
      const sgn = Math.sign(cross.dot(axisW));
      let delta = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(cross.length(), -1, 1)));
      delta *= sgn;

      const gain = 0.6; // stabilité
      const cur = this.normalizeDeg(this.getJointAngleDeg(joint, link.axis));
      let next  = this.normalizeDeg(cur + delta * gain);
      next = this.clamp(next, link.min, link.max);
      this.setJointAngleDeg(joint, link.axis, next);

      // met à jour la position de l'effecteur après l’ajustement de ce joint
      endW = this.getEndEffectorWorldPos();
    }
  }

  private solveIKToTarget(targetW: THREE.Vector3){
    for (let i=0;i<10;i++) this.ikIterateOnce(targetW);
    this.syncStatesFromRig(); // met à jour states[j].target
  }

  private syncStatesFromRig() 
  {
    const d = THREE.MathUtils.radToDeg;

    const rShoulder   = (this.getNode('rShoulder')   as any)?.rotation;
    const rUpperPitch = (this.getNode('rUpperPitch') as any)?.rotation;
    const rElbow      = (this.getNode('rElbow')      as any)?.rotation;
    const rWrist      = (this.getNode('rWrist')      as any)?.rotation;
    if (!rShoulder || !rUpperPitch || !rElbow || !rWrist) return;

    const vals = [
      -d(rShoulder.x),     // 0 Shoulder
      -d(rUpperPitch.z),   // 1 Upper
      -d(rElbow.x),        // 2 Elbow
      +d(rWrist.x),        // 3 Wrist
    ];

    // ✅ NEW: rebuild immutably
    const next: Record<number, JointState> = { ...this.states };
    vals.forEach((v, j) => {
      const prev = this.states[j] ?? ({
        id: j, angle: 0, target: 0, speed: 0, accel: 0, current: 0, microsteps: 0,
        flags: { ok: true }
      } as any);
      next[j] = { ...prev, angle: v, target: v };   // ← nouvelle référence par joint
    });

    this.states = next;  // ← nouvelle référence map
  }

  private applyStateToRig()
  {
    if (this.dragging) return;   // pendant drag, on laisse la main suivre le gizmo

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

    this.scene.updateMatrixWorld(true);

    // à la fin : recale la cible sur la main pour garder le gizmo dessus
    if (this.target) this.placeTargetOnRightHand();

  }
}
