const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const path=require('node:path');

test('filmso.me Apple Passwords association uses exactly our signed iOS app ID',()=>{
 const aasaPath=path.join(__dirname,'..','.well-known','apple-app-site-association');
 assert(statSync(aasaPath).isFile());
 assert.equal(path.extname(aasaPath),'','AASA filename must have no extension');
 const content=readFileSync(aasaPath,'utf8');
 const data=JSON.parse(content);
 assert.deepEqual(data,{
   webcredentials:{apps:['YNA6658FHM.me.filmso.app']}
 });
 assert(!('applinks' in data),'do not accidentally turn on universal links');
 assert(!('activitycontinuation' in data));
});
test('GitHub Pages will not run Jekyll and remove the dot-prefixed verification path',()=>{
 assert(statSync(path.join(__dirname,'..','.nojekyll')).isFile());
});
