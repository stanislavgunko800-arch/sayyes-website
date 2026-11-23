// Тестовый просмотр скана (кухня): GLB со сжатием Draco, свет уже в текстуре.
import {WebGLRenderer,PerspectiveCamera,Scene,Color,MeshBasicMaterial,Box3,Vector3,SRGBColorSpace,NoToneMapping} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
const canvas=document.querySelector('canvas'),status=document.querySelector('.status');
const renderer=new WebGLRenderer({canvas,antialias:true});
renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=NoToneMapping;
const scene=new Scene();scene.background=new Color(0x15110f);
const camera=new PerspectiveCamera(55,1,.05,100);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.07;controls.autoRotate=true;controls.autoRotateSpeed=.6;
controls.addEventListener('start',()=>controls.autoRotate=false);
const size=()=>{const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
addEventListener('resize',size);size();
const draco=new DRACOLoader().setDecoderPath('/3d/draco/');
new GLTFLoader().setDRACOLoader(draco).load('/3d/kitchen.glb',gltf=>{
 gltf.scene.traverse(o=>{if(o.isMesh){const map=o.material.map;if(map){map.anisotropy=8;map.colorSpace=SRGBColorSpace}o.material=new MeshBasicMaterial({map})}});
 scene.add(gltf.scene);
 const box=new Box3().setFromObject(gltf.scene),c=box.getCenter(new Vector3()),s=box.getSize(new Vector3());
 controls.target.copy(c);camera.position.set(c.x+s.x*.2,c.y+s.y*.15,c.z+Math.max(s.x,s.z)*1.35);
 controls.minDistance=.3;controls.maxDistance=Math.max(s.x,s.y,s.z)*2.2;controls.update();
 status.textContent='Вращайте пальцем, масштаб щипком. Можно приблизиться и заглянуть внутрь.';
 document.body.classList.add('ready');
},undefined,()=>{status.textContent='Не удалось загрузить модель.'});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
