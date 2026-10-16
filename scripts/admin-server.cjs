'use strict';
/* Owner-only loopback console. GitHub credentials stay in gh's credential store. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const A=require('./admin-lib.cjs'),L=require('./scenery-lib.cjs'),C=require('../settings.js');
const root=path.resolve(__dirname,'..');
function gh(args,input){return new Promise((resolve,reject)=>{
 const p=execFile('gh',args,{encoding:'utf8',maxBuffer:12*1024*1024,timeout:60000},(error,stdout,stderr)=>{
  if(error)return reject(Error((stderr||'GitHub 请求失败，请检查 gh auth status').replace(/https:\/\/[^\s]+\?[^\s]+/g,'[GitHub URL]').slice(0,1200)));
  try{resolve(stdout.trim()?(args[0]==='api'?JSON.parse(stdout):stdout.trim()):null)}catch{reject(Error('GitHub 返回内容无法读取'))}
 });if(input!==undefined)p.stdin.end(JSON.stringify(input));else p.stdin.end();
})}
const api=(route,method='GET',body)=>gh(['api','repos/'+A.REPO+route,...(method!=='GET'?['--method',method]:[]),...(body!==undefined?['--input','-']:[])],body);
// Live site base used by /api/verify. Override with PIXELWALK_SITE_URL when the
// custom domain changes; the trailing slash is required because paths are appended.
const siteBase=(process.env.PIXELWALK_SITE_URL||'https://pixelwalk.fun/').replace(/\/+$/,'')+'/';
async function owner(){const user=await gh(['api','user']);if(user.id!==A.OWNER_ID)throw Error('当前 gh 账号为 '+user.login+'，请切换到 JilinJL：gh auth switch --user JilinJL');const repo=await api('');if(!repo.permissions?.admin)throw Error('主账号没有仓库管理权限');return {login:user.login,id:user.id}}
async function file(name,ref,optional=false){
 try{const f=await api('/contents/'+name+'?ref='+encodeURIComponent(ref));return Buffer.from(f.content,'base64')}
 catch(error){if(optional&&/404/.test(error.message))return null;throw error}
}
async function state(){
 const head=await api('/git/ref/heads/main'),ref=head.object.sha;
 const [m,c,a]=await Promise.all([file('scenery/manifest.json',ref),file('scenery/config.json',ref,true),file('scenery/admin-audit.json',ref,true)]);
 return {sha:ref,manifest:JSON.parse(m),settings:C.validate(c?JSON.parse(c):{}),audit:a?JSON.parse(a):[]};
}
async function busy(){const runs=await api('/actions/runs?per_page=50');return runs.workflow_runs.some(r=>['queued','in_progress','waiting','pending','requested'].includes(r.status)&&/Scenery (publish|review)/.test(r.name))}
async function commit(state,files,message){
 if(await busy())throw Error('审核或投放任务正在运行，请等任务结束后再保存，避免旧版本重新上线');
 const base=await api('/git/commits/'+state.sha),tree=[];
 for(const [name,data] of Object.entries(files)){
  const blob=await api('/git/blobs','POST',{content:Buffer.isBuffer(data)?data.toString('base64'):data,encoding:Buffer.isBuffer(data)?'base64':'utf-8'});
  tree.push({path:name,mode:'100644',type:'blob',sha:blob.sha});
 }
 const t=await api('/git/trees','POST',{base_tree:base.tree.sha,tree});
 const c=await api('/git/commits','POST',{message,tree:t.sha,parents:[state.sha]});
 // Fast-forward only. A concurrent writer makes this fail instead of losing data.
 await api('/git/refs/heads/main','PATCH',{sha:c.sha,force:false});
 return {sha:c.sha,url:'https://github.com/'+A.REPO+'/commit/'+c.sha};
}
function createServer(deps={}){
 const token=crypto.randomBytes(32).toString('hex');let writing=false;
 const getOwner=deps.owner||owner,getState=deps.state||state,save=deps.commit||commit;
 const server=http.createServer(async(req,res)=>{
  const address=server.address(),origin='http://127.0.0.1:'+address.port;
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
  function send(code,data,type='application/json'){res.writeHead(code,{...headers,'Content-Type':type});res.end(type==='application/json'?JSON.stringify(data):data)}
  try{
   if(req.headers.host!=='127.0.0.1:'+address.port)return send(403,{error:'仅允许从本机 127.0.0.1 打开'});
   const u=new URL(req.url,origin);
   if(u.pathname.startsWith('/api/')){
    if(req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'拒绝跨站访问'});
    if(req.method!=='GET'&&(req.headers.origin!==origin||req.headers['x-admin-token']!==token||req.headers['content-type']!=='application/json'))return send(403,{error:'会话已失效，请刷新后台'});
    const actor=await getOwner();
    if(req.method==='GET'){
     if(u.pathname==='/api/session')return send(200,{actor,token,schema:C.schema,defaults:C.defaults,repo:A.REPO});
     if(u.pathname==='/api/state')return send(200,await getState());
     if(u.pathname==='/api/issues'){const issues=await api('/issues?state=all&labels=scenery&per_page=100');return send(200,issues.filter(i=>!i.pull_request).map(i=>({number:i.number,title:i.title,state:i.state,login:i.user.login,url:i.html_url,labels:i.labels.map(l=>l.name),body:i.body}))) }
     if(u.pathname==='/api/runs'){const r=await api('/actions/runs?per_page=20');return send(200,r.workflow_runs.map(i=>({id:i.id,name:i.name,status:i.status,conclusion:i.conclusion,sha:i.head_sha,url:i.html_url,at:i.created_at}))) }
     if(u.pathname==='/api/verify'){
     const s=await getState(),base=siteBase,expected=L.contentJs(L.content(s.manifest));
      const response=await fetch(base+'content.js?t='+Date.now(),{signal:AbortSignal.timeout(15000)});
      const settings=await fetch(base+'world-settings.js?t='+Date.now(),{signal:AbortSignal.timeout(15000)});
      const text=await response.text(),settingsText=await settings.text();
      const expectedSettings='/* Generated from scenery/config.json. */\nwindow.PixelWalkSettings='+JSON.stringify(s.settings)+';\n';
      const images=await Promise.all(L.content(s.manifest).scenery.map(async i=>{try{const r=await fetch(base+i.image,{signal:AbortSignal.timeout(15000)}),buf=Buffer.from(await r.arrayBuffer()),item=s.manifest.items.find(a=>A.key(a)===i.id);return {id:i.id,title:i.title,ok:r.ok&&crypto.createHash('sha256').update(buf).digest('hex')===item.sha256}}catch{return {id:i.id,title:i.title,ok:false}}}));
      return send(200,{sha:s.sha,contentMatches:response.ok&&text===expected,settingsMatch:settings.ok&&settingsText===expectedSettings,images,at:new Date().toISOString()});
     }
     if(u.pathname==='/api/image'){
      const name=u.searchParams.get('path');if(!A.IMAGE.test(name||''))return send(400,{error:'无效图片路径'});
      return send(200,await file(name,'main'),'image/png');
     }
     return send(404,{error:'接口不存在'});
    }
    if(req.method!=='POST'||u.pathname!=='/api/action')return send(404,{error:'接口不存在'});
    if(writing)return send(409,{error:'正在保存上一项操作，请稍候'});
    writing=true;
    try{
     let length=0;const chunks=[];for await(const part of req){length+=part.length;if(length>1600000)return send(413,{error:'上传内容过大'});chunks.push(part)}
     const input=JSON.parse(Buffer.concat(chunks).toString()),action=input.action;
     if(action==='publish'){await gh(['workflow','run','scenery-publish.yml','--repo',A.REPO,'--ref','main']);return send(200,{message:'已发起投放，请查看发布状态'})}
     if(action==='retry'){await gh(['workflow','run','pages.yml','--repo',A.REPO,'--ref','main']);return send(200,{message:'已重新发起网站部署'})}
     const s=await getState();if(input.sha!==s.sha)return send(409,{error:'线上仓库已变化，请刷新后台后重试'});
     let result;
     if(action==='approve'){
      if(!Number.isSafeInteger(input.issue)||input.issue<1)throw Error('Issue 编号无效');
      const issue=await api('/issues/'+input.issue);if(issue.state!=='open'||!issue.labels.some(l=>l.name==='scenery')||issue.pull_request)throw Error('需要尚未关闭的风景投稿 Issue');
      const previous=s.manifest.items.find(i=>i.issue===issue.number);if(previous&&['published','archived'].includes(previous.status))throw Error('作品已收录，请到作品库管理');
      const form=L.parseIssue(issue.body);if(form.errors.length)throw Error(form.errors.join('；'));
      const png=await A.download(form.imageUrl),file='scenery/images/gh-'+issue.number+'.png',at=new Date().toISOString();
      const item={issue:issue.number,login:issue.user.login,userId:issue.user.id,...A.metadata(form),file,sha256:crypto.createHash('sha256').update(png).digest('hex'),status:'queued',approvedBy:actor.login,approvedAt:at};
      s.manifest.items=s.manifest.items.filter(i=>i.issue!==issue.number).concat(item);
      result={files:{[file]:png,'scenery/manifest.json':A.json(s.manifest),'content.js':L.contentJs(L.content(s.manifest))}};
      result.files['scenery/admin-audit.json']=A.json([...s.audit,{at,actor:actor.login,actorId:actor.id,action,issue:issue.number}].slice(-500));
     }else result=A.apply(s,action,input,actor);
     const saved=await save(s,result.files,'admin: '+action+' '+(input.id||input.issue||result.id||'world settings'));
     let warning='';if(action==='approve'||result.manifest?.items.some(i=>i.status==='queued')){
      try{await gh(['workflow','run','scenery-publish.yml','--repo',A.REPO,'--ref','main'])}catch(error){warning='保存成功，但自动投放未触发：'+error.message}
     }
     send(200,{...saved,message:warning||'已保存到 main，等待 GitHub Pages 部署。',warning});
    }finally{writing=false}
    return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'不支持此方法'});
   let filename;
   if(u.pathname==='/'||u.pathname==='/admin'){res.writeHead(302,{...headers,Location:'/admin/'});res.end();return}
   if(u.pathname==='/admin/')filename='admin/index.html';
   else if(u.pathname==='/game')filename='index.html';
   else{filename=decodeURIComponent(u.pathname.slice(1));if(!/^(?:admin\/(?:admin\.js|admin\.css)|settings\.js|world-settings\.js|engine\.js|pixelate\.js|library\.js|app\.js|content\.js|style\.css|music\.js|assets\/[A-Za-z0-9_./-]+|scenery\/images\/[A-Za-z0-9_.-]+)$/.test(filename)||filename.split('/').includes('..'))return send(404,'不存在','text/plain')}
   const absolute=path.join(root,filename);if(!fs.existsSync(absolute))return send(404,'不存在','text/plain');
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4'};
   send(200,fs.readFileSync(absolute),types[path.extname(filename)]||'application/octet-stream');
  }catch(error){send(400,{error:error.message||'操作失败'})}
 });
 return server;
}
if(require.main===module){
 owner().then(actor=>{
  const server=createServer(),port=Number(process.env.PIXELWALK_ADMIN_PORT||4317);
  server.listen(port,'127.0.0.1',()=>console.log('PixelWalk 线上管理 · '+actor.login+'\nhttp://127.0.0.1:'+port+'/admin/\n仅监听本机；关闭进程即关闭管理入口。'));
  server.on('error',error=>{console.error(error.message);process.exitCode=1});
 }).catch(error=>{console.error(error.message);process.exitCode=1});
}
module.exports={createServer};
