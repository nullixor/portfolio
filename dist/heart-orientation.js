import * as THREE from './vendor/three.module.js';

// A separate world-Y carrier preserves turning while the cube rests on a corner.
export function mountCornerUp(heart){
 const carrier=new THREE.Group();carrier.name='Heart vertical yaw';carrier.add(heart);
 heart.quaternion.setFromUnitVectors(new THREE.Vector3(1,1,1).normalize(),new THREE.Vector3(0,1,0));
 const extent=new THREE.Box3().setFromObject(heart).getSize(new THREE.Vector3());
 return {carrier,extent};
}
