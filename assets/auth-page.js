(function(){
 'use strict';
 var raw=window.__filmsomeEmailEntry;delete window.__filmsomeEmailEntry;
 var lang=(navigator.language||'').startsWith('fr')?'fr':'en',flow,link=null,state='invalid',email='',busy=false,show=false,error='',generation=0,cooldowns=new Map();
 var texts={
 en:{link:'Confirm your email',linkHelp:'Please confirm your email address to activate your film.some account.',recoveryLink:'Reset your password',recoveryLinkHelp:'Continue in your browser to set a new password, or open film.some.',invalid:'This link needs attention',invalidHelp:'Open a fresh link from your email. If you already confirmed your account, try logging in. You can request another email below.',reset:'Choose a new password',resetHelp:'Choose a new password for ',confirmed:'Email confirmed',confirmedHelp:'Your email has been verified. See you at the cinema.',done:'Your password is changed.',doneHelp:'Log in with your new password. This temporary browser session has been closed.',sent:'Check your email.',sentHelp:'If this address is eligible, an email is on its way. Check your inbox and spam folder.',continue:'Verify my email',continueRecovery:'Continue in this browser',open:'Open film.some',back:'Return to film.some',password:'New password',confirmation:'Confirm new password',show:'Show passwords',hide:'Hide passwords',passwordHelp:'Use at least 8 characters. Additional account password requirements also apply.',email:'Email address',resend:'Resend confirmation',recover:'Reset password',save:'Save new password',note:'If the app does not open, return to film.some on your iPhone. Password recovery also works here in the browser.',wait:'Try again in ',network:'Could not complete this request. Check your connection and try again.',expired:'This link is invalid or expired. Request a new email.',weak:'Choose a stronger password that meets the password policy.',same:'Choose a password different from your current password.',length:'Use at least 8 characters.',match:'The passwords do not match.',invalidEmail:'Enter a valid email address.',limit:'Too many email requests. Wait a little before trying again.',delivery:'Email delivery is temporarily unavailable. Please try again later.'},
 fr:{link:'Confirmez votre adresse e-mail',linkHelp:'Confirmez votre adresse e-mail pour activer votre compte film.some.',recoveryLink:'Réinitialisez votre mot de passe',recoveryLinkHelp:'Continuez dans ce navigateur pour choisir un nouveau mot de passe, ou ouvrez film.some.',invalid:'Ce lien nécessite votre attention',invalidHelp:'Ouvrez un nouveau lien reçu par e-mail. Si votre adresse est déjà confirmée, essayez de vous connecter. Vous pouvez demander un nouvel e-mail ci-dessous.',reset:'Choisir un nouveau mot de passe',resetHelp:'Choisissez un nouveau mot de passe pour ',confirmed:'Adresse e-mail confirmée',confirmedHelp:'Votre adresse e-mail a été vérifiée. À bientôt au cinéma.',done:'Votre mot de passe a été modifié.',doneHelp:'Connectez-vous avec le nouveau mot de passe. Cette session temporaire du navigateur a été fermée.',sent:'Consultez vos e-mails.',sentHelp:'Si cette adresse est éligible, un e-mail est en cours d’envoi. Consultez votre boîte de réception et vos indésirables.',continue:'Vérifier mon adresse e-mail',continueRecovery:'Continuer dans ce navigateur',open:'Ouvrir film.some',back:'Revenir dans film.some',password:'Nouveau mot de passe',confirmation:'Confirmer le nouveau mot de passe',show:'Afficher les mots de passe',hide:'Masquer les mots de passe',passwordHelp:'Utilisez au moins 8 caractères. Les autres exigences de sécurité du compte s’appliquent aussi.',email:'Adresse e-mail',resend:'Renvoyer la confirmation',recover:'Réinitialiser le mot de passe',save:'Enregistrer le mot de passe',note:'Si l’application ne s’ouvre pas, revenez dans film.some sur votre iPhone. La réinitialisation fonctionne aussi dans ce navigateur.',wait:'Réessayer dans ',network:'Impossible de terminer cette demande. Vérifiez votre connexion et réessayez.',expired:'Ce lien est invalide ou a expiré. Demandez un nouvel e-mail.',weak:'Choisissez un mot de passe plus robuste qui respecte les exigences de sécurité.',same:'Choisissez un mot de passe différent de l’actuel.',length:'Utilisez au moins 8 caractères.',match:'Les mots de passe ne correspondent pas.',invalidEmail:'Saisissez une adresse e-mail valide.',limit:'Trop de demandes d’e-mails. Patientez avant de réessayer.',delivery:'L’envoi des e-mails est momentanément indisponible. Réessayez plus tard.'}
 };
 var $=function(id){return document.getElementById(id);},t=function(k){return texts[lang][k];};
 function safeError(e){if(e.status===429)return 'limit';if(e.code==='email_address_not_authorized')return 'delivery';if(['otp_expired','otp_disabled'].includes(e.code)||e.message==='invalid_link'||[401,403].includes(e.status))return 'expired';if(e.code==='weak_password')return 'weak';if(e.code==='same_password')return 'same';if(e.message==='password_length')return 'length';if(e.message==='password_mismatch')return 'match';if(e.message==='email_invalid')return 'invalidEmail';return 'network';}
 function render(){
  document.documentElement.lang=lang;var title=state==='link'?(link&&link.kind==='recovery'?'recoveryLink':'link'):state==='reset'?'reset':state==='confirmed'?'confirmed':state==='done'?'done':state==='sent'?'sent':'invalid';
  $('headline').textContent=t(title);$('message').textContent=state==='reset'?t('resetHelp')+email:t(title+'Help');
  $('status-icon').textContent=['confirmed','done'].includes(state)?'✓':'✦';$('error').hidden=!error;$('error').textContent=error?t(error):'';
  $('link-actions').hidden=state!=='link';$('password-form').hidden=state!=='reset';$('request-form').hidden=['link','reset','confirmed','done'].includes(state);$('return-app').hidden=!['confirmed','done'].includes(state);
  [['continue','continue'],['open-app','open'],['return-app','back'],['password-label','password'],['confirmation-label','confirmation'],['password-help','passwordHelp'],['email-label','email'],['save-password','save'],['note','note']].forEach(function(pair){$(pair[0]).textContent=t(pair[1]);});
  $('continue').textContent=t(link&&link.kind==='recovery'?'continueRecovery':'continue');$('toggle-password').textContent=t(show?'hide':'show');$('password').type=$('confirmation').type=show?'text':'password';
  document.querySelectorAll('button,input').forEach(function(el){if(!el.id.startsWith('lang-'))el.disabled=busy;});
  ['en','fr'].forEach(function(l){$('lang-'+l).setAttribute('aria-pressed',String(l===lang));});
  var seconds=Math.max(0,Math.ceil(((cooldowns.get($('email').value.trim().toLowerCase())||0)-Date.now())/1000));
  ['resend','recover'].forEach(function(id){$(id).textContent=seconds?t('wait')+seconds+'s':t(id);$(id).disabled=busy||seconds>0;});
 }
 function receiveIncoming(url){
  generation++;if(flow)void flow.close();link=null;state='invalid';email='';busy=false;show=false;error='';$('password').value=$('confirmation').value='';$('open-app').removeAttribute('href');$('open-app').hidden=true;
  if(window.location.search||window.location.hash)window.history.replaceState(null,'',window.location.pathname);
  try{flow=window.FilmsomeEmail.create(window.FILMSOME_AUTH,window.fetch.bind(window));try{link=window.FilmsomeEmail.parse(url);state='link';}catch(e){error='expired';}
   if(link&&link.tokenHash){$('open-app').href='filmsome://auth/confirm#type='+encodeURIComponent(link.kind==='recovery'?'recovery':'email')+'&token_hash='+encodeURIComponent(link.tokenHash);$('open-app').hidden=false;}
  }catch(e){error='network';}
  render();
 }
 receiveIncoming(raw);raw=null;
 window.addEventListener('hashchange',function(){receiveIncoming(window.location.href);});
 $('continue').addEventListener('click',async function(){if(busy||!flow||!link)return;busy=true;error='';render();$('open-app').removeAttribute('href');$('open-app').hidden=true;
  var run=++generation,currentFlow=flow,currentLink=link;
  try{var verified=await currentFlow.verify(currentLink);if(run!==generation)return;email=verified.email;state=verified.kind==='recovery'?'reset':'confirmed';link=null;if(state==='confirmed')await currentFlow.close();}
  catch(e){if(run===generation){state='invalid';link=null;error=safeError(e);}}finally{if(run===generation){busy=false;render();}}
 });
 $('password-form').addEventListener('submit',async function(event){event.preventDefault();if(busy||state!=='reset')return;busy=true;error='';render();
  var run=++generation,currentFlow=flow;
  try{await currentFlow.changePassword($('password').value,$('confirmation').value);if(run!==generation)return;$('password').value=$('confirmation').value='';state='done';}
  catch(e){if(run===generation){error=safeError(e);if(error==='expired'){state='invalid';$('password').value=$('confirmation').value='';void currentFlow.close();}}}
  finally{if(run===generation){busy=false;render();}}
 });
 $('request-form').addEventListener('submit',async function(event){event.preventDefault();if(busy||!flow)return;var email=$('email').value.trim().toLowerCase(),action=event.submitter&&event.submitter.dataset.action==='signup'?'signup':'recovery';
  if((cooldowns.get(email)||0)>Date.now())return;cooldowns.set(email,Date.now()+60000);busy=true;error='';render();
  var run=++generation,currentFlow=flow;
  try{await currentFlow.send(action,email);if(run===generation)state='sent';}catch(e){if(run===generation)error=safeError(e);}finally{if(run===generation){busy=false;render();}}
 });
 $('email').addEventListener('input',render);$('toggle-password').addEventListener('click',function(){show=!show;render();});
 ['en','fr'].forEach(function(l){$('lang-'+l).addEventListener('click',function(){lang=l;render();});});
 window.addEventListener('pagehide',function(){generation++;$('password').value=$('confirmation').value='';link=null;$('open-app').removeAttribute('href');if(flow)void flow.close();});
 window.addEventListener('pageshow',function(event){if(event.persisted)receiveIncoming(window.location.href);});
 setInterval(render,1000);render();
})();
