import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {cp,readFile,writeFile} from 'node:fs/promises';
execFileSync('python3',['render.py'],{stdio:'inherit'});
execFileSync('python3',['locales/generate.py'],{stdio:'inherit'});
await build({entryPoints:['src/app.js'],outfile:'dist/app.js',bundle:true,minify:true,format:'iife',target:['es2020'],legalComments:'inline'});
const css=await Promise.all(['fonts','style','polish','grunge'].map(n=>readFile(`src/${n}.css`,'utf8')));
await writeFile('dist/style.css',css.join('\n'));
await cp('src/fonts','dist/fonts',{recursive:true});
await cp('public','dist',{recursive:true}); // robots.txt + _headers (no indexing while the site is a preview)
console.log('Built Say Yes with local Motion, GSAP and ScrollTrigger animations');
