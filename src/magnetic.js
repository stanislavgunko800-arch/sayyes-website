import {gsap} from 'gsap';

// Buttons follow the pointer slightly ("magnetic"); no colour change.
// Fine pointers only, and not for reduced-motion users.
export function initMagnetic() {
 if(!matchMedia('(hover: hover) and (pointer: fine)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const element of document.querySelectorAll('.button,.hero-btn')){
  const offset={x:0,y:0};
  const apply=()=>{element.style.translate=`${offset.x.toFixed(2)}px ${offset.y.toFixed(2)}px`;};
  element.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse')return;
   const box=element.getBoundingClientRect();
   gsap.to(offset,{x:(event.clientX-(box.left+box.width/2))*.3,y:(event.clientY-(box.top+box.height/2))*.4,duration:.35,ease:'power3.out',overwrite:true,onUpdate:apply});
  });
  element.addEventListener('pointerleave',()=>{
   gsap.to(offset,{x:0,y:0,duration:.8,ease:'elastic.out(1,.45)',overwrite:true,onUpdate:apply,onComplete:()=>{element.style.translate='';}});
  });
 }
}
