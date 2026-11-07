(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FilmsomeEmail=factory();})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 function parse(raw){
  var u=new URL(raw);if(u.protocol!=='https:'||u.hostname!=='filmso.me'||u.port||u.username||u.password||!['/verified/','/reset-password/','/auth/confirm/'].includes(u.pathname))throw Error('invalid_link');
  var p=new URLSearchParams(u.hash.slice(1));
  if(u.search||p.has('error')||p.has('error_code')||p.has('error_description'))throw Error('invalid_link');
  var type=p.get('type');if(!['email','signup','recovery'].includes(type))throw Error('invalid_link');
  var kind=type==='recovery'?'recovery':'signup',hash=p.get('token_hash'),access=p.get('access_token');
  if(hash&&/^[-_a-zA-Z0-9]{20,512}$/.test(hash)&&p.getAll('token_hash').length===1&&p.getAll('type').length===1&&!access)return {kind:kind,tokenHash:hash};
  // Compatibility with already-issued implicit confirmation URLs. Verify the
  // bearer with Auth; never assume a query code/token is proof of success.
  if(access&&access.length<8192&&/^[\w.-]+$/.test(access)&&p.getAll('access_token').length===1&&p.getAll('type').length===1&&!hash)return {kind:kind,accessToken:access};
  throw Error('invalid_link');
 }
 function create(config,fetcher){
  if(config.url!=='https://aaxkcatrdchkjtcniyev.supabase.co'||!/^sb_publishable_/.test(config.key))throw Error('configuration');
  var token=null,owner=null,kind=null,closed=false;
  async function request(path,method,body,bearer){
   var abort=new AbortController(),timer=setTimeout(function(){abort.abort();},15000);
   try{
    var response=await fetcher(config.url+'/auth/v1/'+path,{method:method,headers:{apikey:config.key,'Content-Type':'application/json',Authorization:'Bearer '+(bearer||config.key)},body:body?JSON.stringify(body):undefined,signal:abort.signal,credentials:'omit',redirect:'error',cache:'no-store'});
    var text=await response.text();if(text.length>262144)throw Error('network');
    var data=text?JSON.parse(text):{};
    if(!response.ok){var e=Error('request');e.code=data.code||data.error_code;e.status=response.status;throw e;}
    return data;
   }finally{clearTimeout(timer);}
  }
  async function user(access){var u=await request('user','GET',null,access);if(!u.id||!u.email||!u.email_confirmed_at)throw Error('invalid_link');return u;}
  return {
   async verify(link){
    if(closed)throw Error('invalid_link');
    var candidate=link.accessToken;
    if(link.tokenHash){var data=await request('verify','POST',{token_hash:link.tokenHash,type:link.kind==='recovery'?'recovery':'email'});candidate=data.access_token;}
    if(!candidate)throw Error('invalid_link');
    try{var u=await user(candidate);if(closed){await request('logout?scope=local','POST',null,candidate).catch(function(){});throw Error('invalid_link');}token=candidate;owner=u.id;kind=link.kind;return {email:u.email,kind:kind};}
    catch(e){await request('logout?scope=local','POST',null,candidate).catch(function(){});throw e;}
   },
   async changePassword(password,confirmation){
    if(!token||!owner||kind!=='recovery'||closed)throw Error('invalid_link');
    if(password.length<8)throw Error('password_length');if(password!==confirmation)throw Error('password_mismatch');
    var u=await user(token);if(u.id!==owner)throw Error('invalid_link');
    var updated=await request('user','PUT',{password:password},token);
    if(updated.id!==owner)throw Error('invalid_link');
    await this.close();
   },
   async send(action,email){
    email=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('email_invalid');
    try{
     if(action==='recovery')await request('recover?redirect_to='+encodeURIComponent('https://filmso.me/reset-password/'),'POST',{email:email});
     else await request('resend?redirect_to='+encodeURIComponent('https://filmso.me/verified/'),'POST',{type:'signup',email:email});
    }catch(e){if(!['user_not_found','email_not_found','email_already_confirmed'].includes(e.code))throw e;}
   },
   async close(){var old=token;token=null;owner=null;closed=true;if(old)await request('logout?scope=local','POST',null,old).catch(function(){});}
  };
 }
 return {parse:parse,create:create};
});
