// Independent CPU analysis, not a runtime policy or GPU-performance predictor.
const weight=(i,sigma)=>Math.exp(-.5*i*i/(sigma*sigma));
const sample=(row,x)=>{const a=Math.floor(x),t=x-a;return row[Math.max(0,Math.min(row.length-1,a))]*(1-t)+row[Math.max(0,Math.min(row.length-1,a+1))]*t;};
function dense(row,x,sigma,step=1){let sum=0,total=0;for(let i=-12;i<=12;i++){const w=weight(i,sigma);sum+=sample(row,x+i*step)*w;total+=w;}return sum/total;}
function paired(row,x,sigma,step=1){let sum=sample(row,x),total=1;for(let i=1;i<=12;i+=2){const a=weight(i,sigma),b=weight(i+1,sigma),w=a+b;if(w>0){const offset=(i+b/w)*step;sum+=(sample(row,x+offset)+sample(row,x-offset))*w;total+=2*w;}}return sum/total;}
const signals={impulse:Array.from({length:31},(_,i)=>i===15?1:0),checker:Array.from({length:31},(_,i)=>i%2),ramp:Array.from({length:31},(_,i)=>i/30),noise:Array.from({length:31},(_,i)=>((i*17+i*i*31)%101)/100),constant:Array(31).fill(.37)};
const rows=[];
for(const[name,row]of Object.entries(signals))for(const sigma of [.1,.5,1,1.5,2.25,3])for(const step of [1,.75]){let maxDelta=0;for(let x=0;x<row.length;x++)maxDelta=Math.max(maxDelta,Math.abs(dense(row,x,sigma,step)-paired(row,x,sigma,step)));rows.push({signal:name,sigma,step,maxDelta,finite:Number.isFinite(maxDelta)});}
const profiles=[];for(const t of [0,.001,.01,.1,.25,.5,.75,.99,1]){
 const q=Math.max(1e-12,t*(2-t));const u=1-t,inside=Math.max(1-u**4,1e-4);
 profiles.push({t,hermite:{height:.5*t*t*(3-2*t),slope:3*t*(1-t)},halfCircle:{height:t===0?0:Math.sqrt(q),slope:t===0?null:(1-t)/Math.sqrt(q)},quarticConvex:{height:Math.sqrt(inside),slope:2*u**3/Math.sqrt(inside)}});
}
function inventory(cssW,cssH,dpr,radii,layered){const w=Math.round(cssW*dpr),h=Math.round(cssH*dpr),chains=radii.filter(r=>r>0).map(radius=>{let tw=w,th=h,scale=1,texels=0,levels=0;while(radius*dpr/scale>3&&tw>2&&th>2){tw=Math.max(1,Math.ceil(tw/2));th=Math.max(1,Math.ceil(th/2));scale*=2;texels+=tw*th;levels++;}texels+=2*tw*th;return{radius,levels,scale,sigma:radius*dpr/scale,physicalBlurSize:[tw,th],imagePasses:levels+2,texels,bytes:texels*4};});const bytes=w*h*4+chains.reduce((sum,c)=>sum+c.bytes,0)+(layered?2*w*h*4:0);return{css:[cssW,cssH],dpr,physical:[w,h],radii,layered,chains,ownedTextureBytes:bytes,ownedTextureMiB:bytes/2**20,note:'Exact logical RGBA8 texel inventory for current allocation dimensions; excludes driver alignment, swapchain, canvas/decoded images and buffers'};}
const memory=[];for(const dpr of [1,1.5,2])for(const radii of [[0],[.5],[3,9,20]])for(const layered of [false,true])memory.push(inventory(960,540,dpr,radii,layered));
const result={kind:'cpu-shader-analysis',baselineSource:'bc2a5ad508a4350aac24d05a9c3519188573ee974398a39322f839ee46434bb7',gaussian:{rows,unitTexelMaxDelta:Math.max(...rows.filter(r=>r.step===1).map(r=>r.maxDelta)),fractionalStepMaxDelta:Math.max(...rows.filter(r=>r.step!==1).map(r=>r.maxDelta)),passed:rows.every(r=>r.finite)&&rows.filter(r=>r.step===1).every(r=>r.maxDelta<1e-12)},profiles,memory};
if(!result.gaussian.passed)throw Error('Ideal unit-texel pairing contract failed');
console.log(JSON.stringify(result,null,2));
