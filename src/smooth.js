import Lenis from 'lenis';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');

// Inertial smooth scrolling for mouse/trackpad only. Touch devices keep native
// momentum scrolling, which is smoother and more battery-friendly on iPhone.
export function initSmoothScroll() {
 if(reduced.matches||!fine.matches)return null;
 const lenis=new Lenis({duration:1.15,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smoothWheel:true,anchors:{offset:-90}});
 lenis.on('scroll',ScrollTrigger.update);
 gsap.ticker.add(time=>lenis.raf(time*1000));
 gsap.ticker.lagSmoothing(0);
 document.querySelectorAll('dialog,.mobile-menu').forEach(element=>element.setAttribute('data-lenis-prevent',''));
 // Pause smoothing while a dialog or the mobile menu locks the page.
 const sync=()=>{const locked=document.body.classList.contains('modal-open')||document.body.classList.contains('menu-open');locked?lenis.stop():lenis.start();};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 reduced.addEventListener('change',()=>{if(reduced.matches){lenis.destroy();document.documentElement.classList.remove('lenis','lenis-smooth');}});
 return lenis;
}

// The marquee speeds up while the page scrolls and relaxes back when it stops.
export function initTickerVelocity() {
 const track=document.querySelector('.ticker-track');
 if(!track||reduced.matches)return;
 const proxy={rate:1};
 let idle=0;
 const apply=()=>{for(const animation of track.getAnimations())animation.playbackRate=proxy.rate;};
 const to=rate=>gsap.to(proxy,{rate,duration:rate>1?.35:1.1,ease:'power2.out',overwrite:true,onUpdate:apply});
 ScrollTrigger.create({start:0,end:'max',onUpdate:self=>{
  to(1+Math.min(Math.abs(self.getVelocity())/260,9));
  clearTimeout(idle);idle=setTimeout(()=>to(1),140);
 }});
}
