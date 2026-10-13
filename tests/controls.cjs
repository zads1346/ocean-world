const fs=require('fs'),vm=require('vm'),assert=require('assert');
const W=require('../dist/waves.js');let hitControl=false;const docHandlers={};const values={},uniforms={},handlers={},classes=()=>({add(){},remove(){},toggle(){}});
const els={};const html=fs.readFileSync('dist/index.html','utf8');for(const [,id] of html.matchAll(/id="([^"]+)"/g))els[id]={id,value:'',hidden:/panel|returnUI|error/.test(id),style:{},dataset:{},classList:classes(),attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this[k]=v;},closest(){return null;},setPointerCapture(id){this.capture=id;},hasPointerCapture(id){return this.capture===id;},releasePointerCapture(){this.capture=null;}};
const gl=new Proxy({FRAMEBUFFER_COMPLETE:36053,checkFramebufferStatus:()=>36053,getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,n)=>n,uniform4f:(n,...v)=>uniforms[n]=v,uniform4fv:(n,v)=>uniforms[n]=Array.from(v),uniform1f:(n,v)=>uniforms[n]=v,uniform2f:(n,x,y)=>uniforms[n]=[x,y],createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),readPixels:(x,y,w,h,f,t,p)=>{const [vx,vy]=uniforms.uPickUV;const r=W.ray((vx+1)/2*sandbox.innerWidth,(1-vy)/2*sandbox.innerHeight,sandbox.innerWidth,sandbox.innerHeight,uniforms.uTime,uniforms.uReduced,uniforms.uWaveMeta[2]);const d=(1.15-r.origin.y)/r.direction.y;if(d<=0||d>250){p.fill(255);return;}const px=r.origin.x+r.direction.x*d,pz=r.direction.z*d;for(const [v,i] of [[(px+512)/1024,0],[(pz+512)/1024,2]]){const lower=(v*255)%1;p[i]=Math.round((v-lower/255)*255);p[i+1]=Math.round(lower*255);}}},{get:(t,p)=>p in t?t[p]:(()=>{})});
const ctx=new Proxy({},{get:()=>()=>{}});els.ocean.getContext=()=>gl;els.weather.getContext=()=>ctx;
const presets=[6.4,12,17.5,22].map(n=>({dataset:{hour:''+n},classList:classes()}));let frame;
const sandbox={console,Math,Float32Array,OceanWaves:W,document:{addEventListener:(n,f)=>docHandlers[n]=f,elementFromPoint:()=>hitControl?{closest:()=>true}:els.ocean,getElementById:id=>els[id],querySelectorAll:()=>presets,hidden:false,body:{classList:classes()},documentElement:{}},innerWidth:1200,innerHeight:750,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(n,f)=>handlers[n]=f,requestAnimationFrame:f=>frame=f,setTimeout:()=>{},window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/ocean.js','utf8'),sandbox);const tick=t=>frame(t);
tick(16);assert.equal(els.ocean.dataset.ready,'true');assert.equal(uniforms.uHour,17.5);assert.deepEqual(uniforms.uResolution,[1200,750]);
els.settings.onclick();assert.equal(els.panel.hidden,false);assert.equal(els.settings.attrs['aria-expanded'],'true');
els.time.oninput({target:{value:'6.4'}});tick(32);assert.equal(uniforms.uHour,6.4);assert.equal(els.period.textContent,'晨光初起');
presets[3].onclick();tick(48);assert.equal(uniforms.uHour,22);assert.equal(els.clock.textContent,'22:00');
els.reflection.oninput({target:{value:'20'}});tick(64);assert.equal(uniforms.uReflection,.2);assert.equal(els.reflectionValue.textContent,'20%');
els.storm.oninput({target:{value:'85'}});tick(80);assert.equal(uniforms.uStorm,.85);assert.equal(els.stormValue.textContent,'雷暴 85%');
els.reduced.onchange({target:{checked:true}});tick(96);assert.equal(uniforms.uReduced,1);assert.equal(uniforms.uFlash,0);
els.pause.onclick();tick(112);const t=uniforms.uTime;tick(128);assert.equal(uniforms.uTime,t);assert.equal(els.pause.attrs['aria-label'],'继续海浪');
els.pause.onclick();els.cycle.onchange({target:{checked:true}});tick(160);assert.ok(uniforms.uHour>22);
sandbox.innerWidth=390;sandbox.innerHeight=844;handlers.resize();tick(176);assert.equal(els.ocean.width,390);assert.equal(els.ocean.height,844);
els.immerse.onclick();assert.equal(els.returnUI.hidden,false);assert.equal(els.panel.hidden,true);els.returnUI.onclick();assert.equal(els.returnUI.hidden,true);
console.log('PASS: renderer startup, settings, dawn/night presets, time, reflection, storm, reduced motion, pause, cycling, 390 × 844 canvas resize, immersive controls');
console.log('Note: these are isolated JS/DOM logic tests, not browser layout or interaction tests.');

// Pointer event lifecycle tests use a simulated GPU readback. Actual shader picking is checked separately.
sandbox.innerWidth=1200;sandbox.innerHeight=750;handlers.resize();els.reduced.onchange({target:{checked:false}});els.waveHeight.oninput({target:{value:'2.5'}});tick(200);assert.equal(uniforms.uWaveMeta[0],2.5);assert.equal(els.waveHeightValue.textContent,'2.5×');
let stamp=300;const event=(id,x,y,extra={})=>({pointerId:id,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y,timeStamp:stamp,preventDefault(){},...extra});
function down(id,x=600,y=560,extra={}){const e=event(id,x,y,extra);docHandlers.pointerdown(e);els.ocean.pointerdown(e);}
function up(id,x=800,y=560,extra={}){stamp+=180;const e=event(id,x,y,extra);docHandlers.pointerup(e);els.ocean.pointerup(e);tick(stamp);}
const count=()=>+els.ocean.dataset.activeWaves;
down(1);assert.equal(els.gestureGuide.hidden,false);els.ocean.pointermove(event(1,750,560));up(1);assert.equal(count(),1);assert.equal(els.gestureGuide.hidden,true);assert(+els.ocean.dataset.lastWaveDirection.split(',')[0]>.99);
down(2);up(2,605,561);assert.equal(count(),1,'tap ignored');
down(3);els.ocean.pointercancel(event(3,700,560));up(3);assert.equal(count(),1,'cancel ignored');
down(4);els.ocean.lostpointercapture(event(4,700,560));up(4);assert.equal(count(),1,'lost capture ignored');
down(5);hitControl=true;up(5);hitControl=false;assert.equal(count(),1,'release over control ignored');
down(6,600,560,{pointerType:'touch'});down(7,650,560,{pointerType:'touch',isPrimary:false});up(6,850,560,{pointerType:'touch'});up(7,900,560,{pointerType:'touch'});assert.equal(count(),1,'multitouch cancels without unintended wave');
down(8,600,560,{pointerType:'touch'});up(8,400,560,{pointerType:'touch'});assert.equal(count(),2,'fresh touch gesture works after multitouch');assert(+els.ocean.dataset.lastWaveDirection.split(',')[0]<-.99);
down(9);handlers.blur();up(9);assert.equal(count(),2,'blur cancels');
for(let i=10;i<20;i++){down(i);up(i,800,600);}assert.equal(count(),4,'active packet bound');
els.pause.onclick();down(25);up(25);assert.equal(count(),4,'pause blocks gestures');els.pause.onclick();
console.log('PASS: wave-height uniform, mouse and touch gestures, guide feedback, tap threshold, cancellation, lost capture, control exclusion, multitouch recovery, blur, repeat swipes bounded to four, pause blocking');
