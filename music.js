(function(root){
'use strict';
function musicMix(night,volume=.1){const n=Math.max(0,Math.min(1,night));return [Math.cos(n*Math.PI/2)*volume,Math.sin(n*Math.PI/2)*volume]}
class MusicPlayer{
 constructor(day,night,onChange,onError){this.tracks=[day,night];this.enabled=false;this.active=true;this.context=null;this.gains=[];this.night=0;this.ticket=0;this.onChange=onChange;this.onError=onError;this.lastMix=-1;this.volume=.1}
 setup(){if(this.context)return;const AudioCtx=root.AudioContext||root.webkitAudioContext;if(!AudioCtx)throw Error('音频播放不可用');this.context=new AudioCtx();this.gains=this.tracks.map(track=>{const source=this.context.createMediaElementSource(track),gain=this.context.createGain();gain.gain.value=0;source.connect(gain).connect(this.context.destination);return gain})}
 async setEnabled(value){this.enabled=!!value;const ticket=++this.ticket;this.onChange(this.enabled);if(!this.enabled){this.pause();return}if(!this.active)return;try{this.setup();const pending=[this.context.resume(),...this.tracks.map(t=>t.play())];await Promise.all(pending);if(ticket!==this.ticket)return;if(!this.active){this.pause();return}this.lastMix=-1;this.update(this.night)}catch(error){if(ticket!==this.ticket)return;this.enabled=false;this.pause();this.onChange(false);this.onError('BGM 暂时无法播放，请再点击一次音乐按钮。')}}
 pause(){this.tracks.forEach(t=>t.pause());if(this.context)this.gains.forEach(g=>{g.gain.cancelScheduledValues(this.context.currentTime);g.gain.setValueAtTime(0,this.context.currentTime)});this.lastMix=-1}
 setActive(active){if(this.active===active)return;this.active=active;if(!active){++this.ticket;this.pause()}else if(this.enabled)this.setEnabled(true)}
 setVolume(value){this.volume=Math.max(0,Math.min(.3,Number(value)||0));this.lastMix=-1;this.update(this.night)}
 update(night){this.night=night;if(!this.enabled||!this.active||!this.context||this.lastMix===night)return;this.lastMix=night;musicMix(night,this.volume).forEach((volume,i)=>{const param=this.gains[i].gain;param.setTargetAtTime(volume,this.context.currentTime,.35);this.tracks[i].dataset.mixGain=volume.toFixed(3)})}
 dispose(){this.enabled=false;++this.ticket;this.pause();if(this.context)this.context.close()}
}
root.PixelWalkMusic={MusicPlayer,musicMix};if(typeof module!=='undefined')module.exports={musicMix,MusicPlayer};
})(typeof window!=='undefined'?window:globalThis);
