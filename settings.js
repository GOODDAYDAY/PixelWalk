/* Shared validation for the game and the owner console. */
(function(root){
'use strict';
const schema={
 speed:{label:'行走速度',min:20,max:240,step:1,default:80},
 stride:{label:'景点间距',min:1100,max:2400,step:1,default:1328},
 transition:{label:'日夜过渡距离',min:80,max:960,step:1,default:320},
 scenesPerPhase:{label:'每轮日景 / 夜景数量',min:1,max:20,step:1,default:5},
 airborneOffset:{label:'空中作品抬升高度',min:0,max:160,step:1,default:96},
 defaultVolume:{label:'默认音乐音量（%）',min:0,max:30,step:1,default:10},
 colorsSmall:{label:'小型作品颜色数',min:3,max:24,step:1,default:7},
 colorsMedium:{label:'中型作品颜色数',min:3,max:24,step:1,default:10},
 colorsLarge:{label:'大型作品颜色数',min:3,max:24,step:1,default:12},
 colorsGiant:{label:'巨大作品颜色数',min:3,max:24,step:1,default:14}
};
const defaults=Object.fromEntries(Object.entries(schema).map(([k,s])=>[k,s.default]));
function validate(input={}){
 if(!input||Array.isArray(input)||typeof input!=='object')throw Error('配置必须是对象');
 for(const key of Object.keys(input))if(!Object.hasOwn(schema,key))throw Error('未知配置：'+key);
 const out={...defaults};
 for(const [key,value] of Object.entries(input)){const s=schema[key];if(!Number.isInteger(value)||value<s.min||value>s.max)throw Error(s.label+'需为 '+s.min+'–'+s.max+' 的整数');out[key]=value}
 return out;
}
const artwork={pixelBase:4,pixelExponent:.75,giantMin:320,giantMax:960,giantDefault:480};
function validateExtent(value=artwork.giantDefault){
 if(!Number.isInteger(value)||value<artwork.giantMin||value>artwork.giantMax)throw Error('巨大作品尺寸需为 320–960 的整数');
 return value;
}
const api={schema,defaults,validate,artwork,validateExtent,values:validate(root.PixelWalkSettings||{})};
root.PixelWalkConfig=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
