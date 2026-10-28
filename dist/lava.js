import * as THREE from './vendor/three.module.js';
import {LAVA_SOURCE,LAVA_BASE,CLIFF_FRONT_Z} from './landscape-layout.js';
import {createLavaTransport,FALL_TRAVEL,TOTAL_TRAVEL} from './lava-transport.js';

export function createLava(scene){
 const samples=256,bytes=new Uint8Array(samples*4);
 const profile=new THREE.DataTexture(bytes,samples,1,THREE.RGBAFormat,THREE.UnsignedByteType);
 profile.minFilter=THREE.LinearFilter;profile.magFilter=THREE.LinearFilter;profile.generateMipmaps=false;
 const uniforms={aspect:{value:1},time:{value:0},heat:{value:1},source:{value:new THREE.Vector2(LAVA_SOURCE.x,LAVA_SOURCE.y)},base:{value:new THREE.Vector2(LAVA_BASE.x,LAVA_BASE.y)},flow:{value:profile},masks:{value:Array.from({length:6},()=>new THREE.Vector4(-2,-2,0,0))}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
 vertexShader:`varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`
 precision highp float;varying vec2 uvv;uniform float aspect,time,heat;uniform vec2 source,base;uniform sampler2D flow;uniform vec4 masks[6];
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(1.63,-1.17,1.17,1.63)*p+vec2(2.7,5.1);a*=.5;}return n;}
 float amount(float t){return texture2D(flow,vec2((clamp(t,0.,1.)*255.+.5)/256.,.5)).r;}
 vec3 thermal(vec3 cold,vec3 hot){return mix(cold,hot,heat);}
 void main(){
  vec2 uv=uvv;float calm=0.;for(int i=0;i<6;i++){vec4 m=masks[i];vec2 d=abs(uv-m.xy)-m.zw;calm=max(calm,1.-smoothstep(0.,.018,max(d.x,d.y)));}
  float protect=1.-calm*.96;vec3 color=vec3(0.);float alpha=0.;
  // Straight central sheet. Each height samples the age of material at that point.
  float t=clamp((source.y-uv.y)/(source.y-base.y),0.,1.);
  if(uv.y<=source.y+.004&&uv.y>=base.y-.012){
   float travel=amount(t*${(FALL_TRAVEL/TOTAL_TRAVEL).toFixed(8)});
   float vertical=smoothstep(base.y-.012,base.y+.005,uv.y)*(1.-smoothstep(source.y-.003,source.y+.004,uv.y));
   float centre=mix(source.x,base.x,t);
   // The viscous sheet follows the same 2.4-second travel time as its front.
   float advect=t-time/2.4;
   float baseWidth=.013+.004*t;
   float wandering=(noise(vec2(advect*10.,4.7))-.5)*baseWidth*.21;
   float d=abs((uv.x-centre)*aspect-wandering);
   float width=baseWidth*(.85+.24*noise(vec2(advect*16.,7.1)));
   if(d<width+.04&&travel>.001){
    float lat=((uv.x-centre)*aspect-wandering)/width;
    float flowNoise=fbm(vec2(lat*2.4+noise(vec2(advect*3.,2.))*.35,advect*7.));
    float raftField=noise(vec2(lat*2.8+flowNoise*.5,advect*22.));
    float crust=smoothstep(.67,.82,raftField)*(.40+.18*smoothstep(.25,.9,abs(lat)));
    float core=(1.-smoothstep(width*.82,width*1.08,d))*vertical*travel;
    float glow=exp(-d*d/.00065)*vertical*travel;
    vec3 rock=thermal(vec3(.025,.16,.28),vec3(.52,.09,.012));
    vec3 bright=thermal(vec3(.15,.42,.62),vec3(.92,.35,.048));
    color+=rock*(.74+.26*flowNoise)*(1.-crust)*core+bright*smoothstep(.49,.70,flowNoise)*core*.46;
    color+=thermal(vec3(.006,.035,.06),vec3(.13,.025,.002))*glow;
    alpha=max(alpha,clamp(core*.94+glow*.16,0.,1.));
   }
  }
  if(uv.y<=base.y+.014){
   float p=clamp((base.y-uv.y)/base.y,0.,1.);
   float travel=amount((${FALL_TRAVEL.toFixed(1)}+p*${(TOTAL_TRAVEL-FALL_TRAVEL).toFixed(1)})/${TOTAL_TRAVEL.toFixed(1)});
   float centre=base.x+p*p*.12+sin(p*5.)*.018*p+(noise(vec2(p*22.,5.))-.5)*.008*p;
   float width=mix(.010,.165,pow(p,1.27)),d=abs(uv.x-centre)*aspect;
   float river=(1.-smoothstep(width*.75,width,d))*(1.-smoothstep(base.y+.004,base.y+.014,uv.y));
   if(d<width+.09&&travel>.001){
    float lat=(uv.x-centre)*aspect/max(.01,width);
    float advect=fbm(vec2(lat*5.8+noise(vec2(p*3.,4.))*.6,p*1.6-time*.65));
    float raft=smoothstep(.59,.76,noise(vec2(lat*4.4+advect*.6,p*6.-time*.72)))*(.3+.7*smoothstep(.25,.92,abs(lat)));
    float hot=smoothstep(.39,.67,advect)*(1.-smoothstep(width*.18,width*.8,d));
    vec3 molten=thermal(vec3(.025,.13,.26),vec3(.48,.078,.009))*(.55+advect*.35)*(1.-raft*.68);
    molten+=thermal(vec3(.13,.32,.51),vec3(.44,.19,.03))*hot;
    float bank=exp(-pow((d-width*.94)/(.014+p*.024),2.));
    color+=molten*river*travel+thermal(vec3(.008,.034,.06),vec3(.16,.034,.003))*bank*travel*.6;
    alpha=max(alpha,clamp((river*.9+bank*.2)*travel,0.,1.));
   }
   vec2 impact=(uv-base)*vec2(aspect,1.)/vec2(.055,.018);
   float pool=exp(-dot(impact,impact)*1.4)*amount(${(FALL_TRAVEL/TOTAL_TRAVEL).toFixed(8)});
   color+=thermal(vec3(.07,.22,.34),vec3(.38,.12,.012))*pool;
   alpha=max(alpha,pool*.48);
  }
  gl_FragColor=vec4(max(color,vec3(0.)),alpha*protect);
 }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.name='Transported lava fall and river';mesh.position.z=CLIFF_FRONT_Z+10;mesh.frustumCulled=false;scene.add(mesh);
 let transport=null;
 const state={get gate(){return transport?.gate??0},get history(){return transport?.history??[]},sample(distance,time){return transport?transport.sample(distance,time):0},get fallTravel(){return FALL_TRAVEL},get totalTravel(){return TOTAL_TRAVEL}};
 return {state,update({width=1440,height=900,time=0,heat=1,page='home',paused=false,masks=[]}={}){
  if(!transport)transport=createLavaTransport(page,time);transport.setPage(page,time);
  transport.snapshot(time);
  for(let i=0;i<samples;i++){const value=Math.round(transport.sample(i/(samples-1)*TOTAL_TRAVEL,time)*255),j=i*4;bytes[j]=value;bytes[j+1]=bytes[j+2]=value;bytes[j+3]=255}
  profile.needsUpdate=true;mesh.scale.set(width,height,1);uniforms.aspect.value=width/Math.max(1,height);uniforms.time.value=time;uniforms.heat.value=THREE.MathUtils.clamp(heat,0,1);
  for(let i=0;i<uniforms.masks.value.length;i++){const m=masks[i],target=uniforms.masks.value[i];if(!m)target.set(-2,-2,0,0);else if(Array.isArray(m))target.fromArray(m);else target.copy(m)}
 }};
}
