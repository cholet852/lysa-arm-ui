import { Component, AfterViewInit, ElementRef, Input, OnChanges } from '@angular/core';
import * as THREE from 'three';
import { JointState } from '../models';

@Component({
  selector: 'app-three-viewer',
  standalone: true,
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements AfterViewInit, OnChanges{
  @Input() states: Record<number,JointState> = {};
  private scene = new THREE.Scene(); private cam!:THREE.PerspectiveCamera; private renderer!:THREE.WebGLRenderer; private host?:HTMLElement;
  private parts:{[k:string]:THREE.Object3D}={};

  constructor(private el:ElementRef){}

  ngAfterViewInit(){
    this.host = this.el.nativeElement.querySelector('.canvas');
    this.cam = new THREE.PerspectiveCamera(50, this.host!.clientWidth/300, 0.1, 100);
    this.cam.position.set(2,2,4);
    const light = new THREE.DirectionalLight(0xffffff, 1); light.position.set(3,5,2); this.scene.add(light); this.scene.add(new THREE.AmbientLight(0xffffff, .5));
    this.renderer = new THREE.WebGLRenderer({antialias:true}); this.renderer.setSize(this.host!.clientWidth, 300); this.host!.appendChild(this.renderer.domElement);

    const mat = new THREE.MeshStandardMaterial();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, .2, 1), mat); base.position.y=.1; this.scene.add(base);
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.6,16), mat); shoulder.position.set(0,.5,0); this.scene.add(shoulder);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(.2,.8,.2), mat); upper.position.set(0,1.1,0); shoulder.add(upper);
    const elbow = new THREE.Object3D(); elbow.position.set(0, .4, 0); upper.add(elbow);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(.18,.7,.18), mat); fore.position.set(0,.35,0); elbow.add(fore);
    const wrist = new THREE.Object3D(); wrist.position.set(0, .35, 0); fore.add(wrist);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(.25,.2,.25), mat); hand.position.set(0,.1,0); wrist.add(hand);

    this.parts = {shoulder, upper, elbow, fore, wrist};

    const render = ()=>{ requestAnimationFrame(render); this.renderer.render(this.scene, this.cam); };
    render();
  }

  ngOnChanges(){
    const s0 = this.states[0]?.angle ?? 0;
    const s1 = this.states[1]?.angle ?? 0;
    const s2 = this.states[2]?.angle ?? 0;
    const s3 = this.states[3]?.angle ?? 0;

    if(this.parts['shoulder']){ this.parts['shoulder'].rotation.z = THREE.MathUtils.degToRad(s1); }
    if(this.parts['upper']){ this.parts['upper'].rotation.x = THREE.MathUtils.degToRad(s0); }
    if(this.parts['elbow']){ this.parts['elbow'].rotation.x = THREE.MathUtils.degToRad(s2); }
    if(this.parts['wrist']){ this.parts['wrist'].rotation.x = THREE.MathUtils.degToRad(s3); }
  }
}
