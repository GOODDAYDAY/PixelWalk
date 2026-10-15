'use strict';
/* Pure helpers for the community scenery pipeline: issue parsing, PNG
   validation / sanitising, manifest bookkeeping and content.js generation.
   No network or git here, so everything is unit-testable. */
const zlib=require('node:zlib');

const SIZE=160,MAX_BYTES=1024*1024;
const PHASE={'日景':'day','夜景':'night'},SIZES={'小':'small','中':'medium','大':'large','巨大':'giant'},PLACE={'地面':false,'空中':true};
const IMAGE_URL=/https:\/\/(?:github\.com\/user-attachments\/assets\/[0-9a-f-]{36}|(?:private-)?user-images\.githubusercontent\.com\/[^\s)"'<>]+)/gi;
const ALLOWED_HOSTS=/(^|\.)github\.com$|(^|\.)githubusercontent\.com$/;

/* ---------- issue form ---------- */
function sections(body=''){
 const out={};let key=null;
 for(const line of String(body).replace(/\r/g,'').split('\n')){
  const m=line.match(/^###\s+(.+?)\s*$/);
  if(m){key=m[1];out[key]='';continue}
  if(key)out[key]+=line+'\n';
 }
 for(const k in out){out[k]=out[k].trim();if(out[k]==='_No response_')out[k]=''}
 return out;
}
function cleanTitle(text){return String(text||'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,40)}
const CONSENT='我有权公开此作品，并允许 PixelWalk 署名展示与分发。';
const POLICY='我已阅读内容规范，确认作品、名称与来源不含禁止内容。';
function parseIssue(body){
 const s=sections(body),errors=[];
 const title=cleanTitle(s['作品名称']);if(!title)errors.push('缺少作品名称');
 const phase=PHASE[s['展示时段']];if(!phase)errors.push('展示时段需为 日景 / 夜景');
 const size=SIZES[s['体积']];if(!size)errors.push('体积需为 小 / 中 / 大 / 巨大');
 const airborne=PLACE[s['摆放方式']];if(airborne===undefined)errors.push('摆放方式需为 地面 / 空中');
 const source=(s['素材来源']||'').trim();if(!source)errors.push('缺少素材来源与许可说明');
 const confirmations=s['确认']||'';
 for(const text of [CONSENT,POLICY])if(!confirmations.split('\n').some(line=>line.trim()==='- [X] '+text||line.trim()==='- [x] '+text))errors.push('请勾选确认：'+text);
 const urls=[...new Set((s['像素 PNG']||'').match(IMAGE_URL)||[])];
 if(!urls.length)errors.push('没有找到上传的 PNG，请把图片拖入「像素 PNG」');
 else if(urls.length>1)errors.push('只能附一张 PNG');
 return {title,phase,size,airborne,imageUrl:urls[0]||null,source,errors};
}

/* ---------- PNG ---------- */
const CRC=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(buf){let c=0xffffffff;for(const b of buf)c=CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
const SIG=Buffer.from([137,80,78,71,13,10,26,10]);
function fail(msg){const e=new Error(msg);e.userFacing=true;throw e}
function decodePng(buf){
 if(!Buffer.isBuffer(buf))buf=Buffer.from(buf);
 if(buf.length>MAX_BYTES)fail('PNG 超过 1 MB');
 if(buf.length<8||!buf.subarray(0,8).equals(SIG))fail('不是 PNG 文件');
 let pos=8,ihdr=null,palette=null,trns=null,ended=false;const idat=[];
 while(pos+8<=buf.length){
  const len=buf.readUInt32BE(pos),type=buf.toString('latin1',pos+4,pos+8);
  if(pos+12+len>buf.length)fail('PNG 数据不完整');
  const data=buf.subarray(pos+8,pos+8+len);
  if(crc32(buf.subarray(pos+4,pos+8+len))!==buf.readUInt32BE(pos+8+len))fail('PNG 校验失败');
  if(!ihdr&&type!=='IHDR')fail('PNG 首块必须为 IHDR');
  if(type==='IHDR'&&(ihdr||len!==13||data[10]!==0||data[11]!==0))fail('PNG 头信息无效');
  if(type==='PLTE'&&(!len||len%3||len>768))fail('PNG 调色板无效');
  if(type==='IHDR')ihdr={width:data.readUInt32BE(0),height:data.readUInt32BE(4),depth:data[8],color:data[9],interlace:data[12]};
  else if(type==='PLTE')palette=data;else if(type==='tRNS')trns=data;else if(type==='IDAT')idat.push(data);
  else if(type==='acTL')fail('不支持动图');else if(type==='IEND'){if(len!==0||pos+12!==buf.length)fail('PNG 结束信息无效');ended=true;break}
  else if(!['IHDR','PLTE','tRNS','IDAT'].includes(type)&&/^[A-Z]/.test(type))fail('PNG 包含不支持的关键数据块');
  pos+=12+len;
 }
 if(!ihdr)fail('PNG 缺少头信息');
 if(!ended||!idat.length)fail('PNG 缺少图像数据或结束信息');
 const {width,height,depth,color,interlace}=ihdr;
 if(width!==SIZE||height!==SIZE)fail(`尺寸需为 ${SIZE}×${SIZE}，当前 ${width}×${height}`);
 if(depth!==8||interlace!==0||!(color===6||color===3))fail('请使用 PixelWalk 下载的透明 PNG（RGBA 8 位）');
 if(color===3&&!palette)fail('PNG 缺少调色板');
 const bpp=color===6?4:1,stride=width*bpp;let raw;
 try{raw=zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:(stride+1)*height+1})}catch{fail('PNG 数据无法解压')}
 if(raw.length!==(stride+1)*height)fail('PNG 数据不完整');
 const px=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++){
  const f=raw[y*(stride+1)],row=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)),o=y*stride;
  for(let x=0;x<stride;x++){
   const a=x>=bpp?px[o+x-bpp]:0,b=y?px[o-stride+x]:0,c=y&&x>=bpp?px[o-stride+x-bpp]:0;let v=row[x];
   if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;
   else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c}
   else if(f!==0)fail('PNG 过滤类型无效');
   px[o+x]=v&255;
  }
 }
 if(color===6)return {width,height,rgba:px};
 const rgba=Buffer.alloc(width*height*4);
 for(let i=0;i<width*height;i++){const k=px[i];if(k*3+2>=palette.length)fail('PNG 调色板索引越界');rgba[i*4]=palette[k*3];rgba[i*4+1]=palette[k*3+1];rgba[i*4+2]=palette[k*3+2];rgba[i*4+3]=trns&&k<trns.length?trns[k]:255}
 return {width,height,rgba};
}
function chunk(type,data){const head=Buffer.alloc(8);head.writeUInt32BE(data.length,0);head.write(type,4,'latin1');const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4),data])));return Buffer.concat([head,data,crc])}
function encodePng(width,height,rgba){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)rgba.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 return Buffer.concat([SIG,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
/* Validate and re-encode: strips every metadata chunk and snaps alpha to the
   game's binary transparency, so the stored file is exactly what is drawn. */
function sanitizePng(buf){
 const {width,height,rgba}=decodePng(buf);let clear=0,solid=0;
 for(let i=3;i<rgba.length;i+=4){if(rgba[i]<128){rgba[i]=rgba[i-1]=rgba[i-2]=rgba[i-3]=0;clear++}else{rgba[i]=255;solid++}}
 if(!solid)fail('图片是空的');
 if(clear/(width*height)<.01)fail('需要透明背景');
 return encodePng(width,height,rgba);
}

/* ---------- manifest & published content ---------- */
const emptyManifest=()=>({version:1,items:[]});
function published(manifest){return manifest.items.filter(i=>i.status==='published').sort((a,b)=>String(a.publishedAt).localeCompare(String(b.publishedAt))||a.issue-b.issue)}
function content(manifest,imageFor=item=>item.file){
 const items=published(manifest),seen=new Set(),contributors=[];
 for(const i of items)if(!seen.has(String(i.userId??i.authorName??i.id))){seen.add(String(i.userId??i.authorName??i.id));contributors.push({userId:i.userId??i.authorName??i.id,name:i.authorName||i.login,github:i.login||''})}
 return {...(manifest.disabledBuiltins?.length?{disabledBuiltins:manifest.disabledBuiltins}:{}),contributors,scenery:items.map(i=>({id:i.id||'gh-'+i.issue,title:i.title,phase:i.phase,size:i.size,airborne:!!i.airborne,author:i.authorName||'@'+i.login,github:i.login||'',image:imageFor(i)}))};
}
function contentJs(data){
 // Escape "<" so the file stays safe when inlined into a <script> tag.
 return '/* Generated by scripts/scenery.cjs from scenery/manifest.json. Do not edit. */\nwindow.PixelWalkContent='+JSON.stringify(data,null,1).replace(/</g,'\\u003c')+';\n';
}
module.exports={SIZE,MAX_BYTES,ALLOWED_HOSTS,CONSENT,POLICY,sections,parseIssue,cleanTitle,crc32,decodePng,encodePng,sanitizePng,emptyManifest,published,content,contentJs};
