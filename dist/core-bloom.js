import * as THREE from './vendor/three.module.js';

// Selective optical bloom: the luminous core is rendered through black shell
// occluders, blurred at reduced resolution, then added over the finished scene.
export function createCoreBloom(renderer,heart,coreMaterial,projectionRoot=null){
 const sourceScene=new THREE.Scene(),objects=[];
 const dark=new THREE.MeshBasicMaterial({color:0x000000,toneMapped:false});
 const light=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 heart.traverse(original=>{if(!original.isMesh)return;const copy=new THREE.Mesh(original.geometry,original.material===coreMaterial?light:dark);copy.matrixAutoUpdate=false;sourceScene.add(copy);objects.push({original,copy})});
 const projected=new Map();
 function syncProjection(){
  if(!projectionRoot)return;
  projectionRoot.updateWorldMatrix(true,true);
  projectionRoot.traverse(original=>{
   if(!original.isMesh)return;
   let copy=projected.get(original);
   if(!copy){copy=new THREE.Mesh(original.geometry,original.material.clone());copy.matrixAutoUpdate=false;sourceScene.add(copy);projected.set(original,copy)}
   copy.matrix.copy(original.matrixWorld);let visible=true;
   for(let node=original;node;node=node.parent)visible=visible&&node.visible;
   copy.visible=visible;copy.material.color.copy(original.material.color);copy.material.opacity=original.material.opacity*.65;
  });
 }
 const targetA=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
 const targetB=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
 const quadScene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{map:{value:targetA.texture},direction:{value:new THREE.Vector2()}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D map;uniform vec2 direction;void main(){vec4 c=texture2D(map,vUv)*.227027;c+=(texture2D(map,vUv+direction*1.384615)+texture2D(map,vUv-direction*1.384615))*.316216;c+=(texture2D(map,vUv+direction*3.230769)+texture2D(map,vUv-direction*3.230769))*.070270;gl_FragColor=c;}`});
 const composite=new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{map:{value:targetA.texture},strength:{value:1.7}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D map;uniform float strength;void main(){vec4 light=texture2D(map,vUv);gl_FragColor=vec4(light.rgb*strength,1.);}'});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blur);quad.frustumCulled=false;quadScene.add(quad);
 const savedColor=new THREE.Color();let width=1,height=1;
 return {
  resize(w,h){width=Math.max(1,Math.round(w/3));height=Math.max(1,Math.round(h/3));targetA.setSize(width,height);targetB.setSize(width,height)},
  render(viewCamera,visibility=1){
   syncProjection();
   if((!heart.visible||visibility<.002)&&![...projected.values()].some(o=>o.visible&&o.material.opacity>.001))return;
   heart.updateWorldMatrix(true,true);
   objects.forEach(({original,copy})=>{copy.matrix.copy(original.matrixWorld);copy.visible=heart.visible&&original.visible});
   light.color.copy(coreMaterial.color).multiplyScalar(visibility);
   renderer.getClearColor(savedColor);const alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
   renderer.setClearColor(0x000000,0);renderer.autoClear=true;
   renderer.setRenderTarget(targetA);renderer.render(sourceScene,viewCamera);
   quad.material=blur;blur.uniforms.map.value=targetA.texture;blur.uniforms.direction.value.set(1.9/width,0);
   renderer.setRenderTarget(targetB);renderer.render(quadScene,camera);
   blur.uniforms.map.value=targetB.texture;blur.uniforms.direction.value.set(0,1.9/height);
   renderer.setRenderTarget(targetA);renderer.render(quadScene,camera);
   renderer.setRenderTarget(null);quad.material=composite;renderer.autoClear=false;
   renderer.render(quadScene,camera);
   renderer.autoClear=auto;renderer.setClearColor(savedColor,alpha);
  }
 };
}
