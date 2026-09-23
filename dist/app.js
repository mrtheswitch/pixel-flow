'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas');
const defaults={width:55,pixel:10,stretch:40,chaos:38,glow:30,grain:12,angle:0};
const animationDefaults={speed:100,waveLength:50,colorWave:65};
const dotDefaults={dotSize:2,gridSize:8,dotOpacity:50,twinkle:82};
let mode="flow";
const backgrounds={flow:"#080e25",dots:"#f4f4f2"};
const settings={...dotDefaults,...defaults,...animationDefaults,seed:1427,palette:0,x:.96,y:.5,background:'#080e25',format:'wide'};
const palettes=[['#0045ff','#53b8ff','#ffe2f4'],['#85ef32','#dcffb4','#f4fff0'],['#e52b7d','#ff9dbb','#ffe4d1'],['#6e7481','#cdd4de','#ffffff']];
const controls=[['width','Ширина потока',10,140],['pixel','Размер пикселей',3,45],['stretch','Вытянутость',10,100],['chaos','Хаотичность',0,100],['glow','Свечение',0,100],['grain','Зерно',0,100],['angle','Направление',-180,180]];
const dotControls=[['dotSize','Размер точек',1,16],['gridSize','Шаг сетки',4,80],['dotOpacity','Непрозрачность',0,100],['twinkle','Мерцание',0,100]];
const animationControls=[['speed','Скорость',0,300],['waveLength','Длина волны',10,100],['colorWave','Сила цвета',0,100]];
for(const [id,label,min,max] of [...controls,...animationControls,...dotControls]){const el=document.createElement('div');el.className='control';el.innerHTML=`<div><label for="${id}">${label}</label><output id="${id}Out" for="${id}"></output></div><input type="range" id="${id}" min="${min}" max="${max}" value="${settings[id]}">`;$(dotControls.some(c=>c[0]===id)?'dotsSliders':animationControls.some(c=>c[0]===id)?'animationSliders':'sliders').append(el);$(id).oninput=()=>{settings[id]=+$(id).value;sync();render()};}
let gl,program,locations={},playing=false,time=0,last=0,frame=0,failed=false;
const vertex=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
uniform float dotsMode,dotSize,gridSize,dotOpacity,twinkle;uniform vec3 dotColor;uniform vec2 res,focus;uniform float seed,width,pixel,stretch,chaos,glow,grain,angle,time,waveLength,colorWave;uniform vec3 bg,c1,c2,c3;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*12.37)*43758.5453);}
float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){if(dotsMode>.5){
vec2 point=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y)/res.y*900.;
vec2 index=floor(point/gridSize);vec2 local=mod(point,gridSize)-gridSize*.5;
float phase=noise(index+vec2(seed-1427.))*6.2831853+(index.x+index.y)*.18;
float rate=.72+noise(index.yx+vec2(17.,31.))*.56;
float pulse=.5+.5*sin(time*6.2831853*rate+phase);
float brightness=1.-twinkle*.01+twinkle*.01*(.12+pulse*.88);
float edge=max(abs(local.x),abs(local.y));float aa=900./res.y*.65;
float mask=1.-smoothstep(dotSize*.5-aa,dotSize*.5+aa,edge);
gl_FragColor=vec4(mix(bg,dotColor,mask*dotOpacity*.01*brightness),1.);return;}
vec2 uv=gl_FragCoord.xy/res;vec2 q=(uv-focus)*vec2(res.x/res.y,1.);float a=angle*3.14159265/180.;q=mat2(cos(a),-sin(a),sin(a),cos(a))*q;float px=pixel/900.;vec2 cell=vec2(px*(1.+stretch*.09),px);vec2 id=floor(q/cell);vec2 p=(id+.5)*cell;
float dist=max(-p.x,0.);float spread=pow(dist,1.13)*width*.0075+.006;float edgeNoise=(hash(vec2(id.x,1.))-.5)*chaos*.0009;
float v=p.y+sin(dist*2.)*dist*.012;vec3 col=bg;
for(int i=0;i<28;i++){float fi=float(i);float r=hash(vec2(fi,7.));float side=mod(fi,2.)*2.-1.;float offset=(.12+r*.9)*side;float wobble=(hash(vec2(id.x,fi))-.5)*chaos*.0014;float center=spread*offset+edgeNoise*side+wobble*spread;
float thickness=spread*(.09+hash(vec2(fi,13.))*.23)+px*.5;
float band=1.-smoothstep(thickness*.4,thickness,abs(v-center));float front=1.-smoothstep(-.03,.055,p.x);float alpha=band*front*(.16+r*.3);
vec3 tint=mix(c1,c2,smoothstep(.25,.75,abs(offset))*.65);tint=mix(tint,c3,smoothstep(.72,1.05,abs(offset)));col=mix(col,tint,alpha);
}
float rimCenter=spread*.96;float rimWidth=spread*.075+px;float rim=(1.-smoothstep(rimWidth*.35,rimWidth*1.9,abs(abs(v)-rimCenter-edgeNoise)))*(1.-smoothstep(-.01,.04,p.x));col=mix(col,c3,rim*.83);
float core=exp(-pow(v/(spread*.115+.007),2.))* (1.-smoothstep(0.,.04,p.x));col=mix(col,c2,core*.76);
float outer=exp(-abs(v)/(spread+.005)*2.)*(1.-smoothstep(0.,.08,p.x));col+=c1*outer*glow*.002;
float wavePhase=dist/(waveLength*.018+.08)*6.2831853+time*1.7;
float wave=.5+.5*sin(wavePhase);float echo=.5+.5*sin(wavePhase+2.094);
vec3 waveColor=mix(c1,c2,wave);waveColor=mix(waveColor,c3,pow(echo,4.)*.8);
float silhouette=smoothstep(.015,.23,length(col-bg));
col=mix(col,waveColor,silhouette*colorWave*.01);
col+=(hash(gl_FragCoord.xy)-.5)*grain*.0012;gl_FragColor=vec4(clamp(col,0.,1.),1.);}`;
function showError(message){failed=true;$('error').hidden=false;$('error').textContent=message;$('export').disabled=true;$('play').disabled=true;}
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
try{gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('WebGL unavailable');program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const attr=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);for(const name of ['dotsMode','dotSize','gridSize','dotOpacity','twinkle','dotColor','res','focus','seed','width','pixel','stretch','chaos','glow','grain','angle','time','waveLength','colorWave','bg','c1','c2','c3'])locations[name]=gl.getUniformLocation(program,name);}catch(e){console.error(e);showError('Не удалось запустить графику. Попробуйте открыть генератор в браузере с поддержкой WebGL.');}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
const sizes={wide:[2400,1350],banner:[2750,1000],square:[2000,2000],portrait:[1600,2000],igPost:[1080,1350],igSquare:[1080,1080],igStory:[1080,1920],tgPost:[1080,1080],tgWide:[1280,720],tgStory:[1080,1920]};
function render(exportSize=false){if(failed)return;const size=sizes[settings.format];const ratio=exportSize?1:Math.min(1,1500/size[0]);const w=Math.round(size[0]*ratio),h=Math.round(size[1]*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.uniform1f(locations.dotsMode,mode==='dots'?1:0);for(const key of Object.keys(dotDefaults))gl.uniform1f(locations[key],settings[key]);gl.uniform3fv(locations.dotColor,rgb($('dotColor').value));gl.uniform2f(locations.res,w,h);gl.uniform2f(locations.focus,settings.x,1-settings.y);for(const key of Object.keys(defaults))gl.uniform1f(locations[key],settings[key]);gl.uniform1f(locations.waveLength,settings.waveLength);gl.uniform1f(locations.colorWave,settings.colorWave);gl.uniform1f(locations.seed,settings.seed);gl.uniform1f(locations.time,time);gl.uniform3fv(locations.bg,rgb(settings.background));palettes[settings.palette].forEach((c,i)=>gl.uniform3fv(locations['c'+(i+1)],rgb(c)));gl.drawArrays(gl.TRIANGLES,0,6);positionRotationHandle();}
function sync(){for(const [id] of [...controls,...animationControls,...dotControls]){$(id).value=settings[id];$(id+'Out').value=(id==='speed'?(settings[id]/100).toFixed(2)+'×':settings[id]+(id==='angle'?'°':animationControls.some(c=>c[0]===id)?'%':''))}for(const id of ['palette','background','seed','format'])$(id).value=settings[id];$('swatches').innerHTML=[settings.background,...palettes[settings.palette]].map(c=>`<i style="background:${c}"></i>`).join('');const [w,h]=sizes[settings.format];$('dimensions').textContent=w+' × '+h;document.querySelector('.stage').style.aspectRatio=w+'/'+h;}
for(const id of ['palette','background','format'])$(id).oninput=()=>{settings[id]=id==='palette'?+$(id).value:$(id).value;sync();render()};
$('seed').onchange=()=>{settings.seed=Math.max(1,Math.min(99999,Math.round(Number($('seed').value)||1)));time=0;sync();render()};
function randomize(){settings.seed=Math.floor(Math.random()*99999)+1;time=0;sync();render();return {seed:settings.seed}}
$('random').onclick=randomize;
$('reset').onclick=()=>{Object.assign(settings,dotDefaults,defaults,animationDefaults,{seed:1427,palette:0,x:.96,y:.5,background:'#080e25',format:'wide'});settings.background=mode==='dots'?'#f4f4f2':'#080e25';$('dotColor').value='#cdcdcb';time=0;sync();render()};
function animate(now){if(!playing)return;if(last)time+=Math.min((now-last)/1000,.1)*settings.speed/100;last=now;render();frame=requestAnimationFrame(animate)}
$('play').onclick=()=>{playing=!playing;last=0;$('play').textContent=playing?'Ⅱ Пауза':'▷ Анимация';$('play').setAttribute('aria-pressed',String(playing));if(playing)frame=requestAnimationFrame(animate);else cancelAnimationFrame(frame)};
function move(e){if(mode==='dots')return;const r=canvas.getBoundingClientRect();settings.x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));settings.y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));render()}
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);move(e)};canvas.onpointermove=e=>{if(canvas.hasPointerCapture(e.pointerId))move(e)};canvas.onpointerup=e=>{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;cancelAnimationFrame(frame);showError('Графика остановилась. Обновите страницу, чтобы запустить генератор снова.');});
$('export').onclick=()=>{render(true);const name=`${mode==='dots'?'dots-grid':'pixel-flow'}-${settings.seed}.png`;canvas.toBlob(blob=>{if(!blob){$('status').textContent='Не удалось сохранить изображение. Попробуйте ещё раз.';return}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('status').textContent='PNG сохранён: '+sizes[settings.format].join(' × ');},'image/png');render()};
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'set_flow_seed',description:'Change the illustration seed and show the resulting pixel flow.',inputSchema:{type:'object',properties:{seed:{type:'integer',minimum:1,maximum:99999}},required:['seed'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isInteger(input.seed)||input.seed<1||input.seed>99999)throw Error('Seed must be an integer from 1 to 99999');settings.seed=input.seed;time=0;sync();render();return {seed:settings.seed}}})).catch(console.warn)}catch(e){console.warn(e)}}
const handle=$('rotateHandle'),guide=$('rotationGuide');
let rotationDrag=null;
function positionRotationHandle(){if(mode==='dots')return;
 const r=canvas.getBoundingClientRect(),cx=settings.x*r.width,cy=settings.y*r.height;
 const a=settings.angle*Math.PI/180, radius=Math.min(110,r.width*.27,r.height*.27);
 const hx=Math.max(22,Math.min(r.width-22,cx-Math.cos(a)*radius));
 const hy=Math.max(22,Math.min(r.height-22,cy+Math.sin(a)*radius));
 handle.style.left=hx+'px';handle.style.top=hy+'px';
 guide.style.left=cx+'px';guide.style.top=cy+'px';guide.style.width=Math.hypot(hx-cx,hy-cy)+'px';guide.style.transform='rotate('+Math.atan2(hy-cy,hx-cx)+'rad)';
}
function pointerAngle(e){const r=canvas.getBoundingClientRect();return Math.atan2(e.clientY-r.top-settings.y*r.height,-(e.clientX-r.left-settings.x*r.width))*180/Math.PI}
handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId);rotationDrag={pointer:pointerAngle(e),angle:settings.angle};};
handle.onpointermove=e=>{if(!rotationDrag)return;const delta=pointerAngle(e)-rotationDrag.pointer;settings.angle=Math.round(((rotationDrag.angle+delta+540)%360+360)%360-180);sync();render();};
function endRotation(){rotationDrag=null}
handle.onpointerup=endRotation;handle.onpointercancel=endRotation;handle.onlostpointercapture=endRotation;
handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const delta=(e.key==='ArrowLeft'?1:-1)*(e.shiftKey?10:1);settings.angle=((settings.angle+delta+540)%360)-180;sync();render();};
function setMode(next){
 backgrounds[mode]=settings.background;mode=next;settings.background=backgrounds[mode];
 $('flowMode').setAttribute('aria-pressed',String(mode==='flow'));$('dotsMode').setAttribute('aria-pressed',String(mode==='dots'));
 for(const id of ['flowPalette','sliders','rotateHandle','rotationGuide'])$(id).hidden=mode==='dots';
 $('dotsPanel').hidden=mode!=='dots';
 for(const id of ['waveLength','colorWave'])$(id).closest('.control').hidden=mode==='dots';
 $('animationNote').textContent=mode==='dots'?'Точки независимо мерцают. Скорость 0 — неподвижный кадр.':'Цветовая волна бежит к точке схождения. Форма потока остаётся неподвижной.';
 document.querySelector('.bottomline>span').textContent=mode==='dots'?'Неподвижная сетка · независимое мерцание':'Перетаскивайте поток · тяните ↻ для вращения';
 canvas.style.cursor=mode==='dots'?'default':'crosshair';
 canvas.setAttribute('aria-label',mode==='dots'?'Сетка мерцающих точек':'Иллюстрация светового потока');
 sync();render();
}
$('flowMode').onclick=()=>setMode('flow');$('dotsMode').onclick=()=>setMode('dots');$('dotColor').oninput=()=>render();
new ResizeObserver(()=>positionRotationHandle()).observe(canvas);
sync();render();
