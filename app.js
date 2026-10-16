'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const {World,Renderer,TravelControls,filterContributors,sprite,acceptsGameKeys}=PixelWalk;
let mainWorld=new World();const mainRenderer=new Renderer($('#game'),mainWorld);
let previewWorld=new World({preview:true}),previewRenderer=new Renderer($('#preview-game'),previewWorld);
let currentRoute='',lastTime=0,toastTimer,hudTime=0;
const travel=new TravelControls(),inputs={left:new Set(),right:new Set()};
const bgm=new PixelWalkMusic.MusicPlayer($('#bgm-day'),$('#bgm-night'),enabled=>{$('#sound-button').innerHTML='♫ <span>BGM '+(enabled?'开':'关')+'</span>';$('#sound-button').setAttribute('aria-pressed',String(enabled))},tell);
bgm.setVolume(PixelWalkLibrary.volume());
let catalogueTicket=0;
async function refreshCatalogue(){const ticket=++catalogueTicket;const {ready}=await PixelWalkLibrary.catalogue();if(ticket!==catalogueTicket)return;clearInput();mainWorld=new World({catalog:ready});mainRenderer.world=mainWorld;hud()}
refreshCatalogue();
function clearInput(){inputs.left.clear();inputs.right.clear();travel.stop();$$('.held').forEach(b=>b.classList.remove('held'));lastTime=0}
function tell(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000)}
function currentCanvas(){return currentRoute==='/contribute'?$('#preview-game'):$('#game')}
function currentWorld(){return currentRoute==='/contribute'?previewWorld:mainWorld}
function anyDialogOpen(){return $$('dialog').some(d=>d.open)}
function hold(button,dir){button.addEventListener('pointerdown',e=>{if(button.disabled)return;e.preventDefault();currentCanvas().focus({preventScroll:true});button.setPointerCapture(e.pointerId);inputs[dir].add('pointer'+e.pointerId);button.classList.add('held')});const end=e=>{inputs[dir].delete('pointer'+e.pointerId);button.classList.remove('held')};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>button.addEventListener(ev,end))}
hold($('#preview-walk'),'right');hold($('#preview-back'),'left');
function setImmersive(enabled){clearInput();travel.setImmersive(enabled);document.body.classList.toggle('immersive',enabled);$('#immersive-button').setAttribute('aria-pressed',String(enabled));$('#game').focus({preventScroll:true});hud()}
function openCredits(){if(!mainWorld.enterHouse())return;clearInput();$('#thanks-search').value='';renderContributors();$('#credits-dialog').showModal();$('#thanks-scroll').scrollTop=0}
function closeCredits(){clearInput();mainWorld.leaveHouse();if($('#credits-dialog').open)$('#credits-dialog').close();$('#game').focus({preventScroll:true})}
// Game keys work anywhere on the play/preview page, not only when the canvas
// has focus. Text fields and open dialogs keep their own keys.
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'&&travel.immersive&&!anyDialogOpen()){e.preventDefault();setImmersive(false);return}
 if(!['/','/contribute'].includes(currentRoute)||!acceptsGameKeys(document.activeElement,anyDialogOpen())||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.code==='KeyW'&&currentRoute==='/'){e.preventDefault();if(!e.repeat)openCredits();return}
 const dir=['ArrowRight','KeyD'].includes(e.code)?'right':['ArrowLeft','KeyA'].includes(e.code)?'left':null;if(!dir)return;
 e.preventDefault();if(document.activeElement!==currentCanvas())currentCanvas().focus({preventScroll:true});
 if(dir==='right'&&currentRoute==='/')travel.pressForward();inputs[dir].add(e.code);
});
window.addEventListener('keyup',e=>{inputs.left.delete(e.code);inputs.right.delete(e.code)});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();bgm.setActive(!document.hidden&&['/','/contribute'].includes(currentRoute))});
function route(){clearInput();if(travel.immersive)setImmersive(false);if($('#credits-dialog').open)closeCredits();if($('#music-dialog').open)$('#music-dialog').close();currentRoute=location.hash.slice(1)||'/';if(currentRoute==='/admin'){location.replace('admin/');return}if(!['/','/contribute'].includes(currentRoute)){location.hash='/';return}$('#play-page').hidden=currentRoute!=='/';$('#contribute-page').hidden=currentRoute!=='/contribute';bgm.setActive(!document.hidden);document.body.classList.toggle('management-open',currentRoute!=='/');window.scrollTo(0,0);currentCanvas().focus({preventScroll:true})}
window.addEventListener('hashchange',route);route();
$('#immersive-button').onclick=()=>setImmersive(true);
// Touch controls live on the scene, leaving the game free of direction buttons.
let lastTouchTap=null;
$('#game').addEventListener('pointerdown',e=>{
 if(mainWorld.houseOpen)return;
 e.preventDefault();$('#game').focus({preventScroll:true});$('#game').setPointerCapture(e.pointerId);
 if(travel.immersive){
  if(e.pointerType==='touch'&&lastTouchTap&&performance.now()-lastTouchTap.time<350&&Math.hypot(e.clientX-lastTouchTap.x,e.clientY-lastTouchTap.y)<30){lastTouchTap=null;setImmersive(false);return}
  travel.pressForward();
  if(e.pointerType==='touch')lastTouchTap={time:performance.now(),x:e.clientX,y:e.clientY};
 }else if(e.pointerType==='touch'||e.pointerType==='pen'){
  const bounds=$('#game').getBoundingClientRect(),dir=(e.clientX-bounds.left)<bounds.width/3?'left':'right';inputs[dir].add('scene'+e.pointerId);
 }
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('#game').addEventListener(name,e=>{inputs.left.delete('scene'+e.pointerId);inputs.right.delete('scene'+e.pointerId)});
$('#game').addEventListener('dblclick',()=>{if(travel.immersive)setImmersive(false)});
$('#restart-button').onclick=async()=>{await refreshCatalogue();$('#game').focus({preventScroll:true})};
$('#enter-house').onclick=openCredits;$('#close-credits').onclick=closeCredits;
$('#credits-dialog').addEventListener('cancel',e=>{e.preventDefault();closeCredits()});
$('#thanks-search').addEventListener('input',()=>{renderContributors();$('#thanks-scroll').scrollTop=0});
const GITHUB_LOGIN=/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
function renderContributors(){const all=filterContributors(PixelWalkContent.contributors||[]),matches=filterContributors(all,$('#thanks-search').value);$('#thanks-count').textContent=all.length+' 位参与者';$('#thanks-list').replaceChildren(...matches.map(person=>{const li=document.createElement('li');let name;if(person.github&&GITHUB_LOGIN.test(person.github)){name=document.createElement('a');name.href='https://github.com/'+person.github;name.target='_blank';name.rel='noopener noreferrer';name.textContent='@'+person.github}else{name=document.createElement('span');name.textContent=person.name}li.append(name);return li}));$('#thanks-empty').hidden=matches.length>0;$('#thanks-empty').textContent=all.length?'没有找到匹配的参与者。':'还没有参与者，期待第一处风景。'}
$('#sound-button').onclick=()=>bgm.setEnabled(!bgm.enabled);$('#music-info-button').onclick=()=>{clearInput();$('#music-dialog').showModal()};$('#close-music').onclick=()=>$('#music-dialog').close();
function showVolume(v){$('#bgm-volume').value=Math.round(v*100);$('#bgm-volume-value').textContent=Math.round(v*100)+'%'}
showVolume(PixelWalkLibrary.volume());$('#bgm-volume').addEventListener('input',e=>{const v=Number(e.target.value)/100;bgm.setVolume(v);PixelWalkLibrary.setVolume(v);showVolume(v)});
$('#fullscreen-button').onclick=async()=>{clearInput();try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.game-shell').requestFullscreen();$('#game').focus()}catch{tell('此浏览器暂不支持全屏。')}};
// Fullscreen keeps the same exit control, and Escape always stops cruise.
document.addEventListener('fullscreenchange',()=>{clearInput();if(!document.fullscreenElement&&travel.immersive)setImmersive(false)});
function hud(){const w=mainWorld;const scene=w.visibleScenes()[0];$('#art-caption').hidden=!scene||w.inCabinPage;if(scene){$('#art-title').textContent=scene.art.title;$('#art-author').textContent=scene.art.author||'Lin'}$('#enter-house').hidden=!w.canEnterHouse()||w.houseOpen;}
function frame(t){const dt=lastTime?Math.min((t-lastTime)/1000,.05):0;lastTime=t;if(!document.hidden&&['/','/contribute'].includes(currentRoute)){const w=currentWorld(),input=currentRoute==='/'?travel.input(inputs.left.size>0,inputs.right.size>0):{left:inputs.left.size>0,right:inputs.right.size>0};w.update(dt,input);bgm.update(w.environment().night);if(currentRoute==='/'){mainRenderer.draw(t);if(t-hudTime>100){hud();hudTime=t}}else previewRenderer.draw(t)}requestAnimationFrame(frame)}requestAnimationFrame(frame);hud();
// Studio: choose image → auto pixelate → walk past it → download → submit on GitHub.
// Any option change re-renders immediately; nothing is stored in the browser.
let sourceImage=null,sourceURL=null,processedImage=null,selectionToken=0;
const opts={phase:'day',size:'medium',airborne:false,extent:PixelWalkConfig.artwork.giantDefault};
const ISSUE_URL='https://github.com/JilinJL/PixelWalk/issues/new';
function status(text='',error=false){$('#process-status').textContent=text;$('#process-status').classList.toggle('error',error)}
function setReady(ready){$('#download-submission').disabled=!ready;$('#submit-issue').setAttribute('aria-disabled',String(!ready));$('#submit-issue').tabIndex=ready?0:-1}
function issueLink(){const q=new URLSearchParams({template:'scenery.yml',title:'[风景投稿] '+artTitle(),'work-title':artTitle(),phase:opts.phase==='night'?'夜景':'日景',size:{small:'小',medium:'中',large:'大',giant:'巨大'}[opts.size],placement:opts.airborne?'空中':'地面'});if(opts.size==='giant')q.set('extent',opts.extent);return ISSUE_URL+'?'+q}
function artTitle(){return $('#art-name').value.trim()||'我的风景'}
function rebuild(){
 $('#giant-size-control').hidden=opts.size!=='giant';
 clearInput();processedImage=null;setReady(false);
 const result=$('#pixel-result');
 if(!sourceImage){result.hidden=true;$('#slot-empty').hidden=false;previewWorld=new World({preview:true});previewRenderer=new Renderer($('#preview-game'),previewWorld);return}
 try{processedImage=processImage(sourceImage,opts.size)}catch(e){result.hidden=true;$('#slot-empty').hidden=false;status(e.message,true);previewWorld=new World({preview:true});previewRenderer=new Renderer($('#preview-game'),previewWorld);return}
 const g=result.getContext('2d');g.clearRect(0,0,160,160);g.drawImage(processedImage,0,0);result.hidden=false;$('#slot-empty').hidden=true;
 previewWorld=new World({preview:true,candidate:{id:'local',title:artTitle(),author:'你',image:processedImage,...opts}});previewRenderer=new Renderer($('#preview-game'),previewWorld);
 setReady(true);$('#submit-issue').href=issueLink();status('');
}
function showSource(img,name){sourceImage=img;if(!$('#art-name').value.trim())$('#art-name').value=name.replace(/\.[^.]+$/,'').slice(0,40);rebuild();$('#preview-game').focus({preventScroll:true})}
async function loadFile(file){const token=++selectionToken;if(!file)return;
 if(!['image/png','image/webp'].includes(file.type))return status('需要透明 PNG / WebP',true);
 if(file.size>8*1024*1024)return status('图片超过 8 MB',true);
 try{const bytes=new Uint8Array(await file.arrayBuffer());if(token!==selectionToken)return;const ascii=new TextDecoder('latin1').decode(bytes);if((file.type==='image/png'&&ascii.includes('acTL'))||(file.type==='image/webp'&&ascii.includes('ANIM')))return status('不支持动图',true);
  const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url})}catch{URL.revokeObjectURL(url);throw Error()}
  if(token!==selectionToken){URL.revokeObjectURL(url);return}
  if(img.width*img.height>16000000){URL.revokeObjectURL(url);return status('图片尺寸过大',true)}
  if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=url;$('#art-name').value='';showSource(img,file.name)
 }catch{status('无法读取这张图片',true)}}
$('#image-file').onchange=e=>loadFile(e.target.files[0]);
['dragenter','dragover'].forEach(name=>$('#drop-zone').addEventListener(name,e=>{e.preventDefault();$('#drop-zone').classList.add('dragging')}));
['dragleave','drop'].forEach(name=>$('#drop-zone').addEventListener(name,e=>{e.preventDefault();$('#drop-zone').classList.remove('dragging');if(name==='drop')loadFile(e.dataTransfer.files[0])}));
$('#sample-button').onclick=async()=>{++selectionToken;const img=new Image();img.src=sprite('cat').toDataURL();await img.decode();if(sourceURL){URL.revokeObjectURL(sourceURL);sourceURL=null}$('#art-name').value='';showSource(img,'午睡的橘子')};
function pick(attr,key,parse=v=>v){$$(`[data-${attr}]`).forEach(b=>b.onclick=()=>{opts[key]=parse(b.dataset[attr]);$$(`[data-${attr}]`).forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});rebuild()})}
pick('phase','phase');pick('size','size');pick('air','airborne',v=>v==='true');
$('#giant-extent').oninput=e=>{opts.extent=Number(e.target.value);$('#giant-extent-value').value=opts.extent;rebuild()};
$('#art-name').addEventListener('change',rebuild);
$('#preview-reset').onclick=()=>{clearInput();previewWorld.reset();$('#preview-game').focus({preventScroll:true})};
$('#download-submission').onclick=()=>{if(!processedImage)return;const link=document.createElement('a');link.href=processedImage.toDataURL('image/png');link.download='PixelWalk-'+artTitle().replace(/[\\/:*?"<>|\s]+/g,'_')+'.png';link.click()};
$('#submit-issue').addEventListener('click',e=>{if(!processedImage){e.preventDefault();return}$('#submit-issue').href=issueLink();$('#download-submission').click()});
// Decode at most 640px on the long side; pixelate.js does the real work on raw RGBA.
function processImage(img,size){const scale=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);const result=PixelWalkPixelate.pixelate(g.getImageData(0,0,c.width,c.height),size),out=document.createElement('canvas');out.width=out.height=160;out.getContext('2d').putImageData(new ImageData(result.data,160,160),0,0);return out}
window.addEventListener('pagehide',()=>{clearInput();if(sourceURL)URL.revokeObjectURL(sourceURL);bgm.dispose()});
