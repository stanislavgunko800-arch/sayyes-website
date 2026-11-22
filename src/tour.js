// 3D-тур по салону: сцена из Blender (запечённый свет, GLB + Draco),
// камера едет по сплайну при прокрутке. Загружается лениво отдельным файлом.
import {WebGLRenderer,PerspectiveCamera,Scene,Color,MeshBasicMaterial,CatmullRomCurve3,Vector3,SRGBColorSpace,NoToneMapping} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';

const root=document.querySelector('[data-tour]');
if(root){
 const canvas=root.querySelector('.tour-canvas');
 const labels=[...root.querySelectorAll('.tour-labels li')];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const blender=p=>new Vector3(p[0],p[2],-p[1]); // Blender Z-up -> glTF Y-up
 try{
  const renderer=new WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=SRGBColorSpace;
  renderer.toneMapping=NoToneMapping;
  const scene=new Scene();scene.background=new Color(0xf2f1ee);
  const camera=new PerspectiveCamera(42,1,.05,60);
  let pos,look,target=0,cur=reduce?.18:0,dirty=true;
  const size=()=>{
   const r=canvas.parentElement.getBoundingClientRect();
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:2));
   renderer.setSize(r.width,r.height,false);
   camera.aspect=r.width/r.height;
   camera.fov=(camera.aspect<1?58:42);
   camera.updateProjectionMatrix();dirty=true;
  };
  const progress=()=>{
   const r=root.getBoundingClientRect(),span=r.height-innerHeight;
   target=span>0?Math.min(1,Math.max(0,-r.top/span)):0;
  };
  const place=t=>{
   const e=t*t*(3-2*t)*.35+t*.65; // мягкий старт и финиш
   camera.position.copy(pos.getPoint(e));
   camera.lookAt(look.getPoint(e));
   labels.forEach((el,i)=>el.classList.toggle('is-on',t>=i/labels.length&&t<(i+1)/labels.length+(i===labels.length-1?1:0)));
  };
  const frame=()=>{
   progress();
   const d=target-cur;
   if(Math.abs(d)>.0004){cur+=d*(reduce?1:.085);dirty=true}
   if(dirty){place(cur);renderer.render(scene,camera);dirty=false;root.classList.toggle('is-started',cur>.02)}
   requestAnimationFrame(frame);
  };
  const draco=new DRACOLoader().setDecoderPath('/3d/draco/');
  const loader=new GLTFLoader().setDRACOLoader(draco);
  Promise.all([fetch(root.dataset.cam).then(r=>r.json()),loader.loadAsync(root.dataset.glb)]).then(([cam,gltf])=>{
   pos=new CatmullRomCurve3(cam.path.map(s=>blender(s.p)),false,'centripetal');
   look=new CatmullRomCurve3(cam.path.map(s=>blender(s.t)),false,'centripetal');
   gltf.scene.traverse(o=>{
    if(o.isMesh){
     const map=o.material.map;
     if(map){map.anisotropy=8;map.colorSpace=SRGBColorSpace}
     o.material=new MeshBasicMaterial({map}); // свет уже запечён
    }
   });
   scene.add(gltf.scene);
   addEventListener('resize',size,{passive:true});
   size();root.classList.add('is-ready');frame();
  }).catch(()=>root.classList.add('is-failed'));
 }catch(e){root.classList.add('is-failed')}
}
