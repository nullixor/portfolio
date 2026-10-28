// Draw into the existing progress fill. The scene owns the clock and animation loop.
export function createLavaProgress() {
 const track=document.querySelector('.project-progress');
 const fill=track?.querySelector('span');
 if(!fill)return {update(){}};
 const canvas=document.createElement('canvas');
 canvas.className='lava-progress-canvas';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d');
 if(!ctx)return {update(){}};
 fill.append(canvas);
 let lastTime=-Infinity,lastWidth=0,lastRatio=0,lastPage='',wasPaused=false;
 const height=18;
 function wave(x,t){return Math.sin(x*.063-t*1.7)*.70+Math.sin(x*.143-t*2.6)*.40+Math.sin(x*.027-t*.9)*.55}
 function ribbon(width,time,half,color,offset=0){
  ctx.beginPath();
  for(let x=0;x<=width+4;x+=4){const px=Math.min(x,width), taper=Math.min(1,px/8,(width-px)/8);const y=9+wave(px,time)+offset-half*Math.max(0,taper);x===0?ctx.moveTo(px,y):ctx.lineTo(px,y)}
  for(let x=width;x>=-4;x-=4){const px=Math.max(x,0),taper=Math.min(1,px/8,(width-px)/8);ctx.lineTo(px,9+wave(px,time)+offset+half*Math.max(0,taper))}
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
 }
 return {update({time=0,paused=false,page='home'}={}){
  if(page!=='projects'){lastPage=page;return}
  const width=fill.getBoundingClientRect().width;
  if(width<1)return;
  const ratio=Math.min(window.devicePixelRatio||1,2);
  const changed=Math.abs(width-lastWidth)>.4||ratio!==lastRatio||lastPage!==page||paused!==wasPaused;
  if(!changed&&(paused||time-lastTime<1/30))return;
  lastPage=page;wasPaused=paused;lastWidth=width;lastRatio=ratio;lastTime=time;
  track.classList.add('lava-ready');
  const pixelWidth=Math.max(1,Math.ceil(width*ratio)),pixelHeight=Math.ceil(height*ratio);
  if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  // A dark irregular bank, a red current, and drifting hot streaks make a thin river.
  ctx.shadowColor='rgba(239,55,8,.72)';ctx.shadowBlur=8;
  ribbon(width,time,3.6,'#641c0c');ctx.shadowBlur=0;
  ribbon(width,time,2.65,'#b52e0b');
  ribbon(width,time,1.32,'#f06312',-.15);
  ctx.save();ctx.beginPath();
  for(let x=0;x<=width+4;x+=4){const px=Math.min(x,width);x===0?ctx.moveTo(px,9+wave(px,time)-1.15):ctx.lineTo(px,9+wave(px,time)-1.15)}
  for(let x=width;x>=-4;x-=4){const px=Math.max(x,0);ctx.lineTo(px,9+wave(px,time)+1.15)}ctx.closePath();ctx.clip();
  for(let i=-1;i<Math.ceil(width/47)+1;i++){
   const x=((i*47+time*17)%(width+80)+width+80)%(width+80)-40;
   const glow=ctx.createLinearGradient(x-18,0,x+22,0);glow.addColorStop(0,'rgba(255,157,29,0)');glow.addColorStop(.48,'rgba(255,204,65,.95)');glow.addColorStop(1,'rgba(255,117,12,0)');
   ctx.fillStyle=glow;ctx.fillRect(x-18,5,40,8);
  }
  ctx.restore();
 }};
}
