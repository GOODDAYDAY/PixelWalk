'use strict';
const crypto=require('node:crypto');
const L=require('./scenery-lib.cjs'),config=require('../settings.js');
const REPO='JilinJL/PixelWalk',OWNER_ID=62745529;
const IMAGE=/^scenery\/images\/(?:gh-\d+(?:-[a-f0-9]{12})?|admin-[a-f0-9]{24})(?:-[a-f0-9]{12})?\.png$/;
const key=i=>i.id||'gh-'+i.issue;
const json=v=>JSON.stringify(v,null,1)+'\n';
function metadata(input){
 const title=L.cleanTitle(input.title);if(!title)throw Error('请填写作品名称');
 if(!['day','night'].includes(input.phase))throw Error('请选择日景或夜景');
 if(!['small','medium','large','giant'].includes(input.size))throw Error('请选择体积');
 if(typeof input.airborne!=='boolean')throw Error('摆放方式无效');
 const source=String(input.source||'').trim().slice(0,1000);if(!source)throw Error('请填写素材来源与使用许可');
 return {title,phase:input.phase,size:input.size,airborne:input.airborne,source};
}
function pngData(value){
 if(typeof value!=='string'||value.length>1400000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('请先生成透明像素 PNG');
 return L.sanitizePng(Buffer.from(value.slice(value.indexOf(',')+1),'base64'));
}
function apply(state,action,input,actor){
 if(actor.id!==OWNER_ID)throw Error('仅 JilinJL 主账号可管理');
 const manifest=structuredClone(state.manifest),at=new Date().toISOString(),files={};
 let item=manifest.items.find(i=>key(i)===input.id);
 if(action==='builtin'){
  const builtin=require('../engine.js').builtinCatalog.find(i=>i.id===input.id);if(!builtin)throw Error('内置作品不存在');
  const hidden=new Set(manifest.disabledBuiltins||[]);if(input.hidden===true)hidden.add(input.id);else if(input.hidden===false)hidden.delete(input.id);else throw Error('下架状态无效');manifest.disabledBuiltins=[...hidden];
 }else if(action==='settings'){
  const settings=config.validate(input.settings);
  files['scenery/config.json']=json(settings);files['world-settings.js']='/* Generated from scenery/config.json. */\nwindow.PixelWalkSettings='+JSON.stringify(settings)+';\n';
 }else if(action==='upload'){
  const id='admin-'+crypto.randomBytes(12).toString('hex'),png=pngData(input.png),file='scenery/images/'+id+'.png';
  const authorName=L.cleanTitle(input.authorName||actor.login);
  item={id,...metadata(input),authorName,login:authorName===actor.login?actor.login:'',userId:authorName===actor.login?actor.id:'credit:'+authorName,file,sha256:crypto.createHash('sha256').update(png).digest('hex'),status:'published',publishedAt:at,approvedBy:actor.login,approvedAt:at,createdBy:actor.login};
  files[file]=png;manifest.items.push(item);
 }else{
  if(!item)throw Error('作品不存在，请刷新列表');
  if(action==='edit'){
   Object.assign(item,metadata(input));
   if(input.png){const png=pngData(input.png),hash=crypto.createHash('sha256').update(png).digest('hex');item.file='scenery/images/'+key(item)+'-'+hash.slice(0,12)+'.png';item.sha256=hash;files[item.file]=png}
  }else if(action==='archive'){item.previousStatus=item.status;item.status='archived';item.archivedAt=at}
  else if(action==='restore'){
   if(item.status!=='archived')throw Error('仅归档作品可恢复');
   item.status=item.previousStatus==='queued'?'queued':'published';if(item.status==='published')item.publishedAt=at;delete item.archivedAt;delete item.previousStatus;
  }else throw Error('未知操作');
  item.updatedAt=at;item.updatedBy=actor.login;
 }
 if(action!=='settings'){files['scenery/manifest.json']=json(manifest);files['content.js']=L.contentJs(L.content(manifest))}
 files['scenery/admin-audit.json']=json([...(state.audit||[]),{at,actor:actor.login,actorId:actor.id,action,id:item?key(item):'world-settings',title:item?.title||'世界参数'}].slice(-500));
 return {files,manifest,id:item?key(item):undefined};
}
async function download(url){
 for(let i=0;i<6;i++){
  const u=new URL(url);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!(L.ALLOWED_HOSTS.test(u.hostname)||(i>0&&u.hostname==='github-production-user-asset-6210df.s3.amazonaws.com')))throw Error('图片地址不在 GitHub 附件域名内');
  const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('location');await r.body?.cancel();if(!next)throw Error('图片跳转无效');url=new URL(next,u).href;continue}
  if(!r.ok)throw Error('图片下载失败：'+r.status);
  let size=0;const chunks=[];for await(const chunk of r.body){size+=chunk.length;if(size>L.MAX_BYTES)throw Error('PNG 超过 1 MB');chunks.push(chunk)}return L.sanitizePng(Buffer.concat(chunks));
 }
 throw Error('图片跳转过多');
}
module.exports={REPO,OWNER_ID,IMAGE,key,json,metadata,pngData,apply,download};
