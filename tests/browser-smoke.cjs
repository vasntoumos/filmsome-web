// Optional visual/DOM check: Playwright 1.62.1 + Chromium. All first-party and
// Auth requests are intercepted; this never sends a real email or password.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:'en-GB'});
  let failure=false,owner='11111111-1111-4111-8111-111111111111',puts=0,verifyCalls=0,mailCalls=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin==='https://filmso.me'){
    const file=path.resolve(__dirname,'..','.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(path.resolve(__dirname,'..')+path.sep))return route.abort();
    const data=await fs.readFile(file);const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';return route.fulfill({body:data,contentType:type});
   }
   if(u.origin!=='https://aaxkcatrdchkjtcniyev.supabase.co')return route.abort();
   const respond=(data,status=200)=>route.fulfill({status,json:data});
   const user={id:owner,email:'viewer@example.test',email_confirmed_at:'2026-01-01'};
   if(u.pathname.endsWith('/verify')){verifyCalls++;return failure?respond({code:'otp_expired'},403):respond({access_token:'fixture-access',user});}
   if(u.pathname.endsWith('/user')){if(route.request().method()==='PUT')puts++;return respond(user);}
   if(u.pathname.endsWith('/logout'))return route.fulfill({status:204,body:''});
   if(u.pathname.endsWith('/resend')||u.pathname.endsWith('/recover')){mailCalls++;return respond({});}
   return route.abort();
  });
  const expectVisible=async selector=>{await page.locator(selector).waitFor({state:'visible'});};
  await page.goto('https://filmso.me/verified/');await expectVisible('#request-form');assert.match(await page.locator('#headline').innerText(),/attention/);assert.equal(verifyCalls,0);
  await page.goto('https://filmso.me/verified/?code=forged');await expectVisible('#request-form');assert.equal(new URL(page.url()).search,'');assert(!await page.locator('#headline').innerText().then(s=>s.includes('confirmed')));
  await page.goto('https://filmso.me/verified/#type=email&token_hash='+'a'.repeat(64));await expectVisible('#continue');assert.equal(new URL(page.url()).hash,'');assert.equal(verifyCalls,0);
  await page.locator('#continue').click();await expectVisible('#return-app');assert.match(await page.locator('#headline').innerText(),/confirmed/);assert.equal(verifyCalls,1);
  await page.goto('https://filmso.me/reset-password/#type=recovery&token_hash='+'b'.repeat(64));await page.locator('#continue').click();await expectVisible('#password-form');
  await page.locator('#lang-fr').click();assert.equal(await page.locator('html').getAttribute('lang'),'fr');assert.match(await page.locator('#headline').innerText(),/mot de passe/);
  await page.locator('#password').fill('long-password');await page.locator('#confirmation').fill('mismatch-value');await page.locator('#save-password').click();await expectVisible('#error');assert.equal(puts,0);assert.match(await page.locator('#error').innerText(),/correspondent/);
  await page.locator('#confirmation').fill('long-password');await page.locator('#toggle-password').click();assert.equal(await page.locator('#password').getAttribute('type'),'text');
  await page.screenshot({path:'/tmp/filmsome-auth-reset-fr.png',fullPage:true});
  await page.locator('#save-password').click();await expectVisible('#return-app');assert.equal(puts,1);assert.match(await page.locator('#headline').innerText(),/modifié/);assert.equal(await page.locator('#password').inputValue(),'');
  failure=true;await page.goto('https://filmso.me/verified/#type=email&token_hash='+'c'.repeat(64));await page.locator('#continue').click();await expectVisible('#error');assert.match(await page.locator('#error').innerText(),/expired/);
  await page.locator('#email').fill('viewer@example.test');await page.locator('#resend').click();await page.waitForFunction(()=>document.getElementById('headline').textContent==='Check your email.');assert.equal(mailCalls,1);assert(await page.locator('#recover').isDisabled());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log('PASS: mobile-width browser confirmation/recovery, direct/forged/expired links, URL scrubbing, explicit verification, French password validation/show-hide, successful reset, cooldown and no horizontal overflow. All network mocked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
