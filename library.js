(function(root){
'use strict';
const KEY='pixelwalk.library.v1',SETTINGS='pixelwalk.settings.v1';
const defaults=()=>({approved:[],archived:[],reviews:{}});
function read(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&Array.isArray(v.approved)&&Array.isArray(v.archived)&&v.reviews&&typeof v.reviews==='object'?v:defaults()}catch{return defaults()}}
function write(state){localStorage.setItem(KEY,JSON.stringify(state))}
function volume(){try{const v=JSON.parse(localStorage.getItem(SETTINGS));return typeof v?.volume==='number'&&Number.isFinite(v.volume)?Math.max(0,Math.min(.3,v.volume)):.1}catch{return .1}}
function setVolume(value){localStorage.setItem(SETTINGS,JSON.stringify({volume:value}))}
function items(){const state=read();return [...PixelWalk.builtinCatalog,...state.approved].map(art=>({...art,archived:state.archived.includes(art.id)}))}
function approve(draft){const state=read(),id='local-'+draft.id;if(!state.approved.some(a=>a.id===id)){if(state.approved.length>=24)throw Error('本地景点库最多保存 24 件投稿作品。请先下载备份。');state.approved.push({...draft,id,author:'本地创作者',phase:draft.phase==='night'?'night':'day',size:['small','medium','large','giant'].includes(draft.size)?draft.size:'medium',approvedAt:new Date().toISOString()})}state.reviews[draft.id]={status:'approved',at:new Date().toISOString()};state.archived=state.archived.filter(x=>x!==id);write(state)}
function returnDraft(id,note){const state=read();state.reviews[id]={status:'returned',note,at:new Date().toISOString()};write(state)}
function archive(id,value){const state=read(),all=items(),art=all.find(a=>a.id===id);if(!art)throw Error('没有找到这件作品。');if(value&&!art.archived&&all.filter(a=>a.phase===art.phase&&!a.archived).length<=1)throw Error('日景和夜景各需至少保留一件启用作品。');state.archived=value?[...new Set([...state.archived,id])]:state.archived.filter(x=>x!==id);write(state)}
async function decode(art){if(typeof art.image!=='string')return {...art};if(!art.image.startsWith('data:image/png;base64,'))throw Error('素材格式无效');const image=new Image();image.src=art.image;await image.decode();return {...art,image}}
async function catalogue(){const entries=items().filter(a=>!a.archived),results=await Promise.allSettled(entries.map(decode)),failed=[];const ready=results.flatMap((result,i)=>{if(result.status==='fulfilled')return [result.value];failed.push(entries[i].title);return []});for(const phase of ['day','night'])if(!ready.some(a=>a.phase===phase))ready.push(PixelWalk.builtinCatalog.find(a=>a.phase===phase));return {ready,failed}}
root.PixelWalkLibrary={read,items,approve,returnDraft,archive,decode,catalogue,volume,setVolume};
})(window);
