import * as THREE from './vendor/three.module.js';

// Separate screen-aligned 3D objects, measured in the world's pixel camera.
const TAU=Math.PI*2;
function polygon(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s}
function radial(r,a){return [Math.cos(a)*r,Math.sin(a)*r]}
function sector(inner,outer,a,b){const p=[],steps=Math.max(3,Math.ceil((b-a)*28));for(let i=0;i<=steps;i++)p.push(radial(outer,a+(b-a)*i/steps));for(let i=steps;i>=0;i--)p.push(radial(inner,a+(b-a)*i/steps));return polygon(p)}
function localShape(points,a,r){const c=Math.cos(a),s=Math.sin(a);return polygon(points.map(([x,y])=>[(r+x)*c-y*s,(r+x)*s+y*c]))}
function bar(a,b,w){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),x=-dy/l*w/2,y=dx/l*w/2;return polygon([[a[0]+x,a[1]+y],[b[0]+x,b[1]+y],[b[0]-x,b[1]-y],[a[0]-x,a[1]-y]])}
function geometry(theme,role){
 const bands=[],marks=[],outer=role==='outer';
 if(theme==='home'){
  const n=outer?12:16;
  for(let i=0;i<n;i++){
   const a=i*TAU/n;
   bands.push(sector(outer?.977:.88,outer?.991:.925,a+.035,a+TAU/n-.055));
   marks.push(localShape([[0,-.022],[.043,-.022],[.043,.022],[0,.022]],a,.955));
  }
  if(!outer)for(let i=0;i<4;i++)marks.push(sector(.72,.76,i*Math.PI/2+.15,i*Math.PI/2+1.0));
 }else if(theme==='about'){
  for(let i=0;i<(outer?4:6);i++){
   const n=outer?4:6,a=i*TAU/n;
   bands.push(sector(outer?.985:.72,outer?.998:.742,a+.14,a+TAU/n-.14));
   marks.push(localShape([[0,0],[-.066,-.025],[-.122,0],[-.066,.025]],a,.998));
   if(!outer)marks.push(localShape([[-.075,-.008],[-.032,0],[-.075,.008]],a,.998));
  }
  if(outer)for(let quadrant=0;quadrant<4;quadrant++)for(let j=1;j<=3;j++){
   const a=quadrant*Math.PI/2+j*Math.PI/8;
   // Twelve small carved runes occupy the open space between crystal anchors.
   // They share the existing mark mesh, not another concentric border.
   marks.push(localShape([[-.016,-.012],[-.010,-.012],[-.010,.012],[-.016,.012]],a,.935));
   marks.push(localShape([[-.010,-.012],[.014,-.012],[.014,-.006],[-.010,-.006]],a,.935));
   if(j===2)marks.push(localShape([[-.010,.006],[.007,.006],[.007,.012],[-.010,.012]],a,.935));
  }
 }else{
  for(let i=0;i<(outer?8:3);i++){
   const n=outer?8:3,a=i*TAU/n;
   bands.push(sector(outer?.98:.945,outer?.997:.974,a+.09,a+TAU/n-.13));
   marks.push(localShape([[0,0],[-.072,-.028],[-.048,0],[-.072,.028]],a,.998));
  }
  if(!outer){for(let i=0;i<3;i++)marks.push(bar(radial(.79,i*TAU/3),radial(.79,(i+1)*TAU/3),.012))}
  else for(let i=0;i<8;i++){
   const a=i*TAU/8+.26;
   marks.push(localShape([[-.008,-.018],[.007,-.018],[.007,.014],[-.008,.014]],a,.94));
   marks.push(localShape([[-.008,.014],[.022,.014],[.022,.026],[-.008,.026]],a,.94));
  }
 }
 const make=shapes=>{const g=new THREE.ExtrudeGeometry(shapes,{depth:.012,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.0008,bevelThickness:.0015,curveSegments:24});g.computeBoundingBox();return g};
 return [make(bands),make(marks)];
}
export function createProjection(scene){
 if(!scene?.add)throw new Error('createProjection requires the Three.js scene');
 const root=new THREE.Group();root.name='Spell circles — separate 3D pairs';scene.add(root);
 const pairs=[],cache=new Map();let lastTime=null,phase=0,lastPage='',lastPaused=false,transition=null;
 let lastWidth=0,lastHeight=0,activePairs=new Set(),measurementCount=0;
 function makePair(theme,index){
  const pairRoot=new THREE.Group();pairRoot.name=`${theme} reading pair ${index}`;root.add(pairRoot);
  const outer=new THREE.Group(),inner=new THREE.Group();outer.name='Outer circumscribed spell circle';inner.name='Inner inscribed spell circle';pairRoot.add(outer,inner);
  const materials=[];
  for(const [role,group] of [['outer',outer],['inner',inner]]){
   const key=`${theme}-${role}`;if(!cache.has(key))cache.set(key,geometry(theme,role));
   cache.get(key).forEach((g,i)=>{
    const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});materials.push(material);
    const mesh=new THREE.Mesh(g,material);mesh.name=`${role} ${i?'engraving':'extruded segments'}`;mesh.renderOrder=3;group.add(mesh);
   });
   group.userData={role,theme,radius:0,screenAligned:true};
  }
  const pair={group:pairRoot,outer,inner,theme,index,materials,opacity:0,positioned:false};
  pairRoot.userData={theme,index,outerRadius:0,innerRadius:0,textBounds:null,padding:24,inset:16};pairs.push(pair);return pair;
 }
 function readingBounds(el){
  const items=[...el.querySelectorAll('h1,h2,p,.quiet-link')].filter(n=>!n.closest('.about-ghost,.project-ghost'));
  const rs=items.map(n=>{const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();return r.width?r:n.getBoundingClientRect()}).filter(r=>r.width>0&&r.height>0);
  if(!rs.length)return null;
  const left=Math.min(...rs.map(r=>r.left)),right=Math.max(...rs.map(r=>r.right)),top=Math.min(...rs.map(r=>r.top)),bottom=Math.max(...rs.map(r=>r.bottom));
  return {left,right,top,bottom,width:right-left,height:bottom-top};
 }
 function targets(bounds,center){
  const {left,right,top,bottom}=bounds;
  const outer=Math.max(Math.hypot(left-center.x,top-center.y),Math.hypot(right-center.x,top-center.y),Math.hypot(left-center.x,bottom-center.y),Math.hypot(right-center.x,bottom-center.y))+24;
  const inner=Math.max(0,Math.min(center.x-left,right-center.x,center.y-top,bottom-center.y)-16);
  return {outer,inner};
 }
 function fit(pair,bounds,center,snap){
  const target=targets(bounds,center);
  if(!snap)target.outer=Math.max(pair.fitTarget?.outer||pair.rest.outer,target.outer);
  if(snap||!pair.rest){
   pair.rest={center:{...center},bounds:{...bounds},...target};pair.fitMotion=null;
  }else{
   pair.rest.center={...center};pair.rest.bounds={...bounds};
   const changed=!pair.fitTarget||Math.abs(target.outer-pair.fitTarget.outer)>.001||Math.abs(target.inner-pair.fitTarget.inner)>.001;
   if(changed)pair.fitMotion={from:{outer:pair.rest.outer,inner:pair.rest.inner},elapsed:0,duration:.32,fresh:true};
  }
  pair.fitTarget=target;
 }
 function advanceFit(pair,dt,paused){
  const motion=pair.fitMotion;if(!motion||paused)return;
  if(motion.fresh){motion.fresh=false;return}
  motion.elapsed=Math.min(motion.duration,motion.elapsed+dt);
  const t=motion.elapsed/motion.duration,e=t*t*t*(10+t*(-15+6*t));
  for(const k of ['outer','inner'])pair.rest[k]=motion.from[k]+(pair.fitTarget[k]-motion.from[k])*e;
  if(t===1)pair.fitMotion=null;
 }
 function slotOrigin(el){
  const r=(el.parentElement||el).getBoundingClientRect();return {x:r.left,y:r.top};
 }
 function pulseAt(motion,elapsed){
  const t=Math.max(0,Math.min(1,elapsed/motion.duration)),d=Math.PI-motion.startPhase;
  // Monotone Hermite phase retains current phase/velocity on retrigger, except
  // near completion where a bounded tangent prevents a reversal or overshoot.
  const m0=Math.min(motion.startSpeed*motion.duration,2*d),m1=d;
  const phi=motion.startPhase+(t*t*(-2*t+3))*d+(t*t*t-2*t*t+t)*m0+(t*t*t-t*t)*m1;
  const speed=((6*t-6*t*t)*d+(3*t*t-4*t+1)*m0+(3*t*t-2*t)*m1)/motion.duration;
  return {pulse:Math.sin(phi)**2,phi,speed};
 }
 function show(pair,width,height,pulse=0){
  const {center,bounds,outer,inner}=pair.rest;
  const outerRadius=outer*(1+.06*pulse),innerRadius=inner*(1-.08*pulse);
  pair.group.position.set(center.x-width/2,height/2-center.y,-60);
  pair.outer.scale.setScalar(outerRadius);pair.inner.scale.setScalar(innerRadius);
  pair.outer.position.z=-3;pair.inner.position.z=3;pair.inner.visible=innerRadius>1;
  pair.outer.rotation.z=phase*.055;pair.inner.rotation.z=-phase*.083;
  pair.outer.userData.radius=outerRadius;pair.inner.userData.radius=innerRadius;
  Object.assign(pair.group.userData,{textBounds:bounds,outerRadius,innerRadius,baseOuterRadius:outer,baseInnerRadius:inner,outerFitTarget:pair.fitTarget.outer,innerFitTarget:pair.fitTarget.inner,innerHiddenByFit:pair.fitTarget.inner<=1,fitActive:!!pair.fitMotion,fitElapsed:pair.fitMotion?.elapsed||0,fitDuration:pair.fitMotion?.duration||0,center:{...center},outerRotation:pair.outer.rotation.z,innerRotation:pair.inner.rotation.z,meshCount:4,transitionPulse:pulse});
 }
 return {group:root,pairs,
  beginTransition(durationMs=850){
   const locked=pairs.filter(p=>p.theme===lastPage&&p.rest);
   if(!locked.length)return;
   const duration=Math.max(1,Number(durationMs)||850)/1000;
   const previous=transition?pulseAt(transition,transition.elapsed):{pulse:0,phi:0,speed:Math.PI/duration};
   transition={page:lastPage,duration,elapsed:0,pulse:previous.pulse,startPhase:previous.phi,startSpeed:previous.speed,locked:new Set(locked),opacity:new Map(locked.map(p=>[p,p.opacity])),settleImmediately:lastPaused};
   // Freeze the displayed radii if a rapid repeat interrupts a prior refit.
   for(const pair of locked){pair.fitMotion=null;pair.fitTarget={outer:pair.rest.outer,inner:pair.rest.inner}}
   root.userData.textTransition={active:!lastPaused,duration,elapsed:0,pulse:previous.pulse};
  },
  update({width,height,time=0,heat=1,page='home',paused=false,source,boundsDirty=true}){
   const dt=lastTime===null?0:Math.max(0,Math.min(.5,time-lastTime));lastTime=time;
   const pageChanged=lastPage!==page,resized=lastWidth!==width||lastHeight!==height;
   lastPage=page;lastWidth=width;lastHeight=height;lastPaused=paused;
   if(pageChanged){transition=null;activePairs=new Set()}
   let completed=null,pulse=0,locked=null;
   if(transition){
    if(resized)transition.reanchor=true;
    if(!paused&&!transition.settleImmediately){
     const before=transition.elapsed,used=Math.min(dt,Math.max(0,transition.duration-before));
     const p0=pulseAt(transition,before).pulse,pm=pulseAt(transition,before+used/2).pulse,p1=pulseAt(transition,before+used).pulse;
     phase+=used*(1+5*(p0+4*pm+p1)/6)+(dt-used);
     transition.elapsed+=used;
    }
    transition.pulse=pulseAt(transition,transition.elapsed).pulse;
    if(transition.settleImmediately||transition.elapsed>=transition.duration-1e-9){completed=transition;transition=null}
    else{pulse=transition.pulse;locked=transition.locked}
   }else if(!paused)phase+=dt;
   if(locked){
    activePairs=locked;
   }else if(boundsDirty||pageChanged||resized||completed||!activePairs.size){
    // The sole layout-measurement path. Steady frames use cached references.
    measurementCount++;
    const section=document.querySelector(`.page[data-view="${page}"]`);
    const selectors=page==='home'?'.home-copy':page==='about'?'.bio .panel-content,.notes .panel-content':'.project-copy:not(.project-ghost)';
    const elements=section&&!section.hidden?[...section.querySelectorAll(selectors)].filter(n=>!n.closest('.about-ghost,.project-ghost')):[];
    activePairs=new Set();
    elements.forEach((el,index)=>{
     const b=readingBounds(el);if(!b)return;
     let pair=pairs.find(p=>p.theme===page&&p.index===index);if(!pair)pair=makePair(page,index);activePairs.add(pair);
     const origin=slotOrigin(el),settling=completed?.locked.has(pair);
     const snap=!pair.rest||pageChanged||resized||(settling&&completed.reanchor)||(settling&&completed.settleImmediately);
     let center;
     if(!pair.rest||pageChanged||resized||(settling&&completed.reanchor))center={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
     else if(settling)center=pair.rest.center;
     else center={x:pair.rest.center.x+(pair.slotOrigin?origin.x-pair.slotOrigin.x:0),y:pair.rest.center.y+(pair.slotOrigin?origin.y-pair.slotOrigin.y:0)};
     fit(pair,b,center,snap);pair.slotOrigin=origin;
    });
   }
   for(const pair of activePairs){
    if(!locked)advanceFit(pair,dt,paused);
    show(pair,width,height,pulse);
   }
   for(const pair of pairs){
    const target=activePairs.has(pair)?1:0;
    if(locked?.has(pair))pair.opacity=transition.opacity.get(pair);
    else pair.opacity=paused?target:pair.opacity+(target-pair.opacity)*(dt===0?1:1-Math.exp(-dt*5));
    pair.group.visible=pair.opacity>.003;
    const color=pair.theme==='home'?0xee9b46:pair.theme==='about'?0x74c9ee:0xf25d31;
    const level=pair.theme==='about'?.70:1;
    pair.materials.forEach((m,i)=>{m.color.setHex(color);m.opacity=pair.opacity*level*(i<2?.27:.19)*(i%2?1.3:1)});
   }
   root.userData.boundsMeasurements=measurementCount;
   root.userData.textTransition={active:!!transition,elapsed:transition?.elapsed||0,duration:transition?.duration||0,pulse:transition?.pulse||0};
  },
  destroy(){scene.remove(root);pairs.forEach(p=>p.materials.forEach(m=>m.dispose()));cache.forEach(gs=>gs.forEach(g=>g.dispose()));pairs.length=0;cache.clear();activePairs.clear();transition=null}
 };
}
