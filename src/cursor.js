import {gsap} from 'gsap';

// Desktop-only (fine pointer, no reduced motion): custom cursor + magnetic buttons.
// Touch devices and reduced-motion users keep the native cursor and no extra motion.
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

const HOVER='a,button,[role=tab],.service-card,.gallery-item,summary,label[for]';
const NATIVE='dialog,video[controls],input,textarea,select,iframe';

export function initCursor() {
 if(!fine.matches||reduced.matches)return;
 const root=document.documentElement;
 const ring=document.createElement('div');
 ring.className='cursor';ring.setAttribute('aria-hidden','true');
 ring.innerHTML='<span class="cursor-ring"><span class="cursor-label"></span></span>';
 const dot=document.createElement('div');
 dot.className='cursor-dot';dot.setAttribute('aria-hidden','true');
 document.body.append(ring,dot);
 root.classList.add('has-cursor','cursor-hidden');

 const label=ring.querySelector('.cursor-label');
 const ringX=gsap.quickTo(ring,'x',{duration:.45,ease:'power3'});
 const ringY=gsap.quickTo(ring,'y',{duration:.45,ease:'power3'});
 const dotX=gsap.quickTo(dot,'x',{duration:.08,ease:'none'});
 const dotY=gsap.quickTo(dot,'y',{duration:.08,ease:'none'});
 let state='',shown=false;

 function setState(next,text=''){
  if(next!==state){state=next;if(next)root.dataset.cursor=next;else delete root.dataset.cursor;}
  if(label.textContent!==text)label.textContent=text;
 }
 function setShown(value){
  if(value===shown)return;
  shown=value;root.classList.toggle('cursor-hidden',!value);
 }

 let lastX=0,lastY=0,frame=0;
 function evaluate(target){
  if(!target||target.closest(NATIVE)){setShown(false);return;}
  setShown(true);
  if(target.closest('.hero-photo')&&!target.closest('a,button')){
   setState('media',document.querySelector('[data-video-label]')?.textContent||'');
  }else if(target.closest(HOVER)){setState('hover');}
  else setState('');
 }
 document.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse')return;
  lastX=event.clientX;lastY=event.clientY;
  if(!shown){gsap.set(ring,{x:lastX,y:lastY});gsap.set(dot,{x:lastX,y:lastY});}
  ringX(lastX);ringY(lastY);dotX(lastX);dotY(lastY);
  evaluate(event.target instanceof Element?event.target:null);
 },{passive:true});
 // Content moves under a still pointer while scrolling: re-check what is below it.
 window.addEventListener('scroll',()=>{
  if(frame||!shown)return;
  frame=requestAnimationFrame(()=>{frame=0;evaluate(document.elementFromPoint(lastX,lastY));});
 },{passive:true});
 document.documentElement.addEventListener('mouseleave',()=>setShown(false));
 document.documentElement.addEventListener('mouseenter',()=>{});
 document.addEventListener('pointerdown',()=>root.classList.add('cursor-down'));
 document.addEventListener('pointerup',()=>root.classList.remove('cursor-down'));
 window.addEventListener('blur',()=>setShown(false));

 // The cursor label promises "watch video": make the photo itself toggle playback.
 document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;
  if(!target||!target.closest('.hero-photo')||target.closest('a,button'))return;
  document.querySelector('.video-toggle')?.click();
 });

 initMagnetic();
 initTilt();
}

function initMagnetic() {
 const targets=document.querySelectorAll('.button,.hero-stamp,.video-toggle,.contact-link,.dialog-close');
 for(const element of targets){
  const strength=element.classList.contains('hero-stamp')?.35:element.classList.contains('contact-link')?0:.22;
  if(!strength)continue;
  const offset={x:0,y:0};
  const apply=()=>{element.style.translate=`${offset.x.toFixed(2)}px ${offset.y.toFixed(2)}px`;};
  element.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse')return;
   const box=element.getBoundingClientRect();
   gsap.to(offset,{x:(event.clientX-(box.left+box.width/2))*strength,y:(event.clientY-(box.top+box.height/2))*strength,duration:.4,ease:'power3.out',overwrite:true,onUpdate:apply});
  });
  element.addEventListener('pointerleave',()=>{
   gsap.to(offset,{x:0,y:0,duration:.9,ease:'elastic.out(1,.45)',overwrite:true,onUpdate:apply,onComplete:()=>{element.style.translate='';}});
  });
 }
}

// Service cards tilt towards the pointer and carry a soft light glare.
function initTilt() {
 for(const card of document.querySelectorAll('.service-card')){
  card.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse')return;
   const box=card.getBoundingClientRect();
   const px=(event.clientX-box.left)/box.width,py=(event.clientY-box.top)/box.height;
   card.style.setProperty('--ry',((px-.5)*10).toFixed(2)+'deg');
   card.style.setProperty('--rx',((.5-py)*8).toFixed(2)+'deg');
   card.style.setProperty('--mx',(px*100).toFixed(1)+'%');
   card.style.setProperty('--my',(py*100).toFixed(1)+'%');
  });
  card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');});
 }
}
