// Respect reduced motion, data-saving preferences and background tabs.
// The hero has no source until playback is allowed or explicitly requested.
export function initVideos(t) {
 const hero=document.querySelector('#hero-film');
 const toggle=document.querySelector('.video-toggle');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const connection=navigator.connection;
 const others=[...document.querySelectorAll('.service-film')];
 let visible=true,userPaused=false,explicit=false;
 function attach(){
  if(hero.getAttribute('src'))return;
  hero.muted=true;hero.defaultMuted=true;
  hero.src=matchMedia('(max-width: 600px)').matches?hero.dataset.mobile:hero.dataset.desktop;
  hero.load();
 }
 function updateControl(){
  const playing=!hero.paused;
  toggle.setAttribute('aria-pressed',String(playing));
  toggle.setAttribute('aria-label',t(playing?'Приостановить видео':'Воспроизвести видео'));
  toggle.querySelector('.video-toggle-icon').textContent=playing?'Ⅱ':'▷';
  toggle.querySelector('[data-video-label]').textContent=t(playing?'Пауза':'Смотреть видео');
 }
 function permitted(){return !reduced.matches&&!connection?.saveData&&!['slow-2g','2g'].includes(connection?.effectiveType);}
 function sync(){
  const busy=others.some(video=>!video.paused);
  if(document.hidden||!visible||busy||userPaused||(!explicit&&!permitted())){hero.pause();return;}
  attach();hero.play().catch(updateControl);
 }
 toggle.addEventListener('click',()=>{
  if(!hero.paused){userPaused=true;explicit=false;hero.pause();}
  else{userPaused=false;explicit=true;others.forEach(video=>video.pause());sync();}
 });
 hero.addEventListener('play',updateControl);hero.addEventListener('pause',updateControl);hero.addEventListener('error',updateControl);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.1});observer.observe(hero);
 // The short service films play silently on a loop while they are on screen and
 // pause when scrolled away. Controls stay available for sound and manual pause.
 const state=new Map();
 const wantsAuto=video=>{const item=state.get(video);return Boolean(item&&item.inView&&!item.userPaused&&permitted()&&!document.hidden);};
 const autoplay=video=>{if(wantsAuto(video)&&video.paused)video.play().catch(()=>{});};
 const pauseQuietly=video=>{const item=state.get(video);if(!video.paused){if(item)item.ours=true;video.pause();}};
 for(const video of others){
  const item={inView:false,userPaused:false,ours:false};state.set(video,item);
  video.muted=true;video.defaultMuted=true;video.loop=true;
  const soloIfLoud=()=>{if(!video.muted)others.forEach(other=>{if(other!==video)other.pause();});};
  video.addEventListener('play',()=>{hero.pause();soloIfLoud();});
  video.addEventListener('volumechange',soloIfLoud);
  video.addEventListener('pause',()=>{if(item.ours)item.ours=false;else if(item.inView&&!document.hidden)item.userPaused=true;});
  const viewport=new IntersectionObserver(entries=>{
   const entry=entries[entries.length-1]; // newest state if several were queued
   item.inView=entry.isIntersecting&&(entry.intersectionRatio===undefined||entry.intersectionRatio>=.5);
   if(!item.inView){item.userPaused=false;pauseQuietly(video);return;}
   autoplay(video);
  },{threshold:[0,.05,.5,.8]});viewport.observe(video);
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)others.forEach(pauseQuietly);else others.forEach(autoplay);
  sync();
 });
 reduced.addEventListener('change',()=>{explicit=false;sync();});
 connection?.addEventListener?.('change',sync);
 window.addEventListener('pagehide',()=>{hero.pause();others.forEach(video=>video.pause());});
 updateControl();
}
