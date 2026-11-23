// «Живой уголок»: настоящее фото салона, разрезанное на слои по глубине.
// При прокрутке слои смещаются с разной скоростью (параллакс + наезд камеры),
// дыры под слоями заполняются размытым фоном.
const root=document.querySelector('[data-corner]');
export function initCorner(){
 if(!root)return;
 const canvas=root.querySelector('.corner-canvas'),ctx=canvas.getContext('2d');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const W=1125,H=2000;
 // полигоны в пикселях исходного фото; depth: 0 фон … 2 близко к камере
 const P=(...a)=>a;
 const layers=[
  {depth:.35,poly:P(250,1075,815,1075,815,1280,250,1280),hole:false}, // полки с подсветкой
  {depth:1.0,poly:P(238,1245,345,1235,440,1290,465,1330,462,1790,380,1800,240,1770,232,1400,245,1300),hole:true}, // левая бочка
  {depth:.75,poly:P(500,1520,560,1495,610,1510,612,1740,560,1760,500,1745),hole:true}, // корзина
  {depth:1.0,poly:P(635,1345,660,1325,745,1315,830,1330,865,1380,862,1800,780,1825,690,1810,640,1750,632,1400),hole:true}, // правая бочка
  {depth:1.35,poly:P(822,1135,900,1110,1125,1050,1125,2000,985,2000,878,1500,868,1420,850,1300,822,1260),hole:true}, // бар
  {depth:1.9,poly:P(812,0,1125,0,1125,740,830,900,812,870),hole:true}, // мезонин
 ];
 const img=new Image();img.src=root.dataset.src;
 let bg,p=0,target=0,dirty=true,px=0,visible=false,cw=0,ch=0;
 const path=poly=>{const g=new Path2D();poly.forEach((v,i)=>{i%2===0&&(i===0?g.moveTo(v,poly[i+1]):g.lineTo(v,poly[i+1]))});g.closePath();return g};
 const make=()=>{
  bg=document.createElement('canvas');bg.width=W;bg.height=H;
  const b=bg.getContext('2d');b.drawImage(img,0,0,W,H);
  b.save();layers.filter(l=>l.hole).forEach(l=>{b.fillStyle='#b9b2a7';b.fill(path(l.poly))});b.restore();
  const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;
  const t=tmp.getContext('2d');t.filter='blur(34px)';t.drawImage(bg,0,0);
  b.save();layers.filter(l=>l.hole).forEach(l=>{const g=path(l.poly);b.save();b.clip(g);b.drawImage(tmp,0,0);b.restore()});b.restore();
  layers.forEach(l=>l.path=path(l.poly));
 };
 const size=()=>{
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  cw=Math.round(r.width*d);ch=Math.round(r.height*d);canvas.width=cw;canvas.height=ch;dirty=true;
 };
 const draw=()=>{
  const base=cw/W;
  const put=(src,depth,clip)=>{
   const s=base*(1.07+p*.07*depth), k=(p-.5)*2, cx=W/2,cy=H*.6;
   const tx=cw/2-cx*s+(-k*34-px*20)*depth*base, ty=ch/2-cy*s+(-p*40)*depth*base*.6;
   ctx.setTransform(s,0,0,s,tx,ty);
   if(clip){ctx.save();ctx.clip(clip);ctx.drawImage(src,0,0,W,H);ctx.restore()}else ctx.drawImage(src,0,0,W,H);
  };
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cw,ch);
  put(bg,.1,null);
  layers.forEach(l=>put(img,l.depth,l.path));
 };
 const frame=()=>{
  if(visible){
   const r=root.getBoundingClientRect(),span=r.height-innerHeight;
   target=reduce?.5:(span>0?Math.min(1,Math.max(0,-r.top/span)):0);
   const d=target-p;if(Math.abs(d)>.0005){p+=d*(reduce?1:.08);dirty=true}
   if(dirty){draw();dirty=false}
  }
  requestAnimationFrame(frame);
 };
 const start=()=>{make();size();addEventListener('resize',size,{passive:true});
  if(!reduce)canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();px=((e.clientX-r.left)/r.width-.5)*2;dirty=true},{passive:true});
  root.classList.add('is-ready');frame()};
 if('IntersectionObserver' in window)new IntersectionObserver(e=>{visible=e.some(x=>x.isIntersecting);dirty=visible||dirty},{rootMargin:'20% 0px'}).observe(root);else visible=true;
 img.complete&&img.naturalWidth?start():(img.onload=start);
}
