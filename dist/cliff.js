import * as THREE from './vendor/three.module.js';
import {LAVA_SOURCE,LAVA_BASE,CLIFF_FRONT_Z} from './landscape-layout.js';

// C1 is modeled rock: a closed opaque volume with real front relief, lateral
// returns and a projecting undercut ledge. No background image or alpha fade.
export function createCliff(scene){
 const group=new THREE.Group();group.name='C1 fractured basalt cliff';group.position.set(0,0,CLIFF_FRONT_Z);scene.add(group);
 const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
 const smooth=t=>t*t*(3-2*t);
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy),h=(a,b)=>random(a+b*71.37);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix,iy),h(ix+1,iy),u),THREE.MathUtils.lerp(h(ix,iy+1),h(ix+1,iy+1),u),v)};
 const step=(a,b,x)=>smooth(THREE.MathUtils.clamp((x-a)/(b-a),0,1));
 const span=1.10-LAVA_BASE.y,nx=46;
 const cut=(v,values)=>{const t=THREE.MathUtils.clamp(v,0,1)*(values.length-1),i=Math.min(values.length-2,Math.floor(t));return THREE.MathUtils.lerp(values[i],values[i+1],t-i)};
 const rows=Array.from({length:57},(_,i)=>i/56);
 for(const y of [LAVA_SOURCE.y-.011,LAVA_SOURCE.y-.006,LAVA_SOURCE.y-.001,LAVA_SOURCE.y+.004,LAVA_SOURCE.y+.023,LAVA_SOURCE.y+.057,LAVA_SOURCE.y+.073])rows.push((y-LAVA_BASE.y)/span);
 rows.sort((a,b)=>a-b);const ys=rows.filter((v,i)=>!i||v-rows[i-1]>.0001),ny=ys.length-1;
 const positions=[],colors=[],indices=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const v=ys[j],u=i/nx,centred=u*2-1;
  const left=-.215+cut(v,[.005,.030,.008,.045,.012,.050,.006,.025,.002])+(noise(v*15.2,1.7)-.5)*.006;
  const right=.215-cut(v,[.012,.003,.032,.007,.048,.014,.040,.005,.018])+(noise(v*17.4,7.1)-.5)*.006;
  let x=THREE.MathUtils.lerp(left,right,u);
  x+=(noise(i*.72,j*.61)-.5)*.0035*Math.sin(u*Math.PI);
  const foot=(noise(u*19.3,2.1)-.5)*.013*Math.min(1,Math.abs(centred)*4);
  let y=v*span+foot*(1-v);
  y+=(noise(i*.57,j*.48)-.5)*.0025*Math.sin(v*Math.PI);
  const worldY=LAVA_BASE.y+y;
  const faultX=u*9+v*.36,faultY=v*7+u*.63;
  const joint=Math.floor(faultX),course=Math.floor(faultY),seed=joint*19+course*37;
  const alongX=faultX-joint-.5,alongY=faultY-course-.5;
  // Piecewise planar crags separated by real depth steps, rather than cloth.
  let z=-130+random(seed+30)*80+alongX*(random(seed+4)-.5)*28+alongY*(random(seed+9)-.5)*25;
  z+=(noise(u*51,v*41)-.5)*1.4;
  z-=Math.exp(-Math.pow(centred/.18,2)-Math.pow((worldY-(LAVA_SOURCE.y-.016))/.024,2))*10;
  z+=Math.exp(-v*10)*(7+noise(u*13.7,6.8)*7);
  z=THREE.MathUtils.clamp(z,-141,-32);
  const edgeRough=step(.014,.045,Math.abs(x));
  const lower=LAVA_SOURCE.y-.006+(noise(u*18.2,15.)-.5)*.014*edgeRough;
  const upper=LAVA_SOURCE.y+.040+(noise(u*11.7,19.)-.5)*.012;
  const hood=Math.exp(-Math.pow(x/.055,4));
  const lip=step(lower-.003,lower+.002,worldY)*(1-step(upper,upper+.012,worldY))*hood;
  z=THREE.MathUtils.lerp(z,27+noise(u*13.8,v*11.2)*3,lip);
  positions.push(x,y,z);
  const shade=(.61+random(joint*3+course*17)*.25+noise(u*27,v*31)*.13)*(.72+.28*step(0,.16,v));
  colors.push(shade,shade*.99,shade*.97);
 }
 const frontVertexCount=positions.length/3;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
  if((i+j)%2)indices.push(a,b,d,a,d,c);else indices.push(a,b,c,b,d,c);
 }
 // The complete perimeter is shared by front/side/back triangles. Topological
 // closure is deliberate, including the irregular floor contact and crown.
 const boundary=[];
 for(let i=0;i<=nx;i++)boundary.push(i);
 for(let j=1;j<=ny;j++)boundary.push(j*(nx+1)+nx);
 for(let i=nx-1;i>=0;i--)boundary.push(ny*(nx+1)+i);
 for(let j=ny-1;j>0;j--)boundary.push(j*(nx+1));
 const back=[];
 for(const f of boundary){const x=positions[f*3],y=positions[f*3+1];back.push(positions.length/3);positions.push(x+(x<0?-.018:.011)-.004,y,-232);colors.push(.47,.48,.49)}
 const centre=positions.length/3;positions.push(-.004,span*.5,-232);colors.push(.45,.46,.47);
 for(let i=0;i<boundary.length;i++){
  const n=(i+1)%boundary.length,f=boundary[i],g=boundary[n],b=back[i],c=back[n];
  indices.push(f,b,c,f,c,g,centre,c,b);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const uniforms={masks:{value:Array.from({length:6},()=>new THREE.Vector4(-2,-2,0,0))}};
 const material=new THREE.MeshStandardMaterial({color:0x242a2c,emissive:0x20262c,emissiveIntensity:.14,roughness:.98,metalness:.015,vertexColors:true,transparent:false,opacity:1,depthWrite:true,depthTest:true});
 material.name='Opaque worn basalt';
 material.onBeforeCompile=shader=>{
  shader.uniforms.cliffMasks=uniforms.masks;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 cliffPosition;varying vec4 cliffClip;').replace('#include <begin_vertex>','#include <begin_vertex>\ncliffPosition=position;').replace('#include <project_vertex>','#include <project_vertex>\ncliffClip=gl_Position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 cliffPosition;varying vec4 cliffClip;uniform vec4 cliffMasks[6];
   float basaltHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec3 grainCell=floor(cliffPosition*vec3(1500.,1100.,.8));
   float grain=basaltHash(grainCell);
   float weather=basaltHash(floor(cliffPosition*vec3(62.,43.,.12)));
   diffuseColor.rgb*=.68+grain*.16+weather*.16;
   vec2 uv=cliffClip.xy/cliffClip.w*.5+.5;float calm=0.;
   for(int i=0;i<6;i++){vec4 m=cliffMasks[i];vec2 d=abs(uv-m.xy)-m.zw;calm=max(calm,1.-smoothstep(0.,.045,max(d.x,d.y)));}
   diffuseColor.rgb*=1.-calm*.64;
  `);
 };
 material.customProgramCacheKey=()=> 'c1-closed-basalt-v1';
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Closed fractured basalt mass';mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
 const warm=new THREE.Color(0x242a2c),cold=new THREE.Color(0x222b30),worldBounds=new THREE.Box3();
 const edgeUse=new Map();for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edgeUse.set(key,(edgeUse.get(key)||0)+1)}
 const topology=Object.freeze({vertices:positions.length/3,triangles:indices.length/3,boundaryEdges:[...edgeUse.values()].filter(n=>n===1).length,nonManifoldEdges:[...edgeUse.values()].filter(n=>n!==2).length,euler:positions.length/3-edgeUse.size+indices.length/3});
 let width=0,height=0;
 const state=Object.freeze({kind:'solid-fractured-cliff',source:LAVA_SOURCE,base:LAVA_BASE,frontZ:CLIFF_FRONT_Z,mesh,geometry,topology,frontVertexCount,get worldBounds(){return worldBounds.clone()},get opaque(){return !material.transparent&&material.opacity===1&&material.depthWrite}});
 return {group,state,update({width:w=1440,height:h=900,heat=1,masks=[]}={}){
  if(w!==width||h!==height){width=w;height=h;group.position.set((LAVA_SOURCE.x-.5)*w,(LAVA_BASE.y-.5)*h,CLIFF_FRONT_Z);group.scale.set(Math.max(w,640),h,Math.max(.5,Math.min(1,w/1280)));group.updateMatrixWorld(true);worldBounds.setFromObject(group)}
  material.color.copy(cold).lerp(warm,THREE.MathUtils.clamp(heat,0,1));
  for(let i=0;i<uniforms.masks.value.length;i++){const m=masks[i],v=uniforms.masks.value[i];if(!m)v.set(-2,-2,0,0);else if(Array.isArray(m))v.fromArray(m);else v.copy(m)}
 }};
}
