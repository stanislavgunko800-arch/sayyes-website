import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Each property has one owner: GSAP controls entrances/scroll scenes, while
// Motion still handles menu swaps, dialogs and game feedback in app.js.
// After the entrance: the headline and photo react to the mouse and to scrolling.
// Desktop only; every effect is cleaned up when the media query stops matching.
function heroLife(desktop) {
 if(!desktop)return ()=>{};
 const hero=document.querySelector('.hero');
 const photo=document.querySelector('.hero-image');
 const [first,second]=document.querySelectorAll('.hero-line');
 const script=document.querySelector('.hero-script');
 const follow=(element,amount)=>({
  x:gsap.quickTo(element,'x',{duration:1.1,ease:'power3'}),
  y:gsap.quickTo(element,'y',{duration:1.1,ease:'power3'}),
  amount
 });
 const parts=[follow(first,[-14,-6]),follow(second,[-28,-10]),follow(script,[-46,-18]),follow(photo,[16,0])];
 const move=event=>{
  const nx=event.clientX/innerWidth-.5,ny=event.clientY/innerHeight-.5;
  for(const part of parts){part.x(nx*part.amount[0]);part.y(ny*part.amount[1]);}
 };
 const rest=()=>{for(const part of parts){part.x(0);part.y(0);}};
 hero.addEventListener('pointermove',move,{passive:true});
 hero.addEventListener('pointerleave',rest);
 const scroll={trigger:hero,start:'top top',end:'bottom top',scrub:.6};
 const tweens=[
  gsap.to(photo,{yPercent:4,scale:1.1,ease:'none',scrollTrigger:scroll}),
  gsap.to('.hero h1',{y:-70,ease:'none',scrollTrigger:scroll}),
  gsap.to('.hero-bottom',{y:-30,ease:'none',scrollTrigger:scroll})
 ];
 return ()=>{
  hero.removeEventListener('pointermove',move);
  hero.removeEventListener('pointerleave',rest);
  tweens.forEach(tween=>{tween.scrollTrigger?.kill();tween.kill();});
 };
}

export function initScrollScenes() {
 const media=gsap.matchMedia();
 media.add({
  motion:'(prefers-reduced-motion: no-preference)',
  desktop:'(min-width: 901px) and (hover: hover) and (pointer: fine)'
 }, context=>{
  if(!context.conditions.motion)return;
  const desktop=context.conditions.desktop;
  let stopHero=()=>{};
  // Each headline line rises out of its own mask; the photo opens like a curtain.
  const lines=[...document.querySelectorAll('.hero-line')];
  const masks=lines.map(line=>{
   if(line.parentElement.classList.contains('hero-mask'))return line.parentElement;
   const mask=document.createElement('span');
   mask.className='hero-mask';line.before(mask);mask.append(line);
   return mask;
  });
  const hero=gsap.timeline({defaults:{ease:'power3.out'},onComplete:()=>{
   masks.forEach(mask=>mask.classList.add('is-open'));
   stopHero=heroLife(desktop);
  }});
  hero.from('.hero-photo',{clipPath:'inset(100% 0% 0% 0%)',duration:1.35,ease:'expo.inOut',clearProps:'clipPath'},0)
   .from('.hero-image',{scale:1.3,duration:2,ease:'expo.out',clearProps:'transform'},0)
   .from('.hero-kicker',{y:12,opacity:0,duration:.7,clearProps:'transform,opacity'},.2)
   .from(lines,{yPercent:118,duration:1.15,stagger:.13,ease:'expo.out',clearProps:'transform'},.25)
   .from('.hero-script',{opacity:0,y:24,rotation:-14,duration:.9,ease:'back.out(1.6)',clearProps:'opacity,transform'},.85)
   .from('.hero-bottom',{y:18,opacity:0,duration:.8,clearProps:'transform,opacity'},.8)
   .from('.hero-stamp',{scale:.2,opacity:0,rotation:-80,duration:1,ease:'back.out(1.7)',clearProps:'transform,opacity'},1.1)
   .from('.video-toggle,.photo-label',{opacity:0,y:10,duration:.6,stagger:.1,clearProps:'transform,opacity'},1.2);

  context.add('enter',element=>{
   gsap.to(element,{opacity:1,y:0,duration:desktop?.8:.5,ease:'power3.out',overwrite:'auto',clearProps:'transform,opacity'});
  });
  for(const element of document.querySelectorAll('.reveal')) {
   // Keep above-the-fold content, keyboard focus and no-JS fallback visible.
   if(element.getBoundingClientRect().top<innerHeight)continue;
   gsap.set(element,{opacity:0,y:desktop?28:14});
   ScrollTrigger.create({trigger:element,start:'top 94%',once:true,onEnter:()=>context.enter(element)});
  }

  if(desktop){
   // Small image-only movements inside already clipped boxes; no pinning,
   // scroll hijacking or animated layout dimensions on touch screens.
   for(const selector of ['.about-visual > img','.contacts-photo > img']) {
    const image=document.querySelector(selector);
    gsap.fromTo(image,{scale:1.09,yPercent:-2},{scale:1.09,yPercent:2,ease:'none',scrollTrigger:{trigger:image.parentElement,start:'top bottom',end:'bottom top',scrub:.8}});
   }
   gsap.fromTo('.collage-main',{rotation:8},{rotation:2,ease:'none',scrollTrigger:{trigger:'.coffee-collage',start:'top bottom',end:'bottom top',scrub:.8}});
   gsap.fromTo('.collage-small',{rotation:-12},{rotation:-4,ease:'none',scrollTrigger:{trigger:'.coffee-collage',start:'top bottom',end:'bottom top',scrub:.8}});
   for(const section of document.querySelectorAll('.section-heading')){
    const heading=section.querySelector('h2');
    if(heading)gsap.from(heading,{y:20,duration:.9,ease:'power3.out',clearProps:'transform',scrollTrigger:{trigger:section,start:'top 88%',once:true}});
   }
  }
  const showFocused=event=>{
   const element=event.target.closest('.reveal');
   if(element){gsap.killTweensOf(element);gsap.set(element,{clearProps:'transform,opacity'});}
  };
  document.addEventListener('focusin',showFocused);
  return ()=>{document.removeEventListener('focusin',showFocused);stopHero();};
 });

 const refresh=()=>ScrollTrigger.refresh();
 const restore=event=>{if(event.persisted)refresh();};
 window.addEventListener('load',refresh,{once:true});
 window.addEventListener('pageshow',restore);
 document.fonts?.ready.then(refresh);
 // Menu category changes alter document height; refresh after the layout settles.
 document.addEventListener('sayyes:layout',refresh);
 return ()=>{media.revert();window.removeEventListener('load',refresh);window.removeEventListener('pageshow',restore);document.removeEventListener('sayyes:layout',refresh);};
}
