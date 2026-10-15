const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const L=require('../scripts/scenery-lib.cjs');
const {acceptsGameKeys}=require('../engine.js');

function art(fill=(x,y)=>x>40&&x<120&&y>60?[120,160,90,255]:[0,0,0,0]){const rgba=Buffer.alloc(160*160*4);for(let y=0;y<160;y++)for(let x=0;x<160;x++)rgba.set(fill(x,y),(y*160+x)*4);return L.encodePng(160,160,rgba)}
const URL1='https://github.com/user-attachments/assets/0f9c8a59-2b0a-4c41-9a0e-2d5a3b1c7e11';
const body=(o={})=>`### 作品名称\n\n${o.title??'夜里的灯'}\n\n### 像素 PNG\n\n${o.image??`![PixelWalk](${URL1})`}\n\n### 展示时段\n\n${o.phase??'夜景'}\n\n### 体积\n\n${o.size??'中'}\n\n### 摆放方式\n\n${o.place??'空中'}\n\n### 素材来源\n\n原创\n`;

test('D works after clicking toolbar buttons or before focusing the canvas; typing is left alone',()=>{
 assert.equal(acceptsGameKeys(null,false),true);
 assert.equal(acceptsGameKeys({tagName:'BODY'},false),true);
 assert.equal(acceptsGameKeys({tagName:'BUTTON'},false),true);
 assert.equal(acceptsGameKeys({tagName:'CANVAS'},false),true);
 assert.equal(acceptsGameKeys({tagName:'INPUT',type:'range'},false),true);
 assert.equal(acceptsGameKeys({tagName:'INPUT',type:'text'},false),false);
 assert.equal(acceptsGameKeys({tagName:'INPUT',type:'search'},false),false);
 assert.equal(acceptsGameKeys({tagName:'TEXTAREA'},false),false);
 assert.equal(acceptsGameKeys({tagName:'CANVAS'},true),false);
});

test('issue form parses into a scenery entry',()=>{
 assert.deepEqual(L.parseIssue(body()),{title:'夜里的灯',phase:'night',size:'medium',airborne:true,imageUrl:URL1,errors:[]});
 assert.equal(L.parseIssue(body({title:'<script>a</script>'+'x'.repeat(80)})).title.includes('<'),false);
 assert.ok(L.parseIssue(body({image:'nothing'})).errors.length);
 assert.ok(L.parseIssue(body({image:`${URL1} https://github.com/user-attachments/assets/1f9c8a59-2b0a-4c41-9a0e-2d5a3b1c7e11`})).errors.some(e=>e.includes('一张')));
 assert.ok(L.parseIssue(body({image:'![x](https://evil.example/a.png)'})).errors.length);
 assert.ok(L.parseIssue(body({phase:'_No response_'})).errors.length);
});

test('PNG validation accepts game output and rejects wrong size, opaque or junk files',()=>{
 const clean=L.sanitizePng(art());assert.deepEqual(L.decodePng(clean).width,160);
 assert.throws(()=>L.sanitizePng(L.encodePng(16,16,Buffer.alloc(16*16*4))),/160×160/);
 assert.throws(()=>L.sanitizePng(art(()=>[1,2,3,255])),/透明/);
 assert.throws(()=>L.sanitizePng(art(()=>[0,0,0,0])),/空/);
 assert.throws(()=>L.sanitizePng(Buffer.from('GIF89a')),/PNG/);
 const broken=Buffer.from(art());broken[40]^=255;assert.throws(()=>L.sanitizePng(broken),/校验|解压/);
 // Semi-transparent edges snap to the binary alpha the renderer uses.
 const soft=L.decodePng(L.sanitizePng(art((x,y)=>x<80?[9,9,9,200]:[9,9,9,40]))).rgba;assert.equal(soft[3],255);assert.equal(soft[(100)*4+3],0);
});

test('content lists only published scenery and dedupes contributors by GitHub id',()=>{
 const m={version:1,items:[
  {issue:3,login:'alice',userId:1,title:'a',phase:'day',size:'small',airborne:false,file:'scenery/images/gh-3.png',status:'published',publishedAt:'2026-10-15T01:00:00Z'},
  {issue:4,login:'alice',userId:1,title:'b',phase:'night',size:'large',airborne:true,file:'scenery/images/gh-4.png',status:'published',publishedAt:'2026-10-15T01:00:00Z'},
  {issue:5,login:'bob',userId:2,title:'c',phase:'day',size:'small',airborne:false,file:'scenery/images/gh-5.png',status:'queued'}]};
 const c=L.content(m);
 assert.deepEqual(c.contributors,[{userId:1,name:'alice',github:'alice'}]);
 assert.deepEqual(c.scenery.map(s=>s.id),['gh-3','gh-4']);
 assert.equal(c.scenery[0].author,'@alice');
 assert.ok(!L.contentJs({contributors:[],scenery:[{title:'</script>'}]}).includes('</script>'));
});

// End-to-end: run the real CLI against a temp repo with a mocked GitHub API.
function pipeline(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pw-'));fs.mkdirSync(path.join(dir,'scripts'));
 for(const f of ['scenery.cjs','scenery-lib.cjs'])fs.copyFileSync(path.join(__dirname,'../scripts',f),path.join(dir,'scripts',f));
 const png=art(),calls=path.join(dir,'calls.json');fs.writeFileSync(calls,'[]');
 const mock=path.join(dir,'mock.cjs');
 fs.writeFileSync(mock,`const fs=require('fs');const perms=${JSON.stringify({lin:'admin',helper:'write',stranger:'read'})};
 globalThis.fetch=async(url,opt={})=>{const log=JSON.parse(fs.readFileSync(${JSON.stringify(calls)}));log.push({url,method:opt.method||'GET',body:opt.body&&JSON.parse(opt.body)});fs.writeFileSync(${JSON.stringify(calls)},JSON.stringify(log));
  if(url.includes('user-attachments')){const b=Buffer.from(${JSON.stringify(png.toString('base64'))},'base64');return {ok:true,status:200,url,body:[b]}}
  const m=url.match(/collaborators\\/([^/]+)\\/permission/);if(m)return {ok:true,status:200,json:async()=>({permission:perms[m[1]]||'none'})};
  return {ok:true,status:201,json:async()=>({})}};`);
 const run=(cmd,event,extra={})=>{const ev=path.join(dir,'event.json');if(event)fs.writeFileSync(ev,JSON.stringify(event));const out=path.join(dir,'out.txt');fs.writeFileSync(out,'');
  const r=spawnSync(process.execPath,['--require',mock,path.join(dir,'scripts/scenery.cjs'),cmd],{env:{...process.env,GITHUB_REPOSITORY:'JilinJL/PixelWalk',GITHUB_TOKEN:'t',GITHUB_EVENT_PATH:ev,GITHUB_OUTPUT:out,...extra},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);return Object.fromEntries(fs.readFileSync(out,'utf8').trim().split('\n').filter(Boolean).map(l=>l.split('=')))};
 const ev=(by,text,author='alice')=>({issue:{number:7,body:body(),labels:[{name:'scenery'}],user:{login:author,id:42,type:'User'}},comment:{body:text,user:{login:by}}});
 const manifest=()=>JSON.parse(fs.readFileSync(path.join(dir,'scenery/manifest.json'),'utf8'));
 const log=()=>JSON.parse(fs.readFileSync(calls,'utf8'));
 return {dir,run,ev,manifest,log};
}

test('only collaborators can approve; approval queues, the 30-minute batch publishes all',()=>{
 const p=pipeline();
 assert.equal(p.run('review',p.ev('stranger','/approve')).changed,'false');
 assert.ok(!fs.existsSync(path.join(p.dir,'scenery/manifest.json')));
 assert.equal(p.run('review',p.ev('helper','/approve 很好看')).changed,'true');
 let m=p.manifest();assert.equal(m.items[0].status,'queued');assert.equal(m.items[0].login,'alice');assert.equal(m.items[0].approvedBy,'helper');
 assert.ok(fs.existsSync(path.join(p.dir,'scenery/images/gh-7.png')));
 assert.ok(!fs.readFileSync(path.join(p.dir,'content.js'),'utf8').includes('gh-7'),'queued items are not live yet');
 const out=p.run('publish');assert.equal(out.changed,'true');assert.equal(out.issues,'7');
 m=p.manifest();assert.equal(m.items[0].status,'published');
 const js=fs.readFileSync(path.join(p.dir,'content.js'),'utf8');assert.ok(js.includes('"github": "alice"'));assert.ok(js.includes('scenery/images/gh-7.png'));
 assert.equal(p.run('publish').changed,'false');
 p.run('announce',null,{ISSUES:'7'});assert.ok(p.log().some(c=>c.method==='PATCH'&&c.body.state==='closed'));
});

test('reject removes a queued item and authors cannot approve their own work',()=>{
 const p=pipeline();
 assert.equal(p.run('review',p.ev('alice','/approve','alice')).changed,'false');
 p.run('review',p.ev('helper','/approve'));assert.equal(p.manifest().items.length,1);
 assert.equal(p.run('review',p.ev('lin','/reject 边缘再清理一下')).changed,'true');
 assert.equal(p.manifest().items.length,0);assert.ok(!fs.existsSync(path.join(p.dir,'scenery/images/gh-7.png')));
 assert.ok(p.log().some(c=>c.body?.labels?.includes('needs-changes')));
 assert.ok(p.log().some(c=>String(c.body?.body).includes('边缘再清理一下')));
});
