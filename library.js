/* Settings and the published scenery catalogue (built-ins + content.js). */
(function(root){
'use strict';
const SETTINGS='pixelwalk.settings.v1';
function volume(){try{const v=JSON.parse(localStorage.getItem(SETTINGS));return typeof v?.volume==='number'&&Number.isFinite(v.volume)?Math.max(0,Math.min(.3,v.volume)):PixelWalkConfig.values.defaultVolume/100}catch{return PixelWalkConfig.values.defaultVolume/100}}
function setVolume(value){try{localStorage.setItem(SETTINGS,JSON.stringify({volume:value}))}catch{}}
const SAFE_IMAGE=/^(scenery\/images\/(?:gh-\d+(?:-[a-f0-9]{12})?|admin-[a-f0-9]{24})(?:-[a-f0-9]{12})?\.png|data:image\/png;base64,[A-Za-z0-9+/=]+)$/;
async function decode(art){
 if(typeof art.image!=='string'||!SAFE_IMAGE.test(art.image))throw Error('bad image');
 const image=new Image();image.src=art.image;await image.decode();
 if(image.naturalWidth!==160||image.naturalHeight!==160)throw Error('bad size');
 return {...art,image};
}
/* Community pieces load in parallel; a broken file is skipped, never fatal. */
async function catalogue(){
 const community=(root.PixelWalkContent?.scenery||[]).filter(a=>a&&['day','night'].includes(a.phase));
 const results=await Promise.allSettled(community.map(decode));
 return {ready:[...PixelWalk.builtinCatalog.filter(a=>!(root.PixelWalkContent?.disabledBuiltins||[]).includes(a.id)),...results.filter(r=>r.status==='fulfilled').map(r=>r.value)],failed:results.filter(r=>r.status==='rejected').length};
}
root.PixelWalkLibrary={volume,setVolume,catalogue,decode};
})(window);
