const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World,CFG,TravelControls,filterContributors,placement,drawMoon}=require('../engine.js');
const {musicMix}=require('../music.js');
function walk(w,x){while(w.x<x-.000001)w.update(Math.min(.05,(x-w.x)/CFG.speed),{right:true})}
test('80 units/second at 30, 60 and 144 Hz; release stops movement',()=>{for(const fps of [30,60,144]){const w=new World();for(let i=0;i<fps*6;i++)w.update(1/fps,{right:true});assert.ok(Math.abs(w.x-480)<1e-7);const x=w.x;w.update(.05,{});assert.equal(w.x,x)}});
test('cabin page changes only after reaching the left screen edge; entry still requires W at the door',()=>{const w=new World();assert.equal(w.inCabinPage,false);assert.equal(w.playerScreenX,144);assert.equal(w.enterHouse(),false);
 w.update(.05,{left:true});assert.equal(w.inCabinPage,false);assert.equal(w.cameraX,-144);assert.equal(w.playerScreenX,140);
 while(w.x>-CFG.playerX)w.update(.05,{left:true});assert.equal(w.playerScreenX,0);assert.equal(w.inCabinPage,false);
 w.update(.05,{left:true});assert.equal(w.inCabinPage,true);assert.equal(w.cameraX,-1104);assert.equal(w.playerScreenX,956);assert.equal(w.visibleScenes().length,0);assert.equal(w.enterHouse(),false);
 while(w.x>CFG.cabinDoorX)w.update(.05,{left:true});assert.equal(w.houseOpen,false);assert.equal(w.canEnterHouse(),true);assert.equal(w.enterHouse(),true);const x=w.x;w.update(.05,{right:true});assert.equal(w.x,x);assert.equal(w.passed,0);w.leaveHouse();walk(w,-CFG.playerX);assert.equal(w.inCabinPage,false);assert.equal(w.playerScreenX,0);walk(w,0);assert.equal(w.playerScreenX,144)});
test('first scene survives return; first pass locks reverse exactly once',()=>{const w=new World(),first=w.scenes[0];walk(w,500);for(let i=0;i<400;i++)w.update(.05,{left:true});assert.equal(w.x,CFG.cabinMinX);assert.equal(w.scenes[0],first);walk(w,first.passX);assert.equal(w.passed,1);assert.equal(w.locked,true);const x=w.x;for(let i=0;i<100;i++)w.update(.05,{left:true});assert.equal(w.x,x);assert.equal(w.passed,1)});
test('15+ scenes grouped correctly; transitions wait for exit and pause with movement',()=>{const w=new World();while(w.passed<16){const s=w.scenes.find(s=>!s.passed);assert.equal(s.phase,Math.floor((s.ordinal-1)/5)%2?'night':'day');walk(w,s.passX);if(w.passed%5===0){const t=w.transitions.find(t=>t.ordinal===w.passed);assert.equal(w.environment().label,'departure');walk(w,t.start);const old=w.scenes.find(s=>s.ordinal===w.passed);if(old)assert.ok(old.passX-w.x+CFG.playerX<=-CFG.recycleMargin);walk(w,t.start+160);const n=w.environment().night;for(let i=0;i<100;i++)w.update(.05,{});assert.equal(w.environment().night,n);assert.ok(Math.abs(n-.5)<.00001);walk(w,t.end);const next=w.scenes.find(s=>s.ordinal===w.passed+1);assert.ok(next.x-w.x+CFG.playerX>=CFG.width+CFG.spawnMargin);assert.equal(w.environment().label,w.passed%10===5?'night':'day')}}});
test('30 minute simulation never shows two artworks and keeps correct phase after history recycling',()=>{const w=new World();let peak=0,maxVisible=0;for(let i=0;i<1800*20;i++){w.update(.05,{right:true});peak=Math.max(peak,w.scenes.length);const visible=w.visibleScenes();maxVisible=Math.max(maxVisible,visible.length);assert.ok(visible.length<=1);const env=w.environment();if(visible.length&&['day','night'].includes(env.label))assert.equal(visible[0].phase,env.label)}assert.ok(w.passed>80);assert.ok(peak<=6);assert.ok(w.transitions.length<=2);console.log(`30 min simulation: ${w.passed} passed, peak ${peak} instances, max ${maxVisible} visible artworks`)});
test('immersive requires initial forward press, sustains after release, exit stops immediately',()=>{const c=new TravelControls(),w=new World();c.setImmersive(true);w.update(.05,c.input(false,false));assert.equal(w.x,0);c.pressForward();for(let i=0;i<100;i++)w.update(.05,c.input(false,false));assert.equal(w.x,400);c.setImmersive(false);w.update(.05,c.input(false,false));assert.equal(w.x,400);c.pressForward();w.update(.05,c.input(false,false));assert.equal(w.x,400);c.setImmersive(true);c.pressForward();c.stop();assert.equal(c.input(false,false).right,false)});
test('contributors are empty by default; search supports names, handles and ID deduplication',()=>{assert.deepEqual(filterContributors([]),[]);const names=Array.from({length:1000},(_,i)=>({userId:i,name:'Test '+i,github:'person-'+i}));assert.equal(filterContributors(names).length,1000);assert.deepEqual(filterContributors(names,' PERSON-998 '),[names[998]]);assert.equal(filterContributors([names[0],names[0]]).length,1);assert.equal(filterContributors(names,'no-match').length,0)});
test('music uses equal-power day/night crossfade at the default 10% volume',()=>{assert.deepEqual(musicMix(0),[.1,0]);const [a,b]=musicMix(.5);assert.ok(Math.abs(a-b)<1e-10);assert.ok(Math.abs(a*a+b*b-.01)<1e-10);const [day,night]=musicMix(1);assert.ok(day<1e-10);assert.equal(night,.1)});
test('preview remains independent and obeys same placement',()=>{const main=new World(),p=new World({preview:true,candidate:{phase:'night',size:'giant',airborne:true}});walk(p,690);assert.equal(p.passed,1);assert.equal(main.passed,0);assert.equal(p.environment().night,1);assert.deepEqual(placement({size:'giant',airborne:true}),{size:320,x:0,y:16})});
test('frame stall is capped and cabin lower bound holds',()=>{const w=new World();w.update(90,{right:true});assert.equal(w.x,4);for(let i=0;i<500;i++)w.update(.05,{left:true});assert.equal(w.x,CFG.cabinMinX)});
test('moon cycles once per completed night, survives recycling, pauses and resets',()=>{
 const w=new World(),phases=['new','first-quarter','full','last-quarter','new'];
 for(let night=0;night<phases.length;night++){
  while(w.passed<(night+1)*10){const scene=w.scenes.find(s=>!s.passed);walk(w,scene.passX);if(w.passed===night*10+6){assert.equal(w.environment().night,1);assert.equal(w.environment().moonPhase,phases[night])}}
  const dawn=w.transitions.find(t=>t.from==='night');walk(w,dawn.start+CFG.transition/2);
  for(let i=0;i<100;i++)w.update(.05,{});
  assert.equal(w.completedNights,night);assert.equal(w.environment().moonPhase,phases[night]);
  walk(w,dawn.end);assert.equal(w.completedNights,night+1);
  for(let i=0;i<100;i++)w.update(.05,{});assert.equal(w.completedNights,night+1);
 }
 const preview=new World({preview:true,candidate:{phase:'night'}});walk(preview,1000);assert.equal(preview.completedNights,0);
 w.reset();assert.equal(w.completedNights,0);assert.equal(w.environment().moonPhase,'new');
});
test('moon silhouettes have opposite lit quarters, a full disc and a dark new moon',()=>{
 const samples=phase=>{const pixels=[];const ctx={fillStyle:'',fillRect(x,y,w,h){pixels.push({x,y,w,h,color:this.fillStyle})}};drawMoon(ctx,phase,'rgb(35,54,79)');assert.ok(pixels.every(p=>!p.color.includes('NaN')&&p.w===2&&p.h===2));return pixels.filter(p=>p.color==='#ece7ba')};
 const first=samples('first-quarter'),last=samples('last-quarter'),full=samples('full');
 assert.equal(samples('new').length,0);assert.equal(first.length,last.length);assert.equal(full.length,first.length+last.length);
 assert.ok(first.every(p=>p.x>=790));assert.ok(last.every(p=>p.x<790));
});
