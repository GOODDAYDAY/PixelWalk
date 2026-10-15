const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=read('index.html').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('style.css')+'</style>');
for(const name of ['content.js','music.js','engine.js','library.js','app.js','admin.js'])html=html.replace(`<script src="${name}"></script>`,()=>'<script>'+read(name)+'</script>');
for(const track of ['childhood','moonlight']){
 const source=`assets/audio/${track}.m4a`;
 html=html.replace(`src="${source}"`,()=>`src="data:audio/mp4;base64,${fs.readFileSync(path.join(root,source)).toString('base64')}"`);
}
fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
fs.writeFileSync(path.join(root,'outputs/PixelWalk-demo.html'),html);
console.log('Generated outputs/PixelWalk-demo.html — scripts, styles and two complete music tracks embedded.');
