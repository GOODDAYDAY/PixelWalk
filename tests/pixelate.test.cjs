const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pixelate,SIZES}=require('../pixelate.js');

// Photo-like source: a shaded, noisy sphere with a soft anti-aliased edge.
function sphere(W=400,H=360){
 const data=new Uint8ClampedArray(W*H*4);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const dx=(x-W/2)/150,dy=(y-H/2)/150,d=Math.hypot(dx,dy),i=(y*W+x)*4;
  const light=Math.max(0,1-Math.hypot(dx+.4,dy+.4)*.8),n=(rnd()-.5)*40;
  data[i]=60+170*light+n;data[i+1]=120+100*light+n;data[i+2]=70+60*light+n;
  data[i+3]=Math.max(0,Math.min(255,(1-d)*255*12));
 }
 return {width:W,height:H,data};
}
const colourAt=(t,x,y)=>{const i=(y*160+x)*4;return t.data[i+3]?`${t.data[i]},${t.data[i+1]},${t.data[i+2]}`:'clear'};

for(const size of Object.keys(SIZES))test(`${size}: every art pixel is a solid ${SIZES[size].block}px block`,()=>{
 const t=pixelate(sphere(),size),{cols,rows,block}=t.grid,ox=Math.floor((160-cols*block)/2),oy=160-rows*block;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const ref=colourAt(t,ox+c*block,oy+r*block);
  for(let y=0;y<block;y++)for(let x=0;x<block;x++)assert.equal(colourAt(t,ox+c*block+x,oy+r*block+y),ref)}
 // Bottom-centred, within the size budget.
 assert.ok(cols*block<=SIZES[size].max+2*block&&rows*block<=SIZES[size].max+2*block);
});

test('hard edges: binary alpha, limited palette, no in-between blur colours',()=>{
 const t=pixelate(sphere(),'large'),seen=new Set();
 for(let i=0;i<t.data.length;i+=4){assert.ok(t.data[i+3]===0||t.data[i+3]===255);if(t.data[i+3])seen.add(colourAt(t,(i/4)%160,Math.floor(i/4/160)))}
 assert.ok(seen.size<=SIZES.large.colors*2,`${seen.size} colours`);
 assert.ok(seen.size>=4,'shading survives as distinct bands');
});

test('silhouette gets a dark outline and no stray single-pixel dust',()=>{
 const t=pixelate(sphere(),'giant'),{cols,rows,block}=t.grid,ox=Math.floor((160-cols*block)/2),oy=160-rows*block;
 const cell=(c,r)=>c<0||r<0||c>=cols||r>=rows?'clear':colourAt(t,ox+c*block,oy+r*block);
 const lum=s=>{const [r,g,b]=s.split(',').map(Number);return .2126*r+.7152*g+.0722*b};
 let edge=0,darker=0,dust=0;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const v=cell(c,r);if(v==='clear')continue;
  const n=[cell(c+1,r),cell(c-1,r),cell(c,r+1),cell(c,r-1)];
  if(n.every(x=>x==='clear'))dust++;
  if(n.some(x=>x==='clear')){edge++;const inner=[cell(c+2,r),cell(c-2,r),cell(c,r+2),cell(c,r-2)].filter(x=>x!=='clear'&&x!==v);if(inner.length&&lum(v)<Math.min(...inner.map(lum)))darker++}}
 assert.equal(dust,0);assert.ok(edge>20);assert.ok(darker/edge>.6,`outline darker on ${darker}/${edge} edge cells`);
});

test('deterministic and rejects images without transparency',()=>{
 assert.deepEqual(pixelate(sphere(),'medium').data,pixelate(sphere(),'medium').data);
 const opaque={width:40,height:40,data:new Uint8ClampedArray(40*40*4).fill(200)};
 assert.throws(()=>pixelate(opaque),/透明/);
 assert.throws(()=>pixelate({width:10,height:10,data:new Uint8ClampedArray(400)}),/主体/);
});

test('already-pixel sprites keep crisp shapes (cat sprite style input)',()=>{
 const W=160,data=new Uint8ClampedArray(W*W*4);
 for(let y=40;y<150;y++)for(let x=30;x<130;x++){const i=(y*W+x)*4;const eye=(y>70&&y<80)&&(x>50&&x<60||x>100&&x<110);data.set(eye?[40,60,50,255]:[220,164,101,255],i)}
 const t=pixelate({width:W,height:W,data},'large'),seen=new Set();
 for(let i=0;i<t.data.length;i+=4)if(t.data[i+3])seen.add(t.data.slice(i,i+3).join());
 assert.ok(seen.size<=4,`flat input stays flat: ${seen.size} colours`);
});
