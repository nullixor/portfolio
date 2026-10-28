const projects = [
  {
    "title": "AI moderation.",
    "description": "I’m exploring how retrieval-augmented generation could support AI moderation, with safer use in schools in mind.",
    "status": "Ongoing research",
    "detail": "I’m compiling a dataset of moderation prompts and experimenting with retrieval-augmented generation. I’m interested in how context changes a moderation decision, and what responsible AI use can look like in a school setting. This research is ongoing; I’m still testing ideas rather than presenting settled results."
  },
  {
    "title": "RoboLab.",
    "description": "A FIRST Tech Challenge robot simulation I created during a summer program at Carnegie Mellon.",
    "status": "Summer program · 2026",
    "detail": "I created RoboLab, a FIRST Tech Challenge robot simulation for robotics teams, during Carnegie Mellon’s Global Cultures and Emerging Technologies summer program. The program brought together technology, ethics and intercultural perspectives—questions I want to keep exploring as I build."
  },
  {
    "title": "Behind The Table.",
    "description": "I co-founded a table tennis nonprofit to connect people through a sport I love. I help turn that idea into events and outreach.",
    "status": "Community · Co-founder & president",
    "detail": "I maintain our website, organize events and member documentation, and reach out to professional players for interviews. Our team raises over $2,000 annually. Being both a player and a community organizer has taught me to think about the people around a project as carefully as the project itself."
  },
  {
    "title": "Recipes, on hand.",
    "description": "An ingredient-based recipe app I built to help inexperienced cooks make something with what they already have.",
    "status": "Independent project",
    "detail": "I built an app that helps inexperienced cooks find approachable, healthy recipes using ingredients they have on hand. I like problems like this: a small everyday obstacle becomes a reason to build something useful."
  },
  {
    "title": "Ciphers & stories.",
    "description": "KRYPTOS drew me into cryptography. I now solve ciphers and create alternate reality game puzzles of my own.",
    "status": "Independent exploration",
    "detail": "I’m interested in the moment a pattern turns into a message. Designing alternate reality game puzzles lets me connect hidden information with storytelling; Codebusters adds another dimension, where solving a problem depends on how a team thinks together."
  }
];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduceMotion.matches, currentProject=0, world;
const settings=document.querySelector('#display-settings');
const simpleInput=document.querySelector('#simple-background');
const pauseInput=document.querySelector('#pause-motion');
let simpleBackground=true;
try{simpleBackground=localStorage.getItem('forge-background')!=='full'}catch{}
function syncBackground(){
 document.body.classList.toggle('simple-background',simpleBackground);
 simpleInput.checked=simpleBackground;
 world?.setSimpleBackground(simpleBackground);
}
function syncMotion(){document.body.classList.toggle('paused',paused);pauseInput.checked=paused;world?.setPaused(paused);document.querySelectorAll('.page').forEach(page=>page.getAnimations({subtree:true}).forEach(animation=>paused?animation.pause():animation.play()))}
document.querySelector('.settings-toggle').addEventListener('click',()=>settings.showModal());
settings.querySelector('.settings-close').addEventListener('click',()=>settings.close());
settings.addEventListener('click',e=>{if(e.target===settings){const r=settings.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)settings.close()}});
simpleInput.addEventListener('change',()=>{simpleBackground=simpleInput.checked;try{localStorage.setItem('forge-background',simpleBackground?'simple':'full')}catch{}syncBackground()});
pauseInput.addEventListener('change',()=>{paused=pauseInput.checked;syncMotion()});
reduceMotion.addEventListener('change',e=>{paused=e.matches;syncMotion()});
syncBackground();syncMotion();
let routeToken=0;
function route(){
  const token=++routeToken;
  const name=['home','about','projects'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
  const old=document.querySelector('[data-view]:not([hidden]):not(.leaving)');
  const next=document.querySelector(`[data-view="${name}"]`);
  document.querySelector('#project-dialog').close();
  document.querySelectorAll('.page').forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.classList.remove('entering','leaving');if(el!==old&&el!==next)el.hidden=true;el.inert=el!==next});
  document.body.dataset.page=name;
  if(old&&old!==next&&!paused){
    old.classList.add('leaving');
    old.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:`translateX(${old.dataset.view==='home'?'-160px':'-65px'})`}],{duration:1000,easing:'cubic-bezier(.4,0,.2,1)'}).finished.then(()=>{if(token===routeToken){old.hidden=true;old.classList.remove('leaving')}}).catch(()=>{});
  }else if(old&&old!==next)old.hidden=true;
  next.hidden=false;next.inert=false;
  if(old!==next&&!paused)next.animate([{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)'}],{duration:1100,delay:old?.dataset.view==='home'?350:120,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});
  document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  document.title=(name==='home'?'James H. Yang — Portfolio':name==='about'?'About Me — James H. Yang':'Projects — James H. Yang');
  window.scrollTo(0,0);world?.setPage(name);
}
window.addEventListener('hashchange',()=>{route();document.querySelector('#main').focus({preventScroll:true})});
route();
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();document.querySelector('#main').focus({preventScroll:true})});
let switching=false,wheelAmount=0,lastWheel=0;
const projectCopy=document.querySelector('.project-copy');
function selectProject(index){
  index=Math.max(0,Math.min(projects.length-1,index));
  if(switching||index===currentProject)return;
  world?.beginTextTransition(800);
  switching=true;
  const ghost=projectCopy.cloneNode(true);ghost.removeAttribute('aria-live');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.classList.add('project-ghost');ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));projectCopy.parentElement.append(ghost);ghost.style.top=projectCopy.offsetTop+'px';ghost.style.left=projectCopy.offsetLeft+'px';ghost.style.width=projectCopy.offsetWidth+'px';
  currentProject=index;const p=projects[index];
  document.querySelector('#project-title').textContent=p.title;document.querySelector('#project-description').textContent=p.description;
  const progress=document.querySelector('.project-progress');progress.setAttribute('aria-valuenow',String(index+1));progress.style.setProperty('--progress',`${(index+1)/projects.length*100}%`);
  world?.selectProject(index);
  if(paused){ghost.remove();switching=false;return}
  ghost.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(72px)'}],{duration:450,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
  projectCopy.animate([{opacity:0,transform:'translateX(110px)'},{opacity:0,transform:'translateX(90px)',offset:.48},{opacity:1,transform:'translateX(0)'}],{duration:800,easing:'cubic-bezier(.16,1,.3,1)'}).finished.finally(()=>{ghost.remove();switching=false});
}
const projectPanel=document.querySelector('.project-panel');
const projectProgress=document.querySelector('.project-progress');
projectProgress.setAttribute('aria-valuemax',String(projects.length));
projectProgress.style.setProperty('--progress',`${1/projects.length*100}%`);
function browsing(){return document.body.dataset.page==='projects'&&!document.querySelector('#project-dialog').open&&!settings.open}
window.addEventListener('wheel',e=>{
 if(!browsing()||e.ctrlKey)return;
 // On small screens let the page scroll until the project text is in view.
 const r=projectPanel.getBoundingClientRect();if(innerWidth<=650&&(r.top>innerHeight*.55||r.bottom<160))return;
 e.preventDefault();const now=performance.now();if(switching){wheelAmount=0;lastWheel=now;return}if(now-lastWheel>200)wheelAmount=0;lastWheel=now;
 wheelAmount+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(Math.abs(wheelAmount)>65){selectProject(currentProject+Math.sign(wheelAmount));wheelAmount=0}
},{passive:false});
window.addEventListener('keydown',e=>{if(!browsing()||['INPUT','TEXTAREA'].includes(e.target.tagName))return;const forward=['ArrowDown','ArrowRight','PageDown'].includes(e.key),back=['ArrowUp','ArrowLeft','PageUp'].includes(e.key);if(forward||back){e.preventDefault();selectProject(currentProject+(forward?1:-1))}});
let touchY=0;
projectPanel.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY},{passive:true});
projectPanel.addEventListener('touchend',e=>{const delta=touchY-e.changedTouches[0].clientY;if(browsing()&&Math.abs(delta)>45)selectProject(currentProject+Math.sign(delta))},{passive:true});
const aboutTopics=[
  {
    "title": "Hi, I’m James.",
    "body": "I’m James H. Yang, a Livingston High School student in the class of 2027.",
    "detail": "I’m curious about where technology, storytelling and people meet. Ciphers were one way in; building tools keeps me exploring.",
    "aside": "Questions first.",
    "note": "Cryptography, cybersecurity, data science and responsible AI—and how technology interacts with culture."
  },
  {
    "title": "How I learn.",
    "body": "I teach myself by building, testing and following the next question.",
    "detail": "My toolkit includes Python, HTML, Java, C# and Lua. KRYPTOS sparked my interest in ciphers; Codebusters made it collaborative.",
    "aside": "Practice & puzzles.",
    "note": "I’ve reached USACO Gold, been an ACSL Senior Division finalist and placed ninth in state Codebusters. I also lead our Physics Club."
  },
  {
    "title": "Beyond the screen.",
    "body": "Singing and beatboxing give me another way to experiment and listen.",
    "detail": "Table tennis and cross country teach me teamwork and consistency. Through Behind The Table, I help build a community around the sport.",
    "aside": "People & rhythm.",
    "note": "I’ve sung in NJ All-State twice and earned APEX first place. In table tennis, I’ve won two North American Teams Division 9 titles."
  }
];
let aboutIndex=0,aboutSwitching=false,aboutWheel=0,aboutLast=0;
const aboutPanel=document.querySelector('.about-composition');
aboutPanel.tabIndex=0;aboutPanel.setAttribute('aria-label','About me. Scroll or use up and down arrows to browse topics.');
function selectAbout(index){
 index=Math.max(0,Math.min(aboutTopics.length-1,index));if(index===aboutIndex||aboutSwitching)return;
 world?.beginTextTransition(850);
 const direction=index>aboutIndex?1:-1;aboutIndex=index;aboutSwitching=true;
 const topic=aboutTopics[index],panels=[...aboutPanel.querySelectorAll('.panel-content')];
 const ghosts=panels.map(el=>{const g=el.cloneNode(true);g.inert=true;g.setAttribute('aria-hidden','true');g.classList.add('about-ghost');el.parentElement.append(g);return g});
 panels[0].querySelector('h2').textContent=topic.title;const paragraphs=panels[0].querySelectorAll('p');paragraphs[0].textContent=topic.body;paragraphs[1].textContent=topic.detail;
 panels[1].querySelector('h2').textContent=topic.aside;panels[1].querySelector('p').textContent=topic.note;
 world?.selectProject(index);world?.energize();
 if(paused){ghosts.forEach(g=>g.remove());aboutSwitching=false;return}
 ghosts.forEach(g=>g.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:`translateY(${-direction*65}px)`}],{duration:400,fill:'forwards',easing:'ease-in'}));
 Promise.all(panels.map(el=>el.animate([{opacity:0,transform:`translateY(${direction*85}px)`},{opacity:0,transform:`translateY(${direction*65}px)`,offset:.4},{opacity:1,transform:'translateY(0)'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'}).finished)).finally(()=>{ghosts.forEach(g=>g.remove());aboutSwitching=false});
}
function aboutBrowsing(){return document.body.dataset.page==='about'&&!settings.open}
window.addEventListener('wheel',e=>{if(!aboutBrowsing()||e.ctrlKey)return;if((aboutIndex===0&&e.deltaY<0)||(aboutIndex===aboutTopics.length-1&&e.deltaY>0)||e.target.closest('.resume-section'))return;const r=aboutPanel.querySelector('.bio').getBoundingClientRect();if(innerWidth<=650&&(r.top>innerHeight*.55||r.bottom<100||(aboutIndex===0&&e.deltaY<0)||(aboutIndex===aboutTopics.length-1&&e.deltaY>0)))return;e.preventDefault();const now=performance.now();if(aboutSwitching){aboutWheel=0;aboutLast=now;return}if(now-aboutLast>200)aboutWheel=0;aboutLast=now;aboutWheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);if(Math.abs(aboutWheel)>65){selectAbout(aboutIndex+Math.sign(aboutWheel));aboutWheel=0}},{passive:false});
window.addEventListener('keydown',e=>{if(!aboutBrowsing())return;const d=['ArrowDown','PageDown'].includes(e.key)?1:['ArrowUp','PageUp'].includes(e.key)?-1:0;if(d&&aboutIndex+d>=0&&aboutIndex+d<aboutTopics.length){e.preventDefault();selectAbout(aboutIndex+d)}});
let aboutTouch=0;aboutPanel.addEventListener('touchstart',e=>{aboutTouch=e.touches[0].clientY},{passive:true});aboutPanel.addEventListener('touchend',e=>{const d=aboutTouch-e.changedTouches[0].clientY;if(aboutBrowsing()&&Math.abs(d)>45)selectAbout(aboutIndex+Math.sign(d))},{passive:true});
// A small, actual toothed silhouette instead of a typographic arrow.
const teeth=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,r=i%4===0||i%4===3?7.8:10;return `${12+Math.cos(a)*r},${12+Math.sin(a)*r}`}).join(' ');
document.querySelectorAll('#project-open,.notes .quiet-link').forEach(el=>{el.classList.add('gear-link');el.insertAdjacentHTML('afterbegin',`<svg class="hover-gear" viewBox="0 0 24 24" aria-hidden="true"><polygon points="${teeth}"/><circle cx="12" cy="12" r="3"/></svg>`)});
const dialog=document.querySelector('#project-dialog');
document.querySelector('#project-open').addEventListener('click',()=>{dialog.querySelector('h2').textContent=projects[currentProject].title;dialog.querySelector('.dialog-description').textContent=projects[currentProject].description;dialog.querySelector('.project-index').textContent=`${currentProject+1} / ${projects.length} · ${projects[currentProject].status}`;dialog.querySelector('.project-detail').textContent=projects[currentProject].detail;dialog.showModal()});
dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
document.querySelector('.heart-button').addEventListener('click',()=>world?.energize());
try {const {createWorld}=await import('./world.js');world=await createWorld(document.querySelector('#world'),{simpleBackground});world.setSimpleBackground(simpleBackground);world.setPage(document.body.dataset.page);world.setPaused(paused)} catch(error){console.warn('Using static clock fallback.',error)}
