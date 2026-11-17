import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createSession, createState, signPayload, getSession, verifyPayload, SESSION_COOKIE, STATE_COOKIE, SESSION_SECONDS } from '../lib/auth.js';
import { onRequest as status } from '../functions/api/status.js';
import { onRequestGet as login } from '../functions/api/auth/discord.js';
import { onRequestGet as callback } from '../functions/api/auth/discord/callback.js';
import { onRequest as logout } from '../functions/api/auth/logout.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const origin = 'https://test.pages.dev';
const secret = 'test-only-secret-not-for-production-123456789';
const user = {user_id:'123456789', username:'Leitor Á', avatar:'https://cdn.discordapp.com/embed/avatars/0.png'};
const env = {SESSION_SECRET:secret, DISCORD_CLIENT_ID:'12345', DISCORD_CLIENT_SECRET:'fake-test-client-secret'};
function database({fail=false, records=[]}={}) {
  const calls=[];
  return {calls, prepare(sql) {
    const entry={sql,args:[]}; calls.push(entry);
    return {bind(...args){entry.args=args; return this;}, async first(){if(fail)throw Error('offline'); return sql.includes('COUNT')?{total:records.length}:null;}, async all(){if(fail)throw Error('offline'); return {success:true,results:records};},async run(){if(fail)throw Error('offline'); return {success:true};}};
  }};
}
async function req(method='GET',body, options={}) {
  const headers={};
  if(options.auth!==false)headers.Cookie=`${SESSION_COOKIE}=${await createSession(user,secret)}`;
  if(method==='POST'){headers.Origin=options.origin??origin; headers['Content-Type']=options.type??'application/json';}
  return new Request(origin+(options.path??'/api/status'), {method,headers:{...headers,...options.headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
}
const read = response => response.json();
test('valid signed session preserves Discord identity and rejects wrong secret',async()=>{
  const request=await req(); assert.deepEqual(await getSession(request,env),user);
  assert.equal(await getSession(request,{SESSION_SECRET:'another-secret-of-at-least-32-characters'}),null);
});
test('tampered, malformed, unsigned and duplicate cookies are rejected',async()=>{
  const token=await createSession(user,secret);
  for(const value of [token.slice(0,-3)+'xxx','not.signed','%invalid','eyJ1c2VyX2lkIjoiMSJ9']){
    assert.equal(await getSession(new Request(origin,{headers:{Cookie:`${SESSION_COOKIE}=${value}`}}),env),null);
  }
  assert.equal(await getSession(new Request(origin,{headers:{Cookie:`${SESSION_COOKIE}=${token}; ${SESSION_COOKIE}=${token}`}}),env),null);
});
test('expired, future and overlong session lifetimes fail verification',async()=>{
  const now=Math.floor(Date.now()/1000);
  for(const times of [{iat:now-20,exp:now-1},{iat:now+90,exp:now+200},{iat:now,exp:now+SESSION_SECONDS+1}]){
    const token=await signPayload({...user,purpose:'session',...times},secret);
    assert.equal(await verifyPayload(token,secret,'session'),null);
  }
});
test('state token cannot be reused as a session',async()=>{
  const state=await createState(secret); assert.equal(await verifyPayload(state.token,secret,'session'),null);
});
test('anonymous POST is 401 and never touches D1',async()=>{
  const DB=database(); const response=await status({request:await req('POST',{conteudo:'a'},{auth:false}),env:{...env,DB}});
  assert.equal(response.status,401); assert.equal(DB.calls.length,0);
});
test('cross-origin and missing Origin POST fail before D1',async()=>{
  for(const headers of [{Origin:'https://evil.example'},{Origin:''}]){
    const DB=database();const response=await status({request:await req('POST',{conteudo:'a'},{headers}),env:{...env,DB}});
    assert.equal(response.status,403);assert.equal(DB.calls.length,0);
  }
});
test('strict payload validation rejects identity spoof, invalid JSON, blank and long values',async()=>{
  for(const body of [{conteudo:'a',userId:'999'}, {conteudo:'a',username:'attacker'}, {}, [], null, {conteudo:42}, {conteudo:'  '},{conteudo:'x'.repeat(501)},'{broken']){
    const DB=database(); const response=await status({request:await req('POST',body),env:{...env,DB}});
    assert.equal(response.status,400,JSON.stringify(body));assert.equal(DB.calls.length,0);
  }
});
test('unsupported content type and oversized request are rejected',async()=>{
  assert.equal((await status({request:await req('POST','hello',{type:'text/plain'}),env})).status,415);
  assert.equal((await status({request:await req('POST','x'.repeat(8193)),env})).status,413);
});
test('valid POST persists parameterized authenticated identity and trimmed content',async()=>{
  const DB=database();const response=await status({request:await req('POST',{conteudo:"  O'Brien <script>  "}),env:{...env,DB}});
  assert.equal(response.status,201);assert.equal((await read(response)).saved,true);
  assert.deepEqual(DB.calls[0].args,[user.user_id,user.username,'T26-3A-72FC-CE8A-AADA-5A53',"O'Brien <script>"]);
  assert.match(DB.calls[0].sql,/VALUES \(\?, \?, \?, \?\)/);
});
test('missing or failing D1 never reports a saved record',async()=>{
  for(const DB of [undefined,database({fail:true})]){
    const response=await status({request:await req('POST',{conteudo:'a'}),env:{...env,DB}});
    assert.equal(response.status,503);assert.equal((await read(response)).ok,false);
  }
});
test('GET filters counts and records by both authenticated user and project',async()=>{
  const records=[{id:1,user_id:user.user_id,conteudo:'note'}]; const DB=database({records});
  const response=await status({request:await req(),env:{...env,DB}});const data=await read(response);
  assert.deepEqual(data.sessionUser,user); assert.deepEqual(data.ultimosRegistros,records);assert.equal(data.totalRegistros,1);
  for(const call of DB.calls.slice(1)){assert.match(call.sql,/WHERE user_id = \? AND chave_projeto = \?/);assert.deepEqual(call.args,[user.user_id,'T26-3A-72FC-CE8A-AADA-5A53']);}
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('anonymous GET exposes no records; failed DB is reported honestly',async()=>{
  const DB=database({records:[{conteudo:'private'}]});const data=await read(await status({request:await req('GET',undefined,{auth:false}),env:{...env,DB}}));
  assert.equal(data.sessionUser,null);assert.deepEqual(data.ultimosRegistros,[]);assert.equal(data.totalRegistros,0);assert.equal(DB.calls.length,1);
  const failed=await read(await status({request:await req(),env:{...env,DB:database({fail:true})}}));assert.equal(failed.d1Connected,false);assert.deepEqual(failed.ultimosRegistros,[]);
});
test('unsupported methods return 405',async()=>{
  assert.equal((await status({request:await req('DELETE'),env})).status,405);
});
test('login refuses missing configuration and DB',async()=>{
  for(const badEnv of [{},{...env,SESSION_SECRET:'short'},env])assert.equal((await login({request:await req(),env:badEnv})).status,503);
});
test('login creates signed state bound to OAuth redirect and secure cookie',async()=>{
  const response=await login({request:await req(),env:{...env,DB:database()}});assert.equal(response.status,302);
  const url=new URL(response.headers.get('Location')); assert.equal(url.origin,'https://discord.com');assert.equal(url.searchParams.get('scope'),'identify');
  assert.equal(url.searchParams.get('redirect_uri'),origin+'/api/auth/discord/callback');
  const header=response.headers.get('Set-Cookie');for(const flag of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert.ok(header.includes(flag));
  const token=header.split(';')[0].split('=')[1];const payload=await verifyPayload(token,secret,'state');assert.equal(payload.nonce,url.searchParams.get('state'));
});
async function callbackRequest({state,queryState=state?.nonce,code='test-code',error}={}) {
  const url=new URL(origin+'/api/auth/discord/callback');if(queryState)url.searchParams.set('state',queryState);if(code)url.searchParams.set('code',code);if(error)url.searchParams.set('error',error);
  return new Request(url,{headers:state?{Cookie:`${STATE_COOKIE}=${state.token}`}:{}});
}
test('callback missing or mismatched state fails without contacting Discord',async()=>{
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
  try{for(const request of [await callbackRequest(),await callbackRequest({state:await createState(secret),queryState:'wrong'})]){
    const response=await callback({request,env:{...env,DB:database()}});assert.equal(response.headers.get('Location'),'/?auth_error=invalid_state');assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
  }assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('callback exchange imports real provider identity and produces valid signed session',async()=>{
  const original=globalThis.fetch;const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json(calls.length===1?{access_token:'fake-token'}:{id:user.user_id,username:'reader',global_name:user.username,avatar:null});};
  try{
    const DB=database();const response=await callback({request:await callbackRequest({state:await createState(secret)}),env:{...env,DB}});
    assert.equal(response.headers.get('Location'),'/?login=success');assert.equal(calls.length,2);assert.match(calls[0].url,/oauth2\/token$/);assert.equal(calls[1].options.headers.Authorization,'Bearer fake-token');
    assert.deepEqual(DB.calls[0].args,[user.user_id,user.username,user.avatar]);
    const cookies=response.headers.getSetCookie();const session=cookies.find(c=>c.startsWith(SESSION_COOKIE+'='));assert.ok(session);assert.match(session,/HttpOnly/);
    assert.deepEqual(await getSession(new Request(origin,{headers:{Cookie:session.split(';')[0]}}),env),user);
  }finally{globalThis.fetch=original;}
});
test('callback token rejection does not issue a session',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:401});
  try{const response=await callback({request:await callbackRequest({state:await createState(secret)}),env:{...env,DB:database()}});assert.equal(response.headers.get('Location'),'/?auth_error=token_exchange_failed');assert.ok(!response.headers.get('Set-Cookie').includes(SESSION_COOKIE));}finally{globalThis.fetch=original;}
});
test('callback denied or missing code stops before token exchange',async()=>{
  for(const options of [{error:'access_denied'},{code:null}]){
    const response=await callback({request:await callbackRequest({state:await createState(secret),...options}),env:{...env,DB:database()}});
    assert.equal(response.headers.get('Location'),options.error?'/?auth_error=access_denied':'/?auth_error=missing_code');
  }
});
test('logout requires same-origin POST and clears both secure cookies',async()=>{
  assert.equal((await logout({request:await req()})).status,405);
  assert.equal((await logout({request:await req('POST',undefined,{origin:'https://evil.example'})})).status,403);
  const response=await logout({request:await req('POST')});assert.equal(response.status,200);
  const cookies=response.headers.getSetCookie();assert.equal(cookies.length,2);for(const c of cookies){assert.match(c,/Max-Age=0/);assert.match(c,/HttpOnly/);assert.match(c,/Secure/);}
});
