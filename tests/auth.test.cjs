const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,create}=require('../assets/auth-core.js');
const config={url:'https://aaxkcatrdchkjtcniyev.supabase.co',key:'sb_publishable_fixture'},hash='a'.repeat(64);
const user={id:'11111111-1111-4111-8111-111111111111',email:'a@example.test',email_confirmed_at:'2026-01-01'};
function fixture(override){const calls=[];const flow=create(config,async(input,init)=>{const url=new URL(input),body=init.body?JSON.parse(init.body):null;calls.push({url,method:init.method,body,headers:init.headers,options:init});if(override){const reply=await override(url,init,body);if(reply)return reply;}
 if(url.pathname.endsWith('/verify'))return Response.json({access_token:'access',user});
 if(url.pathname.endsWith('/user'))return Response.json(user);
 if(url.pathname.endsWith('/logout'))return new Response(null,{status:204});
 return Response.json({});});return {flow,calls};}
test('first-party fragment links parse; forged origins, direct visits, query codes and ambiguous tokens cannot claim success',()=>{
 assert.equal(parse(`https://filmso.me/verified/#type=email&token_hash=${hash}`).kind,'signup');
 assert.equal(parse('https://filmso.me/reset-password/#type=recovery&access_token=legacy.jwt.token').kind,'recovery');
 for(const url of ['https://filmso.me/verified/','https://evil.test/verified/#type=email&token_hash='+hash,'https://filmso.me:444/verified/#type=email&token_hash='+hash,'https://filmso.me/verified/?code=anything',`https://filmso.me/verified/#type=email&type=recovery&token_hash=${hash}`,`https://filmso.me/verified/#type=email&token_hash=${hash}&access_token=anything`])assert.throws(()=>parse(url));
});
test('confirmation requires Auth verification and independently fetched confirmed user, then closes temporary session',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);const result=await f.flow.verify({kind:'signup',tokenHash:hash});assert.equal(result.email,user.email);
 assert.equal(f.calls[0].body.type,'email');assert.equal(f.calls[1].headers.Authorization,'Bearer access');await f.flow.close();assert.match(f.calls.at(-1).url.search,/scope=local/);
 for(const c of f.calls){assert.equal(c.options.credentials,'omit');assert.equal(c.options.redirect,'error');assert.equal(c.options.cache,'no-store');}
});
test('invalid or unconfirmed server identity never verifies; legacy tokens are checked rather than trusted',async()=>{
 const f=fixture((url)=>url.pathname.endsWith('/user')?Response.json({...user,email_confirmed_at:null}):null);await assert.rejects(f.flow.verify({kind:'signup',accessToken:'forged'}),/invalid_link/);assert(f.calls.some(c=>c.url.pathname.endsWith('/logout')));
 const legacy=fixture();await legacy.flow.verify({kind:'signup',accessToken:'legacy'});assert.equal(legacy.calls.length,1);assert.equal(legacy.calls[0].headers.Authorization,'Bearer legacy');await legacy.flow.close();
});
test('recovery rechecks owner and updates only its memory-held session; local cleanup follows success',async()=>{
 const f=fixture();await f.flow.verify({kind:'recovery',tokenHash:hash});await assert.rejects(f.flow.changePassword('short','short'),/password_length/);await assert.rejects(f.flow.changePassword('long-password','mismatch'),/password_mismatch/);
 await f.flow.changePassword('long-password','long-password');const update=f.calls.find(c=>c.method==='PUT');assert.deepEqual(update.body,{password:'long-password'});assert.equal(update.headers.Authorization,'Bearer access');assert.match(f.calls.at(-1).url.search,/scope=local/);await assert.rejects(f.flow.changePassword('again','again'),/invalid_link/);
});
test('confirmation tokens cannot change a password and cross-owner user responses fail closed',async()=>{
 const f=fixture();await f.flow.verify({kind:'signup',tokenHash:hash});await assert.rejects(f.flow.changePassword('long-password','long-password'),/invalid_link/);await f.flow.close();
 let owner=user;const g=fixture(url=>url.pathname.endsWith('/user')?Response.json(owner):null);await g.flow.verify({kind:'recovery',tokenHash:hash});owner={...user,id:'22222222-2222-4222-8222-222222222222'};await assert.rejects(g.flow.changePassword('long-password','long-password'),/invalid_link/);assert(!g.calls.some(c=>c.method==='PUT'));await g.flow.close();
});
test('unknown emails are neutral, SMTP/rate errors are visible, and redirects are fixed first-party URLs',async()=>{
 const f=fixture(url=>url.pathname.endsWith('/recover')||url.pathname.endsWith('/resend')?Response.json({code:'user_not_found'},{status:400}):null);await f.flow.send('signup',' A@EXAMPLE.TEST ');await f.flow.send('recovery','a@example.test');assert.equal(f.calls[0].body.email,'a@example.test');assert.equal(f.calls[0].url.searchParams.get('redirect_to'),'https://filmso.me/verified/');assert.equal(f.calls[1].url.searchParams.get('redirect_to'),'https://filmso.me/reset-password/');
 const g=fixture(()=>Response.json({code:'email_address_not_authorized'},{status:403}));await assert.rejects(g.flow.send('signup','a@example.test'),e=>e.code==='email_address_not_authorized');
});
test('closing during verification discards and revokes the late credential',async()=>{
 let release;const response=new Promise(r=>release=r);const f=fixture(url=>url.pathname.endsWith('/user')?response:null);const p=f.flow.verify({kind:'recovery',tokenHash:hash});await new Promise(r=>setImmediate(r));await f.flow.close();release(Response.json(user));await assert.rejects(p,/invalid_link/);assert(f.calls.some(c=>c.url.pathname.endsWith('/logout')));
});
test('cleanup transport failure cannot undo an already completed password update',async()=>{
 const f=fixture(url=>{if(url.pathname.endsWith('/logout'))throw Error('offline');return null;});await f.flow.verify({kind:'recovery',tokenHash:hash});await f.flow.changePassword('long-password','long-password');await assert.rejects(f.flow.changePassword('long-password','long-password'),/invalid_link/);
});
