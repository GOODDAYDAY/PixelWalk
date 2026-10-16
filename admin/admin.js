'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let session,state,issues=[],runs=[],editId=null,source=null,originalPng=null,resultPng=null,walking=false,previewWorld,previewRenderer,frameTime=0,processing=0;
const form=$('#art-form'),statusNames={published:'收录',queued:'待投放',archived:'已下架'};
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function link(text,url){const n=node('a',text);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n}
function button(text,fn,cls){const n=node('button',text,cls);n.type='button';n.onclick=()=>run(fn);return n}
function notice(text,error=false){$('#notice').textContent=text;$('#notice').classList.toggle('error',error)}
async function request(route,body){const r=await fetch('/api/'+route,{headers:body?{'Content-Type':'application/json','X-Admin-Token':session.token}:{},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'请求失败');return data}
async function run(fn){try{await fn()}catch(error){notice(error.message,true)}}
async function act(action,data={}){
 const buttons=$$('button');buttons.forEach(b=>b.disabled=true);notice('正在保存，请稍候…');
 try{const result=await request('action',{action,sha:state.sha,...data});notice(result.message||'保存成功，等待部署');await refresh(false);return result}
 finally{buttons.forEach(b=>b.disabled=false)}
}
async function refresh(show=true){
 if(show)notice('正在读取线上仓库…');
 state=await request('state');
 Object.assign(PixelWalkConfig.values,state.settings);Object.assign(PixelWalk.CFG,state.settings);
 for(const [size,key] of Object.entries({small:'colorsSmall',medium:'colorsMedium',large:'colorsLarge',giant:'colorsGiant'}))PixelWalkPixelate.SIZES[size].colors=state.settings[key];
 renderArt();renderSettings();renderAudit();
 const loaded=await Promise.allSettled([request('issues'),request('runs')]);
 if(loaded[0].status==='fulfilled'){issues=loaded[0].value;renderIssues()}else $('#issue-list').textContent='读取投稿失败：'+loaded[0].reason.message;
 if(loaded[1].status==='fulfilled'){runs=loaded[1].value;renderRuns()}else $('#runs').textContent='读取发布状态失败：'+loaded[1].reason.message;
 if(show)notice('已读取线上仓库。保存后的变更请到“发布与记录”核验。');
}
function renderArt(){
 const all=[...state.manifest.items,...PixelWalk.builtinCatalog.map(i=>({...i,builtin:true,status:(state.manifest.disabledBuiltins||[]).includes(i.id)?'archived':'published'}))];
 $('#live-count').textContent=all.filter(i=>i.status==='published').length;$('#queue-count').textContent=all.filter(i=>i.status==='queued').length;$('#archive-count').textContent=all.filter(i=>i.status==='archived').length;$('#commit').textContent=state.sha.slice(0,7);
 const q=$('#search').value.toLowerCase(),filter=$('#filter').value;
 const items=all.filter(i=>(filter==='all'||i.status===filter)&&[i.title,i.login,i.authorName].join(' ').toLowerCase().includes(q));
 const cards=items.map(i=>{
  const id=i.id||'gh-'+i.issue,card=node('article',undefined,'card'),img=node('img',undefined,'art-image');img.alt=i.title;img.src=i.builtin?PixelWalk.sprite(i.id).toDataURL():'/api/image?path='+encodeURIComponent(i.file);img.loading='lazy';
  const body=node('div',undefined,'card-body');body.append(node('h3',i.title),node('span',statusNames[i.status]||i.status,'chip '+i.status),node('span',(i.phase==='night'?'夜景':'日景')+' · '+({small:'小',medium:'中',large:'大',giant:'巨大'}[i.size])+' · '+(i.airborne?'空中':'地面'),'muted'),node('p',i.authorName||i.author||'@'+i.login,'muted'));
  const actions=node('div',undefined,'actions');if(i.builtin){actions.append(node('span','内置风景','muted'),button(i.status==='archived'?'恢复上线':'下架',()=>act('builtin',{id,hidden:i.status!=='archived'})));body.append(actions);card.append(img,body);return card}actions.append(button('编辑 / 预览',()=>openEditor(i)));
  if(i.status==='archived')actions.append(button('恢复上线',()=>act('restore',{id})));
  else actions.append(button('下架',async()=>{if(confirm('下架「'+i.title+'」？部署成功后将从线上原野移除，之后可以恢复。'))await act('archive',{id})},'danger'));
  if(i.issue)actions.append(link('Issue ↗','https://github.com/'+session.repo+'/issues/'+i.issue));body.append(actions);card.append(img,body);return card;
 });$('#art-list').replaceChildren(...(cards.length?cards:[node('p',all.length?'没有匹配的作品。':'还没有收录作品。可以手动上传，或在“投稿审核”中批准现有投稿。','empty')]));
}
function renderIssues(){
 const rows=issues.map(i=>{
  const item=state.manifest.items.find(x=>x.issue===i.number),row=node('article',undefined,'row'),info=node('div');info.append(link('#'+i.number+' '+i.title,i.url),node('small','@'+i.login+' · '+(item?(statusNames[item.status]||item.status):i.state==='open'?'待审':'已关闭')+' · '+i.labels.join(' / ')));
  const actions=node('div',undefined,'actions');actions.append(link('查看图片与评论 ↗',i.url));
  if(i.state==='open'&&(!item||item.status==='queued'))actions.append(button(item?'重新审核':'通过并投放',async()=>{if(confirm('确认已经查看并批准 #'+i.number+' 的图片、来源和展示信息？'))await act('approve',{issue:i.number})},'primary'));
  row.append(info,actions);return row;
 });$('#issue-list').replaceChildren(...(rows.length?rows:[node('p','暂无风景投稿。','empty')]));
}
function renderSettings(){
 const fields=Object.entries(session.schema).map(([key,s])=>{const label=node('label',s.label,'field'),input=node('input');input.type='number';input.name=key;input.min=s.min;input.max=s.max;input.step=s.step;input.value=state.settings[key];input.required=true;label.append(input,node('small',s.min+'–'+s.max+' · 默认 '+s.default));return label});$('#settings-fields').replaceChildren(...fields);
}
function renderRuns(){
 const names={success:'成功',failure:'失败',skipped:'跳过',cancelled:'取消',in_progress:'运行中',queued:'排队中',waiting:'等待中',completed:'完成'};
 $('#runs').replaceChildren(...runs.map(i=>{const row=node('div',undefined,'row'),info=node('div');info.append(link(i.name,i.url),node('small',new Date(i.at).toLocaleString('zh-CN')+' · '+i.sha.slice(0,7)));row.append(info,node('span',names[i.conclusion||i.status]||i.status,'chip'));return row}));
}
function renderAudit(){$('#audit').replaceChildren(...(state.audit||[]).slice(-25).reverse().map(i=>{const row=node('div',undefined,'row');const names={upload:'上传作品',edit:'编辑作品',archive:'下架作品',restore:'恢复作品',settings:'修改世界参数',builtin:'调整内置风景',approve:'审核通过'};row.append(node('span',(names[i.action]||i.action)+' · '+(i.title||i.id||'#'+i.issue)),node('small',i.actor+' · '+new Date(i.at).toLocaleString('zh-CN')));return row}));}
function selectTab(tab){$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.tab').forEach(s=>s.hidden=s.id!==tab)}
$$('[data-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
$('#search').oninput=renderArt;$('#filter').onchange=renderArt;$('#refresh').onclick=()=>run(()=>refresh());
$('#publish').onclick=()=>run(()=>act('publish'));$('#retry').onclick=()=>run(()=>act('retry'));
$('#verify').onclick=()=>run(async()=>{
 $('#verification').textContent='核对线上清单、配置和图片哈希中…';
 const result=await request('verify'),ok=result.contentMatches&&result.settingsMatch&&result.images.every(i=>i.ok);
 $('#verification').classList.toggle('error',!ok);
 $('#verification').textContent=(ok?'✓ 线上作品、参数与全部图片均与仓库一致。':'线上尚未完全匹配，请查看部署是否结束。')+'\n作品清单：'+(result.contentMatches?'一致':'待更新')+' · 世界参数：'+(result.settingsMatch?'一致':'待更新')+' · 图片：'+result.images.filter(i=>i.ok).length+'/'+result.images.length+'\n核对仓库版本 '+result.sha.slice(0,7)+' · '+new Date(result.at).toLocaleString('zh-CN');
});
$('#defaults').onclick=()=>{for(const [k,v] of Object.entries(session.defaults))$('#settings-form').elements[k].value=v};
$('#settings-form').onsubmit=e=>{e.preventDefault();run(async()=>{const settings=Object.fromEntries(Object.keys(session.schema).map(k=>[k,Number(e.target.elements[k].value)]));await act('settings',{settings})})};
async function openEditor(item){
 editId=item?(item.id||'gh-'+item.issue):null;source=null;originalPng=null;resultPng=null;processing++;
 form.reset();form.elements.title.value=item?.title||'';form.elements.authorName.value=item?.authorName||item?.login||session.actor.login;form.elements.source.value=item?.source||'';form.elements.phase.value=item?.phase||'day';form.elements.size.value=item?.size||'medium';form.elements.extent.value=item?.extent??PixelWalkConfig.artwork.giantDefault;form.elements.airborne.checked=!!item?.airborne;
 $('#author-field').hidden=!!item;$('#editor-title').textContent=item?'编辑风景':'上传风景';$('#editor-error').textContent='';$('#file-status').textContent='透明 PNG / WebP，最大 8 MB。自动生成正式像素图。';$('#tile').getContext('2d').clearRect(0,0,160,160);walking=false;buildPreview();$('#editor').showModal();
 if(item){try{const response=await fetch('/api/image?path='+encodeURIComponent(item.file));if(!response.ok)throw Error('读取作品图片失败');const img=await createImageBitmap(await response.blob());if(!$('#editor').open||editId!==(item.id||'gh-'+item.issue)){img.close();return}const c=$('#tile');c.getContext('2d').drawImage(img,0,0,160,160);source=img;originalPng=true;$('#already-pixel').checked=true;buildPreview(c);$('#file-status').textContent='已载入现有图片。选择文件可替换；不选文件则保留原图。'}catch(error){$('#editor-error').textContent=error.message}}
}
function buildPreview(image){
 $('#giant-size-field').hidden=form.elements.size.value!=='giant';$('#admin-extent-value').value=form.elements.extent.value;
 if(!image&&($('#tile').getContext('2d').getImageData(0,0,160,160).data.some((v,i)=>i%4===3&&v)))image=$('#tile');
 const candidate={id:'admin-preview',title:form.elements.title.value,phase:form.elements.phase.value,size:form.elements.size.value,extent:Number(form.elements.extent.value),airborne:form.elements.airborne.checked,image};
 previewWorld=new PixelWalk.World({preview:true,candidate});previewRenderer=new PixelWalk.Renderer($('#preview'),previewWorld);
}
function convert(){
 if(!source)return buildPreview();
 try{
  const tile=$('#tile'),g=tile.getContext('2d');g.clearRect(0,0,160,160);
  if($('#already-pixel').checked){if(source.width!==160||source.height!==160||!originalPng)throw Error('保留像素模式需要 160 × 160 PNG');g.drawImage(source,0,0)}
  else{
   const c=document.createElement('canvas'),scale=Math.min(1,640/Math.max(source.width,source.height));c.width=Math.max(1,Math.round(source.width*scale));c.height=Math.max(1,Math.round(source.height*scale));const cg=c.getContext('2d',{willReadFrequently:true});cg.drawImage(source,0,0,c.width,c.height);const result=PixelWalkPixelate.pixelate(cg.getImageData(0,0,c.width,c.height),form.elements.size.value);g.putImageData(new ImageData(result.data,160,160),0,0);
  }
  resultPng=tile.toDataURL('image/png');buildPreview(tile);$('#file-status').textContent='✓ 已生成 160 × 160 像素图。保存时还会验证透明背景。';$('#editor-error').textContent='';
 }catch(error){resultPng=null;$('#editor-error').textContent=error.message}
}
$('#art-file').onchange=()=>run(async()=>{
 const file=$('#art-file').files[0],ticket=++processing;if(!file)return;
 resultPng=null;if(file.size>8*1024*1024)throw Error('图片超过 8 MB');if(!['image/png','image/webp'].includes(file.type))throw Error('需要透明 PNG / WebP');
 const bytes=new Uint8Array(await file.arrayBuffer()),text=new TextDecoder('latin1').decode(bytes);if(text.includes('acTL')||text.includes('ANIM'))throw Error('不支持动画图片');
 const img=await createImageBitmap(file);if(ticket!==processing||!$('#editor').open){img.close();return}if(img.width*img.height>16000000){img.close();throw Error('图片尺寸过大')}
 source?.close?.();source=img;originalPng=file.type==='image/png';if(!form.elements.title.value)form.elements.title.value=file.name.replace(/\.[^.]+$/,'').slice(0,40);convert();
});
for(const key of ['phase','size','airborne'])form.elements[key].onchange=()=>{if(key==='size')$('#already-pixel').checked=false;convert()};$('#already-pixel').onchange=convert;
form.elements.extent.oninput=()=>buildPreview();
$('#upload').onclick=()=>run(()=>openEditor());
function closeEditor(){walking=false;processing++;source?.close?.();source=null;$('#editor').close()}
$('#close-editor').onclick=closeEditor;$('#cancel-editor').onclick=closeEditor;$('#editor').addEventListener('close',()=>walking=false);
$('#walk').onpointerdown=e=>{e.preventDefault();walking=true;e.target.setPointerCapture(e.pointerId)};for(const name of ['pointerup','pointercancel','lostpointercapture'])$('#walk').addEventListener(name,()=>walking=false);window.addEventListener('blur',()=>walking=false);
$('#reset-preview').onclick=()=>{walking=false;previewWorld?.reset()};
form.onsubmit=e=>{
 e.preventDefault();run(async()=>{
  $('#editor-error').textContent='';
  if(source&&!resultPng){$('#editor-error').textContent='请先修正图片预览错误';return}
  if(!editId&&!resultPng){$('#editor-error').textContent='请选择一张透明图片';return}
  const data={id:editId,title:form.elements.title.value,source:form.elements.source.value,phase:form.elements.phase.value,size:form.elements.size.value,airborne:form.elements.airborne.checked,authorName:form.elements.authorName.value};if(data.size==='giant')data.extent=Number(form.elements.extent.value);if(resultPng)data.png=resultPng;
  try{await act(editId?'edit':'upload',data);closeEditor()}catch(error){$('#editor-error').textContent=error.message;throw error}
 })
};
function frame(time){const dt=frameTime?Math.min((time-frameTime)/1000,.05):0;frameTime=time;if($('#editor').open&&previewWorld&&!document.hidden){previewWorld.update(dt,{right:walking});previewRenderer.draw(time)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
async function boot(){
 try{
  if(location.hostname!=='127.0.0.1')throw Error('线上页面是管理入口；写操作由你的本机后台执行。');
  session=await request('session');$('#identity').textContent='@'+session.actor.login+' · 主账号';$('#console').hidden=false;await refresh();
 }catch(error){$('#console').hidden=true;$('#connect').hidden=false;$('#identity').textContent='本机安全管理';$('#connect-error').textContent=error.message}
}
boot();
