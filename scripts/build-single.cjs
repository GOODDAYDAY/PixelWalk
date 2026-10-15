const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const lib=require('./scenery-lib.cjs'),manifestFile=path.join(root,'scenery/manifest.json');
// Inline published scenery as data URLs so the single file works offline.
const inlineContent=()=>fs.existsSync(manifestFile)?lib.contentJs(lib.content(JSON.parse(fs.readFileSync(manifestFile,'utf8')),item=>'data:image/png;base64,'+fs.readFileSync(path.join(root,item.file)).toString('base64'))):read('content.js');
let html=read('index.html').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('style.css')+'</style>');
for(const name of ['content.js','music.js','engine.js','pixelate.js','library.js','app.js'])html=html.replace(`<script src="${name}"></script>`,()=>'<script>'+(name==='content.js'?inlineContent():read(name))+'</script>');
for(const track of ['childhood','moonlight']){
 const source=`assets/audio/${track}.m4a`;
 html=html.replace(`src="${source}"`,()=>`src="data:audio/mp4;base64,${fs.readFileSync(path.join(root,source)).toString('base64')}"`);
}
fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
fs.writeFileSync(path.join(root,'outputs/PixelWalk-demo.html'),html);
console.log('Generated outputs/PixelWalk-demo.html — scripts, styles and two complete music tracks embedded.');
