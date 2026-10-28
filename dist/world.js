import * as THREE from './vendor/three.module.js';
import {createHeart} from './heart.js';
import {mountCornerUp} from './heart-orientation.js';
import {createEnvironment} from './environment.js';
import {createProjection} from './projection.js';
import {createCoreBloom} from './core-bloom.js';
import {createLavaProgress} from './lava-progress.js';
import {createLava} from './lava.js';
import {createCliff} from './cliff.js';

// One foreground scene, one material family, one key-light direction.
// Environment follows the approved bare foundation; no legacy effects are loaded.
export async function createWorld(container,{simpleBackground=false}={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,simpleBackground?1:1.7));
 renderer.setClearColor(0x090b0d,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 container.append(renderer.domElement);
 const scene=new THREE.Scene();
 // Keep expensive full-screen shaders and cliff geometry out of the initial
 // low-lag scene. Restore the accepted environment only on explicit request.
 let backgroundRoot,environment,cliff,lava;
 function ensureBackground(){
  if(backgroundRoot)return;
  backgroundRoot=new THREE.Group();backgroundRoot.name='Full cavern background';scene.add(backgroundRoot);
  environment=createEnvironment(backgroundRoot);cliff=createCliff(backgroundRoot);lava=createLava(backgroundRoot);
 }
 if(!simpleBackground)ensureBackground();
 const projection=createProjection(scene);
 const lavaProgress=createLavaProgress();
 const masks=Array.from({length:6},()=>new THREE.Vector4(-2,-2,0,0));
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2500);camera.position.z=1000;
 const fill=new THREE.HemisphereLight(0x7f7161,0x19191d,.80);scene.add(fill);
 const key=new THREE.DirectionalLight(0xffc18b,2.7);key.position.set(-350,340,550);scene.add(key);
 const palette={
  iron:new THREE.MeshStandardMaterial({color:0x363832,roughness:.73,metalness:.42}),
  brass:new THREE.MeshStandardMaterial({color:0x705b40,roughness:.72,metalness:.58}),
  gold:new THREE.MeshStandardMaterial({color:0x9c8059,roughness:.62,metalness:.58}),
  emissive:new THREE.MeshStandardMaterial({color:0xb99565,emissive:0xc16728,emissiveIntensity:.25,roughness:.50,metalness:.35})
 };
 // Deposited soot is spatially fixed to each modeled part, with warmer worn
 // patches and a rough surface instead of clean uniformly polished brass.
 function weather(material,strength){
  material.customProgramCacheKey=()=>`forge-weather-${strength}`;
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 forgePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nforgePosition=position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 forgePosition;
    float forgeHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float forgeNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(forgeHash(i),forgeHash(i+vec3(1,0,0)),f.x),mix(forgeHash(i+vec3(0,1,0)),forgeHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(forgeHash(i+vec3(0,0,1)),forgeHash(i+vec3(1,0,1)),f.x),mix(forgeHash(i+vec3(0,1,1)),forgeHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `).replace('#include <color_fragment>',`#include <color_fragment>
    float deposits=forgeNoise(forgePosition*3.7+vec3(4.,7.,1.));
    float speckle=forgeHash(floor(forgePosition*320.));
    diffuseColor.rgb*=mix(1.,.20+.75*smoothstep(.19,.86,deposits),${strength.toFixed(2)});
    diffuseColor.rgb*=.86+.14*speckle;
   `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+forgeNoise(forgePosition*9.)*.12,0.,1.);');
  };
 }
 for(const name of ['iron','brass','gold'])weather(palette[name],.80);
 const clockMats={brass:palette.brass,gold:palette.gold,iron:palette.iron,glow:palette.emissive};
 const clock=new THREE.Group();scene.add(clock);
 const response=await fetch('./assets/clock.json');if(!response.ok)throw Error('Clock asset unavailable');
 const {parts}=await response.json();const asset=await fetch('./assets/clock.bin');if(!asset.ok)throw Error('Clock geometry unavailable');
 const binary=await asset.arrayBuffer(),moving=new Map();
 for(const p of parts){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary,p.position.offset,p.position.length),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(binary,p.normal.offset,p.normal.length),3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(binary,p.index.offset,p.index.length),1));
  const mesh=new THREE.Mesh(geometry,clockMats[p.material]);mesh.name=p.name;
  if(p.motion==='fixed'){mesh.position.fromArray(p.pivot);clock.add(mesh)}else{
   if(!moving.has(p.motion)){const group=new THREE.Group();group.position.fromArray(p.pivot);moving.set(p.motion,group);clock.add(group)}
   moving.get(p.motion).add(mesh);
  }
 }
 const heartPalette=Object.fromEntries(Object.entries(palette).map(([name,material])=>[name,material.clone()]));
 heartPalette.iron.color.set(0x767973);heartPalette.iron.roughness=.73;heartPalette.iron.metalness=.42;
 for(const name of ['iron','brass','gold'])weather(heartPalette[name],.80);
 heartPalette.emissive=new THREE.MeshBasicMaterial({color:0x82eaff,toneMapped:false});
 const mechanism=createHeart(heartPalette),heart=mechanism.group;
 // Corner-up pose belongs below the yaw carrier, so turning stays world-vertical.
 const {carrier:heartCarrier,extent:heartExtent}=mountCornerUp(heart);scene.add(heartCarrier);
 // The powered bore casts a little colored light onto its own worn metal.
 const coreLight=new THREE.PointLight(0x70ddff,1.8,160,0);coreLight.position.set(0,.04,.08);heart.add(coreLight);
 let bloom=simpleBackground?null:createCoreBloom(renderer,heart,heartPalette.emissive,projection.group);
 // Independent instances allow both objects to fade without changing shared colors.
 const clockMaterials=[...new Set(Object.values(clockMats))];
 const heartMaterials=Object.values(heartPalette);
 const allMaterials=[...clockMaterials,...heartMaterials];allMaterials.forEach(m=>{m.transparent=true});
 let lastRendered=0;
 let width=0,height=0,time=0,last=0,page=document.body.dataset.page||'home',paused=false,dirty=true;
 let boundsDirty=true,maskDirty=true,copyUntil=0,copyWasActive=false;
 let homeMix=page==='home'?1:0,heat=page==='about'?0:1,spin=0,selection=0,energy=0;
 const heartTarget=new THREE.Vector3(),heartPosition=new THREE.Vector3();let positioned=false;
 let clockSize=0,heartSize=0;
 const coldKey=new THREE.Color(0xa6b7b8),warmKey=new THREE.Color(0xffbd7a);
 const warmBrass=new THREE.Color(0x705b40),coldBrass=new THREE.Color(0x5d605b);
 function center(selector){const r=document.querySelector(selector).getBoundingClientRect();return {x:r.left+r.width/2-width/2,y:height/2-r.top-r.height/2,w:r.width,h:r.height}}
 function layout(){
  const mobile=width<=650;
  clockSize=mobile?Math.min(width*.69,300):Math.min(width*.44,height*.74);
  clock.scale.setScalar(clockSize/4.95);
  clock.position.set((mobile?width*.05:width*.225)+(1-homeMix)*width*.65,mobile?height/2-97-height*.205:height*.01,0);
  if(page!=='home'){
   const c=center(page==='about'?'.heart-space':'.project-art');
   heartTarget.set(c.x,c.y+(page==='projects'?18:0),0);
   heartSize=Math.min(c.w*.84/heartExtent.x,c.h*.78/heartExtent.y,148);
   if(!positioned){heartPosition.copy(heartTarget);positioned=true}
  }
 }
 function textMasks(){
  const visible=document.querySelector(`.page[data-view="${page}"]`);
  const elements=[...visible.querySelectorAll('.home-copy h1,.home-copy .subtitle,.home-copy .intro,.page-heading h1,.panel-content:not(.about-ghost)')];
  masks.forEach((mask,i)=>{const el=elements[i];if(!el){mask.set(-2,-2,0,0);return}let r=(time<copyUntil&&el.matches('.panel-content')?el.parentElement:el).getBoundingClientRect();if(el.matches('h1,p')){const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect();if(text.width&&text.height)r=text}mask.set((r.left+r.width/2)/width,1-(r.top+r.height/2)/height,r.width/width/2,r.height/height/2)});
 }
 function resize(){width=innerWidth;height=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,simpleBackground?1:1.7));renderer.setSize(width,height);bloom?.resize(width,height);camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();boundsDirty=maskDirty=dirty=true}
 function frame(now){
  if(document.hidden){last=now;return}
  // In the lighter mode, cap foreground rendering too; the gradient is a
  // compositor transform and needs no JavaScript or WebGL background work.
  if(simpleBackground&&!dirty&&lastRendered&&now-lastRendered<1000/30-1)return;
  lastRendered=now;
  const dt=last?Math.min((now-last)/1000,.5):0;
  last=now;
  if(paused&&!dirty)return;
  if(!paused)time+=dt;
  const ease=paused?1:1-Math.exp(-dt*3.2);
  homeMix=THREE.MathUtils.lerp(homeMix,page==='home'?1:0,ease);
  if(!paused)heat=THREE.MathUtils.lerp(heat,page==='about'?0:1,1-Math.exp(-dt*.9));
  if(!paused)energy*=Math.exp(-dt*2.1);
  const copyActive=time<copyUntil;
  if(copyWasActive&&!copyActive)boundsDirty=maskDirty=true;
  copyWasActive=copyActive;
  const measure=boundsDirty;
  if(measure){layout();boundsDirty=false}
  clock.visible=homeMix>.002;heart.visible=homeMix<.998;
  clockMaterials.forEach(m=>{m.opacity=homeMix});heartMaterials.forEach(m=>{m.opacity=1-homeMix});
  clock.position.set((width<=650?width*.05:width*.225)+(1-homeMix)*width*.65,width<=650?height/2-97-height*.205:height*.01,0);
  clock.rotation.set(.10,-.23,-.055);
  for(const [name,g] of moving){if(name==='minute')g.rotation.z=-time*.12-.65;else if(name==='hour')g.rotation.z=-time*.025+1.05;else g.rotation.z=time*(parseInt(name.slice(-1))%2?-.065:.045)}
  spin=THREE.MathUtils.lerp(spin,selection*Math.PI*.5,ease);
  heartPosition.lerp(heartTarget,ease);heartCarrier.position.copy(heartPosition);heartCarrier.position.z=-homeMix*220;
  heartCarrier.scale.setScalar(heartSize*(.65+.35*(1-homeMix)));
  heartCarrier.rotation.set(0,.57+spin,0);
  if(mechanism.update)mechanism.update(time,heat,energy);
  else if(mechanism.inner)mechanism.inner.rotation.y=time*.09;
  key.color.copy(coldKey).lerp(warmKey,heat);
  palette.brass.color.copy(coldBrass).lerp(warmBrass,heat);heartPalette.brass.color.copy(palette.brass.color);
  heartPalette.emissive.color.set(0x70ddff).lerp(new THREE.Color(page==='projects'?0xff582b:0xffa34a),heat).multiplyScalar(2.0+Math.sin(time*1.15)*.08+energy*.5);
  coreLight.color.copy(heartPalette.emissive.color);coreLight.distance=heartSize*1.1;coreLight.intensity=(1-homeMix)*(1.8+energy*.8);
  if(maskDirty){if(!simpleBackground)textMasks();maskDirty=false}
  if(!simpleBackground){
   environment.update({width,height,time,heat,page,paused,masks});
   cliff.update({width,height,heat,masks});
   lava.update({width,height,time,heat,page,paused,masks});
  }
  const source=homeMix>.5?clock.position:heartCarrier.position;
  projection.update({width,height,time,heat,page,paused,boundsDirty:measure,source:{x:source.x+width/2,y:height/2-source.y}});
  renderer.render(scene,camera);if(!simpleBackground)bloom.render(camera,1-homeMix);
  lavaProgress.update({width,height,time,paused,page});dirty=false;
 }
 window.addEventListener('resize',resize);
 window.addEventListener('scroll',()=>{boundsDirty=maskDirty=dirty=true},{passive:true});
 document.fonts?.ready.then(()=>{boundsDirty=maskDirty=dirty=true});
 document.addEventListener('visibilitychange',()=>{last=0;dirty=true});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();document.body.classList.remove('webgl-ready')});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{document.body.classList.add('webgl-ready');dirty=true});
 resize();document.body.classList.add('webgl-ready');renderer.setAnimationLoop(frame);
 function setSimpleBackground(value){
  simpleBackground=Boolean(value);
  if(!simpleBackground){ensureBackground();if(!bloom)bloom=createCoreBloom(renderer,heart,heartPalette.emissive,projection.group)}
  if(backgroundRoot)backgroundRoot.visible=!simpleBackground;
  container.dataset.background=simpleBackground?'simple':'full';lastRendered=0;resize();
 }
 container.dataset.background=simpleBackground?'simple':'full';
 return {setSimpleBackground,beginTextTransition(durationMs=850){if(!paused){projection.beginTransition?.(durationMs);copyUntil=time+durationMs/1000}boundsDirty=maskDirty=dirty=true},setPage(value){page=value;copyUntil=0;if(paused)heat=page==='about'?0:1;boundsDirty=maskDirty=dirty=true},setPaused(value){paused=value;dirty=true},selectProject(value){selection=value;energy=.4;boundsDirty=maskDirty=dirty=true},energize(){energy=1;dirty=true}};
}
