import {gsap} from 'gsap';

// Brand intro: shown once per browser session, never for reduced-motion users.
// The page is fully usable without it: a head script adds `js-preload` only when the
// intro will play, and also removes it again after 5.5 s as a failsafe.
export function initIntro() {
 const root=document.documentElement;
 const panel=document.querySelector('.preloader');
 if(!panel||!root.classList.contains('js-preload'))return;
 const words=panel.querySelectorAll('.preloader-word i');
 const sub=panel.querySelector('.preloader-sub');
 const bar=panel.querySelector('.preloader-bar i');
 const loaded=new Promise(resolve=>{
  const done=()=>(document.fonts?.ready||Promise.resolve()).then(resolve,resolve);
  document.readyState==='complete'?done():addEventListener('load',done,{once:true});
 });
 const finish=()=>{
  try{sessionStorage.setItem('sayyes-intro','1');}catch{}
  root.classList.remove('js-preload');
  panel.style.display='none';
 };
 const enter=gsap.timeline({defaults:{ease:'expo.out'}});
 enter.from(words,{yPercent:115,duration:1,stagger:.12},.1)
  .from(sub,{opacity:0,y:10,duration:.8,ease:'power3.out'},.6)
  .fromTo(bar,{scaleX:0},{scaleX:1,duration:1.25,ease:'power2.inOut'},.1);
 Promise.all([loaded,new Promise(resolve=>enter.eventCallback('onComplete',resolve))]).then(()=>{
  const exit=gsap.timeline({onComplete:finish});
  exit.to(words,{yPercent:-115,duration:.6,stagger:.08,ease:'expo.in'})
   .to(sub,{opacity:0,duration:.3},0)
   .to(panel,{yPercent:-100,duration:.95,ease:'expo.inOut'},.35)
   .add(()=>document.dispatchEvent(new Event('sayyes:intro-exit')),.7);
 });
}
