const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','style.css','world-settings.js','settings.js','content.js','music.js','engine.js','pixelate.js','library.js','app.js'])fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.cpSync(path.join(root,'admin'),path.join(out,'admin'),{recursive:true});
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
// Only published images ship; queued ones stay in the repo until their batch.
const {content}=require('./scenery-lib.cjs'),manifestFile=path.join(root,'scenery/manifest.json');
if(fs.existsSync(manifestFile)){const live=content(JSON.parse(fs.readFileSync(manifestFile,'utf8'))).scenery;if(live.length)fs.mkdirSync(path.join(out,'scenery/images'),{recursive:true});for(const art of live)fs.copyFileSync(path.join(root,art.image),path.join(out,art.image))}
const settings=require('../settings.js').validate(JSON.parse(fs.readFileSync(path.join(root,'scenery/config.json'),'utf8')));
fs.writeFileSync(path.join(out,'world-settings.js'),'/* Generated from scenery/config.json. */\nwindow.PixelWalkSettings='+JSON.stringify(settings)+';\n');
fs.writeFileSync(path.join(out,'.nojekyll'),'');
// Workflow builds need the CNAME inside the uploaded artifact: the Pages setting
// alone does not inject it. Keep it in sync with the Pages custom domain.
const domain=process.env.PIXELWALK_DOMAIN||'pixelwalk.fun';
fs.writeFileSync(path.join(out,'CNAME'),domain+'\n');
console.log('Built dist/ with relative asset paths, CNAME '+domain+', for GitHub Pages or any static server.');
