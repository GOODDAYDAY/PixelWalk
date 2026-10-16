/* PixelWalk: dependency-free world simulation and shared Canvas renderer. */
(function(root){
'use strict';
const config=root.PixelWalkConfig||(typeof require==='function'?require('./settings.js'):null),settings=config.values;
const CFG={width:960,height:540,ground:432,playerX:144,speed:80,stride:1328,container:320,recycleMargin:64,transition:320,spawnMargin:48,cabinDoorX:-724,cabinMinX:-1008,...settings};
const DAY=[['bakery','风从面包房来','large'],['balloon','把云寄给你','giant'],['cat','午睡的橘子','small'],['tree','一棵树的下午','large'],['windmill','风的邮局','giant']];
const NIGHT=[['observatory','收集星光的人','giant'],['ufo','远道而来的朋友','giant'],['lamp','晚归的一盏灯','medium'],['mushroom','月光小屋','large'],['fox','睡前的好梦','small']];
const builtinCatalog=[...DAY.map(a=>[...a,'day']),...NIGHT.map(a=>[...a,'night'])].map(([id,title,size,phase])=>({id,title,size,phase,author:'Lin',airborne:['balloon','ufo'].includes(id)}));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const noise=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
const MOON_PHASES=['new','first-quarter','full','last-quarter'];
class World{
 constructor(options={}){this.catalog=options.catalog||builtinCatalog;this.candidate=options.candidate||null;this.preview=!!options.preview;this.reset()}
 reset(){this.x=0;this.distance=0;this.passed=0;this.locked=false;this.direction=1;this.walking=false;this.scenes=[];this.nextOrdinal=1;this.nextX=370;this.transitions=[];this.stableNight=0;this.completedNights=0;this.houseOpen=false;this.seed=17;this.recent=[];this.populate()}
 populate(){if(this.preview){if(!this.scenes.length){const art=this.candidate||{id:'tree',title:'一棵树的下午',size:'large'},span=sceneSpan(art),x=370-span.left;this.scenes=[{ordinal:1,x,passX:x+span.right,phase:art.phase||'day',art,passed:false}]}return}
 while(this.nextX<this.x+CFG.width+CFG.stride*2){const ordinal=this.nextOrdinal,phase=Math.floor((ordinal-1)/CFG.scenesPerPhase)%2?'night':'day';
 let pool=this.catalog.filter(a=>a.phase===phase);if(!pool.length){this.nextX+=CFG.stride;this.nextOrdinal++;if(ordinal%CFG.scenesPerPhase===0){const start=this.nextX-320,end=start+CFG.transition;this.transitions.push({start,end,from:phase,to:phase==='day'?'night':'day',ordinal})}continue}
 let choices=pool.filter(a=>!this.recent.includes(a.id));if(!choices.length)choices=pool;
 const art=ordinal===1?(pool.find(a=>a.id==='bakery')||pool[0]):choices[Math.floor(noise(this.seed++)*choices.length)];this.recent.push(art.id);if(this.recent.length>8)this.recent.shift();
 const span=sceneSpan(art),x=this.nextX-span.left,scene={ordinal,x,passX:x+span.right,phase,art,passed:false};this.scenes.push(scene);
 if(ordinal%CFG.scenesPerPhase===0){const start=scene.passX+CFG.playerX+CFG.recycleMargin,end=start+CFG.transition;this.transitions.push({start,end,from:phase,to:phase==='day'?'night':'day',ordinal});this.nextX=end+CFG.width-CFG.playerX+CFG.spawnMargin}else this.nextX=scene.passX+Math.max(CFG.stride-CFG.container,CFG.width+CFG.spawnMargin);this.nextOrdinal++;
 }
 }
 update(dt,input){if(this.houseOpen){this.walking=false;return 0}dt=clamp(dt,0,.05);let dir=(input.right?1:0)-(input.left?1:0);if(this.locked&&dir<0)dir=0;const old=this.x;this.x=Math.max(this.preview?0:CFG.cabinMinX,this.x+dir*CFG.speed*dt);if(this.preview)this.x=Math.min(Math.max(1000,...this.scenes.map(s=>s.passX+CFG.playerX)),this.x);this.walking=this.x!==old;if(this.walking)this.direction=dir;this.distance+=Math.abs(this.x-old);const before=this.passed;
 for(const s of this.scenes){if(!s.passed&&this.x>=s.passX){s.passed=true;this.passed++;this.locked=true}}
 this.populate();if(this.locked&&!this.preview)this.scenes=this.scenes.filter(s=>s.passX-this.x+CFG.playerX>=-CFG.recycleMargin);
 while(this.transitions.length&&this.x>=this.transitions[0].end){const transition=this.transitions.shift();this.stableNight=transition.to==='night'?1:0;if(transition.from==='night')this.completedNights++}return this.passed-before;
 }
 environment(){const moonPhase=MOON_PHASES[this.completedNights%MOON_PHASES.length];if(this.preview)return{night:this.candidate?.phase==='night'?1:0,label:this.candidate?.phase==='night'?'night':'day',progress:0,moonPhase};let night=this.stableNight,label=night?'night':'day';for(const t of this.transitions){if(this.x>=t.end){night=t.to==='night'?1:0;label=t.to;continue}if(this.x>=t.start){const p=clamp((this.x-t.start)/(t.end-t.start));return{night:t.from==='day'?p:1-p,label:t.from==='day'?'day_to_night':'night_to_day',progress:p,moonPhase}}if(this.passed>=t.ordinal){return{night:t.from==='night'?1:0,label:'departure',progress:0,moonPhase}}break}return{night,label,progress:0,moonPhase}}
 get inCabinPage(){return !this.preview&&this.x<-CFG.playerX}
 get cameraX(){return this.inCabinPage?-CFG.width-CFG.playerX:Math.max(0,this.x)-CFG.playerX}
 get playerScreenX(){return this.x-this.cameraX}
 canEnterHouse(){return this.inCabinPage&&!this.locked&&Math.abs(this.x-CFG.cabinDoorX)<=28}
 enterHouse(){if(!this.canEnterHouse())return false;this.houseOpen=true;this.walking=false;return true}
 leaveHouse(){this.houseOpen=false}
 visibleScenes(){return this.scenes.filter(s=>s.x+sceneSpan(s.art).left-this.cameraX<CFG.width&&s.passX-this.cameraX>0)}
 activeScene(){return this.scenes.find(s=>!s.passed)||this.scenes[this.scenes.length-1]}
}
class TravelControls {
 constructor(){this.immersive=false;this.autoWalking=false}
 setImmersive(value){this.immersive=!!value;this.autoWalking=false}
 pressForward(){if(this.immersive)this.autoWalking=true}
 stop(){this.autoWalking=false}
 input(left,right){return {left:!this.autoWalking&&left,right:right||(this.immersive&&this.autoWalking)}}
}
// Movement keys are accepted unless a dialog is open or the user is typing.
// Buttons and links stay excluded only for their own activation keys (handled
// by callers via preventDefault), so pressing D after clicking BGM still walks.
function acceptsGameKeys(active,dialogOpen){
 if(dialogOpen)return false;if(!active)return true;
 const tag=String(active.tagName||'').toUpperCase();
 if(tag==='TEXTAREA'||tag==='SELECT'||active.isContentEditable)return false;
 if(tag==='INPUT')return ['button','checkbox','radio','range','file','submit','reset'].includes(String(active.type||'').toLowerCase());
 return true;
}
function filterContributors(items,query=''){
 const seen=new Set(),q=query.trim().toLocaleLowerCase();
 return items.filter(person=>{if(!person||!person.name||person.userId==null||seen.has(String(person.userId)))return false;seen.add(String(person.userId));return !q||[person.name,person.github||''].some(x=>String(x).toLocaleLowerCase().includes(q))});
}
const colors={day:{sky:'#c2e4df',haze:'#e5edd5',mountain:'#a6cac2',mountain2:'#86b8ae',hill:'#81af83',hill2:'#68a17c',grass:'#8fba72',grass2:'#6f9e62',earth:'#a4a47a',road:'#d9c69b',road2:'#c4b387',front:'#446d50'},night:{sky:'#23364f',haze:'#566d78',mountain:'#354d64',mountain2:'#34576b',hill:'#3d6967',hill2:'#335d57',grass:'#52795e',grass2:'#3a6351',earth:'#526254',road:'#879381',road2:'#6b7d6c',front:'#25453e'}};
function mix(a,b,t){const c=x=>x.startsWith('#')?[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)):x.match(/\d+/g).slice(0,3).map(Number);const aa=c(a),bb=c(b);return `rgb(${aa.map((n,i)=>Math.round(n+(bb[i]-n)*t)).join(',')})`}
function rect(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))}
// A 16-by-16 stepped disc, drawn on the landscape's two-unit pixel grid.
// New moon has only a quiet unlit silhouette; quarters light opposite halves.
function drawMoon(ctx,phase,sky){for(let y=0;y<16;y++)for(let x=0;x<16;x++){
 if((x-7.5)**2+(y-7.5)**2>64)continue;
 const lit=phase==='full'||phase==='first-quarter'&&x>=8||phase==='last-quarter'&&x<8;
 rect(ctx,774+x*2,54+y*2,2,2,lit?'#ece7ba':mix(sky,'#71818b',.15));
}}
function polygon(ctx,pts,c){ctx.fillStyle=c;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill()}
const spriteCache=new Map();
function sprite(id){if(spriteCache.has(id))return spriteCache.get(id);const c=document.createElement('canvas');c.width=160;c.height=160;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)},p=(pts,col)=>polygon(g,pts,col);
 const green='#4e7851',leaf='#739b53',light='#9bbd65',dark='#354f40',wood='#80634b',cream='#f4dfa8',roof='#a56555',ink='#515b51';
 if(id==='bakery'||id==='mushroom'){
 const mush=id==='mushroom';r(27,68,108,80,'#b9a577');r(31,73,100,71,cream);r(31,119,100,25,'#d3b781');r(25,143,112,9,wood);r(31,149,100,5,dark);r(39,49,17,28,wood);r(42,42,18,8,roof);
 p([[19,72],[19,62],[29,62],[29,52],[40,52],[40,42],[52,42],[52,32],[106,32],[106,42],[116,42],[116,52],[127,52],[127,62],[140,62],[140,75]],mush?'#a17e91':roof);
 for(let y=40;y<72;y+=10)for(let x=32;x<130;x+=18)if(x>60-y/2&&x<100+y/2)r(x+(y%20?0:8),y,12,2,mush?'#c69aab':'#c78b6b');r(19,73,121,5,wood);r(72,101,28,44,wood);r(77,105,18,35,'#627977');r(91,124,2,4,cream);
 for(const x of [40,108]){r(x,91,17,28,wood);r(x+3,94,11,20,mush?'#e7d28a':'#88b1a4');r(x+7,94,2,20,cream);r(x,104,17,2,cream);r(x-3,119,23,5,wood);r(x-2,116,6,5,leaf);r(x+13,115,6,6,leaf)}
 r(59,78,50,15,'#4d6c59');g.fillStyle=cream;g.font='bold 7px monospace';g.textAlign='center';g.fillText(mush?'MOON':'BAKERY',84,88);r(32,127,22,15,roof);r(30,124,26,4,cream);r(36,130,14,2,'#f3c989');r(122,134,14,18,wood);r(118,128,20,9,leaf);r(128,124,7,7,light);
 }else if(id==='tree'){
 r(72,65,18,86,wood);r(79,61,7,90,'#9d7c50');r(67,147,30,7,wood);p([[80,110],[50,76],[54,69],[81,96]],wood);p([[84,89],[110,61],[118,65],[88,108]],wood);
 const clusters=[[29,46,47,45],[48,21,53,56],[88,34,47,57],[18,62,49,33],[57,53,65,45]];clusters.forEach(([x,y,w,h],i)=>{r(x+7,y,w-14,h,dark);r(x,y+9,w,h-18,dark);r(x+3,y+6,w-6,h-15,green);r(x+8,y+2,w-16,h-18,leaf);r(x+12,y+6,w-25,10,light)});for(let i=0;i<45;i++)r(25+noise(i)*100,39+noise(i+90)*40,3,3,noise(i+3)>.5?light:leaf);
 }else if(id==='balloon'){
 r(68,130,27,21,wood);r(72,133,19,13,'#cba774');r(68,137,27,3,'#9b7c58');r(67,105,3,27,ink);r(94,105,3,27,ink);p([[55,99],[67,126],[70,125],[59,99]],ink);p([[104,99],[94,126],[91,125],[100,99]],ink);
 p([[41,25],[52,14],[106,14],[120,29],[127,48],[125,74],[112,99],[98,113],[64,113],[48,98],[34,72],[33,48]],roof);p([[53,21],[66,15],[95,15],[110,28],[114,60],[104,91],[92,110],[70,110],[57,89],[47,58]],'#e7bd82');p([[73,14],[87,14],[95,36],[96,68],[88,100],[84,112],[76,112],[68,86],[65,57],[67,30]],'#f6e4b4');r(40,48,80,3,'#f4dba0');r(47,83,66,3,'#bd8064');r(68,113,26,5,wood);
 }else if(id==='cat'||id==='fox'){
 const fur=id==='fox'?'#bc7c4b':'#dca465';p([[35,78],[35,41],[48,41],[60,57],[91,57],[106,40],[119,40],[119,86]],fur);r(34,72,88,45,fur);r(49,107,70,34,fur);r(46,137,24,10,fur);r(94,137,26,10,fur);r(113,110,20,24,fur);r(127,88,12,34,fur);r(130,82,12,12,'#f2dfaa');r(43,51,8,15,'#dfa098');r(104,50,8,16,'#dfa098');r(45,87,10,7,dark);r(100,87,10,7,dark);r(68,94,22,19,cream);r(75,95,8,5,'#7e6256');r(63,64,8,15,'#b47e4f');r(80,63,7,17,'#b47e4f');r(97,63,7,13,'#b47e4f');r(58,118,8,15,'#b47e4f');
 }else if(id==='windmill'){
 p([[52,147],[61,61],[99,61],[111,147]],'#ded2aa');r(50,147,64,7,wood);p([[55,64],[80,35],[105,64]],roof);r(75,126,15,21,wood);r(73,85,17,22,'#638980');r(78,85,3,22,cream);r(73,95,17,3,cream);
 const cx=80,cy=68;[[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy])=>{p([[cx+dx*10-dy*4,cy+dy*10+dx*4],[cx+dx*62-dy*5,cy+dy*62+dx*5],[cx+dx*62+dy*10,cy+dy*62-dx*10],[cx+dx*11+dy*10,cy+dy*11-dx*10]],'#f2e5bc');for(let j=19;j<60;j+=10)r(cx+dx*j-3,cy+dy*j-3,6,6,'#b8a986')});r(75,63,10,10,wood);
 }else if(id==='observatory'){
 r(31,81,100,67,'#9faab0');r(39,90,84,52,'#bcc2b5');r(28,144,109,10,'#748893');p([[25,84],[25,62],[35,62],[35,45],[49,45],[49,34],[108,34],[108,45],[121,45],[121,62],[133,62],[133,84]],'#557d88');r(25,81,108,7,'#d3c499');r(78,34,10,46,'#385a72');r(82,34,3,46,'#8aaeb0');p([[88,45],[116,22],[125,31],[97,55]],'#aebfb6');r(116,20,13,13,'#d2c5a5');r(73,116,20,31,'#3c5967');r(77,121,12,17,'#ebcf88');[45,105].forEach(x=>{r(x,104,14,20,'#425e70');r(x+3,107,8,14,'#f3d997')});r(31,94,100,4,'#8b9a9e');
 }else if(id==='ufo'){
 p([[51,53],[62,37],[99,37],[111,53],[111,76],[51,76]],'#92c2bd');r(64,40,31,7,'#c5ddd2');r(55,56,51,20,'#649c9e');p([[25,78],[45,65],[117,65],[137,78],[137,91],[119,104],[43,104],[25,91]],'#6a7b98');r(19,80,124,13,'#a7a3ad');r(27,91,108,7,'#586a83');for(let i=0;i<5;i++)r(36+i*20,82,8,5,'#eadd8d');r(64,104,35,6,'#8097a5');
 }else if(id==='lamp'){
 r(76,47,9,103,wood);r(65,148,31,6,ink);r(65,29,31,29,'#e6c981');r(70,33,21,22,'#f8e7a8');r(63,25,35,6,ink);r(67,54,27,6,ink);r(64,29,4,27,ink);r(93,29,4,27,ink);p([[61,25],[80,11],[100,25]],ink);r(79,30,3,25,wood);
 }else if(id==='hut'){
 r(24,74,112,77,wood);for(let y=77;y<150;y+=9)r(24,y,112,2,'#a17d54');p([[13,78],[13,65],[24,65],[24,54],[37,54],[37,43],[51,43],[51,32],[107,32],[107,43],[120,43],[120,54],[132,54],[132,65],[145,65],[145,78]],'#566e52');for(let y=42;y<75;y+=9)r(60-(y-40),y,40+(y-40)*2,2,'#728462');r(68,105,28,46,'#454d3e');r(73,108,19,40,'#a78b5c');r(86,128,3,3,cream);r(36,100,21,25,'#e3cd8d');r(105,100,21,25,'#e3cd8d');r(45,100,3,25,wood);r(114,100,3,25,wood);r(61,83,43,13,cream);g.fillStyle=wood;g.font='7px monospace';g.fillText('WELCOME',65,92);r(20,150,122,6,'#4a5942');
 }
 spriteCache.set(id,c);return c;
}
const boundsCache=new WeakMap();
function artworkBounds(art){
 if(typeof document==='undefined')return {x:0,y:0,width:160,height:160};
 if(boundsCache.has(art))return boundsCache.get(art);const bitmap=artworkBitmap(art);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,160,160);
 const data=ctx.getImageData(0,0,160,160).data;let left=160,top=160,right=-1,bottom=-1;
 for(let y=0;y<160;y++)for(let x=0;x<160;x++)if(data[(y*160+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 const bounds=right>=left?{x:left,y:top,width:right-left+1,height:bottom-top+1}:{x:0,y:0,width:160,height:160};boundsCache.set(art,bounds);return bounds;
}
function placement(art){
 const floor=CFG.ground-(art.airborne?CFG.airborneOffset:0);
 if(art.size==='giant'){
  const bounds=artworkBounds(art),requested=Number.isInteger(art.extent)?clamp(art.extent,config.artwork.giantMin,config.artwork.giantMax):config.artwork.giantDefault;
  const scale=Math.min(requested/Math.max(bounds.width,bounds.height),CFG.width/bounds.width,floor/bounds.height);
  const width=Math.max(1,Math.floor(bounds.width*scale)),height=Math.max(1,Math.floor(bounds.height*scale));
  return {size:Math.max(width,height),width,height,x:Math.floor((CFG.container-width)/2),y:floor-height};
 }
 const size={small:64,medium:128,large:224}[art.size]||128;return {size,x:(320-size)/2,y:floor-size};
}
function sceneSpan(art){const p=placement(art);return {left:Math.min(0,p.x),right:Math.max(CFG.container,p.x+(p.width||p.size))}}
// Normalize built-in pieces to the same 160px transparent tile used by uploads.
// Small/medium/large retain the 2-world-unit grid; giants fit their chosen extent.
const artworkCache=new Map();
function artworkBitmap(art){
 if(art.image)return art.image;
 const key=art.id+':'+art.size;if(artworkCache.has(key))return artworkCache.get(key);
 const source=sprite(art.id),data=source.getContext('2d').getImageData(0,0,160,160).data;
 let left=160,top=160,right=-1,bottom=-1;
 for(let y=0;y<160;y++)for(let x=0;x<160;x++)if(data[(y*160+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 const tile=document.createElement('canvas');tile.width=tile.height=160;
 if(right>=left){const max=({small:32,medium:64,large:112,giant:160}[art.size]||64),sw=right-left+1,sh=bottom-top+1,scale=max/Math.max(sw,sh),dw=Math.max(1,Math.round(sw*scale)),dh=Math.max(1,Math.round(sh*scale)),ctx=tile.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(source,left,top,sw,sh,Math.floor((160-dw)/2),160-dh,dw,dh)}
 artworkCache.set(key,tile);return tile;
}
class Renderer{
 constructor(canvas,world){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.buffer=document.createElement('canvas');this.buffer.width=960;this.buffer.height=540;this.g=this.buffer.getContext('2d');this.world=world;this.reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches}
 draw(time=0){const w=this.world,viewX=w.cameraX+CFG.playerX,env=w.environment(),n=env.night,g=this.g;g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;const pal={};for(const k in colors.day)pal[k]=mix(colors.day[k],colors.night[k],n);
 rect(g,0,0,960,540,pal.sky);rect(g,0,150,960,140,mix(pal.sky,pal.haze,.4));rect(g,0,230,960,140,pal.haze);
 if(n>.05){g.globalAlpha=n;for(let i=0;i<48;i++){const x=noise(i+5)*960,y=28+noise(i+60)*200;rect(g,x,y,2+(i%7===0?2:0),2,'#e4e6ce')}drawMoon(g,env.moonPhase,pal.sky);g.globalAlpha=1}
 g.globalAlpha=1-n;rect(g,770-viewX*.015%100,63,42,42,'#f5edba');g.globalAlpha=1;
 for(let i=0;i<7;i++){let x=((i*213-viewX*.1+(this.reduced?0:time*.003))%1460+1460)%1460-200;const y=70+noise(i)*95;g.globalAlpha=.75-n*.5;rect(g,x+15,y,94,16,'#f4f5df');rect(g,x+35,y-10,47,12,'#f4f5df');rect(g,x,y+12,138,10,'#f4f5df');g.globalAlpha=1}
 const layer=(base,height,speed,col,seed)=>{const points=[[0,540]];for(let x=-8;x<=968;x+=8){const xx=x+viewX*speed;const y=base-Math.sin(xx/230+seed)*height-Math.sin(xx/87+seed)*height*.22;points.push([x,Math.round(y/4)*4])}points.push([960,540]);polygon(g,points,col)};
 layer(290,65,.12,pal.mountain,2);layer(320,43,.21,pal.mountain2,6);layer(355,40,.35,pal.hill,1);layer(390,23,.5,pal.hill2,5);
 // Small distant conifers are part of the landscape, not counted artworks.
 for(let i=0;i<26;i++){const wx=Math.floor(viewX*.45/115)*115+i*115-100;const sx=wx-viewX*.45,y=370+noise(wx)*28,h=18+noise(wx+3)*30;rect(g,sx+8,y,4,14,pal.hill2);polygon(g,[[sx-5,y],[sx+10,y-h],[sx+26,y]],pal.hill2)}
 rect(g,0,400,960,34,pal.grass);rect(g,0,428,960,8,pal.grass2);rect(g,0,436,960,8,pal.earth);rect(g,0,444,960,50,pal.road);rect(g,0,490,960,8,pal.road2);rect(g,0,498,960,42,pal.front);
 for(let i=0;i<135;i++){const wx=Math.floor(viewX/37)*37+i*37-150,sx=wx-viewX;const yy=404+noise(wx+11)*23;rect(g,sx,yy,4+noise(wx)*9,2,noise(wx+4)>.5?pal.grass2:mix(pal.grass,'#cfdb95',.25));if(i%4===0){rect(g,sx,yy-5,2,5,pal.grass2);rect(g,sx-2,yy-6,5,3,mix('#eee3a2','#9fbd9a',n))}rect(g,sx+noise(wx+3)*23,452+noise(wx+7)*34,4+noise(wx+6)*12,2,noise(wx+2)>.5?pal.road2:mix(pal.road,'#e8d8ac',.5))}
 if(w.inCabinPage){g.drawImage(sprite('hut'),240,152,280,280);rect(g,358,427,43,6,pal.road2);rect(g,250,431,260,4,pal.grass2)}
 for(const scene of w.scenes){const sx=scene.x-viewX+144,a=scene.art,p=placement(a),span=sceneSpan(a);if(sx+span.left>1030||sx+span.right<-80)continue;const width=p.width||p.size,height=p.height||p.size;if(!a.airborne){g.globalAlpha=.15;rect(g,sx+160-width*.4,429,width*.8,6,'#243f35');g.globalAlpha=1}if(a.size==='giant'){const b=artworkBounds(a);g.drawImage(artworkBitmap(a),b.x,b.y,b.width,b.height,Math.round(sx)+p.x,p.y,width,height)}else g.drawImage(artworkBitmap(a),Math.round(sx/2)*2,CFG.ground-320-(a.airborne?CFG.airborneOffset:0),320,320);if(n>.2&&['lamp','mushroom','observatory'].includes(a.id)){g.globalAlpha=n*.14;rect(g,sx+p.x+width*.25,p.y+height*.4,width*.5,height*.5,'#ffe8a2');g.globalAlpha=1}}
 this.player(time,n);
 for(let i=0;i<33;i++){const wx=Math.floor(viewX/41)*41+i*41-80,sx=wx-viewX;const yy=501+noise(wx)*35;rect(g,sx,yy,3,8,mix('#63865a','#385e4c',n));rect(g,sx+4,yy+4,7,2,mix('#75955e','#416951',n));if(i%5===0){rect(g,sx+7,yy-1,4,4,mix('#d5c681','#6e9773',n))}}
 if(n>.25&&!this.reduced){g.globalAlpha=n*.7;for(let i=0;i<9;i++){const x=((noise(i+6)*1200-viewX*.8)%1100+1100)%1100,y=345+noise(i+22)*80+Math.sin(time/1000+i)*7;rect(g,x,y,2,2,'#f1dfa0')}g.globalAlpha=1}
 const ctx=this.ctx;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,960,540);ctx.drawImage(this.buffer,0,0,960,540);
 }
 player(time,night){const g=this.g,w=this.world,x=Math.round(w.playerScreenX),step=w.walking?Math.floor(w.distance/8)%4:0,bob=w.walking&&step%2?2:0,y=432-bob;g.save();g.translate(x,y);if(w.direction<0)g.scale(-1,1);g.globalAlpha=.16;rect(g,-14,0,30,4,'#1e392b');g.globalAlpha=1;const shoe='#384c49',pants='#58666b';rect(g,-7,-16,6,12,pants);rect(g,3,-16,6,12,pants);rect(g,-9-(step===1?4:0),-5,10,5,shoe);rect(g,2+(step===3?4:0),-5,10,5,shoe);rect(g,-10,-31,20,19,'#d1a557');rect(g,-15,-31,7,17,'#6e7960');rect(g,-16,-29,3,12,'#9ba280');rect(g,9,-27,5,13,'#e2bf8b');rect(g,-8,-44,20,16,'#e8c697');rect(g,-9,-45,22,7,'#574c41');rect(g,-10,-44,5,15,'#574c41');rect(g,8,-37,3,3,'#354d46');rect(g,-10,-48,23,7,'#b16f50');rect(g,-5,-52,15,6,'#c8875b');rect(g,-15,-43,32,4,'#d8a270');rect(g,-8,-30,20,4,'#a56c4b');g.restore()}
}
root.PixelWalk={acceptsGameKeys,builtinCatalog,artworkBitmap,artworkBounds,CFG,World,Renderer,TravelControls,filterContributors,sprite,placement,clamp,spriteCache,MOON_PHASES,drawMoon};if(typeof module!=='undefined')module.exports={acceptsGameKeys,builtinCatalog,CFG,World,TravelControls,filterContributors,placement,MOON_PHASES,drawMoon};
})(typeof window!=='undefined'?window:globalThis);
