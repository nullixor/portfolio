import * as THREE from './vendor/three.module.js';

// Continuous cubic gearbox frame around the unchanged accepted interlocked gear core.
export function createHeart(palette = {}) {
 const iron=palette.iron||new THREE.MeshStandardMaterial({color:0x292b29,metalness:.78,roughness:.48});
 const brass=palette.brass||new THREE.MeshStandardMaterial({color:0x756047,metalness:.8,roughness:.44});
 const gold=palette.gold||brass;
 const ember=palette.emissive||new THREE.MeshStandardMaterial({color:0xa85822,emissive:0xb14612,emissiveIntensity:1,metalness:.4,roughness:.55});
 const group=new THREE.Group(),inner=new THREE.Group();group.add(inner);

 // Continuous cast cube: twelve edges, substantial caps and recessed diamond windows.
 function strap(points,depth=.13,bevel=.012){
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1});
  geometry.translate(0,0,-depth/2+bevel);geometry.computeVertexNormals();return geometry;
 }
 function piece(geometry,material,rotation,position,parent=group){
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.set(...rotation);mesh.position.set(...position);parent.add(mesh);return mesh;
 }
 const edge=strap([[-.62,-.057],[.62,-.057],[.62,.057],[-.62,.057]],.114,.009);
 const corner=strap([[-.10,-.10],[.10,-.10],[.10,.10],[-.10,.10]],.20,.014);
 for(const a of [-.62,.62])for(const b of [-.62,.62]){
  piece(edge,iron,[0,0,0],[0,a,b]);
  piece(edge,iron,[0,0,Math.PI/2],[a,0,b]);
  piece(edge,iron,[0,Math.PI/2,0],[a,b,0]);
 }
 for(const x of [-.62,.62])for(const y of [-.62,.62])for(const z of [-.62,.62])piece(corner,iron,[0,0,0],[x,y,z]);
 function frameExtrusion(shape,depth,bevel=.004){
  const g=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:40});
  g.translate(0,0,-depth/2+bevel);return g;
 }
 function diamondPath(radius,clockwise=false,path=new THREE.Shape()){
  const points=clockwise?[[0,radius],[radius,0],[0,-radius],[-radius,0]]:[[0,radius],[-radius,0],[0,-radius],[radius,0]];
  points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();return path;
 }
 function diamondAnnulus(outer,inside,depth){
  const shape=diamondPath(outer);shape.holes.push(diamondPath(inside,true,new THREE.Path()));return frameExtrusion(shape,depth);
 }
 const plate=new THREE.Shape();
 [[-.535,-.600],[.535,-.600],[.600,-.535],[.600,.535],[.535,.600],[-.535,.600],[-.600,.535],[-.600,-.535]].forEach(([x,y],i)=>i?plate.lineTo(x,y):plate.moveTo(x,y));plate.closePath();
 const opening=diamondPath(.565,true,new THREE.Path());plate.holes.push(opening);
 const facePlate=frameExtrusion(plate,.058,.006),windowLip=diamondAnnulus(.613,.570,.038),windowRecess=diamondAnnulus(.582,.556,.065);
 const fastener=new THREE.CylinderGeometry(.024,.024,.018,6,1);fastener.rotateX(Math.PI/2);
 const slot=new THREE.BoxGeometry(.023,.004,.003);
 // Small corner mechanisms echo the selected mechanical puzzle-cube fittings.
 function fittingGear(radius,root,teeth){
  const shape=new THREE.Shape(),n=teeth*4;
  for(let k=0;k<n;k++){const a=k/n*Math.PI*2,r=k%4===1||k%4===2?radius:root;const x=Math.cos(a)*r,y=Math.sin(a)*r;k?shape.lineTo(x,y):shape.moveTo(x,y)}shape.closePath();
  const hole=new THREE.Path();hole.absarc(0,0,radius*.28,0,Math.PI*2,true);shape.holes.push(hole);return frameExtrusion(shape,.016,.0015);
 }
 const fitting=fittingGear(.061,.051,10),pinion=fittingGear(.033,.027,8);
 const faceRotations=[[0,0,0],[0,Math.PI,0],[0,Math.PI/2,0],[0,-Math.PI/2,0],[-Math.PI/2,0,0],[Math.PI/2,0,0]];
 faceRotations.forEach((rotation,index)=>{
  const face=new THREE.Group();face.name='Recessed diamond gearbox window '+index;face.rotation.set(...rotation);group.add(face);
  piece(facePlate,iron,[0,0,0],[0,0,.613],face);
  piece(windowRecess,iron,[0,0,0],[0,0,.575],face);
  piece(windowLip,brass,[0,0,0],[0,0,.650],face);
  for(const x of [-.605,.605])for(const y of [-.605,.605]){
   piece(fastener,brass,[0,0,(x+y)*2],[x,y,.730],face);
   piece(slot,iron,[0,0,(x+y)*2],[x,y,.741],face);
  }
  const sign=index%2?-1:1;
  piece(fitting,brass,[0,0,index*.2],[sign*.414,.414,.658],face);
  piece(pinion,iron,[0,0,index*.2+.18],[sign*.486,.367,.658],face);
  // One narrow rectangular service fitting balances the mechanism without fins.
  const service=strap([[-.056,-.024],[.056,-.024],[.056,.024],[-.056,.024]],.022,.004);
  piece(service,brass,[0,0,-sign*.12],[-sign*.414,-.444,.654],face);
 });
 // Face-space inspection contract; the actual holes/collars above use these
 // dimensions. Metadata survives frame batching without touching the core.
 group.userData.frameApertures=Object.freeze(faceRotations.map((rotation,index)=>Object.freeze({
  face:index,shape:'rhombus',rotation:Object.freeze([...rotation]),clearVertexRadius:.556,clearInradius:.556/Math.SQRT2,outerVertexRadius:.613
 })));
 // The open frame shelters a hollow, spherical gear assembly. Complementary
 // half-lap slots at ±X let the orthogonal annuli pass without broad overlap.
 const gearSpecs=[
  {name:'Equatorial crown',teeth:28,outer:.423,root:.382,inner:.275,thickness:.056,slotOuter:.322,slotInner:.275,material:brass,plane:'XY'},
  {name:'Meridian crown',teeth:24,outer:.416,root:.378,inner:.275,thickness:.056,slotOuter:.416,slotInner:.345,material:iron,plane:'XZ'}
 ];
 const slotHalfAngle=.205,bevel=.0035;
 const angularAxisDistance=a=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<slotHalfAngle||Math.abs(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))-Math.PI)<slotHalfAngle;
 function gearShape(spec){
  const shape=new THREE.Shape(),n=spec.teeth*8,profile=[0,0,.36,1,1,.36,0,0];
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2;let r=spec.root+(spec.outer-spec.root)*profile[i%8];
   if(angularAxisDistance(a))r=Math.min(r,spec.slotOuter);
   const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);
  }
  shape.closePath();const hole=new THREE.Path();
  for(let i=n;i>=0;i--){const a=i/n*Math.PI*2,r=angularAxisDistance(a)?spec.slotInner:spec.inner,x=Math.cos(a)*r,y=Math.sin(a)*r;i===n?hole.moveTo(x,y):hole.lineTo(x,y)}
  hole.closePath();shape.holes.push(hole);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:spec.thickness-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:1});
  geometry.translate(0,0,-spec.thickness/2+bevel);geometry.computeVertexNormals();return geometry;
 }
 function seamArc(start,span,z,back=false){
  const vertices=[],indices=[],n=8;
  for(let i=0;i<=n;i++){const a=start+i/n*span;for(const r of [.286,.313])vertices.push(Math.cos(a)*r,Math.sin(a)*r,z)}
  for(let i=0;i<n;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2)}
  if(back)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 }
 const gears=gearSpecs.map((spec,index)=>{
  const carrier=new THREE.Group();carrier.name=spec.name;carrier.rotation.x=index?Math.PI/2:0;inner.add(carrier);
  piece(gearShape(spec),spec.material,[0,0,0],[0,0,0],carrier);
  // Discrete inset energy channels and flush hexagonal fasteners. The hollow
  // bore stays open; no sphere, disk, hidden orb or luminous shell is present.
  const bolt=new THREE.CylinderGeometry(.011,.011,.006,6,1);bolt.rotateX(Math.PI/2);
  for(let k=0;k<8;k++){
   const a=(k+.5)*Math.PI/4;
   for(const side of [-1,1]){
    piece(bolt,gold,[0,0,a],[Math.cos(a)*.35,Math.sin(a)*.35,side*(spec.thickness/2+.003)],carrier);
    piece(seamArc(a-.11,.22,side*(spec.thickness/2+.0008),side<0),ember,[0,0,0],[0,0,0],carrier);
   }
  }
  return {name:spec.name,group:carrier,toothCount:spec.teeth,plane:spec.plane,outerRadius:spec.outer,innerRadius:spec.inner,thickness:spec.thickness,slotHalfAngle,slotInner:spec.slotInner,slotOuter:spec.slotOuter};
 });

 // Bake static parts into one mesh per material, preserving the shared material instances.
 function batch(container,excluded=new Set()){
  group.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(container.matrixWorld).invert();
  const buckets=new Map(),sources=[];
  function collect(node){
   if(node!==container&&excluded.has(node))return;
   if(node.isMesh){
    const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry;
    const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld),normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
    let data=buckets.get(node.material);if(!data){data={p:[],n:[],uv:[]};buckets.set(node.material,data)}
    const p=new THREE.Vector3(),n=new THREE.Vector3();
    for(let i=0;i<position.count;i++){
     p.fromBufferAttribute(position,i).applyMatrix4(matrix);n.fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize();
     data.p.push(p.x,p.y,p.z);data.n.push(n.x,n.y,n.z);data.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
    }
    if(geometry!==node.geometry)geometry.dispose();sources.push(node);
   }
   for(const child of node.children)collect(child);
  }
  collect(container);for(const source of sources)source.parent.remove(source);
  for(const [material,data] of buckets){
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));geometry.computeBoundingSphere();
   const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;container.add(mesh);
  }
 }
 batch(group,new Set([inner]));
 for(const gear of gears){batch(gear.group);gear.body=gear.group.children.find(mesh=>mesh.material===gearSpecs[gears.indexOf(gear)].material);gear.body.name=gear.name+' toothed body';gear.body.userData.toothCount=gear.toothCount;gear.body.userData.hollow=true;}
 return {group,inner,gears,coreType:'interlocked-toothed-annuli',clearance:{radial:.345-.322-2*bevel,angular:slotHalfAngle,axial:gearSpecs[0].thickness},emissiveMaterials:[ember],update(time=0,heat=0,energy=0){
  // Fixed relative gear orientation: the keyed assembly moves as one object.
  inner.rotation.set(.16+Math.sin(time*.10)*.035,.35+time*.105,.10+Math.sin(time*.08)*.025);
 }};
}
