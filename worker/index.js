// Say Yes website worker: static site + anonymous feedback inbox for the owner.
//
//   POST /api/feedback        public form  -> stored in KV (binding FEEDBACK), nothing about the sender is kept
//   GET  /api/feedback        CRM pulls new messages   (Authorization: Bearer <CRM_TOKEN>)
//   POST /api/feedback/ack    CRM confirms it saved them -> they are deleted here   (same token)
// Everything else is served from the static assets.

const MIN=10,MAX=2000,TOPICS=['idea','service','praise','other'],LANGS=['ru','en','ka'];
const HOURLY_LIMIT=60; // overall (not per person): protects the inbox from floods without tracking anyone

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function safeEqual(a,b){
 const x=new TextEncoder().encode(String(a)),y=new TextEncoder().encode(String(b));
 let diff=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);
 return diff===0;
}
function authorised(request,env){
 if(!env.CRM_TOKEN)return false;
 const header=request.headers.get('authorization')||'';
 const token=header.startsWith('Bearer ')?header.slice(7):'';
 return safeEqual(token,env.CRM_TOKEN);
}
const random=()=>[...crypto.getRandomValues(new Uint8Array(4))].map(b=>b.toString(16).padStart(2,'0')).join('');

async function submit(request,env,url){
 if(!env.FEEDBACK)return json({error:'storage'},503);
 // Same-origin browsers only; no cookies, no credentials.
 const origin=request.headers.get('origin');
 if(!origin||origin!==url.origin)return json({error:'origin'},403);
 if(!(request.headers.get('content-type')||'').includes('application/json'))return json({error:'type'},415);
 const raw=await request.text();
 if(raw.length>MAX*6+500)return json({error:'size'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'json'},400);}
 const message=String(body?.message??'').replace(/\r\n/g,'\n').trim();
 if(message.length<MIN)return json({error:'short'},400);
 if(message.length>MAX)return json({error:'long'},400);
 // Bots: the hidden field is filled in or the form was "submitted" within moments of opening.
 if(String(body?.hp??'')!==''||!(Number(body?.ms)>=2500))return json({ok:true}); // pretend success, store nothing
 const hour=Math.floor(Date.now()/3600000),limitKey='rl:'+hour;
 const used=Number(await env.FEEDBACK.get(limitKey))||0;
 if(used>=HOURLY_LIMIT)return json({error:'busy'},429);
 await env.FEEDBACK.put(limitKey,String(used+1),{expirationTtl:7200});
 const topic=TOPICS.includes(body?.topic)?body.topic:'other';
 const lang=LANGS.includes(body?.lang)?body.lang:'ru';
 const id=String(Date.now()).padStart(15,'0')+'-'+random();
 // Only the day is kept (not the time) and nothing about the connection or device.
 const record={id,date:new Date().toISOString().slice(0,10),topic,lang,message};
 await env.FEEDBACK.put('m:'+id,JSON.stringify(record));
 return json({ok:true});
}

async function list(request,env,url){
 if(!authorised(request,env))return json({error:'unauthorised'},env.CRM_TOKEN?401:503);
 if(!env.FEEDBACK)return json({error:'storage'},503);
 const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||100,1),200);
 const keys=await env.FEEDBACK.list({prefix:'m:',limit});
 const messages=[];
 for(const key of keys.keys){
  const value=await env.FEEDBACK.get(key.name);
  if(value)try{messages.push(JSON.parse(value));}catch{}
 }
 return json({messages,more:!keys.list_complete});
}

async function ack(request,env){
 if(!authorised(request,env))return json({error:'unauthorised'},env.CRM_TOKEN?401:503);
 if(!env.FEEDBACK)return json({error:'storage'},503);
 let body;try{body=await request.json();}catch{return json({error:'json'},400);}
 const ids=(Array.isArray(body?.ids)?body.ids:[]).filter(id=>/^\d{15}-[0-9a-f]{8}$/.test(id)).slice(0,200);
 await Promise.all(ids.map(id=>env.FEEDBACK.delete('m:'+id)));
 return json({deleted:ids.length});
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/feedback'){
   if(request.method==='POST')return submit(request,env,url);
   if(request.method==='GET')return list(request,env,url);
   return json({error:'method'},405);
  }
  if(url.pathname==='/api/feedback/ack'){
   return request.method==='POST'?ack(request,env):json({error:'method'},405);
  }
  if(url.pathname.startsWith('/api/'))return json({error:'not found'},404);
  return env.ASSETS.fetch(request);
 }
};
