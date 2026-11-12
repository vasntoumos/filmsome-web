const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('landing page renders actual optimized product screenshots',()=>{
  for(const name of ['invites','activity','home-programme','selected-screening']){
    assert(home.includes('./assets/screenshots/'+name+'.webp'),name+' missing from homepage');
    assert(fs.statSync(path.join(root,'assets','screenshots',name+'.webp')).size>1000);
  }
  assert(home.includes('data-screenshot-carousel'));
  assert(home.includes('data-carousel-next'));
  assert(home.includes('data-carousel-prev'));
});
test('landing keeps brand, contact and legal paths',()=>{
  assert(home.includes('you. a film.someone else.'));
  for(const p of ['/privacy/','/terms/','/contact/','/delete-account/'])assert(home.includes(p));
});
test('landing carousel remains lightweight and user-controlled',()=>{
  const js=fs.readFileSync(path.join(root,'assets/carousel.js'),'utf8');
  assert(js.includes('scrollTo'));
  assert(!js.includes('setInterval('));
  const css=fs.readFileSync(path.join(root,'assets/landing.css'),'utf8');
  assert(css.includes('scroll-snap-type'));
  assert(css.includes('prefers-reduced-motion'));
});

test('French landing has localized navigation, screen captions, and working paths',()=>{
  const fr=fs.readFileSync(path.join(root,'fr','index.html'),'utf8');
  assert.match(home,/href="\/fr\/" lang="fr"/);
  assert.match(fr,/<html lang="fr">/);
  assert.match(fr,/href="\/" lang="en"/);
  assert.match(fr,/aria-current="page" aria-label="Français, langue actuelle"/);
  assert.match(fr,/href="\/privacy\/\?lang=fr"/);
  assert.match(fr,/id="beta-waitlist-form"/);
  assert.match(fr,/data-screenshot-carousel/);
  assert.match(fr,/le bon film passe déjà quelque part/);
  assert.doesNotMatch(fr,/<a href="#how-it-works">How it works<\/a>/);
  for(const name of ['invites','activity','home-programme','selected-screening']) {
    assert(fr.includes('/assets/screenshots/'+name+'.webp'));
  }
});
