const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','style.css','content.js','music.js','engine.js','pixelate.js','library.js','app.js'])fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
// Only published images ship; queued ones stay in the repo until their batch.
const {content}=require('./scenery-lib.cjs'),manifestFile=path.join(root,'scenery/manifest.json');
if(fs.existsSync(manifestFile)){const live=content(JSON.parse(fs.readFileSync(manifestFile,'utf8'))).scenery;if(live.length)fs.mkdirSync(path.join(out,'scenery/images'),{recursive:true});for(const art of live)fs.copyFileSync(path.join(root,art.image),path.join(out,art.image))}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Built dist/ with relative asset paths for GitHub Pages or any static server.');
