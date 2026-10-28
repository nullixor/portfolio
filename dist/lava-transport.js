// Gate events travel downstream in seconds; no navigation event resets material
// already in the fall or river. The caller supplies the shared, pausable clock.
export const FALL_TRAVEL=2.4;
export const RIVER_TRAVEL=2.8;
export const TOTAL_TRAVEL=FALL_TRAVEL+RIVER_TRAVEL;
export const FRONT_SOFTNESS=.16;
export function createLavaTransport(initialPage='home',initialTime=0){
 let gate=initialPage==='home'?1:0,base=gate,lastTime=initialTime;const events=[];
 function smooth(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
 function prune(time){while(events.length&&events[0].time<time-TOTAL_TRAVEL-FRONT_SOFTNESS){base+=events.shift().delta}base=Math.max(0,Math.min(1,base))}
 return {
  setPage(page,time){
   time=Math.max(lastTime,Number.isFinite(time)?time:lastTime);lastTime=time;prune(time);
   const next=page==='home'?1:0;if(next===gate)return;
   const delta=next-gate;gate=next;
   const last=events[events.length-1];
   if(last&&last.time===time){last.delta+=delta;if(!last.delta)events.pop()}else events.push({time,delta});
  },
  sample(distance,time){
   const delay=Math.max(0,Math.min(TOTAL_TRAVEL,distance));let v=base;
   for(const event of events)v+=event.delta*smooth((time-event.time-delay)/FRONT_SOFTNESS);
   return Math.max(0,Math.min(1,v));
  },
  snapshot(time){prune(time);return {gate,base,events:events.map(e=>({...e}))}},
  get gate(){return gate},get history(){return events.map(e=>({...e}))}
 };
}
