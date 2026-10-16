const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const L=require('../scripts/scenery-lib.cjs');
const {acceptsGameKeys}=require('../engine.js');

function art(fill=(x,y)=>x>40&&x<120&&y>60?[120,160,90,255]:[0,0,0,0]){const rgba=Buffer.alloc(160*160*4);for(let y=0;y<160;y++)for(let x=0;x<160;x++)rgba.set(fill(x,y),(y*160+x)*4);return L.encodePng(160,160,rgba)}
const URL1='https://github.com/user-attachments/assets/0f9c8a59-2b0a-4c41-9a0e-2d5a3b1c7e11';
const body=(o={})=>`### 作品名称\n\n${o.title??'夜里的灯'}\n\n### 像素 PNG\n\n${o.image??`![PixelWalk](${URL1})`}\n\n### 展示时段\n\n${o.phase??'夜景'}\n\n### 体积\n\n${o.size??'中'}\n\n### 摆放方式\n\n${o.place??'空中'}\n\n### 素材来源\n\n${o.source??'原创'}\n\n### 确认\n\n${o.confirm??`- [X] ${L.CONSENT}\n- [X] ${L.POLICY}`}\n`;

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
 assert.deepEqual(L.parseIssue(body()),{title:'夜里的灯',phase:'night',size:'medium',airborne:true,imageUrl:URL1,source:'原创',errors:[]});
 assert.equal(L.parseIssue(body({title:'<script>a</script>'+'x'.repeat(80)})).title.includes('<'),false);
 assert.ok(L.parseIssue(body({image:'nothing'})).errors.length);
 assert.ok(L.parseIssue(body({image:`${URL1} https://github.com/user-attachments/assets/1f9c8a59-2b0a-4c41-9a0e-2d5a3b1c7e11`})).errors.some(e=>e.includes('一张')));
 assert.ok(L.parseIssue(body({image:'![x](https://evil.example/a.png)'})).errors.length);
 assert.ok(L.parseIssue(body({phase:'_No response_'})).errors.length);
});

test('giant issue dimensions survive approval and publication with a safe legacy default',()=>{
 assert.equal(L.parseIssue(body({size:'巨大'})).extent,480);
 const giantBody=body({size:'巨大'})+'\n### 巨大作品尺寸\n\n960\n';
 assert.equal(L.parseIssue(giantBody).extent,960);
 for(const bad of ['961','0','480.5','hello'])assert.ok(L.parseIssue(body({size:'巨大'})+'\n### 巨大作品尺寸\n\n'+bad).errors.some(e=>e.includes('巨大作品尺寸')));
 const p=pipeline(),event=p.ev('lin','/approve');event.issue.body=giantBody;p.run('review',event);
 assert.equal(p.manifest().items[0].extent,960);p.run('publish');
 assert.equal(L.content(p.manifest()).scenery[0].extent,960);
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
 fs.copyFileSync(path.join(__dirname,'../settings.js'),path.join(dir,'settings.js'));
 const png=art(),calls=path.join(dir,'calls.json');fs.writeFileSync(calls,'[]');
 const comments=path.join(dir,'comments.json');fs.writeFileSync(comments,'[]');
 const mock=path.join(dir,'mock.cjs');
 fs.writeFileSync(mock,`const fs=require('fs');const perms=${JSON.stringify({lin:'admin',helper:'write',stranger:'read'})};
 globalThis.fetch=async(url,opt={})=>{const log=JSON.parse(fs.readFileSync(${JSON.stringify(calls)}));log.push({url,method:opt.method||'GET',body:opt.body&&JSON.parse(opt.body)});fs.writeFileSync(${JSON.stringify(calls)},JSON.stringify(log));
  if(process.env.FAIL_ROUTE&&url.includes(process.env.FAIL_ROUTE)&&(!process.env.FAIL_METHOD||opt.method===process.env.FAIL_METHOD))return {ok:false,status:Number(process.env.FAIL_STATUS||404),text:async()=>'test API failure'};
  if(url.includes('user-attachments')&&process.env.REDIRECT_URL)return {ok:false,status:302,headers:{get:()=>process.env.REDIRECT_URL}};
  if(url.includes('user-attachments')||url===process.env.STORAGE_PNG_URL){const b=Buffer.from(${JSON.stringify(png.toString('base64'))},'base64');return {ok:true,status:200,url,body:[b]}}
  const m=url.match(/collaborators\\/([^/]+)\\/permission/);if(m)return {ok:true,status:200,json:async()=>({permission:perms[m[1]]||'none'})};
  if(opt.method==='GET'&&/issues\\/7$/.test(url))return {ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(process.env.CURRENT_ISSUE||process.env.GITHUB_EVENT_PATH)).issue};
  if(url.includes('/comments?'))return {ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(${JSON.stringify(comments)}))};
  if(url.endsWith('/comments')&&opt.method==='POST'){const list=JSON.parse(fs.readFileSync(${JSON.stringify(comments)}));list.push({user:{login:'github-actions[bot]'},body:JSON.parse(opt.body).body});fs.writeFileSync(${JSON.stringify(comments)},JSON.stringify(list))}
  return {ok:true,status:201,json:async()=>({})}};`);
 const run=(cmd,event,extra={})=>{const ev=path.join(dir,'event.json');if(event)fs.writeFileSync(ev,JSON.stringify(event));const out=path.join(dir,'out.txt');fs.writeFileSync(out,'');
  const r=spawnSync(process.execPath,['--require',mock,path.join(dir,'scripts/scenery.cjs'),cmd],{env:{...process.env,GITHUB_REPOSITORY:'JilinJL/PixelWalk',GITHUB_TOKEN:'t',GITHUB_EVENT_PATH:ev,GITHUB_OUTPUT:out,...extra},encoding:'utf8'});
  assert.equal(r.status,Number(extra.EXPECT_STATUS||0),r.stderr);if(r.status)return r;return Object.fromEntries(fs.readFileSync(out,'utf8').trim().split('\n').filter(Boolean).map(l=>l.split('=')))};
 const ev=(by,text,author='alice')=>({issue:{number:7,body:body(),state:'open',labels:[{name:'scenery'}],user:{login:author,id:42,type:'User'}},comment:{body:text,user:{login:by}}});
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
 assert.equal(p.run('publish').changed,'true','deployment not confirmed: retry');
 p.run('announce',null,{ISSUES:'7'});assert.ok(p.log().some(c=>c.method==='PATCH'&&c.body.state==='closed'));
 assert.equal(p.run('publish').changed,'false');
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


test('source and both consent checkboxes are enforced even for a manually created issue',()=>{
 assert.ok(L.parseIssue(body({source:''})).errors.some(e=>e.includes('来源')));
 assert.ok(L.parseIssue(body({confirm:''})).errors.some(e=>e.includes('勾选')));
 assert.ok(L.parseIssue(body({confirm:`- [ ] ${L.CONSENT}\n- [X] ${L.POLICY}`})).errors.length);
});

test('current issue body and state replace the stale webhook snapshot',()=>{
 const p=pipeline(),current=path.join(p.dir,'current.json'),event=p.ev('helper','/APPROVE');
 fs.writeFileSync(current,JSON.stringify({...event,issue:{...event.issue,body:body({title:'最新作品'})}}));
 p.run('review',event,{CURRENT_ISSUE:current});assert.equal(p.manifest().items[0].title,'最新作品');
 assert.equal(p.manifest().items[0].source,'原创');assert.match(p.manifest().items[0].sha256,/^[a-f0-9]{64}$/);
 fs.writeFileSync(current,JSON.stringify({...event,issue:{...event.issue,state:'closed'}}));
 assert.equal(p.run('review',event,{CURRENT_ISSUE:current}).changed,'false');
});

test('API write failures fail the job; missing labels and absent reviewers are allowed',()=>{
 const p=pipeline();
 assert.equal(p.run('review',p.ev('helper','/approve'),{FAIL_ROUTE:'/permission',FAIL_STATUS:'404'}).changed,'false');
 p.run('review',p.ev('helper','/approve'),{FAIL_ROUTE:'/labels/pending-review',FAIL_STATUS:'404'});
 const failed=p.run('review',p.ev('helper','/approve'),{FAIL_ROUTE:'/comments',EXPECT_STATUS:'1'});
 assert.match(failed.stderr,/404/);
});

test('reject removes queued snapshots; published snapshots require explicit repository removal',()=>{
 const p=pipeline();p.run('review',p.ev('helper','/approve'));p.run('publish');
 assert.equal(p.run('review',p.ev('lin','/reject')).changed,'false');
 assert.equal(p.manifest().items[0].status,'published');
});

test('announcement retries do not duplicate comments after a later close failure',()=>{
 const p=pipeline();p.run('review',p.ev('helper','/approve'));p.run('publish');
 p.run('announce',null,{ISSUES:'7',FAIL_ROUTE:'/issues/7',FAIL_METHOD:'PATCH',EXPECT_STATUS:'1'});
 assert.ok(!p.manifest().items[0].announcedAt);
 assert.equal(p.run('publish').changed,'true');
 p.run('announce',null,{ISSUES:'7'});
 assert.equal(p.log().filter(c=>c.method==='POST'&&c.body?.body?.includes('pixelwalk-published:7')).length,1);
 assert.ok(p.manifest().items[0].announcedAt);
});

test('attachment redirects are validated before fetching the destination',()=>{
 const p=pipeline();
 assert.equal(p.run('review',p.ev('helper','/approve'),{REDIRECT_URL:'http://127.0.0.1/private'}).changed,'false');
 assert.ok(!p.log().some(c=>c.url.startsWith('http://127.0.0.1')));
 assert.ok(p.log().some(c=>c.body?.body?.includes('附件域名')));
});

test('truncated headers and missing PNG terminators are rejected as validation errors',()=>{
 const good=art();
 for(const bad of [good.subarray(0,good.length-12),Buffer.concat([good,Buffer.from('junk')])])assert.throws(()=>L.sanitizePng(bad),e=>e.userFacing===true);
 const header=Buffer.alloc(13);const short=Buffer.concat([good.subarray(0,8),header]);
 assert.throws(()=>L.sanitizePng(short),e=>e.userFacing===true);
});


test('write authors cannot self-review; administrators have the documented exception',()=>{
 const p=pipeline();
 assert.equal(p.run('review',p.ev('helper','/approve','helper')).changed,'false');
 assert.ok(!fs.existsSync(path.join(p.dir,'scenery/manifest.json')));
 assert.equal(p.run('review',p.ev('lin','/approve','lin')).changed,'true');
});

test('one publish batch promotes every queued artwork and retries all unannounced candidates',()=>{
 const p=pipeline();p.run('review',p.ev('helper','/approve'));
 const file=path.join(p.dir,'scenery/manifest.json'),m=p.manifest();m.items.push({...m.items[0],issue:8});fs.writeFileSync(file,JSON.stringify(m));
 assert.equal(p.run('publish').issues,'7 8');
 assert.ok(p.manifest().items.every(i=>i.status==='published'));
 assert.equal(p.run('publish').issues,'7 8');
});

test('GitHub attachment storage redirect is accepted, arbitrary buckets remain blocked',()=>{
 const url='https://github-production-user-asset-6210df.s3.amazonaws.com/example.png';
 const p=pipeline();
 assert.equal(p.run('review',p.ev('helper','/approve'),{REDIRECT_URL:url,STORAGE_PNG_URL:url}).changed,'true');
 assert.ok(p.log().some(c=>c.url===url));
 for(const bad of ['https://attacker.s3.amazonaws.com/example.png','https://github-production-user-asset-6210df.s3.amazonaws.com.evil.example/file']){
  const q=pipeline();
  assert.equal(q.run('review',q.ev('helper','/approve'),{REDIRECT_URL:bad}).changed,'false');
  assert.ok(!q.log().some(c=>c.url===bad));
 }
});
