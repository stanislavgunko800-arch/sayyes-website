// Worker logic test with an in-memory KV (no Cloudflare needed).
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
const store=new Map();
const KV={async get(k){return store.get(k)??null},async put(k,v){store.set(k,v)},async delete(k){store.delete(k)},
 async list({prefix,limit}){const names=[...store.keys()].filter(k=>k.startsWith(prefix)).sort().slice(0,limit);return {keys:names.map(name=>({name})),list_complete:true}}};
const env={FEEDBACK:KV,CRM_TOKEN:'secret-token',ASSETS:{fetch:async()=>new Response('asset')}};
const origin='https://example.test';
const post=(body,headers={})=>worker.fetch(new Request(origin+'/api/feedback',{method:'POST',headers:{'content-type':'application/json',origin,...headers},body:JSON.stringify(body)}),env);
const good={message:'Очень понравился кофе, но хотелось бы больше розеток.',topic:'idea',lang:'ru',hp:'',ms:9000};
// stores a message, keeps nothing about the sender
let r=await post(good);assert.equal(r.status,200);assert.equal(store.size,2); // message + rate-limit counter
const rec=JSON.parse([...store].find(([k])=>k.startsWith('m:'))[1]);
assert.deepEqual(Object.keys(rec).sort(),['date','id','lang','message','topic']);
assert.match(rec.date,/^\d{4}-\d{2}-\d{2}$/);
// validation
assert.equal((await post({...good,message:'коротко'})).status,400);
assert.equal((await post({...good,message:'я'.repeat(2001)})).status,400);
assert.equal((await post(good,{origin:'https://evil.test'})).status,403);
// bots get a fake success and nothing is stored
const before=store.size;
assert.equal((await post({...good,hp:'x'})).status,200);assert.equal((await post({...good,ms:100})).status,200);
assert.equal(store.size,before);
// CRM side needs the token
assert.equal((await worker.fetch(new Request(origin+'/api/feedback'),env)).status,401);
assert.equal((await worker.fetch(new Request(origin+'/api/feedback',{headers:{authorization:'Bearer nope'}}),env)).status,401);
r=await worker.fetch(new Request(origin+'/api/feedback',{headers:{authorization:'Bearer secret-token'}}),env);
const {messages}=await r.json();assert.equal(messages.length,1);assert.equal(messages[0].message,good.message);
// ack removes it
r=await worker.fetch(new Request(origin+'/api/feedback/ack',{method:'POST',headers:{authorization:'Bearer secret-token','content-type':'application/json'},body:JSON.stringify({ids:[messages[0].id,'../bad']})}),env);
assert.equal((await r.json()).deleted,1);
r=await worker.fetch(new Request(origin+'/api/feedback',{headers:{authorization:'Bearer secret-token'}}),env);
assert.equal((await r.json()).messages.length,0);
// no token configured -> CRM endpoints closed; static assets pass through
assert.equal((await worker.fetch(new Request(origin+'/api/feedback',{headers:{authorization:'Bearer x'}}),{...env,CRM_TOKEN:undefined})).status,503);
assert.equal(await (await worker.fetch(new Request(origin+'/ru/'),env)).text(),'asset');
console.log('PASS: feedback worker — anonymous storage, validation, bot traps, token-protected pull and delete');
