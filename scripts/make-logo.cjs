'use strict';
/* Generates the PixelWalk logo set from one pixel grid:
   assets/logo.svg (mark + wordmark), assets/favicon.svg, assets/icon-32.png,
   assets/apple-touch-icon.png. Run: node scripts/make-logo.cjs */
const fs=require('node:fs'),path=require('node:path');
const {encodePng}=require('./scenery-lib.cjs');
const out=path.resolve(__dirname,'../assets');

// Game palette (engine.js): day sky / night sky, grass, road, walker.
const C={d:'#c2e4df',n:'#23364f',s:'#f5edba',m:'#ece7ba',t:'#e4e6ce',g:'#8fba72',G:'#52795e',r:'#d9c69b',R:'#879381',f:'#446d50',F:'#25453e',
 h:'#c8875b',b:'#d8a270',H:'#574c41',k:'#e8c697',e:'#354d46',p:'#6e7960',y:'#d1a557',l:'#58666b',o:'#384c49'};

// Mark: the walker stands on the line where day (left) turns to night (right),
// the same transition the game makes every five scenes. '.' = clear.
const MARK=(()=>{
 const g=Array.from({length:16},(_,y)=>Array.from({length:16},(_,x)=>{const day=x<8;
  if(y>=13)return day?'f':'F';if(y>=11)return day?'r':'R';if(y===10)return day?'g':'G';return day?'d':'n'}));
 const put=(ch,...pts)=>{for(const [x,y] of pts)g[y][x]=ch};
 put('.',[0,0],[15,0],[0,15],[15,15]);
 put('s',[1,2],[2,2],[1,3],[2,3]);                         // sun
 put('m',[12,2],[13,2],[11,3],[11,4],[12,5],[13,5]);       // crescent moon
 put('t',[9,2],[14,7],[10,8]);                             // stars
 put('h',[6,4],[7,4],[8,4]);put('b',[5,5],[6,5],[7,5],[8,5],[9,5]); // hat
 put('H',[6,6],[6,7]);put('k',[7,6],[8,6],[7,7]);put('e',[8,7]);    // hair, face, eye
 put('p',[5,8],[5,9]);put('y',[6,8],[7,8],[8,8],[6,9],[7,9],[8,9]); // pack, coat
 put('l',[6,10],[8,10]);put('o',[5,11],[6,11],[8,11],[9,11]);       // legs, boots
 return g.map(r=>r.join(''));
})();

// 7-row pixel font, mixed case; x-height glyphs sit on rows 2–6.
const GLYPH={
 P:['11110','10001','10001','11110','10000','10000','10000'],
 i:['1','0','1','1','1','1','1'],
 x:['00000','00000','10001','01010','00100','01010','10001'],
 e:['00000','00000','01110','10001','11111','10000','01111'],
 l:['10','10','10','10','10','10','01'],
 W:['1000001','1000001','1000001','1001001','1001001','1010101','0100010'],
 a:['00000','00000','01110','00001','01111','10001','01111'],
 k:['1000','1000','1001','1010','1100','1010','1001']};
function wordmark(text){
 const rows=Array.from({length:7},()=>'');
 [...text].forEach((ch,i)=>{const g=GLYPH[ch];for(let r=0;r<7;r++)rows[r]+=(i?'0':'')+g[r]});
 return rows;
}

// Merge horizontal runs into <rect>s; crispEdges keeps every pixel square.
function rects(grid,colour,ox=0,oy=0){
 let s='';grid.forEach((row,y)=>{let x=0;while(x<row.length){const ch=row[x];if(ch==='.'||ch==='0'){x++;continue}let w=1;while(row[x+w]===ch)w++;
  s+=`<rect x="${ox+x}" y="${oy+y}" width="${w}" height="1" fill="${colour(ch)}"/>`;x+=w}});return s;
}
const svg=(w,h,body,label)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w*4}" height="${h*4}" shape-rendering="crispEdges" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>\n`;

const mark=rects(MARK,ch=>C[ch]);
const word=wordmark('PixelWalk'),ww=word[0].length;
// Wordmark in the site ink colour; baseline sits on the grass line (row 10).
const wx=19,wy=4,lockup=rects(word,()=>'#293c35',wx,wy);
fs.writeFileSync(path.join(out,'logo.svg'),svg(wx+ww+1,16,mark+lockup,'PixelWalk'));
fs.writeFileSync(path.join(out,'favicon.svg'),svg(16,16,mark,'PixelWalk'));

function png(scale,pad=0){
 const n=16*scale+pad*2,rgba=Buffer.alloc(n*n*4);
 // Padded icons (iOS) get the night colour behind them instead of transparency.
 if(pad)for(let i=0;i<n*n;i++)rgba.set([0x23,0x36,0x4f,255],i*4);
 // Square icons fill the rounded-off corners with the neighbouring colour.
 MARK.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch==='.'&&!pad)return;const hex=C[ch==='.'?row[x?x-1:1]:ch],v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)rgba.set([...v,255],((pad+y*scale+dy)*n+pad+x*scale+dx)*4)}));
 return encodePng(n,n,rgba);
}
fs.writeFileSync(path.join(out,'icon-32.png'),png(2));
fs.writeFileSync(path.join(out,'apple-touch-icon.png'),png(11,2));
console.log(`logo ${wx+ww+1}×16, favicon 16×16, icon-32.png, apple-touch-icon.png (180)`);
