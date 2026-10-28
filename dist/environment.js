import * as THREE from './vendor/three.module.js';

// One cohesive volcanic interior, drawn behind the models. Archives are references
// only: all relief, ground recession and molten cuts are generated here.
export function createEnvironment(scene){
 const uniforms={resolution:{value:new THREE.Vector2(1440,900)},aspect:{value:1.6},time:{value:0},heat:{value:1},masks:{value:Array.from({length:6},()=>new THREE.Vector4(-2,-2,0,0))}};
 const material=new THREE.ShaderMaterial({
  depthWrite:false,depthTest:false,toneMapped:false,uniforms,
  vertexShader:`varying vec2 surfaceUv;
   void main(){surfaceUv=uv;gl_Position=vec4(position.xy,.9999,1.);}`,
  fragmentShader:`
   precision highp float;
   varying vec2 surfaceUv;
   uniform vec2 resolution;
   uniform float aspect,time,heat;
   uniform vec4 masks[6];
   vec3 thermal(vec3 cold,vec3 hot){return mix(cold,hot,heat);}
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
   vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
   float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
   }
   float fbm(vec2 p){
    float n=0.,a=.52;
    for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(1.63,-1.17,1.17,1.63)*p+vec2(2.7,5.1);a*=.48;}
    return n;
   }
   // Warped cellular edges give interrupted branching seams, not a repeating
   // tile or a uniform field of molten color. Most of the floor stays crust.
   float fissure(vec2 p){
    vec2 cell=floor(p),f=fract(p);float first=8.,second=8.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
     vec2 offset=vec2(float(x),float(y)),delta=offset+hash2(cell+offset)-f;
     float d=dot(delta,delta);
     if(d<first){second=first;first=d;}else second=min(second,d);
    }
    return sqrt(second)-sqrt(first);
   }
   float vaultHeight(float x){
    return .925-.058*sin(x*4.2+.55)+(noise(vec2(x*14.0,8.1))-.5)*.048;
   }
   // Distant molten falls emerge from the roof and travel over rough basalt.
   // The broad component is reflected rock light; the fine component is lava.
   vec3 ceilingFall(vec2 uv,float x,float end,float width,float seed){
    float source=vaultHeight(x)+.014;
    float bend=(noise(vec2(uv.y*7.5,seed))-.5)*.014;
    bend+=(noise(vec2(uv.y*23.0,seed+6.))-.5)*.0035;
    float distance=abs(uv.x-x-bend)*aspect;
    float breakup=.72+.28*noise(vec2(uv.y*72.0+time*.65,seed));
    float ribbonWidth=width*(.50+noise(vec2(uv.y*35.0,seed+3.))*.80);
    float vertical=smoothstep(end-.028,end+.052,uv.y)*(1.-smoothstep(source-.009,source+.018,uv.y));
    float ribbon=(1.-smoothstep(ribbonWidth,ribbonWidth+.0020,distance))*vertical*breakup;
    float core=(1.-smoothstep(ribbonWidth*.12,ribbonWidth*.52,distance))*vertical*breakup;
    float reflected=exp(-distance*distance/(.0032+width*1.5))*vertical;
    return vec3(ribbon,core,reflected);
   }
   vec3 contactPool(vec2 uv,vec2 source,vec2 radius){
    vec2 q=(uv-source)*vec2(aspect,1.)/radius;
    float field=dot(q,q);
    float ripple=.87+.13*noise(vec2(q.x*3.,q.y*6.));
    float pulse=mix(1.,.95+sin(time*.8+source.x*17.)*.05,heat);
    float core=exp(-field*2.1)*ripple;
    float pool=exp(-field*.65);
    float halo=exp(-field*.17);
    return (thermal(vec3(.035,.15,.26),vec3(.48,.16,.023))*core+thermal(vec3(.010,.058,.10),vec3(.18,.043,.004))*pool+thermal(vec3(.004,.023,.044),vec3(.076,.017,.001))*halo)*(.20+.80*heat)*pulse;
   }
   vec2 ceilingContact(float x,float y,float seed){
    float bend=(noise(vec2(y*7.5,seed))-.5)*.014+(noise(vec2(y*23.,seed+6.))-.5)*.0035;
    return vec2(x+bend,y);
   }
   void main(){
    vec2 uv=surfaceUv,p=(uv-.5)*vec2(aspect,1.);
    float calm=0.;
    for(int i=0;i<6;i++){
     vec4 m=masks[i];vec2 d=abs(uv-m.xy)-m.zw;
     calm=max(calm,1.-smoothstep(.0,.065,max(d.x,d.y)));
    }
    // Visible distant surfaces retain enough value at normal brightness. The
    // central void remains quieter than the irregular, partially lit cliffs.
    vec3 charcoal=mix(vec3(.039,.045,.051),vec3(.049,.041,.035),heat);
    vec3 color=charcoal;
    float broad=fbm(p*2.4+vec2(8.4,1.7));
    float rock=fbm(p*vec2(12.,18.)+vec2(broad*2.7,1.));
    float grain=noise(p*320.+rock*4.);
    float striation=fbm(p*vec2(38.,6.)+rock*2.0);
    float ridges=pow(1.-abs(rock*2.-1.),3.);
    float leftContour=.18+(noise(vec2(uv.y*7.3,3.))-.5)*.085;
    float rightContour=.84+(noise(vec2(uv.y*5.8,7.))-.5)*.12;
    float leftWall=1.-smoothstep(leftContour-.09,leftContour+.13,uv.x);
    float rightWall=smoothstep(rightContour-.14,rightContour+.08,uv.x);
    float backRidge=(1.-smoothstep(.035,.115,abs(uv.x-.505-(broad-.5)*.12)))*smoothstep(.37,.65,uv.y);
    float cliff=max(max(leftWall,rightWall),backRidge*.62);
    cliff*=smoothstep(.18,.39,uv.y);
    vec3 rockTint=mix(vec3(.62,.70,.76),vec3(.89,.65,.43),heat);
    float relief=.022+pow(rock,1.3)*.105+ridges*.027+(striation-.5)*.046+(grain-.5)*.009;
    color=mix(color,rockTint*relief,cliff*(1.-calm*.78));
    // The two outer falls and their broad, surface-shaped pools
    // of reflected light give the room its volcanic source of illumination.
    vec3 fallA=ceilingFall(uv,.058,.225,.0036,1.7);
    vec3 fallC=ceilingFall(uv,.926,.285,.0042,13.8);
    vec3 falls=fallA+fallC;
    float ambientHeat=.23+.77*heat;
    float rockLight=falls.z*(.16+pow(rock,2.)*1.65+striation*.24)*(1.-calm*.84);
    color+=thermal(vec3(.018,.055,.095),vec3(.108,.037,.012))*rockLight*ambientHeat;
    color+=thermal(vec3(.028,.17,.30),vec3(.46,.104,.016))*falls.x*ambientHeat*(1.-calm*.95);
    color+=thermal(vec3(.12,.38,.58),vec3(.25,.139,.041))*falls.y*ambientHeat*(1.-calm*.95);
    // Organic ceiling occlusion covers the lava sources. Its irregular lower
    // edge is a shadowed rock shelf, with no geometric vault/ring silhouette.
    float roofLine=vaultHeight(uv.x)+(rock-.5)*.035;
    float roof=smoothstep(roofLine-.012,roofLine+.025,uv.y);
    vec3 roofColor=mix(vec3(.026,.031,.036),vec3(.034,.029,.025),heat);
    roofColor+=rockTint*(rock*.029+(grain-.5)*.003);
    color=mix(color,roofColor,roof*.94);
    float roofReflection=exp(-pow((uv.y-roofLine+.018)*25.,2.))*falls.z;
    color+=thermal(vec3(.010,.035,.070),vec3(.08,.025,.008))*roofReflection*ambientHeat*(1.-calm*.88);
    // Perspective-ground coordinates compress fine basalt detail into the
    // distance; their soft termination avoids a hard horizon or raised bowl.
    if(uv.y<.34){
     float recession=1./max(.07,.08+(.31-uv.y)*2.8);
     vec2 ground=vec2((uv.x-.5)*aspect*.90,1.)*recession;
     float coarse=fbm(ground*2.0+vec2(3.8,1.2));
     float floorMask=1.-smoothstep(.14,.32,uv.y+(coarse-.5)*.035);
     vec2 warped=ground*3.1+vec2(noise(ground*3.4),noise(ground*3.4+17.))*1.3;
     float edge=fissure(warped);
     float breakup=noise(ground*2.3+9.);
     float width=.013+pow(noise(ground*4.1+5.),4.)*.065;
     float opened=(1.-smoothstep(width,width+.045,edge))*smoothstep(.46,.67,breakup);
     float core=(1.-smoothstep(width*.12,width*.56,edge))*smoothstep(.51,.70,breakup);
     float cooledDetail=noise(warped*17.);
     float crust=(coarse-.48)*.020+(cooledDetail-.5)*.004;
     color+=mix(vec3(.55,.65,.71),vec3(.85,.69,.50),heat)*crust*floorMask*(1.-calm*.78);
     float depthFade=1.-smoothstep(.045,.30,uv.y);
     float protectedHeat=(1.-calm*.93)*floorMask*depthFade;
     float breath=mix(1.,.96+sin(time*.28+ground.y*1.3)*.04,heat);
     float activity=(.12+.88*heat*heat)*breath;
     vec3 molten=thermal(vec3(.018,.10,.23),vec3(.39,.072,.012))*opened+thermal(vec3(.09,.24,.37),vec3(.36,.16,.032))*core;
     color+=molten*activity*protectedHeat;
     // Crust contours remain fixed; sparse hot highlights advect through their
     // channels. At cold heat the blue fissures are completely stationary.
     float traveling=noise(vec2(ground.x*7.5+coarse*2.,ground.y*6.4-time*.62));
     float streak=smoothstep(.57,.84,traveling);
     vec3 movingHeat=vec3(.17,.047,.006)*opened+vec3(.11,.078,.023)*core;
     color+=movingHeat*streak*heat*heat*protectedHeat;
     color+=thermal(vec3(.002,.010,.028),vec3(.031,.010,.002))*opened*(.18+.82*heat)*floorMask*(1.-calm*.94);
    }
    // Bounded impact bloom marks floor contacts without a full-screen wash.
    vec3 impact=contactPool(uv,ceilingContact(.058,.225,1.7),vec2(.047,.013));
    impact+=contactPool(uv,ceilingContact(.926,.285,13.8),vec2(.054,.014))*.85;
    color+=impact*(1.-calm*.95);
    float vignette=smoothstep(.24,.92,length(p*vec2(.73,1.05)));
    color*=1.-vignette*.27;
    gl_FragColor=vec4(max(color,vec3(.0)),1.);
   }`
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);
 mesh.name='Cavern and basalt floor';mesh.frustumCulled=false;mesh.renderOrder=-1000;scene.add(mesh);
 const state=Object.freeze({ceilingFallCount:2,get heat(){return uniforms.heat.value},get time(){return uniforms.time.value}});
 return {state,update({width=1440,height=900,time=0,heat=1,masks=[]}={}){
  uniforms.time.value=time;uniforms.heat.value=THREE.MathUtils.clamp(heat,0,1);
  uniforms.aspect.value=width/Math.max(1,height);uniforms.resolution.value.set(width,height);
  for(let i=0;i<uniforms.masks.value.length;i++){const mask=masks[i],target=uniforms.masks.value[i];if(!mask)target.set(-2,-2,0,0);else if(Array.isArray(mask))target.fromArray(mask);else target.copy(mask)}
 }};
}
