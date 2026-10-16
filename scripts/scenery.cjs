'use strict';
/* Community scenery pipeline, run by GitHub Actions.
   node scripts/scenery.cjs review   — handle /approve or /reject on an issue comment
   node scripts/scenery.cjs publish  — release every queued item (30-minute schedule)
   node scripts/scenery.cjs content  — regenerate content.js from the manifest
   All untrusted text (issue body, comments) arrives through env/event JSON, never shell. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const L=require('./scenery-lib.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'scenery'),images=path.join(dir,'images'),manifestFile=path.join(dir,'manifest.json');
const env=process.env,repo=env.GITHUB_REPOSITORY,token=env.GITHUB_TOKEN;
const REVIEWERS=new Set(['admin','maintain','write']);

const readManifest=()=>fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):L.emptyManifest();
function writeAll(manifest){
 fs.mkdirSync(images,{recursive:true});
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,1)+'\n');
 fs.writeFileSync(path.join(root,'content.js'),L.contentJs(L.content(manifest)));
}
function output(name,value){if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,`${name}=${value}\n`);console.log(`${name}=${value}`)}

async function api(method,route,body,{allowMissing=false}={}){
 const res=await fetch('https://api.github.com/repos/'+repo+route,{method,signal:AbortSignal.timeout(30000),headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','content-type':'application/json'},body:body&&JSON.stringify(body)});
 if(res.status===404&&allowMissing)return null;
 if(!res.ok)throw Error(`${method} ${route}: ${res.status} ${await res.text()}`);
 return res.status===204?null:res.json();
}
const comment=(n,text)=>api('POST',`/issues/${n}/comments`,{body:text});
const addLabels=(n,labels)=>api('POST',`/issues/${n}/labels`,{labels});
const removeLabel=(n,label)=>api('DELETE',`/issues/${n}/labels/${encodeURIComponent(label)}`,undefined,{allowMissing:true});

async function download(url){
 const signal=AbortSignal.timeout(30000);
 for(let redirects=0;redirects<=5;redirects++){
  const target=new URL(url);
  // GitHub attachments redirect to this verified GitHub-owned S3 bucket.
  // Permit this exact host only after a trusted attachment URL; never arbitrary S3.
  if(target.protocol!=='https:'||target.username||target.password||target.port||!(L.ALLOWED_HOSTS.test(target.hostname)||(redirects>0&&target.hostname==='github-production-user-asset-6210df.s3.amazonaws.com')))throw Object.assign(Error('图片地址不在 GitHub 附件域名内'),{userFacing:true});
  const res=await fetch(target.href,{redirect:'manual',signal});
  if([301,302,303,307,308].includes(res.status)){
   const location=res.headers.get('location');await res.body?.cancel?.();
   if(!location)break;url=new URL(location,target).href;continue;
  }
  if(!res.ok)throw Object.assign(Error('图片下载失败 '+res.status),{userFacing:true});
  const chunks=[];let total=0;
  for await(const part of res.body){total+=part.length;if(total>L.MAX_BYTES)throw Object.assign(Error('PNG 超过 1 MB'),{userFacing:true});chunks.push(part)}
  return Buffer.concat(chunks);
 }
 throw Object.assign(Error('图片重定向过多'),{userFacing:true});
}

async function review(){
 const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
 let issue=event.issue;const actor=event.comment.user.login,text=String(event.comment.body||'').trim();
 const cmd=text.match(/^\/(approve|reject)\b\s*([\s\S]*)$/i);
 if(!cmd||issue.pull_request||!issue.labels.some(l=>l.name==='scenery'))return output('changed','false');
 const action=cmd[1].toLowerCase(),reason=cmd[2].trim().slice(0,500);
 // Only collaborators with write access may review; everyone else is ignored.
 const perm=(await api('GET',`/collaborators/${encodeURIComponent(actor)}/permission`,undefined,{allowMissing:true}))?.permission;
 if(!REVIEWERS.has(perm)){console.log(`ignored: ${actor} has ${perm||'no'} permission`);return output('changed','false')}
 if(actor===issue.user.login&&perm!=='admin'){await comment(issue.number,`@${actor} 不能审核自己的投稿，请由其他协作者审核。`);return output('changed','false')}
 // Read the current issue after waiting for the repository lock, not a stale event body.
 issue=await api('GET',`/issues/${issue.number}`);
 if(issue.pull_request||!issue.labels.some(l=>l.name==='scenery')||(action==='approve'&&issue.state!=='open'))return output('changed','false');
 const manifest=readManifest(),existing=manifest.items.find(i=>i.issue===issue.number);
 if(existing&&['published','archived'].includes(existing.status)){await comment(issue.number,'这件作品已经投放，无需重复审核。');return output('changed','false')}

 if(action==='reject'){
  if(existing){manifest.items=manifest.items.filter(i=>i!==existing);fs.rmSync(path.join(root,existing.file),{force:true});writeAll(manifest)}
  await removeLabel(issue.number,'pending-review');await removeLabel(issue.number,'approved');await removeLabel(issue.number,'accepted');await addLabels(issue.number,['needs-changes']);
  await comment(issue.number,`@${issue.user.login} 需要修改${reason?'：\n\n> '+reason.replace(/\n/g,'\n> '):'。'}\n\n修改后编辑本 Issue 替换图片，再等待审核。`);
  return output('changed',existing?'true':'false');
 }

 if(issue.user.type!=='User'){await comment(issue.number,'只接受个人 GitHub 账号的投稿。');return output('changed','false')}
 const form=L.parseIssue(issue.body);let png;
 try{if(form.errors.length)throw Object.assign(Error(form.errors.join('；')),{userFacing:true});png=L.sanitizePng(await download(form.imageUrl))}
 catch(error){if(!error.userFacing)throw error;await comment(issue.number,`无法通过：${error.message}。`);return output('changed','false')}
 const file=`scenery/images/gh-${issue.number}.png`;fs.mkdirSync(images,{recursive:true});fs.writeFileSync(path.join(root,file),png);
 const item={issue:issue.number,login:issue.user.login,userId:issue.user.id,title:form.title,phase:form.phase,size:form.size,...(form.extent!==undefined?{extent:form.extent}:{}),airborne:form.airborne,file,source:form.source,sha256:crypto.createHash('sha256').update(png).digest('hex'),status:'queued',approvedBy:actor,approvedAt:new Date().toISOString()};
 manifest.items=manifest.items.filter(i=>i.issue!==issue.number).concat(item);writeAll(manifest);
 await removeLabel(issue.number,'pending-review');await removeLabel(issue.number,'needs-changes');await addLabels(issue.number,['approved']);
 await comment(issue.number,`✅ @${actor} 审核通过「${item.title}」，已保存图片快照，等待批量部署；投放任务约每 30 分钟检查一次，GitHub 调度可能延迟。`);
 output('changed','true');
}

async function publish(){
 const manifest=readManifest(),queued=manifest.items.filter(i=>i.status==='queued'),at=new Date().toISOString();
 for(const i of queued){i.status='published';i.publishedAt=at}
 // Published here means included in the candidate build, not proof of deployment.
 // Retry every unannounced item, including after a failed deploy or notification.
 const pending=manifest.items.filter(i=>i.status==='published'&&i.issue&&!i.announcedAt);
 if(!pending.length){console.log('queue empty');return output('changed','false')}
 writeAll(manifest);output('changed','true');output('issues',pending.map(i=>i.issue).join(' '));
}
// Runs only after deployment succeeds. The durable marker avoids duplicate
// comments when a later API operation or the final manifest push fails.
async function announce(){
 const manifest=readManifest();
 for(const n of String(env.ISSUES||'').split(/\s+/).filter(Boolean).map(Number)){
  const item=manifest.items.find(i=>i.issue===n&&i.status==='published');
  if(!item)throw Error(`No published manifest entry for issue ${n}`);
  if(item.announcedAt)continue;
  const marker=`<!-- pixelwalk-published:${n} -->`;let sent=false;
  for(let page=1;;page++){
   const comments=await api('GET',`/issues/${n}/comments?per_page=100&page=${page}`);
   if(comments.some(c=>c.user?.login==='github-actions[bot]'&&c.body?.includes(marker))){sent=true;break}
   if(comments.length<100)break;
  }
  await removeLabel(n,'approved');await removeLabel(n,'accepted');await addLabels(n,['published']);
  if(!sent)await comment(n,marker+'\n🌄 已投放到 PixelWalk 原野，并加入木屋鸣谢。感谢参与！');
  await api('PATCH',`/issues/${n}`,{state:'closed',state_reason:'completed'});
  item.announcedAt=new Date().toISOString();
 }
 writeAll(manifest);
}

const commands={review,publish,announce,content:async()=>writeAll(readManifest())};
const run=commands[process.argv[2]];
if(!run){console.error('usage: scenery.cjs review|publish|announce|content');process.exit(2)}
run().catch(error=>{console.error(error);process.exit(1)});
