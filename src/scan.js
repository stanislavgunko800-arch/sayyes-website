// 3D-скан кухни Say Yes: GLB (Draco), свет уже в текстуре; камера плывёт по прокрутке.
import {WebGLRenderer,PerspectiveCamera,Scene,Color,MeshBasicMaterial,Box3,Vector3,SRGBColorSpace,NoToneMapping} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
const root=document.querySelector('[data-scan]');
if(root){
 const canvas=root.querySelector('.scan-canvas');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{
  const renderer=new WebGLRenderer({canvas,antialias:true});
  renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=NoToneMapping;
  const scene=new Scene();scene.background=new Color(0x15110f);
  const camera=new PerspectiveCamera(50,1,.05,100);
  let c,s,target=0,cur=reduce?.4:0,px=0,dirty=true;
  const size=()=>{const r=canvas.parentElement.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:2));renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=camera.aspect<1?64:50;camera.updateProjectionMatrix();dirty=true};
  const place=t=>{
   const e=t*t*(3-2*t);
   const az=(-.62+e*1.1)+px*.12, el=.2-e*.12, rad=Math.max(s.x,s.z)*(1.55-e*.95);
   camera.position.set(c.x+Math.sin(az)*rad*Math.cos(el),c.y+Math.sin(el)*rad+s.y*.05,c.z+Math.cos(az)*rad*Math.cos(el));
   camera.lookAt(c.x,c.y,c.z);
  };
  const frame=()=>{
   const r=root.getBoundingClientRect(),span=r.height-innerHeight;
   target=span>0?Math.min(1,Math.max(0,-r.top/span)):0;
   const d=target-cur;if(Math.abs(d)>.0004){cur+=d*(reduce?1:.085);dirty=true}
   if(dirty){place(cur);renderer.render(scene,camera);dirty=false;root.classList.toggle('is-started',cur>.02)}
   requestAnimationFrame(frame);
  };
  const draco=new DRACOLoader().setDecoderPath('/3d/draco/');
  new GLTFLoader().setDRACOLoader(draco).loadAsync(root.dataset.glb).then(gltf=>{
   gltf.scene.traverse(o=>{if(o.isMesh){const map=o.material.map;if(map){map.anisotropy=8;map.colorSpace=SRGBColorSpace}o.material=new MeshBasicMaterial({map})}});
   scene.add(gltf.scene);
   const box=new Box3().setFromObject(gltf.scene);c=box.getCenter(new Vector3());s=box.getSize(new Vector3());
   addEventListener('resize',size,{passive:true});
   if(!reduce)canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();px=((e.clientX-r.left)/r.width-.5)*2;dirty=true},{passive:true});
   size();root.classList.add('is-ready');frame();
  }).catch(()=>root.classList.add('is-failed'));
 }catch(e){root.classList.add('is-failed')}
}
