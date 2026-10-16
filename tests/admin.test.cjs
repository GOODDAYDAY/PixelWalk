'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../scripts/admin-lib.cjs'),L=require('../scripts/scenery-lib.cjs'),C=require('../settings.js');
const {createServer}=require('../scripts/admin-server.cjs');
const actor={id:A.OWNER_ID,login:'JilinJL'};
const base=()=>({sha:'base',manifest:{version:1,items:[]},settings:C.defaults,audit:[]});
function image(){const rgba=Buffer.alloc(160*160*4);for(let y=30;y<140;y++)for(let x=40;x<100;x++){const p=(y*160+x)*4;rgba[p]=220;rgba[p+1]=90;rgba[p+3]=255}return 'data:image/png;base64,'+L.encodePng(160,160,rgba).toString('base64')}
const upload=()=>({title:'灯塔',phase:'night',size:'large',airborne:false,source:'本人原创，允许分发',authorName:'画师',png:image()});
test('custom giant extent survives upload, edit and generated content; invalid sizes are rejected',()=>{
 const s=base(),r=A.apply(s,'upload',{...upload(),size:'giant',extent:960},actor),item=r.manifest.items[0];
 assert.equal(item.extent,960);assert.equal(L.content(r.manifest).scenery[0].extent,960);
 const edited=A.apply({...s,manifest:r.manifest},'edit',{...upload(),size:'giant',extent:640,id:item.id},actor);assert.equal(L.content(edited.manifest).scenery[0].extent,640);
 const smaller=A.apply({...s,manifest:edited.manifest},'edit',{...upload(),id:item.id},actor);assert.equal(Object.hasOwn(smaller.manifest.items[0],'extent'),false);
 for(const extent of [0,319,961,480.5,'960'])assert.throws(()=>A.apply(s,'upload',{...upload(),size:'giant',extent},actor),/巨大作品尺寸/);
});
test('owner console uploads, edits, archives and restores without losing the source or credit',()=>{
 const s=base(),r=A.apply(s,'upload',upload(),actor);assert.equal(s.manifest.items.length,0);assert.equal(r.manifest.items.length,1);const item=r.manifest.items[0];assert.match(item.id,/^admin-/);assert.ok(A.IMAGE.test(item.file));assert.equal(L.content(r.manifest).scenery[0].author,'画师');assert.equal(L.content(r.manifest).contributors[0].name,'画师');assert.equal(L.content(r.manifest).contributors[0].github,'');
 const next={...s,manifest:r.manifest},archived=A.apply(next,'archive',{id:item.id},actor);assert.equal(L.content(archived.manifest).scenery.length,0);assert.equal(archived.manifest.items[0].file,item.file);assert.ok(!Object.values(archived.files).includes(null));
 const restored=A.apply({...s,manifest:archived.manifest},'restore',{id:item.id},actor);assert.equal(L.content(restored.manifest).scenery.length,1);
 const edited=A.apply({...s,manifest:restored.manifest},'edit',{...upload(),id:item.id,title:'新灯塔'},actor);assert.equal(edited.manifest.items[0].title,'新灯塔');assert.notEqual(edited.manifest.items[0].file,item.file);assert.ok(A.IMAGE.test(edited.manifest.items[0].file));
});
test('settings and uploads reject non-owner, invalid ranges, unknown keys, opaque files and missing source',()=>{
 assert.throws(()=>A.apply(base(),'upload',upload(),{id:1,login:'other'}),/仅/);
 assert.throws(()=>A.apply(base(),'settings',{settings:{speed:999}},actor),/行走速度/);
 assert.throws(()=>A.apply(base(),'settings',{settings:{admin:true}},actor),/未知/);
 assert.throws(()=>A.apply(base(),'upload',{...upload(),source:''},actor),/来源/);
 const rgba=Buffer.alloc(160*160*4,255);assert.throws(()=>A.pngData('data:image/png;base64,'+L.encodePng(160,160,rgba).toString('base64')),/透明/);
 const r=A.apply(base(),'settings',{settings:{speed:120,scenesPerPhase:3}},actor);assert.equal(JSON.parse(r.files['scenery/config.json']).speed,120);assert.ok(r.files['world-settings.js'].includes('"scenesPerPhase":3'));
});
test('built-in scenery can be hidden without being reintroduced by an empty phase fallback',()=>{
 let s=base();const {builtinCatalog,World}=require('../engine.js');
 for(const item of builtinCatalog){const r=A.apply(s,'builtin',{id:item.id,hidden:true},actor);s={...s,manifest:r.manifest}}
 assert.equal(L.content(s.manifest).disabledBuiltins.length,10);const w=new World({catalog:[]});for(let i=0;i<1000;i++)w.update(.05,{right:true});assert.equal(w.scenes.length,0);assert.ok(Number.isFinite(w.environment().night));
 const r=A.apply(s,'builtin',{id:'cat',hidden:false},actor);assert.equal(L.content(r.manifest).disabledBuiltins.length,9);
});
test('loopback API checks Host, same-origin CSRF and stale commits before any write',async t=>{
 let writes=0;const server=createServer({owner:async()=>actor,state:async()=>base(),commit:async()=>{writes++;return {sha:'new'}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const origin='http://127.0.0.1:'+server.address().port;
 const session=await (await fetch(origin+'/api/session')).json();assert.ok(session.token);
 const badHost=await new Promise((resolve,reject)=>{require('node:http').get(origin+'/api/state',{headers:{Host:'evil.test'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)});assert.equal(badHost,403);
 assert.equal((await fetch(origin+'/api/state',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 assert.equal((await fetch(origin+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 const headers={'Content-Type':'application/json',Origin:origin,'X-Admin-Token':session.token};
 assert.equal((await fetch(origin+'/api/action',{method:'POST',headers,body:JSON.stringify({action:'settings',sha:'old',settings:{speed:90}})})).status,409);assert.equal(writes,0);
 const ok=await fetch(origin+'/api/action',{method:'POST',headers,body:JSON.stringify({action:'settings',sha:'base',settings:{speed:90}})});assert.equal(ok.status,200);assert.equal(writes,1);
 assert.equal((await fetch(origin+'/admin/')).status,200);assert.equal((await fetch(origin+'/admin/admin.js')).status,200);assert.equal((await fetch(origin+'/package.json')).status,404);
});
test('published settings change actual speed, phase grouping and airborne placement',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),context={PixelWalkSettings:{speed:120,scenesPerPhase:2,airborneOffset:40}};context.globalThis=context;vm.createContext(context);
 for(const f of ['settings.js','engine.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8'),context);
 const w=vm.runInContext('new PixelWalk.World()',context);for(let i=0;i<20;i++)w.update(.05,{right:true});assert.equal(w.x,120);assert.equal(w.scenes.find(s=>s.ordinal===3).phase,'night');assert.equal(context.PixelWalk.placement({size:'small',airborne:true}).y,328);
});
